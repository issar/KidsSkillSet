import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStoreSnapshot } from '../data/store';
import { useT } from '../i18n/translations';
import {
  getSkills,
  getLastAssessmentDate,
  getTwoLowestSkills,
  getStudentDisplayName,
  addStudent,
  deleteStudent,
  getGroups,
  updateStudent,
} from '../data/store';
import ReportExport from './ReportExport';
import ConfirmDialog from './ConfirmDialog';
import KebabMenu from './KebabMenu';

export default function GroupView() {
  const { groupName } = useParams<{ groupName: string }>();
  const state = useStoreSnapshot();
  const T = useT(state.lang);
  const skills = getSkills();

  const [search, setSearch] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newGeneralNote, setNewGeneralNote] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [transferStudentId, setTransferStudentId] = useState<string | null>(null);
  const [bulkMoveTarget, setBulkMoveTarget] = useState<string | null>(null);

  const decodedGroup = groupName ? decodeURIComponent(groupName) : '';
  const studentsInGroup = useMemo(() => {
    if (!decodedGroup) return [];
    return state.students
      .filter((s) => s.active !== '0' && s.group_name === decodedGroup)
      .sort((a, b) => getStudentDisplayName(a).localeCompare(getStudentDisplayName(b)));
  }, [decodedGroup, state.students]);

  const filtered = useMemo(() => {
    if (!search.trim()) return studentsInGroup;
    const q = search.trim().toLowerCase();
    return studentsInGroup.filter((s) => {
      const display = getStudentDisplayName(s).toLowerCase();
      return display.includes(q) || s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q);
    });
  }, [studentsInGroup, search]);

  const formatDate = (iso: string | null) => {
    if (!iso) return T.noAssessment;
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(state.lang === 'he' ? 'he-IL' : 'en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const skillName = (skillId: string) => {
    const sk = skills.find((s) => s.skill_id === skillId);
    return sk ? (state.lang === 'he' ? sk.name_he : sk.name_en) || skillId : skillId;
  };

  const groups = getGroups();
  const otherGroups = groups.filter((g) => g !== decodedGroup);

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const first = newFirstName.trim();
    const last = newLastName.trim();
    if (!first || !last) return;
    addStudent({
      first_name: first,
      last_name: last,
      group_name: decodedGroup,
      general_note: newGeneralNote.trim(),
      active: '1',
    });
    setNewFirstName('');
    setNewLastName('');
    setNewGeneralNote('');
    setShowAddStudent(false);
  };

  const toggleSelect = (sid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((s) => s.student_id)));
  };

  const handleDeleteStudent = (sid: string) => {
    deleteStudent(sid);
    setSelectedIds((p) => { const n = new Set(p); n.delete(sid); return n; });
    setConfirmDeleteId(null);
    setOpenKebabId(null);
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => deleteStudent(id));
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  };

  const handleBulkMove = (newGroup: string) => {
    if (!newGroup) return;
    selectedIds.forEach((id) => updateStudent(id, { group_name: newGroup }));
    setSelectedIds(new Set());
    setBulkMoveTarget(null);
  };

  const handleTransfer = (sid: string, newGroup: string) => {
    updateStudent(sid, { group_name: newGroup });
    setTransferStudentId(null);
    setOpenKebabId(null);
  };

  const studentToConfirmDelete = confirmDeleteId ? filtered.find((s) => s.student_id === confirmDeleteId) : null;

  if (!groupName || !decodedGroup) {
    return (
      <div>
        <Link to="/">{T.backToGroups}</Link>
      </div>
    );
  }

  return (
    <div className="group-view">
      <div className="group-view-header">
        <Link to="/" className="no-print">{T.backToGroups}</Link>
        <h2>{decodedGroup}</h2>
        <input
          type="search"
          className="search-input"
          placeholder={T.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={T.search}
        />
      </div>

      <ReportExport groupName={decodedGroup} students={filtered} />

      <section className="add-student-section no-print">
        {showAddStudent ? (
          <form onSubmit={handleAddStudent} className="add-student-form">
            <h3>{T.addStudentToGroup}</h3>
            <label>
              {T.firstName}
              <input
                type="text"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                required
                autoFocus
                aria-label={T.firstName}
              />
            </label>
            <label>
              {T.lastName}
              <input
                type="text"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                required
                aria-label={T.lastName}
              />
            </label>
            <label>
              {T.generalNote}
              <textarea
                value={newGeneralNote}
                onChange={(e) => setNewGeneralNote(e.target.value)}
                rows={2}
                aria-label={T.generalNote}
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary">{T.save}</button>
              <button type="button" onClick={() => setShowAddStudent(false)}>{T.cancel}</button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddStudent(true)}
            className="primary"
          >
            {T.addStudentToGroup}
          </button>
        )}
      </section>

      {studentsInGroup.length === 0 && !showAddStudent ? (
        <p>{T.noStudents}</p>
      ) : null}
      {selectedIds.size > 0 && (
        <div className="bulk-toolbar no-print">
          <span className="bulk-toolbar-label">
            {T.selectedCount.replace('{count}', String(selectedIds.size))}
          </span>
          {bulkMoveTarget === null ? (
            <>
              {otherGroups.length > 0 && (
                <button type="button" className="bulk-action" onClick={() => setBulkMoveTarget('')}>
                  {T.bulkMove}
                </button>
              )}
              <button type="button" className="bulk-action danger" onClick={() => setConfirmBulkDelete(true)}>
                {T.bulkDelete}
              </button>
              <button type="button" className="bulk-action-cancel" onClick={() => setSelectedIds(new Set())}>
                {T.cancel}
              </button>
            </>
          ) : (
            <span className="action-group">
              <select
                value={bulkMoveTarget}
                onChange={(e) => { const v = e.target.value; if (v) handleBulkMove(v); else setBulkMoveTarget(null); }}
                autoFocus
              >
                <option value="">{state.lang === 'he' ? 'בחר קבוצה' : 'Select group'}</option>
                {otherGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <button type="button" onClick={() => setBulkMoveTarget(null)}>{T.cancel}</button>
            </span>
          )}
        </div>
      )}

      {studentsInGroup.length > 0 ? (
        <>
          <p className="section-explanation">{T.twoLowestSkillsExpl}</p>
          <div className="table-wrap">
          <table className="group-table">
            <thead>
              <tr>
                <th className="group-table-checkbox no-print">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((s) => selectedIds.has(s.student_id))}
                    onChange={selectAll}
                    aria-label={T.bulkSelect}
                  />
                </th>
                <th className="group-table-index">#</th>
                <th>{state.lang === 'he' ? 'שם' : 'Name'}</th>
                <th>{T.lastAssessment}</th>
                <th>{T.twoLowestSkills}</th>
                <th className="no-print">{state.lang === 'he' ? 'פעולות' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => {
                const last = getLastAssessmentDate(s.student_id);
                const two = getTwoLowestSkills(s.student_id);
                const twoStr = two
                  .map((t) => `${skillName(t.skillId)} (${t.score})`)
                  .join(', ') || '—';
                const isTransfer = transferStudentId === s.student_id;
                const kebabOpen = openKebabId === s.student_id;
                const isSelected = selectedIds.has(s.student_id);
                return (
                  <tr key={s.student_id} className={isSelected ? 'row-selected' : ''}>
                    <td className="group-table-checkbox no-print">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(s.student_id)}
                        aria-label={T.bulkSelect}
                      />
                    </td>
                    <td className="group-table-index">{idx + 1}</td>
                    <td className="group-table-name" title={getStudentDisplayName(s)}>
                      <Link to={`/kid/${s.student_id}`}>{getStudentDisplayName(s)}</Link>
                    </td>
                    <td className="group-table-date">{formatDate(last)}</td>
                    <td className="group-table-focus" title={twoStr}>{twoStr}</td>
                    <td className="group-table-actions no-print">
                      <span className="action-group">
                        <Link to={`/kid/${s.student_id}`} className="button primary">
                          {T.newAssessmentButton}
                        </Link>
                        {isTransfer && otherGroups.length > 0 ? (
                          <span className="action-group">
                            <select
                              value=""
                              onChange={(e) => { const v = e.target.value; if (v) handleTransfer(s.student_id, v); }}
                              onBlur={() => setTransferStudentId(null)}
                              autoFocus
                            >
                              <option value="">{state.lang === 'he' ? 'בחר קבוצה' : 'Select'}</option>
                              {otherGroups.map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                            <button type="button" onClick={() => setTransferStudentId(null)}>{T.cancel}</button>
                          </span>
                        ) : (
                          <KebabMenu
                            open={kebabOpen}
                            onClose={() => setOpenKebabId(null)}
                            onToggle={() => setOpenKebabId(kebabOpen ? null : s.student_id)}
                            triggerLabel={state.lang === 'he' ? 'פעולות' : 'Actions'}
                          >
                            <button type="button" onClick={() => { setTransferStudentId(s.student_id); setOpenKebabId(null); }}>
                              {T.transferToGroup}
                            </button>
                            <button type="button" className="danger" onClick={() => { setConfirmDeleteId(s.student_id); setOpenKebabId(null); }}>
                              {T.deleteStudent}
                            </button>
                          </KebabMenu>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      ) : null}

      <ConfirmDialog
        open={!!studentToConfirmDelete}
        title={T.deleteStudent}
        message={studentToConfirmDelete ? T.confirmDeleteStudentMessage : ''}
        confirmLabel={T.delete}
        cancelLabel={T.cancel}
        onConfirm={() => studentToConfirmDelete && handleDeleteStudent(studentToConfirmDelete.student_id)}
        onCancel={() => setConfirmDeleteId(null)}
        danger
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title={T.bulkDelete}
        message={T.confirmBulkDelete.replace('{count}', String(selectedIds.size))}
        confirmLabel={T.delete}
        cancelLabel={T.cancel}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
        danger
      />
    </div>
  );
}
