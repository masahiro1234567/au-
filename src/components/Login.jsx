import React, { useState } from 'react';
import { dbSet } from '../useFirebase.js';
import { showToast } from '../utils.js';

function slugId(name) {
  return btoa(unescape(encodeURIComponent(name.trim()))).replace(/=/g, '');
}

// 名前＋パスワードのみの簡易ログイン。
// 初めての名前なら、そのパスワードで新規登録。既存の名前ならパスワード一致を確認してログイン。
// 同じ端末なら次回以降はApp.jsx側でlocalStorageから自動的にスキップされる。
export default function Login({ onBack, onLogin, profiles }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (!name.trim() || !password.trim()) return showToast('名前とパスワードを入力してください');
    setLoading(true);
    try {
      const id = slugId(name);
      const existing = profiles?.[id];
      if (existing) {
        if (existing.password !== undefined && existing.password !== password) {
          showToast('パスワードが違います');
          setLoading(false);
          return;
        }
        const user = {
          name: existing.name || name.trim(), id,
          pos: existing.pos || '', closerRank: existing.closerRank || '',
        };
        localStorage.setItem('autest_user', JSON.stringify(user));
        onLogin(user);
      } else {
        const user = { name: name.trim(), id, pos: '', closerRank: '' };
        await dbSet('user_profiles/' + id, { name: name.trim(), password, updatedAt: Date.now() });
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
        <div className="hdr-right"><button className="btn-back" onClick={onBack}>← 戻る</button></div>
      </div>
      <div className="t-body">
        <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 6 }}>📝</div>
          <div className="fw8" style={{ fontSize: '1rem' }}>ログイン</div>
          <div className="ts mt8">初めての方は、名前と好きなパスワードを決めて登録してください</div>
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
              placeholder="初めての方は新しく決めてください"
              onKeyDown={(e) => e.key === 'Enter' && doLogin()}
            />
          </div>
          <button className="tbtn tbtn-primary mt13" disabled={loading} onClick={doLogin}>
            {loading ? '確認中...' : 'ログイン / 登録してはじめる'}
          </button>
        </div>
      </div>
    </div>
  );
}
