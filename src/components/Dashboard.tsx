import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStoreSnapshot } from '../data/store';
import { useT } from '../i18n/translations';
import {
  getGroups,
  getStudents,
  addGroup,
  addStudent,
  renameGroup,
  deleteGroup,
} from '../data/store';
import ImportExport from './ImportExport';
import KebabMenu from './KebabMenu';
import ConfirmDialog from './ConfirmDialog';

function getStudentCountPerGroup(students: ReturnType<typeof getStudents>, groupName: string): number {
  return students.filter((s) => s.group_name === groupName && s.active !== '0').length;
}

export default function Dashboard() {
  const state = useStoreSnapshot();
  const T = useT(state.lang);
  const groups = getGroups();

  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteGroupName, setConfirmDeleteGroupName] = useState<string | null>(null);
  const [openGroupKebabId, setOpenGroupKebabId] = useState<string | null>(null);

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newStudentGroup, setNewStudentGroup] = useState('');
  const [newStudentNote, setNewStudentNote] = useState('');

  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (name) {
      addGroup(name);
      setNewGroupName('');
    }
  };

  const handleStartRename = (group: string) => {
    setEditingGroup(group);
    setEditName(group);
  };

  const handleSaveRename = () => {
    if (editingGroup && editName.trim()) {
      renameGroup(editingGroup, editName.trim());
      setEditingGroup(null);
      setEditName('');
    }
  };

  const handleDeleteGroup = (name: string) => {
    deleteGroup(name);
    setConfirmDeleteGroupName(null);
    setOpenGroupKebabId(null);
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const first = newFirstName.trim();
    const last = newLastName.trim();
    const group = newStudentGroup.trim();
    if (!first || !last || !group) return;
    if (!groups.includes(group)) addGroup(group);
    addStudent({
      first_name: first,
      last_name: last,
      group_name: group,
      general_note: newStudentNote.trim(),
      active: '1',
    });
    setNewFirstName('');
    setNewLastName('');
    setNewStudentGroup('');
    setNewStudentNote('');
    setShowAddStudent(false);
  };

  const allStudents = getStudents();
  const studentCount = allStudents.length;

  return (
    <div className="dashboard">
      <ImportExport />

      <div className="dashboard-counters">
        <span className="counter-badge" title={T.groupsCountExpl}>
          {state.lang === 'he' ? 'קבוצות' : 'Groups'}: <strong>{groups.length}</strong>
          <span className="counter-explanation">{T.groupsCountExpl}</span>
        </span>
        <span className="counter-badge" title={T.studentsCountExpl}>
          {state.lang === 'he' ? 'תלמידים' : 'Students'}: <strong>{studentCount}</strong>
          <span className="counter-explanation">{T.studentsCountExpl}</span>
        </span>
      </div>

      <h2>{T.groups}</h2>
      <p className="section-explanation">{T.groupsExpl}</p>

      {groups.length === 0 ? (
        <p className="dashboard-empty-hint">{T.noGroups}</p>
      ) : null}
      <ul className="groups-list">
          {groups.map((group) => (
            <li key={group}>
              {editingGroup === group ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename();
                      if (e.key === 'Escape') setEditingGroup(null);
                    }}
                    className="search-input"
                    autoFocus
                  />
                  <button type="button" onClick={handleSaveRename} className="primary">
                    {T.save}
                  </button>
                  <button type="button" onClick={() => setEditingGroup(null)}>
                    {T.cancel}
                  </button>
                </>
              ) : (
                <>
                  <Link to={`/group/${encodeURIComponent(group)}`}>
                    {T.groupWithCount.replace('{name}', group).replace('{count}', String(getStudentCountPerGroup(allStudents, group)))}
                  </Link>
                  <div className="group-actions">
                    <button
                      type="button"
                      onClick={() => handleStartRename(group)}
                      title={T.renameGroup}
                      aria-label={T.renameGroup}
                    >
                      ✏️
                    </button>
                    <KebabMenu
                      open={openGroupKebabId === group}
                      onClose={() => setOpenGroupKebabId(null)}
                      onToggle={() => setOpenGroupKebabId(openGroupKebabId === group ? null : group)}
                      triggerLabel={T.profileActions}
                    >
                      <button
                        type="button"
                        className="danger"
                        onClick={() => { setConfirmDeleteGroupName(group); setOpenGroupKebabId(null); }}
                      >
                        {T.deleteGroup}
                      </button>
                    </KebabMenu>
                  </div>
                </>
              )}
            </li>
          ))}
      </ul>

      <div className="add-group-row">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
          placeholder={T.groupName}
          aria-label={T.groupName}
        />
        <button type="button" onClick={handleAddGroup} className="primary">
          {T.addGroup}
        </button>
      </div>

      <section className="add-student-section">
        {showAddStudent ? (
          <form onSubmit={handleAddStudent} className="add-student-form">
            <h3>{T.addStudent}</h3>
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
              {T.groupName}
              <input
                type="text"
                value={newStudentGroup}
                onChange={(e) => setNewStudentGroup(e.target.value)}
                list="dashboard-groups-list"
                required
                placeholder={groups.length ? '' : undefined}
                aria-label={T.groupName}
              />
              <datalist id="dashboard-groups-list">
                {groups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </label>
            <label>
              {T.generalNote}
              <textarea
                value={newStudentNote}
                onChange={(e) => setNewStudentNote(e.target.value)}
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
            {T.addStudent}
          </button>
        )}
      </section>

      <ConfirmDialog
        open={!!confirmDeleteGroupName}
        title={T.deleteGroup}
        message={confirmDeleteGroupName ? T.confirmDeleteGroupMessage : ''}
        confirmLabel={T.delete}
        cancelLabel={T.cancel}
        onConfirm={() => confirmDeleteGroupName && handleDeleteGroup(confirmDeleteGroupName)}
        onCancel={() => setConfirmDeleteGroupName(null)}
        danger
      />
    </div>
  );
}
