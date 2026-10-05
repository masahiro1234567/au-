import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

// ===== オレタブ練習：共通部品 =====
// 画面は 1024×768 の横画面として作り、OreTab.jsx で端末サイズに合わせて縮小・回転する

// ---- 表示の整形：電話番号 090-1234-5678／郵便番号 590-0014／月日 03/12 ----
export function formatValue(type, v) {
  if (!v) return '';
  if (type === 'zip') return v.length > 3 ? v.slice(0, 3) + '-' + v.slice(3) : v;
  if (type === 'tel') {
    if (v.length <= 3) return v;
    if (v.length <= 7) return v.slice(0, 3) + '-' + v.slice(3);
    return v.slice(0, 3) + '-' + v.slice(3, 7) + '-' + v.slice(7);
  }
  if (type === 'md') return v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v;
  return v;
}

export const yen = (v) => (v ? v.toLocaleString('ja-JP') + ' 円' : '- 円');

// ---- 入力欄の状態をまとめて扱うフック ----
// values/setValue を渡せば外部の状態（お支払い目安額のタブ別など）を使える。渡さなければ内部で持つ
// maxLen：数字の欄の桁数（数字以外は入らない）、fmt：表示の整形
export function useForm({ values: extValues, setValue: extSet, maxLen = {}, fmt = {}, labels = {} } = {}) {
  const [inner, setInner] = useState({});
  const [kp, setKp] = useState(null); // キーパッドを開いている欄の名前
  const values = extValues || inner;
  const set = extSet || ((name, v) => setInner((s) => ({ ...s, [name]: v })));
  const get = (name) => values[name] || '';
  const isNumeric = (name) => !!(maxLen[name] || fmt[name]);
  return {
    values, get, set, maxLen, fmt, labels,
    reset: () => { if (!extValues) setInner({}); setKp(null); },
    display: (name) => (fmt[name] ? formatValue(fmt[name], get(name)) : get(name)),
    onChange: (name) => (e) => {
      let v = e.target.value;
      if (isNumeric(name)) {
        v = v.replace(/[^0-9]/g, '');
        if (maxLen[name]) v = v.slice(0, maxLen[name]);
      }
      set(name, v);
    },
    kp, openKp: (name) => setKp(name), closeKp: () => setKp(null),
  };
}

// ---- お知らせ（数秒で消える） ----
export function useToast() {
  const [msg, setMsg] = useState('');
  const t = useRef(null);
  useEffect(() => () => clearTimeout(t.current), []);
  const say = (m) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(''), 1800);
  };
  return { msg, say };
}
export function Toast({ msg }) {
  return msg ? <div className="ot-toast">{msg}</div> : null;
}

// ---- 「手順は完璧です！」の通知 ----
export function SuccessNotice({ title, sub, sub2, onClose }) {
  return (
    <div className="ot-success" role="status">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#16a34a" /><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <div>
        <div className="ot-success-title">{title}</div>
        {sub && <div className="ot-success-sub">{sub}</div>}
        {sub2 && <div className="ot-success-sub2">{sub2}</div>}
      </div>
      <button className="ot-btn" onClick={onClose}>OK</button>
    </div>
  );
}

// ---- アイコン（線画） ----
const S = { stroke: '#4a3528', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
const Ico = ({ children, size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
export const Icons = {
  alert: <Ico><path d="M12 4l9 16H3z" {...S} /><path d="M12 10v4M12 17v.5" {...S} /></Ico>,
  mail: <Ico><rect x="3" y="6" width="18" height="12" rx="2" {...S} /><path d="M3 7l9 6 9-6" {...S} /></Ico>,
  help: <Ico><circle cx="12" cy="12" r="8" {...S} /><circle cx="12" cy="12" r="3" {...S} /></Ico>,
  multi: <Ico><rect x="4" y="4" width="6" height="6" {...S} /><rect x="14" y="4" width="6" height="6" {...S} /><rect x="4" y="14" width="6" height="6" {...S} /><path d="M17 14v6M14 17h6" {...S} /></Ico>,
  manual: <Ico><path d="M4 5h6a2 2 0 012 2v12a2 2 0 00-2-2H4zM20 5h-6a2 2 0 00-2 2v12a2 2 0 012-2h6z" {...S} /></Ico>,
  eye: <Ico><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" {...S} /><circle cx="12" cy="12" r="2.5" {...S} /></Ico>,
  rw: <Ico><rect x="6" y="3" width="12" height="18" rx="2" {...S} /><path d="M4 4l16 16" {...S} /></Ico>,
  sync: <Ico><path d="M20 8a8 8 0 00-14-2M4 16a8 8 0 0014 2M18 3v5h-5M6 21v-5h5" {...S} /></Ico>,
  q: <Ico><circle cx="12" cy="12" r="9" {...S} /><path d="M9.5 9.5a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4M12 17v.5" {...S} /></Ico>,
  x: <Ico><path d="M6 6l12 12M18 6L6 18" {...S} /></Ico>,
  out: <Ico><path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 16l-4-4 4-4M6 12h10" {...S} /></Ico>,
  search: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.6" /><path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>,
  pick: <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="11" height="11" rx="1.5" {...S} strokeWidth="1.9" /><path d="M9 19h9a1 1 0 001-1V9" {...S} strokeWidth="1.9" /></svg>,
  keypad: (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><g fill="#6b5a4e">
      {[5, 11, 17].map((y) => [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
      <circle cx="12" cy="22" r="1.4" />
    </g></svg>
  ),
};

// ---- 上部のバー。right：右側に並べるボタン（'multi','manual','eye','rw','sync','q','x','out'） ----
const RIGHT_LABEL = { multi: 'マルチタスク', manual: 'マニュアル', eye: 'マスク解除', rw: 'RW未接続', sync: '担当者変更', q: 'ヘルプ', x: '閉じる', out: 'ログアウト' };
// ログイン中の担当者（{ id, name }）と「担当者変更」を開く関数。OreTab.jsx で渡す
export const StaffContext = React.createContext({ staff: null, changeStaff: null });
export function TopBar({ right, onMultitask, onClose, onLogout, noop }) {
  const { staff, changeStaff } = React.useContext(StaffContext);
  const handler = (k) => (k === 'multi' ? onMultitask : k === 'x' ? onClose : k === 'out' ? onLogout || noop : k === 'sync' && changeStaff ? changeStaff : noop);
  return (
    <header className="ot-tb">
      <button className="ot-tb-btn" onClick={noop}>{Icons.alert}緊急 0</button>
      <button className="ot-tb-btn" onClick={noop}>{Icons.mail}未読 0</button>
      <button className="ot-tb-btn" onClick={noop}>{Icons.help}応対要請</button>
      {staff ? (
        <div className="ot-tb-staff"><div className="ot-ellipsis">［拠点コード］　［店舗名］</div><div className="ot-ellipsis">{staff.id}　{staff.name}</div></div>
      ) : <span className="ot-tb-practice">練習用</span>}
      <div className="ot-tb-right">
        <button className="ot-tb-ev" onClick={noop}>イベントモード</button>
        {right.map((k) => (
          <button key={k} className="ot-tb-ico" onClick={handler(k)} aria-label={RIGHT_LABEL[k]}>{Icons[k]}{RIGHT_LABEL[k]}</button>
        ))}
      </div>
    </header>
  );
}

// ---- キーパッド付きの入力欄 ----
export function KpField({ form, name, label, style, placeholder, left, align }) {
  const btn = (
    <button type="button" className={`ot-kpb ${left ? 'left' : ''}`} aria-label={`${label}のキーパッドを開く`} onClick={() => form.openKp(name)}>
      {Icons.keypad}
    </button>
  );
  return (
    <div className="ot-kp" style={style}>
      {left && btn}
      <input aria-label={label} inputMode="numeric" placeholder={placeholder} style={align ? { textAlign: align } : undefined}
        value={form.display(name)} onChange={form.onChange(name)} />
      {!left && btn}
    </div>
  );
}

// ---- 携帯のようなテンキー（下から出る） ----
export function Keypad({ form, money }) {
  const cur = form.kp;
  if (!cur) return null;
  const val = form.get(cur);
  const lim = form.maxLen[cur] || 13;
  const put = (v) => form.set(cur, v);
  const disp = form.fmt[cur] ? formatValue(form.fmt[cur], val) : money ? (val ? Number(val).toLocaleString('ja-JP') : '0') : val;
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'クリア', '0', '⌫'];
  const press = (k) => {
    if (k === 'クリア') return put('');
    if (k === '⌫') return put(val.slice(0, -1));
    if (val.length < lim) put(val + k);
  };
  return (
    <div className="ot-ov" onClick={(e) => { if (e.target === e.currentTarget) form.closeKp(); }}>
      <div className="ot-kpanel" role="dialog" aria-label="キーパッド">
        <div className="ot-kpanel-head"><b>{(form.labels[cur] || '') + 'を入力'}</b><button className="ot-btn" style={{ height: 32 }} onClick={form.closeKp}>閉じる</button></div>
        <div className="ot-kdisp">{disp || ' '}</div>
        <div className="ot-kgrid">
          {keys.map((k) => (
            <button key={k} className={`ot-kkey ${k === 'クリア' || k === '⌫' ? 'fn' : ''}`} onClick={() => press(k)}>{k}</button>
          ))}
          <button className="ot-kkey ok" onClick={form.closeKp}>完了</button>
        </div>
      </div>
    </div>
  );
}

// ===== プルダウン（オレタブ用）=====
// スマホを縦持ちで回転表示しているとき、ブラウザ標準のプルダウンは本当の向き（縦）で開いてしまうため、
// 画面の中に選択肢を出す自前のプルダウンを使う。書き方は <select> と同じ（中に <option> を並べる）
export const StageContext = React.createContext(null);

function flattenOptions(children, out = []) {
  React.Children.forEach(children, (c) => {
    if (!c) return;
    if (c.type === React.Fragment) return flattenOptions(c.props.children, out);
    if (c.type === 'option') {
      const label = React.Children.toArray(c.props.children).join('');
      out.push({ value: c.props.value == null ? label : String(c.props.value), label, disabled: !!c.props.disabled });
    }
  });
  return out;
}

// 要素の位置を、舞台（1024×768）の中の座標で求める（回転・縮小の影響を受けないレイアウト上の位置）
function posInStage(el, stage) {
  let x = 0, y = 0, n = el;
  while (n && n !== stage) { x += n.offsetLeft - (n.scrollLeft || 0); y += n.offsetTop - (n.scrollTop || 0); n = n.offsetParent; }
  return { x: x + (el.scrollLeft || 0), y: y + (el.scrollTop || 0), w: el.offsetWidth, h: el.offsetHeight };
}

export function OtSelect({ value, onChange, disabled, style, children, className, ...rest }) {
  const stage = React.useContext(StageContext);
  const [pos, setPos] = useState(null); // 開いているときの一覧の位置
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const opts = flattenOptions(children);
  const cur = opts.find((o) => o.value === String(value ?? '')) || opts.find((o) => !o.disabled) || { label: '' };
  const pick = (v) => { setPos(null); if (onChange) onChange({ target: { value: v } }); };
  const open = () => {
    const b = btnRef.current;
    if (!b) return;
    if (!stage) return setPos({ left: 0, top: b.offsetHeight + 2, width: Math.max(b.offsetWidth, 240), maxH: 320, local: true });
    const p = posInStage(b, stage);
    const H = stage.offsetHeight || 768, W = stage.offsetWidth || 1024;
    const width = Math.min(Math.max(p.w, 240), W - 16);
    const left = Math.min(Math.max(p.x, 8), W - width - 8);
    const below = H - (p.y + p.h) - 10, above = p.y - 10;
    // 下に余裕があれば下に、なければ上に開く（以前の標準プルダウンと同じ出方）
    if (below >= 220 || below >= above) setPos({ left, top: p.y + p.h + 2, width, maxH: Math.min(360, below) });
    else setPos({ left, bottom: H - p.y + 2, width, maxH: Math.min(360, above) });
  };
  useEffect(() => {
    if (!pos || !listRef.current) return;
    const el = listRef.current.querySelector('.on');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [pos]);
  const listStyle = pos && { position: 'absolute', left: pos.left, width: pos.width, maxHeight: pos.maxH, ...(pos.bottom != null ? { bottom: pos.bottom } : { top: pos.top }) };
  const panel = pos && (
    <div className="ot-psel-ov" onClick={(e) => { if (e.target === e.currentTarget) setPos(null); }}>
      <div className="ot-psel" role="listbox" aria-label={rest['aria-label']} ref={listRef} style={listStyle}>
        {opts.map((o, i) => (o.disabled ? (
          <div key={i} className="ot-psel-head">{o.label}</div>
        ) : (
          <button key={i} role="option" aria-selected={o.value === cur.value} className={`ot-psel-opt ${o.value === cur.value ? 'on' : ''}`} onClick={() => pick(o.value)}>
            {o.label || '（空欄）'}
          </button>
        )))}
      </div>
    </div>
  );
  return (
    <>
      <button type="button" ref={btnRef} className={`ot-sel ot-sel-btn ${className || ''}`} style={style} disabled={disabled} aria-label={rest['aria-label']} onClick={open}>
        <span className="ot-ellipsis" style={{ flex: 1, textAlign: 'left' }}>{cur.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="#6b5a4e" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {panel && (stage ? ReactDOM.createPortal(panel, stage) : panel)}
    </>
  );
}

// ---- 実機と同じ形のお知らせ（青い i のダイアログ） ----
export function InfoDialog({ title, text, onOk }) {
  return (
    <div className="ot-dim" style={{ zIndex: 90 }}>
      <div className="ot-info" role="alertdialog" aria-label={title || 'お知らせ'}>
        <div className="ot-info-body">
          <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#1e5fd0" /><path d="M20 17v12M20 11v1" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
          <div>{title && <div style={{ fontWeight: 800 }}>{title}</div>}<div style={{ whiteSpace: 'pre-line' }}>{text}</div></div>
        </div>
        <button className="ot-info-ok" onClick={onOk}>OK</button>
      </div>
    </div>
  );
}
