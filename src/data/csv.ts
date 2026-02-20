import type { Skill, Student, AssessmentRow, AssessmentPerspective, AppState, Lang } from '../types';

const STORAGE_KEY = 'kidsskillset_app_state';

function escapeCsvCell(s: string): string {
  const str = String(s ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (inQuotes) {
      cur += c;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/** Parse CSV into headers and rows (for column mapping flow). */
export function parseCsvToRows(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 1) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    rows.push(parseCsvLine(lines[i]));
  }
  return { headers, rows };
}

export type StudentCsvField = 'full_name' | 'first_name' | 'last_name' | 'external_id' | 'group_name' | 'general_note';

/** Map CSV column index (0-based) to app field. -1 = not mapped. */
export type StudentColumnMapping = Partial<Record<StudentCsvField, number>>;

/** Build students from CSV rows using column mapping. */
export function buildStudentsFromMapping(
  rows: string[][],
  mapping: StudentColumnMapping,
  startId: number
): Student[] {
  const students: Student[] = [];
  let nextId = startId;
  const get = (row: string[], field: StudentCsvField): string => {
    const idx = mapping[field];
    if (idx == null || idx < 0) return '';
    return (row[idx] ?? '').trim();
  };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const fullName = get(row, 'full_name');
    const firstName = get(row, 'first_name');
    const lastName = get(row, 'last_name');
    const externalId = get(row, 'external_id');
    const groupName = get(row, 'group_name');
    const generalNote = get(row, 'general_note');
    const hasName = fullName || firstName || lastName;
    if (!hasName) continue;
    students.push({
      student_id: `student_${nextId++}`,
      first_name: fullName ? '' : firstName,
      last_name: fullName ? '' : lastName,
      full_name: fullName || undefined,
      external_id: externalId || undefined,
      group_name: groupName,
      general_note: generalNote,
      active: '1',
    });
  }
  return students;
}

/** Suggest mapping from Hebrew/English column names. */
export function suggestStudentMapping(headers: string[]): StudentColumnMapping {
  const mapping: StudentColumnMapping = {};
  const heNames: [string[], StudentCsvField][] = [
    [['שם הלקוח', 'שם', 'שם התלמיד', 'לקוח', 'תלמיד', 'name', 'full name', 'full_name'], 'full_name'],
    [['שם פרטי', 'first name', 'first_name'], 'first_name'],
    [['שם משפחה', 'last name', 'last_name'], 'last_name'],
    [['מזהה', 'id', 'external_id', 'מזהה חיצוני'], 'external_id'],
    [['סוג הקורס', 'קורס', 'קבוצה', 'group', 'group_name'], 'group_name'],
    [['הערה', 'הערות', 'note', 'general_note'], 'general_note'],
  ];
  for (const [candidates, field] of heNames) {
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c].trim();
      const hLower = h.toLowerCase();
      if (candidates.some((cand) => hLower === cand.toLowerCase() || hLower.includes(cand.toLowerCase()) || (h && cand && h.includes(cand)))) {
        mapping[field] = c;
        break;
      }
    }
  }
  return mapping;
}

export function parseAssessmentsCsv(text: string): AssessmentRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const get = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`assessments.csv: missing column "${name}"`);
    return i;
  };
  const assessmentId = get('assessment_id');
  const studentId = get('student_id');
  const dateIso = get('date_iso');
  const skillId = get('skill_id');
  const score = get('score');
  const note = header.indexOf('note') >= 0 ? header.indexOf('note') : -1;
  const persIdx = header.findIndex((h) => h === 'perspective' || h === 'מבט');

  const rows: AssessmentRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const sid = cells[studentId]?.trim() || '';
    const aid = cells[assessmentId]?.trim() || `assess_${i}`;
    const skid = cells[skillId]?.trim() || '';
    const sc = parseInt(cells[score] ?? '0', 10) || 0;
    const persVal = persIdx >= 0 ? (cells[persIdx] ?? '').trim().toLowerCase() : '';
    const perspective: AssessmentPerspective | undefined =
      persVal === 'parent' || persVal === 'הורה' ? 'parent'
      : persVal === 'instructor' || persVal === 'מדריך' ? 'instructor'
      : undefined;
    rows.push({
      assessment_id: aid,
      student_id: sid,
      date_iso: cells[dateIso]?.trim() ?? '',
      skill_id: skid,
      score: Math.min(100, Math.max(0, sc)),
      note: note >= 0 ? (cells[note]?.trim() ?? '') : '',
      ...(perspective && { perspective }),
    });
  }
  return rows;
}

export function skillsToCsv(skills: Skill[]): string {
  const header = ['skill_id', 'name_he', 'desc_he', 'name_en', 'desc_en', 'order_index'];
  const lines = [header.join(',')];
  for (const s of skills) {
    lines.push([
      escapeCsvCell(s.skill_id),
      escapeCsvCell(s.name_he),
      escapeCsvCell(s.desc_he),
      escapeCsvCell(s.name_en),
      escapeCsvCell(s.desc_en),
      String(s.order_index),
    ].join(','));
  }
  return lines.join('\r\n');
}

export function studentsToCsv(students: Student[]): string {
  const header = ['student_id', 'first_name', 'last_name', 'full_name', 'external_id', 'group_name', 'general_note', 'active'];
  const lines = [header.join(',')];
  for (const s of students) {
    lines.push([
      escapeCsvCell(s.student_id),
      escapeCsvCell(s.first_name),
      escapeCsvCell(s.last_name),
      escapeCsvCell(s.full_name ?? ''),
      escapeCsvCell(s.external_id ?? ''),
      escapeCsvCell(s.group_name),
      escapeCsvCell(s.general_note),
      escapeCsvCell(s.active),
    ].join(','));
  }
  return lines.join('\r\n');
}

export function assessmentsToCsv(rows: AssessmentRow[]): string {
  const header = ['assessment_id', 'student_id', 'date_iso', 'skill_id', 'score', 'note', 'perspective'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      escapeCsvCell(r.assessment_id),
      escapeCsvCell(r.student_id),
      escapeCsvCell(r.date_iso),
      escapeCsvCell(r.skill_id),
      String(r.score),
      escapeCsvCell(r.note),
      escapeCsvCell(r.perspective ?? ''),
    ].join(','));
  }
  return lines.join('\r\n');
}

export function loadStateFromStorage(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredState;
    return {
      skills: data.skills ?? undefined,
      students: data.students ?? undefined,
      assessmentRows: data.assessmentRows ?? undefined,
      lang: data.lang ?? undefined,
      groupNames: data.groupNames ?? undefined,
    };
  } catch {
    return null;
  }
}

export interface StoredState {
  skills?: Skill[];
  students?: Student[];
  assessmentRows?: AssessmentRow[];
  lang?: Lang;
  groupNames?: string[];
}

export function saveStateToStorage(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      skills: state.skills,
      students: state.students,
      assessmentRows: state.assessmentRows,
      lang: state.lang,
      groupNames: state.groupNames,
    }));
  } catch (_) {}
}
