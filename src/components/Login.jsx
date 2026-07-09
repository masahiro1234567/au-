import React, { useState } from 'react';
import { dbSet, dbRemove } from '../useFirebase.js';
import { showToast } from '../utils.js';

const POSITIONS = ['NV', 'IN', 'SAM', 'MQ'];
const RANKS = ['秀', '優', '良', '可'];

export default function Login({ onBack, onLogin, onAdminLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pos, setPos] = useState('');
  const [closerRank, setCloserRank] = useState('');

  const doLogin = async () => {
    if (!name.trim() || !email.trim()) return showToast('名前とメールは必須です');
    if (!email.includes('@')) return showToast('正しいメールアドレスを入力してください');
    if (!pos) return showToast('役職を選択してください');
    if (!closerRank) return showToast('クローザーランクを選択してください');

    const id = btoa(unescape(encodeURIComponent(email))).replace(/=/g, '');
    const user = { name, email, id, pos, closerRank };
    localStorage.setItem('autest_user', JSON.stringify(user));
    try {
      await dbSet('user_profiles/' + id, { name, email, pos, closerRank, updatedAt: Date.now() });
    } catch { /* noop */ }
    onLogin(user);
  };

  return (
    <div className="page">
      <div className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>用語テスト</h1></div>
        <div className="hdr-right"><button className="btn-back" onClick={onBack}>← 用語集</button></div>
      </div>
      <div className="t-body">
        <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 6 }}>📝</div>
          <div className="fw8" style={{ fontSize: '1rem' }}>はじめまして！</div>
          <div className="ts mt8">名前・役職・クローザーランクを登録してください</div>
        </div>
        <div className="t-card">
          <div className="form-group">
            <label>名前 <span className="req">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：山田 太郎" />
          </div>
          <div className="form-group">
            <label>メールアドレス <span className="req">*</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="例：taro@example.com" />
          </div>
          <div className="form-group">
            <label>役職 <span className="req">*</span></label>
            <div className="pos-select-row">
              {POSITIONS.map((p) => (
                <div className="pos-opt" key={p}>
                  <input type="radio" name="login-pos" id={`lp-${p}`} checked={pos === p} onChange={() => setPos(p)} />
                  <label htmlFor={`lp-${p}`}>{p}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>クローザーランク <span className="req">*</span></label>
            <div className="rank-select-row">
              {RANKS.map((r) => (
                <div className="rank-opt" data-rank={r} key={r}>
                  <input type="radio" name="login-rank" id={`lr-${r}`} checked={closerRank === r} onChange={() => setCloserRank(r)} />
                  <label htmlFor={`lr-${r}`}>{r}</label>
                </div>
              ))}
            </div>
          </div>
          <button className="tbtn tbtn-primary mt13" onClick={doLogin}>登録してはじめる</button>
        </div>
      </div>
    </div>
  );
}
