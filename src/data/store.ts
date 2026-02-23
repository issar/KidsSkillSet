import { useState, useEffect } from 'react';
import type {
  Skill,
  Student,
  AssessmentRow,
  Assessment,
  AssessmentPerspective,
  SkillScores,
  AppState,
  Lang,
} from '../types';
import { DEFAULT_SKILLS } from './skills';
import {
  loadStateFromStorage,
  saveStateToStorage,
  parseAssessmentsCsv,
  skillsToCsv,
  studentsToCsv,
  assessmentsToCsv,
} from './csv';

export type StoreListener = () => void;
const listeners: StoreListener[] = [];

/**
 * Storage key is user scoped.
 * Call setStorageKeyForUser(userId) after login and before initStore().
 */
let storageKey = 'kidsskillset_state:anonymous';

export function setStorageKeyForUser(userId: string | null | undefined): void {
  storageKey = `kidsskillset_state:${userId ?? 'anonymous'}`;
}

let state: AppState = {
  skills: [...DEFAULT_SKILLS],
  students: [],
  assessmentRows: [],
  lang: 'he',
  groupNames: [],
};

function getState(): AppState {
  return state;
}

function setState(partial: Partial<AppState>): void {
  state = { ...state, ...partial };
  saveStateToStorage(storageKey, state);
  listeners.forEach((l) => l());
}

export function initStore(): void {
  state = {
    skills: [...DEFAULT_SKILLS],
    students: [],
    assessmentRows: [],
    lang: 'he',
    groupNames: [],
  };

  const stored = loadStateFromStorage(storageKey);
  state.skills = stored?.skills?.length ? [...stored.skills] : [...DEFAULT_SKILLS];
  if (stored?.students?.length) state.students = stored.students;
  if (stored?.assessmentRows?.length) state.assessmentRows = stored.assessmentRows;
  if (stored?.lang) state.lang = stored.lang;
  if (stored?.groupNames?.length) state.groupNames = stored.groupNames;

  saveStateToStorage(storageKey, state);
  listeners.forEach((l) => l());
}

export function subscribe(listener: StoreListener): () => void {
  listeners.push(listener);
  return () => {
    const i = listeners.indexOf(listener);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function getSkills(): Skill[] {
  return [...state.skills].sort((a, b) => a.order_index - b.order_index);
}

export function getStudents(): Student[] {
  return state.students.filter((s) => s.active !== '0');
}

export function getStudentDisplayName(s: Student): string {
  if (s.full_name?.trim()) return s.full_name.trim();
  return [s.first_name, s.last_name].filter(Boolean).join(' ').trim() || '—';
}

function normalizeMatchKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getStudentMatchKey(s: Student): string {
  if (s.external_id?.trim()) return `id:${s.external_id.trim().toLowerCase()}`;
  const name = getStudentDisplayName(s);
  return `name:${normalizeMatchKey(name)}`;
}

export interface MergeStudentsResult {
  added: number;
  skipped: number;
  errors: number;
}

export function mergeStudents(imported: Student[]): MergeStudentsResult {
  const existingKeys = new Set(state.students.map((s) => getStudentMatchKey(s)));
  let added = 0;
  let skipped = 0;
  let errors = 0;

  const toAdd: Student[] = [];
  for (const s of imported) {
    const key = getStudentMatchKey(s);
    if (!key || key === 'name:' || key === 'id:') {
      errors++;
      continue;
    }
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    existingKeys.add(key);
    toAdd.push({
      ...s,
      student_id:
        s.student_id?.trim() ||
        `student_${Date.now()}_${added}_${Math.random().toString(36).slice(2, 9)}`,
    });
    added++;
  }

  if (toAdd.length) setState({ students: [...state.students, ...toAdd] });
  return { added, skipped, errors };
}

export function getAssessmentRows(): AssessmentRow[] {
  return [...state.assessmentRows];
}

export function getLang(): Lang {
  return state.lang;
}

export function setLang(lang: Lang): void {
  setState({ lang });
}

export function getAssessmentsByStudent(studentId: string): Assessment[] {
  const rows = state.assessmentRows.filter((r) => r.student_id === studentId);
  const byId = new Map<string, Assessment>();

  for (const r of rows) {
    let a = byId.get(r.assessment_id);
    const perspective = r.perspective ?? 'instructor';

    if (!a) {
      a = {
        assessment_id: r.assessment_id,
        student_id: r.student_id,
        date_iso: r.date_iso,
        parent_scores: {},
        instructor_scores: {},
      };
      byId.set(r.assessment_id, a);
    }

    const scores = perspective === 'parent' ? a.parent_scores : a.instructor_scores;
    scores[r.skill_id] = { score: r.score, note: r.note };
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime(),
  );
}

export function getLastAssessmentDate(studentId: string): string | null {
  const assessments = getAssessmentsByStudent(studentId);
  return assessments.length ? assessments[0].date_iso : null;
}

export function getAssessmentScores(
  a: Assessment,
  perspective: AssessmentPerspective | 'auto',
): SkillScores {
  if (perspective !== 'auto') {
    return perspective === 'parent' ? a.parent_scores : a.instructor_scores;
  }

  const hasInstructor = Object.keys(a.instructor_scores).some((k) => a.instructor_scores[k] != null);
  const hasParent = Object.keys(a.parent_scores).some((k) => a.parent_scores[k] != null);

  if (hasInstructor) return a.instructor_scores;
  if (hasParent) return a.parent_scores;
  return {};
}

function getScoresForDisplay(a: Assessment): SkillScores {
  return getAssessmentScores(a, 'auto');
}

export function getTwoLowestSkills(studentId: string): { skillId: string; score: number }[] {
  const assessments = getAssessmentsByStudent(studentId);
  if (!assessments.length) return [];

  const scores = getScoresForDisplay(assessments[0]);
  const entries = Object.entries(scores)
    .map(([skillId, { score }]) => ({ skillId, score }))
    .sort((x, y) => x.score - y.score);

  return entries.slice(0, 2);
}

export function getRadarDataForAssessment(
  assessment: Assessment,
  skills: Skill[],
  lang: Lang,
  perspective: AssessmentPerspective,
): { subject: string; value: number; fullMark: number }[] {
  const scores = perspective === 'parent' ? assessment.parent_scores : assessment.instructor_scores;
  const nameKey = lang === 'he' ? 'name_he' : 'name_en';

  return skills.map((s) => ({
    subject: s[nameKey] || s.skill_id,
    value: scores[s.skill_id]?.score ?? 0,
    fullMark: 100,
  }));
}

export function getRadarDataFromDraftCombined(
  parentScores: Record<string, { score: number; note?: string }>,
  instructorScores: Record<string, { score: number; note?: string }>,
  skills: Skill[],
  lang: Lang,
): { subject: string; value: number; valueB: number; fullMark: number }[] {
  const nameKey = lang === 'he' ? 'name_he' : 'name_en';

  return skills.map((s) => ({
    subject: s[nameKey] || s.skill_id,
    value: parentScores[s.skill_id]?.score ?? 0,
    valueB: instructorScores[s.skill_id]?.score ?? 0,
    fullMark: 100,
  }));
}

export function getRadarDataFromScores(
  scores: Record<string, { score: number; note?: string }>,
  skills: Skill[],
  lang: Lang,
): { subject: string; value: number; fullMark: number }[] {
  const nameKey = lang === 'he' ? 'name_he' : 'name_en';

  return skills.map((s) => ({
    subject: s[nameKey] || s.skill_id,
    value: scores[s.skill_id]?.score ?? 0,
    fullMark: 100,
  }));
}

export function getRadarDataCombined(
  assessment: Assessment,
  skills: Skill[],
  lang: Lang,
): { subject: string; value: number; valueB: number; fullMark: number }[] {
  const nameKey = lang === 'he' ? 'name_he' : 'name_en';

  return skills.map((s) => ({
    subject: s[nameKey] || s.skill_id,
    value: assessment.parent_scores[s.skill_id]?.score ?? 0,
    valueB: assessment.instructor_scores[s.skill_id]?.score ?? 0,
    fullMark: 100,
  }));
}

export function getRadarDataCompare(
  assessmentA: Assessment,
  assessmentB: Assessment,
  skills: Skill[],
  lang: Lang,
  perspective: AssessmentPerspective,
): { subject: string; value: number; valueB: number; fullMark: number }[] {
  const scoresA = perspective === 'parent' ? assessmentA.parent_scores : assessmentA.instructor_scores;
  const scoresB = perspective === 'parent' ? assessmentB.parent_scores : assessmentB.instructor_scores;
  const nameKey = lang === 'he' ? 'name_he' : 'name_en';

  return skills.map((s) => ({
    subject: s[nameKey] || s.skill_id,
    value: scoresA[s.skill_id]?.score ?? 0,
    valueB: scoresB[s.skill_id]?.score ?? 0,
    fullMark: 100,
  }));
}

export function getGroups(): string[] {
  const fromStudents = new Set(state.students.map((s) => s.group_name).filter(Boolean));
  const extra = state.groupNames || [];
  extra.forEach((g) => fromStudents.add(g));
  return Array.from(fromStudents).sort();
}

export function addGroup(name: string): void {
  const n = name.trim();
  if (!n) return;
  if (getGroups().includes(n)) return;
  setState({ groupNames: [...(state.groupNames || []), n] });
}

export function renameGroup(oldName: string, newName: string): void {
  const n = newName.trim();
  if (!n) return;

  const students = state.students.map((s) => (s.group_name === oldName ? { ...s, group_name: n } : s));
  const groupNames = (state.groupNames || []).map((g) => (g === oldName ? n : g));

  setState({ students, groupNames });
}

export function deleteGroup(name: string): void {
  const students = state.students.map((s) =>
    s.group_name === name ? { ...s, group_name: '', active: '0' } : s,
  );
  const groupNames = (state.groupNames || []).filter((g) => g !== name);

  setState({ students, groupNames });
}

export function addStudent(student: Omit<Student, 'student_id'>): void {
  const id = `student_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  setState({ students: [...state.students, { ...student, student_id: id }] });
}

export function updateStudent(studentId: string, updates: Partial<Student>): void {
  const students = state.students.map((s) => (s.student_id === studentId ? { ...s, ...updates } : s));
  setState({ students });
}

export function deleteStudent(studentId: string): void {
  updateStudent(studentId, { active: '0' });
}

export function deleteAssessment(assessmentId: string): void {
  setState({
    assessmentRows: state.assessmentRows.filter((r) => r.assessment_id !== assessmentId),
  });
}

export function updateAssessmentPerspective(
  assessmentId: string,
  studentId: string,
  dateIso: string,
  perspective: AssessmentPerspective,
  scores: SkillScores,
): void {
  const skills = getSkills();
  const filtered = state.assessmentRows.filter(
    (r) => !(r.assessment_id === assessmentId && r.perspective === perspective),
  );

  const rows: AssessmentRow[] = skills.map((s) => {
    const sc = scores[s.skill_id] ?? { score: 50, note: '' };
    return {
      assessment_id: assessmentId,
      student_id: studentId,
      date_iso: dateIso,
      skill_id: s.skill_id,
      score: Math.min(100, Math.max(0, sc.score)),
      note: sc.note ?? '',
      perspective,
    };
  });

  setState({ assessmentRows: [...filtered, ...rows] });
}

export function addAssessment(
  studentId: string,
  dateIso: string,
  parentScores: SkillScores,
  instructorScores: SkillScores,
): void {
  const aid = `assess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const skills = getSkills();
  const rows: AssessmentRow[] = [];

  const addForPerspective = (pers: AssessmentPerspective, scores: SkillScores) => {
    if (Object.keys(scores).length === 0) return;
    skills.forEach((s) => {
      const sc = scores[s.skill_id] ?? { score: 50, note: '' };
      rows.push({
        assessment_id: aid,
        student_id: studentId,
        date_iso: dateIso,
        skill_id: s.skill_id,
        score: Math.min(100, Math.max(0, sc.score)),
        note: sc.note ?? '',
        perspective: pers,
      });
    });
  };

  addForPerspective('parent', parentScores);
  addForPerspective('instructor', instructorScores);

  if (rows.length === 0) return;
  setState({ assessmentRows: [...state.assessmentRows, ...rows] });
}

export function setStudents(students: Student[]): void {
  setState({ students });
}

export function appendStudents(students: Student[]): void {
  const withIds = students.map((s, i) => ({
    ...s,
    student_id: s.student_id?.trim() || `student_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
  }));
  setState({ students: [...state.students, ...withIds] });
}

export function setAssessmentRows(rows: AssessmentRow[]): void {
  setState({ assessmentRows: rows });
}

function ensureIds(s: AppState): AppState {
  const studentIdMap = new Map<string, string>();

  const students = s.students.map((st, i) => {
    const id = st.student_id?.trim() || `student_${i + 1}`;
    if (st.student_id !== id) studentIdMap.set(st.student_id, id);
    return { ...st, student_id: id };
  });

  const rows = s.assessmentRows.map((r) => ({
    ...r,
    student_id: studentIdMap.get(r.student_id) ?? r.student_id,
  }));

  return { ...s, students, assessmentRows: rows };
}

export function importAssessmentsFromCsv(csvText: string): { ok: boolean; error?: string } {
  try {
    const rows = parseAssessmentsCsv(csvText);
    setState({ assessmentRows: [...state.assessmentRows, ...rows] });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function exportToCsv(): { skills: string; students: string; assessments: string } {
  const s = ensureIds(state);
  return {
    skills: skillsToCsv(s.skills),
    students: studentsToCsv(s.students),
    assessments: assessmentsToCsv(s.assessmentRows),
  };
}

export { getState, setState };

export function useStoreSnapshot(): AppState {
  const [snapshot, setSnapshot] = useState(() => getState());
  useEffect(() => {
    return subscribe(() => setSnapshot({ ...getState() }));
  }, []);
  return snapshot;
}