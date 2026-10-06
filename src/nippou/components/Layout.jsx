import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNpShell } from '../NippouApp';
import { onAppBack } from '../../backStack.js';
import { ManualButton, nippouManualKey } from '../../manual/Manual.jsx';

// au navi と同じ見た目のヘッダー。日報のトップで「戻る」を押すと au navi のホームへ戻る
export default function Layout({ title, children, footer }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { onExit, exitLabel } = useNpShell();
  const { isAdmin } = useAuth();
  // 日報の中で最初に開いた画面なら、戻るで au navi（または管理画面）へ
  const atRoot = location.key === 'default';
  // ブラウザの「戻る」（タッチパッドのスワイプなど）：日報の中の前の画面に戻る。最初の画面なら au navi に戻る
  useEffect(() => onAppBack(() => { if (atRoot) return false; navigate(-1); return true; }), [atRoot, navigate]);
  return (
    <div className="page">
      <header className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>{title}</h1></div>
        <div className="hdr-right">
          {isAdmin && <span className="np-badge-admin">管理者</span>}
          <button className="btn-back" onClick={() => (atRoot ? onExit() : navigate(-1))}>← {atRoot ? exitLabel : '戻る'}</button>
          <ManualButton screen={nippouManualKey(location.pathname, title)} />
        </div>
      </header>
      <div className="np np-body">{children}</div>
      {footer && <div className="np np-foot">{footer}</div>}
    </div>
  );
}
