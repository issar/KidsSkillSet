import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Dashboard from '../components/Dashboard';

export default function DashboardPage() {
  const { profile, isAdmin, logout } = useAuth();

  return (
    <>
      <div className="dashboard-auth-bar no-print" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>{profile?.email}</span>
        {isAdmin && <Link to="/admin">Admin</Link>}
        <button type="button" onClick={() => logout()}>Log out</button>
      </div>
      <Dashboard />
    </>
  );
}
