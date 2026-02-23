import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { initStore, setStorageKeyForUser } from '../data/store';

export interface Profile {
  id: string;
  email: string | null;
  role: string;
  created_at: string;
}

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  register: (email: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data as Profile;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadTokenRef = useRef(0);

  const loadSession = async (session: Session | null) => {
    const token = ++loadTokenRef.current;
    setLoading(true);

    if (!session?.user) {
      setStorageKeyForUser(null);
      initStore();
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    setStorageKeyForUser(session.user.id);
    initStore();
    setUser(session.user);

    const p = await fetchProfile(session.user.id);
    if (token !== loadTokenRef.current) return;

    setProfile(p);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => loadSession(session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  };

  const register = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setStorageKeyForUser(null);
    initStore();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const value: AuthContextValue = {
    user,
    profile,
    isAdmin: profile?.role === 'admin',
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
