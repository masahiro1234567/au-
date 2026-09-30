import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNpShell } from '../NippouApp';

// au navi と同じ見た目のヘッダー。日報のトップで「戻る」を押すと au navi のホームへ戻る
export default function Layout({ title, children, footer }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { onExit, exitLabel } = useNpShell();
  const { isAdmin } = useAuth();
  // 日報の中で最初に開いた画面なら、戻るで au navi（または管理画面）へ
  const atRoot = location.key === 'default';
  return (
    <div className="page">
      <header className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>{title}</h1></div>
        <div className="hdr-right">
          {isAdmin && <span className="np-badge-admin">管理者</span>}
          <button className="btn-back" onClick={() => (atRoot ? onExit() : navigate(-1))}>← {atRoot ? exitLabel : '戻る'}</button>
        </div>
      </header>
      <div className="np np-body">{children}</div>
      {footer && <div className="np np-foot">{footer}</div>}
    </div>
  );
}
