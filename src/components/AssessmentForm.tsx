import { useState, useEffect } from 'react';
import type { SkillScores } from '../types';
import { useStoreSnapshot } from '../data/store';
import { useT } from '../i18n/translations';
import { getSkills, addAssessment, updateAssessmentPerspective } from '../data/store';

export type EditingAssessment = {
  assessmentId: string;
  dateIso: string;
  perspective: 'parent' | 'instructor';
  initialScores?: SkillScores;
};

type Props = {
  studentId: string;
  editingAssessment?: EditingAssessment | null;
  onEditCancel?: () => void;
  onDraftChange?: (parent: SkillScores | null, instructor: SkillScores | null) => void;
  onAssessmentSaved?: () => void;
  onEditSaved?: () => void;
  onTabChange?: (tab: 'parent' | 'instructor') => void;
};

function initScores(skills: { skill_id: string }[]): SkillScores {
  const o: SkillScores = {};
  skills.forEach((s) => { o[s.skill_id] = { score: 50, note: '' }; });
  return o;
}

type PanelProps = {
  hint: string;
  scores: SkillScores;
  onScoresChange: (s: SkillScores) => void;
  skills: ReturnType<typeof getSkills>;
  skillName: (id: string) => string;
  T: ReturnType<typeof useT>;
};

function AssessmentPanel({ hint, scores, onScoresChange, skills, skillName, T }: PanelProps) {
  const setScore = (skillId: string, score: number) => {
    const n = Math.min(100, Math.max(0, score));
    onScoresChange({
      ...scores,
      [skillId]: { ...(scores[skillId] ?? { score: 50, note: '' }), score: n },
    });
  };
  const setNote = (skillId: string, note: string) => {
    onScoresChange({
      ...scores,
      [skillId]: { ...(scores[skillId] ?? { score: 50, note: '' }), note },
    });
  };

  return (
    <div className="assessment-panel">
      <p className="assessment-panel-hint">{hint}</p>
      {skills.map((skill) => {
        const val = scores[skill.skill_id]?.score ?? 50;
        const note = scores[skill.skill_id]?.note ?? '';
        return (
          <div key={skill.skill_id} className="skill-row">
            <label className="skill-name">{skillName(skill.skill_id)}</label>
            <input
              type="range"
              min={0}
              max={100}
              value={val}
              onChange={(e) => setScore(skill.skill_id, Number(e.target.value))}
              aria-label={`${skillName(skill.skill_id)} ${T.score}`}
            />
            <input
              type="number"
              min={0}
              max={100}
              value={val}
              onChange={(e) => setScore(skill.skill_id, Number(e.target.value))}
              aria-label={`${skillName(skill.skill_id)} ${T.score}`}
            />
            <textarea
              placeholder={T.note}
              value={note}
              onChange={(e) => setNote(skill.skill_id, e.target.value)}
              rows={1}
              aria-label={`${skillName(skill.skill_id)} ${T.note}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function AssessmentForm({
  studentId,
  editingAssessment,
  onEditCancel,
  onDraftChange,
  onAssessmentSaved,
  onEditSaved,
  onTabChange,
}: Props) {
  const state = useStoreSnapshot();
  const T = useT(state.lang);
  const skills = getSkills();

  const today = new Date().toISOString().slice(0, 10);
  const [dateIso, setDateIso] = useState(today);
  const [parentScores, setParentScores] = useState<SkillScores>(() => initScores(skills));
  const [instructorScores, setInstructorScores] = useState<SkillScores>(() => initScores(skills));
  const [activeTab, setActiveTab] = useState<'parent' | 'instructor'>('instructor');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (editingAssessment) {
      setDateIso(editingAssessment.dateIso);
      setActiveTab(editingAssessment.perspective);
      onTabChange?.(editingAssessment.perspective);
      if (editingAssessment.initialScores) {
        const next = { ...initScores(skills), ...editingAssessment.initialScores };
        if (editingAssessment.perspective === 'parent') setParentScores(next);
        else setInstructorScores(next);
      }
    }
  }, [editingAssessment]);

  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const nextParent = { ...parentScores };
    const nextInstructor = { ...instructorScores };
    let changed = false;
    skills.forEach((s) => {
      if (!(s.skill_id in nextParent)) { nextParent[s.skill_id] = { score: 50, note: '' }; changed = true; }
      if (!(s.skill_id in nextInstructor)) { nextInstructor[s.skill_id] = { score: 50, note: '' }; changed = true; }
    });
    if (changed) {
      setParentScores(nextParent);
      setInstructorScores(nextInstructor);
      onDraftChange?.(nextParent, nextInstructor);
    }
  }, [skills.length]);

  const notifyDraft = (p: SkillScores, i: SkillScores) => {
    onDraftChange?.(p, i);
  };

  const handleParentChange = (s: SkillScores) => {
    setParentScores(s);
    notifyDraft(s, instructorScores);
  };
  const handleInstructorChange = (s: SkillScores) => {
    setInstructorScores(s);
    notifyDraft(parentScores, s);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAssessment) {
      const scores = editingAssessment.perspective === 'parent' ? parentScores : instructorScores;
      const filtered: SkillScores = {};
      skills.forEach((s) => {
        const sc = scores[s.skill_id];
        if (sc) filtered[s.skill_id] = sc;
      });
      if (Object.keys(filtered).length === 0) return;
      updateAssessmentPerspective(
        editingAssessment.assessmentId,
        studentId,
        editingAssessment.dateIso,
        editingAssessment.perspective,
        filtered
      );
      onEditSaved?.();
      onEditCancel?.();
      onDraftChange?.(null, null);
    } else {
      const p: SkillScores = {};
      const i: SkillScores = {};
      skills.forEach((s) => {
        const pid = parentScores[s.skill_id];
        const iid = instructorScores[s.skill_id];
        if (pid) p[s.skill_id] = pid;
        if (iid) i[s.skill_id] = iid;
      });
      if (Object.keys(p).length === 0 && Object.keys(i).length === 0) return;
      addAssessment(studentId, dateIso, p, i);
      onDraftChange?.(null, null);
      onAssessmentSaved?.();
    }
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  const skillName = (skillId: string) => {
    const sk = skills.find((s) => s.skill_id === skillId);
    return sk ? (state.lang === 'he' ? sk.name_he : sk.name_en) || skillId : skillId;
  };

  if (!skills.length) return null;

  return (
    <form className="assessment-form" onSubmit={handleSubmit}>
      <div className="assessment-form-date-row">
        <label htmlFor="assessment-date">{T.date}</label>
        <input
          id="assessment-date"
          type="date"
          value={dateIso}
          onChange={(e) => setDateIso(e.target.value)}
          required
        />
      </div>
      <div className="assessment-form-tabs">
        <button
          type="button"
          className={`assessment-form-tab instructor-tab ${activeTab === 'instructor' ? 'active' : ''}`}
          onClick={() => setActiveTab('instructor')}
        >
          {T.instructorAssessment}
        </button>
        <button
          type="button"
          className={`assessment-form-tab parent-tab ${activeTab === 'parent' ? 'active' : ''}`}
          onClick={() => setActiveTab('parent')}
        >
          {T.parentAssessment}
        </button>
      </div>
      <div className="assessment-form-tab-content">
        {activeTab === 'instructor' ? (
          <AssessmentPanel
            hint={T.mayBeEmpty}
            scores={instructorScores}
            onScoresChange={handleInstructorChange}
            skills={skills}
            skillName={skillName}
            T={T}
          />
        ) : (
          <AssessmentPanel
            hint={T.mayBeEmpty}
            scores={parentScores}
            onScoresChange={handleParentChange}
            skills={skills}
            skillName={skillName}
            T={T}
          />
        )}
      </div>
      <div className="assessment-form-actions">
        <button type="submit" className="primary">
          {editingAssessment ? T.save : T.addAssessment}
        </button>
        {editingAssessment && (
          <button type="button" onClick={() => { onEditCancel?.(); onDraftChange?.(null, null); }}>
            {T.cancel}
          </button>
        )}
        {submitted && <span className="assessment-form-success">&#10003;</span>}
      </div>
    </form>
  );
}
