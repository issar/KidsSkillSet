import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStoreSnapshot, setLang } from "./data/store";
import { useT } from "./i18n/translations";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import DashboardPage from "./pages/Dashboard";
import GroupView from "./components/GroupView";
import KidProfile from "./components/KidProfile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import AutoVerifyBanner from "./components/AutoVerifyBanner";
import "./App.css";

const BASENAME = import.meta.env.PROD ? "/empower/skills" : "";

export default function App() {
  const state = useStoreSnapshot();
  const { user, loading } = useAuth();

  const lang = state.lang;
  const T = useT(lang);
  const isRtl = lang === "he";

  return (
    <div className="app" dir={isRtl ? "rtl" : "ltr"}>
      <header className="app-header">
        <h1 className="app-title">{T.appTitle}</h1>
        <LangSwitch />
      </header>

      <AutoVerifyBanner />

      <main className="app-main">
        <BrowserRouter basename={BASENAME}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/"
              element={
                loading ? (
                  <div style={{ padding: "2rem", textAlign: "center" }}>Loading…</div>
                ) : user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Login />
                )
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/group/:groupName"
              element={
                <ProtectedRoute>
                  <GroupView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/kid/:studentId"
              element={
                <ProtectedRoute>
                  <KidProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </main>
    </div>
  );
}

function LangSwitch() {
  const { lang } = useStoreSnapshot();
  const T = useT(lang);

  return (
    <div className="lang-switch">
      <button
        type="button"
        className={lang === "he" ? "active" : ""}
        onClick={() => setLang("he")}
        aria-label="עברית"
      >
        {T.langHebrew}
      </button>

      <button
        type="button"
        className={lang === "en" ? "active" : ""}
        onClick={() => setLang("en")}
        aria-label="English"
      >
        {T.langEnglish}
      </button>
    </div>
  );
}