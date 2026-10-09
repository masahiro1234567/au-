import { createContext, useContext } from 'react';
import { anyDayEditors, kpiDirectors } from '../lib/kpiLink';
import { useFirebaseList } from '../lib/useFirebaseList';
const nn = (s) => String(s || '').normalize('NFKC').replace(/[\s　]/g, '');

// au navi のログイン情報を日報の画面へ渡す橋渡し
// user：{ name, uid（fp_usersのID）, permission }、isAdmin：管理者パスワードでログイン中か
const AuthContext = createContext({ user: null, isAdmin: false });

export function AuthProvider({ user, isAdmin, onAdmin, children }) {
  // KPI（どの日に誰がディレクターか）を読み取って、編集権限を自動で付ける
  const { data: kpiData } = useFirebaseList('fp_kpi');
  const isMe = (n) => !!user && nn(n) === nn(user.name);
  // 日報の編集権限：管理者、またはその日報枠を作った人・その日の記入者・
  // どれかの日のKPIでディレクターに割り当てられている人（自動）・どれかの日の「編集権限」に追加された人（閲覧のみユーザーは不可）
  const canEditReport = (frame) =>
    isAdmin || (user && user.permission !== 'readonly' && (!frame || frame.createdBy === user.name || (frame.days || []).some((d) => d.director === user.name) || frame.director === user.name || frame.userName === user.name
      || (frame.days || []).some((d) => kpiDirectors(kpiData, frame.store, d.date).some(isMe))
      || anyDayEditors(frame).some(isMe)));
  return <AuthContext.Provider value={{ user, isAdmin, onAdmin, canEditReport }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
