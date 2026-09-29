import { createContext, useContext, useEffect } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import './np.css';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ensureAnonAuth } from './lib/firebase';
import NpHome from './pages/NpHome';
import FrameForm from './pages/FrameForm';
import FrameList from './pages/FrameList';
import FrameDetail from './pages/FrameDetail';
import Stats from './pages/Stats';
import Personal from './pages/Personal';
import Stores from './pages/Stores';
import Kpi from './pages/Kpi';
import Admin from './pages/Admin';

// au navi の中で日報の画面を動かす入れ物（画面の行き来は日報の中だけで完結させる）
const ShellContext = createContext({ onExit: () => {}, exitLabel: 'ホーム', startPath: '/' });
export const useNpShell = () => useContext(ShellContext);

const ROUTES = (
  <>
    <Route path="/" element={<NpHome />} />
    <Route path="/report/new" element={<FrameForm />} />
    <Route path="/report/pick" element={<FrameList pick />} />
    <Route path="/report/frame/:id" element={<FrameForm />} />
    <Route path="/reports" element={<FrameList />} />
    <Route path="/frames/:id" element={<FrameDetail />} />
    <Route path="/stats" element={<Stats />} />
    <Route path="/stores" element={<Stores />} />
    <Route path="/kpi" element={<Kpi />} />
    <Route path="/personal" element={<Personal />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </>
);

// startPath：最初に開く画面（ホームの「KPI」から来たときは '/kpi'）
export default function NippouApp({ user, isAdmin, onExit, onAdmin, startPath = '/' }) {
  useEffect(() => { ensureAnonAuth(); }, []);
  return (
    <ShellContext.Provider value={{ onExit, exitLabel: 'ホーム', startPath }}>
      <AuthProvider user={user} isAdmin={isAdmin} onAdmin={onAdmin}>
        <ToastProvider>
          <MemoryRouter initialEntries={[startPath]}>
            <Routes>{ROUTES}</Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ShellContext.Provider>
  );
}

// 管理画面の「日報管理」タブの中身。編集・詳細の画面もこの中で開く
function AdminHome() { return <Admin />; }
export function NippouAdmin({ user }) {
  useEffect(() => { ensureAnonAuth(); }, []);
  return (
    <ShellContext.Provider value={{ onExit: () => {}, exitLabel: '管理画面', startPath: '/' }}>
      <AuthProvider user={user} isAdmin onAdmin={() => {}}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<div className="np"><AdminHome /></div>} />
              <Route path="/report/frame/:id" element={<FrameForm />} />
              <Route path="/frames/:id" element={<FrameDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ShellContext.Provider>
  );
}
