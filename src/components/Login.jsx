import React, { useState } from 'react';
import { ref, get, push, set } from 'firebase/database';
import { dbSet } from '../useFirebase.js';
import { INITIAL_PW } from '../utils.js';
import { db as npDb, ensureAnonAuth } from '../nippou/lib/firebase.js';
import { normName } from '../testStats.js';

function slugId(name) {
  return btoa(unescape(encodeURIComponent(name.trim()))).replace(/=/g, '');
}
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// au navi のログイン：名前＋パスワード
// ・名簿（日報の fp_users）に登録された人だけ入れる。名簿にない名前は「申請」として登録し、管理者の承認を待つ
// ・初回（自分のパスワードをまだ決めていない人）は初回用パスワードで入り、自分のパスワードを設定する
export default function Login({ onLogin, profiles, notice }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('login'); // login / setpw
  const [pending, setPending] = useState(null); // { uid, u }
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState(null); // { ok, text }
  const [loading, setLoading] = useState(false);

  // 用語集側のプロフィール（テスト結果の記録用）も用意してログイン完了
  const finish = async (uid, u) => {
    const nm = (u.name || name).trim();
    const id = slugId(nm);
    const existing = profiles?.[id];
    if (!existing) await dbSet('user_profiles/' + id, { name: nm, updatedAt: Date.now() });
    const user = { name: nm, id, uid, permission: u.permission || 'edit', pos: existing?.pos || '', closerRank: existing?.closerRank || '' };
    try {
      await set(push(ref(npDb, 'fp_login_logs')), { uid, name: nm, loginAt: Date.now(), loginAtStr: new Date().toLocaleString('ja-JP'), via: 'au navi' });
      await set(ref(npDb, `fp_users/${uid}/lastLogin`), Date.now());
    } catch { /* 記録に失敗してもログインは続ける */ }
    localStorage.setItem('autest_user', JSON.stringify(user));
    onLogin(user);
  };

  const doLogin = async () => {
    const nm = name.trim();
    if (!nm || !password) return setMsg({ ok: false, text: '名前とパスワードを入力してください' });
    setLoading(true); setMsg(null);
    try {
      await ensureAnonAuth();
      const snap = await get(ref(npDb, 'fp_users'));
      let entry = null;
      // 同じ名前（スペース・全角半角の違いは無視）が複数あるときは、最後にログインしたものを使う
      snap.forEach((c) => { const u = c.val(); if (u && normName(u.name) === normName(nm) && (!entry || (u.lastLogin || u.createdAt || 0) > (entry[1].lastLogin || entry[1].createdAt || 0))) entry = [c.key, u]; });
      if (!entry) {
        if (password !== INITIAL_PW) { setMsg({ ok: false, text: '名前またはパスワードが違います' }); }
        else {
          await set(push(ref(npDb, 'fp_users')), { name: nm, permission: 'pending', createdAt: Date.now(), via: 'au navi' });
          setMsg({ ok: true, text: '利用申請を送りました。管理者の承認後にログインできます。' });
        }
      } else {
        const [uid, u] = entry;
        if (u.permission === 'disabled') setMsg({ ok: false, text: 'このアカウントはログインが禁止されています' });
        else if (u.permission === 'pending') setMsg({ ok: true, text: '利用申請の承認待ちです。承認されるまでお待ちください。' });
        else if (!u.pwHash) {
          if (password !== INITIAL_PW) setMsg({ ok: false, text: '初回は初回用のパスワードでログインしてください' });
          else { setPending({ uid, u }); setStep('setpw'); }
        } else if ((await sha256(`${u.pwSalt || uid}:${password}`)) !== u.pwHash) setMsg({ ok: false, text: '名前またはパスワードが違います' });
        else await finish(uid, u);
      }
    } catch (e) {
      setMsg({ ok: false, text: 'エラー：' + e.message });
    }
    setLoading(false);
  };

  const savePw = async () => {
    if (pw1.length < 6) return setMsg({ ok: false, text: 'パスワードは6文字以上にしてください' });
    if (pw1 !== pw2) return setMsg({ ok: false, text: '確認用のパスワードが一致しません' });
    if (pw1 === INITIAL_PW) return setMsg({ ok: false, text: '初回用とは別のパスワードにしてください' });
    setLoading(true);
    try {
      await set(ref(npDb, `fp_users/${pending.uid}/pwHash`), await sha256(`${pending.uid}:${pw1}`));
      await set(ref(npDb, `fp_users/${pending.uid}/pwSalt`), null);
      await finish(pending.uid, pending.u);
    } catch (e) { setMsg({ ok: false, text: 'エラー：' + e.message }); }
    setLoading(false);
  };

  return (
    <div className="page">
      <div className="hdr"><div className="logo"><div className="logo-mark">au</div><h1>au navi</h1></div></div>
      <div className="t-body">
        <div style={{ textAlign: 'center', padding: '20px 0 18px' }}>
          <div className="fw8" style={{ fontSize: '1.15rem' }}>{step === 'login' ? 'ログイン' : 'パスワードの設定'}</div>
          <div className="ts mt8">{step === 'login' ? '名前とパスワードを入力してください' : '次回から使う、自分のパスワードを決めてください'}</div>
        </div>
        {notice && <div className="au-login-msg ng" style={{ marginTop: 0, marginBottom: 12 }}>{notice}</div>}
        <div className="t-card">
          {step === 'login' ? (<>
            <div className="form-group"><label>名前 <span className="req">*</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：山田 太郎" autoComplete="username" /></div>
            <div className="form-group"><label>パスワード <span className="req">*</span></label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" onKeyDown={(e) => e.key === 'Enter' && doLogin()} /></div>
            <button className="tbtn tbtn-primary mt13" disabled={loading} onClick={doLogin}>{loading ? '確認中...' : 'ログイン'}</button>
            <div className="au-login-note">名簿に登録されている名前で入ってください。初めての方は初回用のパスワードで入ると、自分のパスワードを設定する画面に進みます。名簿にない名前で初回用のパスワードを入れると、利用申請になります。</div>
          </>) : (<>
            <div className="form-group"><label>新しいパスワード（6文字以上）</label>
              <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password" /></div>
            <div className="form-group"><label>確認のため、もう一度</label>
              <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" onKeyDown={(e) => e.key === 'Enter' && savePw()} /></div>
            <button className="tbtn tbtn-primary mt13" disabled={loading} onClick={savePw}>{loading ? '保存中...' : '設定してはじめる'}</button>
          </>)}
          {msg && <div className={`au-login-msg ${msg.ok ? 'ok' : 'ng'}`}>{msg.text}</div>}
        </div>
      </div>
    </div>
  );
}
