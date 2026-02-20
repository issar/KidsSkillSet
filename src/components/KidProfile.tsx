import React, { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useStoreSnapshot } from '../data/store';
import { useT } from '../i18n/translations';
import type { AssessmentPerspective } from '../types';
import {
  getSkills,
  getAssessmentsByStudent,
  getRadarDataForAssessment,
  getRadarDataFromScores,
  getRadarDataCompare,
  getRadarDataCombined,
  getRadarDataFromDraftCombined,
  getAssessmentScores,
  getStudents,
  getStudentDisplayName,
  getGroups,
  deleteStudent,
  deleteAssessment,
  updateStudent,
} from '../data/store';
import AssessmentForm, { type EditingAssessment } from './AssessmentForm';
import ConfirmDialog from './ConfirmDialog';
import KebabMenu from './KebabMenu';
import CollapsibleSection from './CollapsibleSection';

export default function KidProfile() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const state = useStoreSnapshot();
  const T = useT(state.lang);
  const skills = getSkills();
  const students = getStudents();

  const [compareMode, setCompareMode] = useState(false);
  const [assessmentA, setAssessmentA] = useState<string | null>(null);
  const [assessmentB, setAssessmentB] = useState<string | null>(null);
  const [radarPerspective, setRadarPerspective] = useState<AssessmentPerspective>('instructor');
  const [draftParent, setDraftParent] = useState<Record<string, { score: number; note: string }> | null>(null);
  const [draftInstructor, setDraftInstructor] = useState<Record<string, { score: number; note: string }> | null>(null);
  const [confirmDeleteAssessmentId, setConfirmDeleteAssessmentId] = useState<string | null>(null);
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState(false);
  const [transferGroup, setTransferGroup] = useState<boolean>(false);
  const [openAssessmentKebabId, setOpenAssessmentKebabId] = useState<string | null>(null);
  const [openProfileActions, setOpenProfileActions] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<EditingAssessment | null>(null);
  const [combinedView, setCombinedView] = useState(false);
  const [expandedLeftPanel, setExpandedLeftPanel] = useState<string | null>(null);
  const [viewedAssessmentTab, setViewedAssessmentTab] = useState<'parent' | 'instructor'>('instructor');

  const student = useMemo(
    () => state.students.find((s) => s.student_id === studentId),
    [state.students, studentId]
  );

  const assessments = useMemo(
    () => (studentId ? getAssessmentsByStudent(studentId) : []),
    [studentId, state.assessmentRows]
  );

  const groupStudents = useMemo(() => {
    if (!student?.group_name) return [];
    return students
      .filter((s) => s.group_name === student.group_name)
      .sort((a, b) => getStudentDisplayName(a).localeCompare(getStudentDisplayName(b)));
  }, [student, students]);

  const currentIndex = groupStudents.findIndex((s) => s.student_id === studentId);
  const prevKid = currentIndex > 0 ? groupStudents[currentIndex - 1] : null;
  const nextKid = currentIndex >= 0 && currentIndex < groupStudents.length - 1 ? groupStudents[currentIndex + 1] : null;

  const latest = assessments[0] ?? null;
  const selectedAssessA = (assessmentA && assessments.find((a) => a.assessment_id === assessmentA)) || latest;
  const selectedAssessB = assessmentB
    ? assessments.find((a) => a.assessment_id === assessmentB)
    : assessments[1] ?? null;
  const hasDraft = (draftParent && Object.keys(draftParent).length > 0) || (draftInstructor && Object.keys(draftInstructor).length > 0);
  const draftForPerspective = radarPerspective === 'parent' ? draftParent : draftInstructor;
  const radarDataDraftSingle = draftForPerspective && Object.keys(draftForPerspective).length > 0
    ? getRadarDataFromScores(draftForPerspective, skills, state.lang)
    : [];
  const radarDataDraftCombined = hasDraft && combinedView
    ? getRadarDataFromDraftCombined(draftParent ?? {}, draftInstructor ?? {}, skills, state.lang)
    : [];
  const radarDataSingle = radarDataDraftCombined.length > 0
    ? radarDataDraftCombined
    : radarDataDraftSingle.length > 0
      ? radarDataDraftSingle
      : selectedAssessA
        ? combinedView
          ? getRadarDataCombined(selectedAssessA, skills, state.lang)
          : getRadarDataForAssessment(selectedAssessA, skills, state.lang, radarPerspective)
        : [];
  const radarDataCompare =
    compareMode && selectedAssessA && selectedAssessB
      ? getRadarDataCompare(selectedAssessA, selectedAssessB, skills, state.lang, 'instructor')
      : [];

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(state.lang === 'he' ? 'he-IL' : 'en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const formatDateDDMMYYYY = (iso: string) => {
    try {
      const d = new Date(iso);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return iso;
    }
  };

  const skillName = (skillId: string) => {
    const sk = skills.find((s) => s.skill_id === skillId);
    return sk ? (state.lang === 'he' ? sk.name_he : sk.name_en) || skillId : skillId;
  };

  const sortedSkillsWithScores = useMemo(() => {
    if (!latest) return [];
    const sc = getAssessmentScores(latest, compareMode ? 'instructor' : radarPerspective);
    return skills
      .map((s) => ({
        skill: s,
        score: sc[s.skill_id]?.score ?? 0,
        note: sc[s.skill_id]?.note ?? '',
      }))
      .sort((a, b) => a.score - b.score);
  }, [latest, skills, radarPerspective, compareMode]);

  const diffs = compareMode && selectedAssessA && selectedAssessB
    ? skills.map((s) => {
        const sa = getAssessmentScores(selectedAssessA, 'instructor');
        const sb = getAssessmentScores(selectedAssessB, 'instructor');
        const va = sa[s.skill_id]?.score ?? 0;
        const vb = sb[s.skill_id]?.score ?? 0;
        return { skillName: skillName(s.skill_id), diff: vb - va };
      })
    : [];

  const groups = getGroups();
  const otherGroups = groups.filter((g) => g !== student?.group_name);

  const handleTransfer = (newGroup: string) => {
    if (!studentId || !newGroup) return;
    updateStudent(studentId, { group_name: newGroup });
    setTransferGroup(false);
  };

  const handleDeleteStudent = () => {
    if (!studentId) return;
    const group = student?.group_name;
    deleteStudent(studentId);
    if (group) navigate(`/group/${encodeURIComponent(group)}`);
    else navigate('/');
  };

  if (!studentId || !student) {
    return (
      <div>
        <Link to="/">{T.backToGroups}</Link>
        <p>{state.lang === 'he' ? 'תלמיד לא נמצא' : 'Student not found'}</p>
      </div>
    );
  }

  const selectedA = assessmentA || (assessments[0]?.assessment_id ?? null);
  const selectedB = assessmentB || (assessments[1]?.assessment_id ?? null);

  return (
    <div className="kid-profile">
      <div className="nav-buttons no-print">
        <Link to={student.group_name ? `/group/${encodeURIComponent(student.group_name)}` : '/'}>
          {T.backToGroup}
        </Link>
        {prevKid && (
          <Link to={`/kid/${prevKid.student_id}`} className="primary">
            ← {T.prevKid}
          </Link>
        )}
        {nextKid && (
          <Link to={`/kid/${nextKid.student_id}`} className="primary">
            {T.nextKid} →
          </Link>
        )}
      </div>

      <div className="kid-profile-header">
        <h2>{getStudentDisplayName(student)}</h2>
        <p className="kid-profile-meta">
          {state.lang === 'he' ? 'קבוצה' : 'Group'}: {student.group_name || '—'}
        </p>
        <div className="kid-profile-actions no-print">
          <KebabMenu
            open={openProfileActions}
            onClose={() => setOpenProfileActions(false)}
            onToggle={() => setOpenProfileActions(!openProfileActions)}
            triggerLabel={T.profileActions}
          >
            {otherGroups.length > 0 && (
              <>
                <button type="button" onClick={() => { setTransferGroup(true); setOpenProfileActions(false); }}>
                  {T.transferToGroup}
                </button>
              </>
            )}
            <button type="button" className="danger" onClick={() => { setConfirmDeleteStudent(true); setOpenProfileActions(false); }}>
              {T.deleteStudent}
            </button>
          </KebabMenu>
          {transferGroup && otherGroups.length > 0 && (
            <span className="action-group profile-transfer-inline">
              <select
                value=""
                onChange={(e) => { const v = e.target.value; if (v) { handleTransfer(v); setTransferGroup(false); } }}
                autoFocus
              >
                <option value="">{state.lang === 'he' ? 'בחר קבוצה' : 'Select group'}</option>
                {otherGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <button type="button" onClick={() => setTransferGroup(false)}>{T.cancel}</button>
            </span>
          )}
        </div>
        <div className={`general-note-box ${student.general_note ? '' : 'empty'}`}>
          {T.generalNote}: {student.general_note || (state.lang === 'he' ? '(אין הערה)' : '(none)')}
        </div>
      </div>

      <div className="kid-profile-two-column">
        <div className="kid-profile-left">
          <CollapsibleSection
            title={state.lang === 'he' ? 'הערכה חדשה' : T.newAssessment}
            defaultOpen={false}
            open={expandedLeftPanel === 'newAssessment'}
            onOpenChange={(v) => {
              if (v) setExpandedLeftPanel('newAssessment');
              else { setExpandedLeftPanel(null); setEditingAssessment(null); }
            }}
          >
            <AssessmentForm
              studentId={studentId}
              editingAssessment={editingAssessment}
              onEditCancel={() => setEditingAssessment(null)}
              onDraftChange={(p, i) => { setDraftParent(p); setDraftInstructor(i); }}
              onAssessmentSaved={() => { setDraftParent(null); setDraftInstructor(null); }}
              onEditSaved={() => setEditingAssessment(null)}
              onTabChange={(tab) => setRadarPerspective(tab)}
            />
          </CollapsibleSection>
          {assessments.length > 0 && (
            <CollapsibleSection
              title={T.assessmentsHistory}
              summary={`${assessments.length} ${state.lang === 'he' ? 'הערכות' : 'assessments'}`}
              defaultOpen={false}
              open={expandedLeftPanel === 'history'}
              onOpenChange={(v) => setExpandedLeftPanel(v ? 'history' : null)}
            >
              <ul className="assessments-history-list">
                {assessments.map((a, idx) => {
                  const kebabOpen = openAssessmentKebabId === a.assessment_id;
                  return (
                    <li key={a.assessment_id}>
                      <span className="assessment-label">
                        {T.assessmentNum} {idx + 1}: {formatDateDDMMYYYY(a.date_iso)}
                      </span>
                      <span className="assessment-actions">
                        <button type="button" onClick={() => setAssessmentA(a.assessment_id)}>
                          {T.viewAssessment}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAssessment({
                              assessmentId: a.assessment_id,
                              dateIso: a.date_iso,
                              perspective: 'instructor',
                              initialScores: Object.keys(a.instructor_scores).length > 0 ? a.instructor_scores : undefined,
                            });
                            setExpandedLeftPanel('newAssessment');
                          }}
                        >
                          {T.editInstructorAssessment}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAssessment({
                              assessmentId: a.assessment_id,
                              dateIso: a.date_iso,
                              perspective: 'parent',
                              initialScores: Object.keys(a.parent_scores).length > 0 ? a.parent_scores : undefined,
                            });
                            setExpandedLeftPanel('newAssessment');
                          }}
                        >
                          {T.editParentAssessment}
                        </button>
                        <KebabMenu
                          open={kebabOpen}
                          onClose={() => setOpenAssessmentKebabId(null)}
                          onToggle={() => setOpenAssessmentKebabId(kebabOpen ? null : a.assessment_id)}
                          triggerLabel={state.lang === 'he' ? 'פעולות' : 'Actions'}
                        >
                          <button
                            type="button"
                            className="danger"
                            onClick={() => { setConfirmDeleteAssessmentId(a.assessment_id); setOpenAssessmentKebabId(null); }}
                          >
                            {T.deleteAssessment}
                          </button>
                        </KebabMenu>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {selectedAssessA && (() => {
                const a = selectedAssessA;
                const idx = assessments.findIndex((x) => x.assessment_id === a.assessment_id) + 1;
                const scores = viewedAssessmentTab === 'parent' ? a.parent_scores : a.instructor_scores;
                const hasParent = Object.keys(a.parent_scores).some((k) => a.parent_scores[k]?.score != null);
                const hasInstructor = Object.keys(a.instructor_scores).some((k) => a.instructor_scores[k]?.score != null);
                return (
                  <div className="assessment-view-panels">
                    <p className="assessment-view-date">{T.assessmentNum} {idx}: {formatDate(a.date_iso)}</p>
                    <div className="assessment-view-tabs">
                      <button
                        type="button"
                        className={`assessment-view-tab instructor-tab ${viewedAssessmentTab === 'instructor' ? 'active' : ''}`}
                        onClick={() => setViewedAssessmentTab('instructor')}
                      >
                        {T.instructor}
                      </button>
                      <button
                        type="button"
                        className={`assessment-view-tab parent-tab ${viewedAssessmentTab === 'parent' ? 'active' : ''}`}
                        onClick={() => setViewedAssessmentTab('parent')}
                      >
                        {T.parent}
                      </button>
                    </div>
                    <div className="assessment-view-content">
                      <p className="assessment-panel-hint">{T.mayBeEmpty}</p>
                      <ul className="assessment-view-scores">
                        {skills.map((sk) => {
                          const sc = scores[sk.skill_id];
                          if (!sc && viewedAssessmentTab === 'instructor' && !hasInstructor) return <li key={sk.skill_id}>{skillName(sk.skill_id)}: —</li>;
                          if (!sc && viewedAssessmentTab === 'parent' && !hasParent) return <li key={sk.skill_id}>{skillName(sk.skill_id)}: —</li>;
                          if (!sc) return <li key={sk.skill_id}>{skillName(sk.skill_id)}: —</li>;
                          return (
                            <li key={sk.skill_id}>
                              <span className="skill-score-line">{skillName(sk.skill_id)}: {sc.score}</span>
                              {sc.note && <div className="skill-note-row">{sc.note}</div>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </CollapsibleSection>
          )}
          {latest && (
            <CollapsibleSection
              title={`${T.latestAssessment} – ${formatDate(latest.date_iso)}`}
              defaultOpen={false}
              open={expandedLeftPanel === 'latest'}
              onOpenChange={(v) => setExpandedLeftPanel(v ? 'latest' : null)}
            >
              <p><strong>{T.skillsSortedLowToHigh}</strong></p>
              <p className="section-explanation">{T.skillsSortedExpl}</p>
              <ul className="skills-list-sorted">
                {sortedSkillsWithScores.map(({ skill, score, note }) => (
                  <li key={skill.skill_id}>
                    <span className="skill-score-line">{skillName(skill.skill_id)}: {score}</span>
                    {note && <div className="skill-note-row">{note}</div>}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}
        </div>
        <div className="kid-profile-right">
          <CollapsibleSection title={T.radarChart} summary={T.radarChartExpl} defaultOpen={true}>
        <p className="section-explanation">{T.radarChartExpl}</p>
        <div className="radar-view-controls">
          {compareMode ? (
            <span className="radar-compare-label">{T.instructorProgressOverTime}</span>
          ) : (
            <>
              <label className="combined-view-toggle">
                <input
                  type="checkbox"
                  checked={combinedView}
                  onChange={(e) => setCombinedView(e.target.checked)}
                />
                {T.combinedView}
              </label>
              {!combinedView && (
                <div className="radar-perspective-toggle">
                  <label>
                    <input
                      type="radio"
                      name="radar-perspective"
                      checked={radarPerspective === 'instructor'}
                      onChange={() => setRadarPerspective('instructor')}
                    />
                    {T.perspectiveInstructor}
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="radar-perspective"
                      checked={radarPerspective === 'parent'}
                      onChange={() => setRadarPerspective('parent')}
                    />
                    {T.perspectiveParent}
                  </label>
                </div>
              )}
            </>
          )}
        </div>
        <div className="compare-controls">
          <label>
            <input
              type="checkbox"
              checked={compareMode}
              onChange={(e) => {
                const v = e.target.checked;
                setCompareMode(v);
                if (v) { setCombinedView(false); setRadarPerspective('instructor'); }
              }}
            />
            {T.compareMode}
          </label>
          {compareMode && (
            <>
              <label>
                {T.assessment} 1:
                <select
                  value={selectedA ?? ''}
                  onChange={(e) => setAssessmentA(e.target.value || null)}
                >
                  <option value="">{T.selectAssessment}</option>
                  {assessments.map((a) => (
                    <option key={a.assessment_id} value={a.assessment_id}>
                      {formatDate(a.date_iso)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {T.assessment} 2:
                <select
                  value={selectedB ?? ''}
                  onChange={(e) => setAssessmentB(e.target.value || null)}
                >
                  <option value="">{T.selectAssessment}</option>
                  {assessments.map((a) => (
                    <option key={a.assessment_id} value={a.assessment_id}>
                      {formatDate(a.date_iso)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {!compareMode && (
            <label>
              {T.selectAssessment}:
              <select
                value={selectedA ?? ''}
                onChange={(e) => setAssessmentA(e.target.value || null)}
              >
                {assessments.map((a) => (
                  <option key={a.assessment_id} value={a.assessment_id}>
                    {formatDate(a.date_iso)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="radar-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={compareMode && radarDataCompare.length ? radarDataCompare : radarDataSingle}
              margin={{ top: 60, right: 80, bottom: 60, left: 80 }}
              outerRadius="55%"
              cx="50%"
              cy="50%"
            >
              <PolarGrid />
              <PolarAngleAxis
                dataKey="subject"
                tickLine={false}
                tick={((props: unknown) => {
                  const p = props as { payload?: { value?: string }; x?: number; y?: number; cx?: number; cy?: number };
                  const x = Number(p.x) || 0;
                  const y = Number(p.y) || 0;
                  const cx = Number(p.cx) || 0;
                  const cy = Number(p.cy) || 0;
                  const dx = x - cx;
                  const dy = y - cy;
                  const len = Math.sqrt(dx * dx + dy * dy) || 1;
                  const pushOut = 1.55;
                  const tx = cx + (dx / len) * (len * pushOut);
                  const ty = cy + (dy / len) * (len * pushOut);
                  return (
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="var(--color-charcoal)" fontSize={12} className="radar-axis-tick">
                      {p.payload?.value ?? ''}
                    </text>
                  );
                }) as React.ComponentProps<typeof PolarAngleAxis>['tick']}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              {!compareMode && radarDataSingle.length > 0 && (
                radarDataSingle.length > 0 && 'valueB' in (radarDataSingle[0] ?? {})
                  ? (
                    <>
                      <Radar
                        name={T.parent}
                        dataKey="value"
                        stroke="var(--color-parent)"
                        fill="var(--color-parent)"
                        fillOpacity={0.3}
                      />
                      <Radar
                        name={T.instructor}
                        dataKey="valueB"
                        stroke="var(--color-instructor)"
                        fill="var(--color-instructor)"
                        fillOpacity={0.35}
                      />
                    </>
                  )
                  : (
                    <Radar
                      name={hasDraft && !combinedView ? T.currentFormPreview : (selectedAssessA ? formatDate(selectedAssessA.date_iso) : '')}
                      dataKey="value"
                      stroke={radarPerspective === 'parent' ? 'var(--color-parent)' : 'var(--color-instructor)'}
                      fill={radarPerspective === 'parent' ? 'var(--color-parent)' : 'var(--color-instructor)'}
                      fillOpacity={0.4}
                    />
                  )
              )}
              {compareMode && radarDataCompare.length > 0 && (
                <>
                  <Radar
                    name={selectedAssessA ? formatDate(selectedAssessA.date_iso) : ''}
                    dataKey="value"
                    stroke="var(--color-instructor)"
                    fill="var(--color-instructor)"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name={selectedAssessB ? formatDate(selectedAssessB.date_iso) : ''}
                    dataKey="valueB"
                    stroke="var(--color-parent)"
                    fill="var(--color-parent)"
                    fillOpacity={0.35}
                  />
                </>
              )}
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {compareMode && diffs.length > 0 && (
          <ul className="diff-list">
            {diffs.map((d) => (
              <li key={d.skillName}>
                <span>{d.skillName}</span>
                <span className={`diff-value ${d.diff > 0 ? 'positive' : d.diff < 0 ? 'negative' : ''}`}>
                  {d.diff > 0 ? '+' : ''}{d.diff}
                </span>
              </li>
            ))}
          </ul>
        )}
          </CollapsibleSection>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteStudent}
        title={T.deleteStudent}
        message={T.confirmDeleteStudentMessage}
        confirmLabel={T.delete}
        cancelLabel={T.cancel}
        onConfirm={() => { setConfirmDeleteStudent(false); handleDeleteStudent(); }}
        onCancel={() => setConfirmDeleteStudent(false)}
        danger
      />

      <ConfirmDialog
        open={!!confirmDeleteAssessmentId}
        title={T.deleteAssessment}
        message={T.confirmDeleteAssessmentMessage}
        confirmLabel={T.delete}
        cancelLabel={T.cancel}
        onConfirm={() => { if (confirmDeleteAssessmentId) { deleteAssessment(confirmDeleteAssessmentId); setConfirmDeleteAssessmentId(null); } }}
        onCancel={() => setConfirmDeleteAssessmentId(null)}
        danger
      />
    </div>
  );
}
