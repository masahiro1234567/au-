import React, { useState } from 'react';
import { InfoDialog, OtSelect, OtTextField } from './common.jsx';
import { normId, findStaff, checkPassword, savePassword, pwRuleError } from './staff.js';

// ===== オレタブのログイン =====
// その日に初めて：担当者IDとパスワードの両方に担当者ID（例 AUK40212）→ パスワード変更へ → ログイン画面に戻る
// 変更したあと：担当者IDと新しいパスワードでログイン → ポータル
const Warn = () => (
  <svg width="22" height="20" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 2l10 18H2z" fill="#f2c200" stroke="#c99a00" strokeWidth="1.2" strokeLinejoin="round" /><path d="M12 8v6M12 16.5v.5" stroke="#222" strokeWidth="2" strokeLinecap="round" /></svg>
);
const QUESTIONS = ['好きな食べ物は？', 'よく行くお店の名前は？', 'ペットの名前は？'];

export default function OreLogin({ roster, onLogin, say }) {
  const [mode, setMode] = useState('login'); // login ／ change
  const [place, setPlace] = useState('shop');
  const [shopCode, setShopCode] = useState('［拠点コード］');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [staff, setStaff] = useState(null); // パスワード変更中の人
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [q, setQ] = useState('');
  const [ans, setAns] = useState('');

  const NG = '担当者IDまたはパスワードが正しくありません。';
  // ログイン／パスワード変更のどちらでも、まず担当者IDとパスワードを確かめる
  const verify = async () => {
    const key = normId(id);
    if (!key || !pw) { setErr('担当者IDとパスワードを入力して下さい。'); return null; }
    const st = findStaff(roster, key);
    if (!st) { setErr(NG); return null; }
    setBusy(true);
    try { return { st, res: await checkPassword(key, pw) }; } catch (e) { setErr('通信に失敗しました。もう一度お試しください。'); return null; } finally { setBusy(false); }
  };
  const toChange = (st) => { setStaff(st); setP1(''); setP2(''); setQ(''); setAns(''); setMode('change'); };
  const login = async () => {
    const v = await verify();
    if (!v) return;
    if (v.res === 'new') return toChange(v.st); // 今日はじめて → パスワードの初期設定
    if (v.res === 'ok') return onLogin(v.st);
    setErr(NG);
  };
  const openChange = async () => {
    const v = await verify();
    if (!v) return;
    if (v.res === 'ng') return setErr(NG);
    toChange(v.st);
  };
  const runChange = async () => {
    if (!p1 || !p2) return setErr('新パスワードを入力して下さい。');
    if (p1 !== p2) return setErr('新パスワードと新パスワードの確認が一致しません。');
    const r = pwRuleError(p1, staff.id);
    if (r) return setErr(r);
    if (!q) return setErr('秘密の質問を選択して下さい。');
    if (!ans.trim()) return setErr('秘密の質問の答えを入力して下さい。');
    setBusy(true);
    try {
      await savePassword(staff.id, p1);
      setMode('login'); setPw(''); setStaff(null);
      say('パスワードを変更しました。新しいパスワードでログインして下さい');
    } catch (e) { setErr('保存できませんでした。もう一度お試しください。'); }
    setBusy(false);
  };

  return (
    <div className="ot-login">
      {mode === 'login' ? (<>
        <h1>ログイン</h1>
        <div className="ot-login-warn">
          <div><Warn />端末の操作に当たっては、第三者の覗き見が行われないよう周囲の環境にも配慮ください。</div>
          <div><Warn />業務以外の目的で利用することは禁止されています。利用履歴は記録されています。</div>
        </div>
        <div className="ot-login-form">
          <div className="row"><span className="lb">利用場所</span>
            <label className="ot-radio"><input type="radio" name="ot-place" checked={place === 'shop'} onChange={() => setPlace('shop')} />店頭</label>
            <label className="ot-radio"><input type="radio" name="ot-place" checked={place === 'event'} onChange={() => setPlace('event')} />イベント</label>
          </div>
          <label><span className="lb">拠点コード</span><OtTextField label="拠点コード" value={shopCode} onChange={setShopCode} /></label>
          <label><span className="lb">担当者ID</span><OtTextField label="担当者ID" upper value={id} onChange={setId} /></label>
          <label><span className="lb">パスワード</span><OtTextField label="パスワード" password value={pw} onChange={setPw} onEnter={login} /></label>
        </div>
        <button className="ot-login-red" style={{ marginTop: 24 }} disabled={busy} onClick={login}>ログイン</button>
        <div style={{ display: 'flex', gap: 36, marginTop: 22 }}>
          <button className="ot-login-gray" onClick={() => say('練習用では使えません')}>パスワード初期化</button>
          <button className="ot-login-gray" disabled={busy} onClick={openChange}>パスワード変更</button>
        </div>
      </>) : (<>
        <h1 style={{ marginTop: 60 }}>パスワード変更</h1>
        <div className="ot-pwc-form">
          <div><span className="lb">拠点名</span>［拠点コード］　［店舗名］</div>
          <div><span className="lb">担当者</span>{staff.id}　{staff.name}</div>
          <label><span className="lb">新パスワード</span><OtTextField label="新パスワード" password value={p1} onChange={setP1} autoComplete="new-password" /></label>
          <label><span className="lb">新パスワードの確認</span><OtTextField label="新パスワードの確認" password value={p2} onChange={setP2} autoComplete="new-password" /></label>
          <div><span className="lb">秘密の質問</span>
            <OtSelect className="ot-sel" aria-label="秘密の質問" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 340, height: 42 }}>
              <option value="">選択してください</option>
              {QUESTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
            </OtSelect>
          </div>
          <label><span className="lb">秘密の質問の答え</span><input className="ot-inp" value={ans} onChange={(e) => setAns(e.target.value)} /></label>
        </div>
        <div style={{ display: 'flex', gap: 40, marginTop: 26 }}>
          <button className="ot-login-blue" onClick={() => { setMode('login'); setPw(''); setStaff(null); }}>戻る</button>
          <button className="ot-login-red" style={{ width: 220, height: 52, fontWeight: 400 }} disabled={busy} onClick={runChange}>実行</button>
        </div>
        <div className="ot-pwc-rule">【パスワードルール】<br />・文字数は8〜20文字にしてください。<br />・パスワードは英字・数字をそれぞれ1つ以上使用してください。<br />・パスワードは同じ英数字を4回以上連続使用することはできません。<br />・直近4回で使用されていたパスワードは指定できません。</div>
      </>)}
      {err && <InfoDialog text={err} onOk={() => setErr('')} />}
    </div>
  );
}

// ===== 担当者変更（ポータルなどの右上）：担当者IDとパスワードを入れて、上のバーの担当者を切り替える =====
export function StaffDialog({ roster, onOk, onCancel }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = async () => {
    const key = normId(id);
    if (!key || !pw) return setMsg('担当者IDとパスワードを入力して下さい。');
    const st = findStaff(roster, key);
    if (!st) return setMsg('担当者IDまたはパスワードが正しくありません。');
    setBusy(true);
    try {
      const r = await checkPassword(key, pw);
      if (r === 'ok') return onOk(st);
      setMsg(r === 'new' ? 'この担当者IDは本日まだパスワードを設定していません。ログイン画面から設定して下さい。' : '担当者IDまたはパスワードが正しくありません。');
    } catch (e) { setMsg('通信に失敗しました。もう一度お試しください。'); } finally { setBusy(false); }
  };
  return (
    <div className="ot-dim" style={{ zIndex: 85 }}>
      <div className="ot-info" role="dialog" aria-label="担当者変更" style={{ width: 500 }}>
        <div className="ot-info-body" style={{ paddingBottom: 8 }}>
          <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#1e5fd0" /><path d="M20 17v12M20 11v1" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
          <div><div>(ORCMI7023D)</div><div>担当者IDを入力して下さい。</div></div>
        </div>
        <label className="ot-info-row"><span>担当者ID</span><OtTextField label="担当者ID" upper value={id} onChange={setId} /></label>
        <label className="ot-info-row" style={{ paddingBottom: 12 }}><span>パスワード</span><OtTextField label="パスワード" password value={pw} onChange={setPw} /></label>
        {msg && <div className="ot-info-err">{msg}</div>}
        <div className="ot-info-btns"><button disabled={busy} onClick={ok}>OK</button><button onClick={onCancel}>キャンセル</button></div>
      </div>
    </div>
  );
}
