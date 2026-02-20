import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ProfileRow {
  id: string;
  email: string | null;
  role: string;
  created_at: string;
}

interface KidRow {
  id: string;
  user_id: string;
  name: string | null;
  created_at: string;
}

interface AssessmentRecordRow {
  id: string;
  kid_id: string;
  date: string;
  created_at: string;
}

interface AssessmentEntryRow {
  id: string;
  record_id: string;
  type: string;
  data: unknown;
  created_at: string;
}

export default function AdminDashboard() {
  const { profile, logout } = useAuth();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [kids, setKids] = useState<KidRow[]>([]);
  const [records, setRecords] = useState<AssessmentRecordRow[]>([]);
  const [entries, setEntries] = useState<AssessmentEntryRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('profiles').select('id, email, role, created_at').order('created_at', { ascending: false });
      setLoadingUsers(false);
      if (error) return;
      setUsers((data as ProfileRow[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setKids([]);
      setRecords([]);
      setEntries([]);
      return;
    }
    setLoadingData(true);
    (async () => {
      const { data: kidsData } = await supabase.from('kids').select('id, user_id, name, created_at').eq('user_id', selectedUserId);
      setKids((kidsData as KidRow[]) ?? []);
      setRecords([]);
      setEntries([]);
      setLoadingData(false);
    })();
  }, [selectedUserId]);

  useEffect(() => {
    if (kids.length === 0) return;
    const kidIds = kids.map((k) => k.id);
    (async () => {
      const { data: recData } = await supabase.from('assessment_records').select('id, kid_id, date, created_at').in('kid_id', kidIds);
      setRecords((recData as AssessmentRecordRow[]) ?? []);
    })();
  }, [kids]);

  useEffect(() => {
    if (records.length === 0) return;
    const recordIds = records.map((r) => r.id);
    (async () => {
      const { data: entData } = await supabase.from('assessment_entries').select('id, record_id, type, data, created_at').in('record_id', recordIds);
      setEntries((entData as AssessmentEntryRow[]) ?? []);
    })();
  }, [records]);

  return (
    <div style={{ padding: '1rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Admin</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>{profile?.email}</span>
          <Link to="/dashboard">Dashboard</Link>
          <button type="button" onClick={() => logout()}>Log out</button>
        </div>
      </div>

      {loadingUsers ? (
        <p>Loading users…</p>
      ) : (
        <>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Select user</label>
          <select
            value={selectedUserId ?? ''}
            onChange={(e) => setSelectedUserId(e.target.value || null)}
            style={{ padding: '0.5rem', minWidth: 260, marginBottom: '1.5rem' }}
          >
            <option value="">—</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email ?? u.id} {u.role === 'admin' ? '(admin)' : ''}
              </option>
            ))}
          </select>

          {selectedUserId && (
            <>
              {loadingData ? (
                <p>Loading data…</p>
              ) : (
                <>
                  <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Kids</h2>
                  {kids.length === 0 ? (
                    <p style={{ color: 'var(--color-muted)', marginBottom: '1rem' }}>No kids for this user.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1rem' }}>
                      {kids.map((k) => (
                        <li key={k.id} style={{ padding: '0.25rem 0' }}>{k.name ?? k.id}</li>
                      ))}
                    </ul>
                  )}

                  <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Assessment records</h2>
                  {records.length === 0 ? (
                    <p style={{ color: 'var(--color-muted)', marginBottom: '1rem' }}>No assessment records.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1rem' }}>
                      {records.map((r) => {
                        const kid = kids.find((k) => k.id === r.kid_id);
                        return (
                          <li key={r.id} style={{ padding: '0.25rem 0', fontSize: '0.9rem' }}>
                            {kid?.name ?? r.kid_id} — {r.date}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Assessment entries</h2>
                  {entries.length === 0 ? (
                    <p style={{ color: 'var(--color-muted)' }}>No assessment entries.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      {entries.map((e) => (
                        <li key={e.id} style={{ padding: '0.25rem 0', fontSize: '0.85rem' }}>
                          {e.type}: {JSON.stringify(e.data)}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
