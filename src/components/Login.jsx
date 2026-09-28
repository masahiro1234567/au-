import React, { useState } from 'react';
import { dbSet } from '../useFirebase.js';
import { showToast, TEST_LOGIN_PW } from '../utils.js';

function slugId(name) {
  return btoa(unescape(encodeURIComponent(name.trim()))).replace(/=/g, '');
}

// 名前＋共通パスワード（orinavi.au）でログイン。
// 名前が初めてなら新規プロフィールを作成、既存の名前ならそのプロフィールを読み込む。
// 同じ端末なら次回以降はApp.jsx側でlocalStorageから自動的にスキップされる。
export default function Login({ onBack, onLogin, profiles }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (!name.trim() || !password.trim()) return showToast('名前とパスワードを入力してください');
    if (password !== TEST_LOGIN_PW) return showToast('パスワードが違います');
    setLoading(true);
    try {
      const id = slugId(name);
      const existing = profiles?.[id];
      if (existing) {
        const user = {
          name: existing.name || name.trim(), id,
          pos: existing.pos || '', closerRank: existing.closerRank || '',
        };
        localStorage.setItem('autest_user', JSON.stringify(user));
        onLogin(user);
      } else {
        const user = { name: name.trim(), id, pos: '', closerRank: '' };
        await dbSet('user_profiles/' + id, { name: name.trim(), updatedAt: Date.now() });
        localStorage.setItem('autest_user', JSON.stringify(user));
        onLogin(user);
      }
    } catch (e) {
      showToast('エラー: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <div className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>用語テスト</h1></div>
        <div className="hdr-right">{onBack && <button className="btn-back" onClick={onBack}>← 戻る</button>}</div>
      </div>
      <div className="t-body">
        <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 6 }}>📝</div>
          <div className="fw8" style={{ fontSize: '1rem' }}>ログイン</div>
          <div className="ts mt8">名前と共通パスワードを入力してください</div>
        </div>
        <div className="t-card">
          <div className="form-group">
            <label>名前 <span className="req">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：山田 太郎" />
          </div>
          <div className="form-group">
            <label>パスワード <span className="req">*</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="共通パスワードを入力"
              onKeyDown={(e) => e.key === 'Enter' && doLogin()}
            />
          </div>
          <button className="tbtn tbtn-primary mt13" disabled={loading} onClick={doLogin}>
            {loading ? '確認中...' : 'ログインしてはじめる'}
          </button>
        </div>
      </div>
    </div>
  );
}
