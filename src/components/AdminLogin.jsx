import React, { useState } from 'react';
import { ADMIN_PW, showToast } from '../utils.js';

export default function AdminLogin({ onBack, onSuccess }) {
  const [pw, setPw] = useState('');

  const doLogin = () => {
    if (pw === ADMIN_PW) {
      sessionStorage.setItem('isAdmin', '1');
      onSuccess();
    } else {
      showToast('パスワードが違います');
    }
  };

  return (
    <div className="page">
      <div className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>管理者ログイン</h1></div>
        <div className="hdr-right"><button className="btn-back" onClick={onBack}>← 戻る</button></div>
      </div>
      <div className="t-body">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '2rem', marginBottom: 6 }}>🔐</div>
          <div className="fw8">管理者専用</div>
          <div className="ts mt8">パスワードを入力してください</div>
        </div>
        <div className="t-card">
          <div className="form-group">
            <label>管理者パスワード</label>
            <input
              type="password" value={pw} onChange={(e) => setPw(e.target.value)}
              placeholder="パスワードを入力"
              onKeyDown={(e) => e.key === 'Enter' && doLogin()}
            />
          </div>
          <button className="tbtn tbtn-primary mt8" onClick={doLogin}>ログイン</button>
        </div>
      </div>
    </div>
  );
}
