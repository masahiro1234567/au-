import { createContext, useContext } from 'react';

// au navi のログイン情報を日報の画面へ渡す橋渡し
// user：{ name, uid（fp_usersのID）, permission }、isAdmin：管理者パスワードでログイン中か
const AuthContext = createContext({ user: null, isAdmin: false });

export function AuthProvider({ user, isAdmin, onAdmin, children }) {
  // 日報の編集権限：管理者、またはその日報枠を作った人・その日の記入者（閲覧のみユーザーは不可）
  const canEditReport = (frame) =>
    isAdmin || (user && user.permission !== 'readonly' && (!frame || frame.createdBy === user.name || (frame.days || []).some((d) => d.director === user.name) || frame.director === user.name || frame.userName === user.name));
  return <AuthContext.Provider value={{ user, isAdmin, onAdmin, canEditReport }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
