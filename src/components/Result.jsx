import React, { useEffect, useState } from 'react';
import { dbPush } from '../useFirebase.js';

export default function Result({ user, mode, qtype, selRank, answers, onHome, onRetry }) {
  const [saveMsg, setSaveMsg] = useState('');

  const score = answers.filter((a) => a.isCorrect).length;
  const total = answers.length;
  const pct = Math.round((score / total) * 100);

  useEffect(() => {
    (async () => {
      try {
        await dbPush('test_results', {
          userId: user.id, userName: user.name, userEmail: user.email,
          userPos: user.pos || '', userCloserRank: user.closerRank || '',
          mode, qtype, rank: qtype === 'rank' ? selRank : 'all',
          score, total, pct,
          detail: answers.map((a) => ({ name: a.term.name, termRank: a.term.rank, correct: a.isCorrect })),
          createdAt: Date.now(),
        });
        setSaveMsg(mode === 'official' ? '✅ 結果を保存しました' : '練習モード（ログのみ記録）');
      } catch {
        setSaveMsg('⚠️ 保存失敗');
      }
    })();
  }, []); // eslint-disable-line

  return (
    <div className="page">
      <div className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>テスト結果</h1></div>
        <div className="hdr-right">
          <span className={`mode-badge ${mode === 'practice' ? 'mode-practice' : 'mode-official'}`}>
            {mode === 'practice' ? '練習モード' : '本番モード'}
          </span>
        </div>
      </div>
      <div className="t-body">
        <div style={{ textAlign: 'center', padding: '18px 0' }}>
          <div className="score-circle">
            <div className="score-num">{score}</div>
            <div className="score-denom">/{total}問</div>
          </div>
          <div className="fw8" style={{ fontSize: '.92rem' }}>
            {pct >= 80 ? '🎉 素晴らしい！' : pct >= 60 ? '👍 まずまず！' : '💪 もう一度挑戦！'}
          </div>
          <div className="ts mt8" style={{ color: mode === 'official' ? 'var(--ryo)' : 'var(--sub)' }}>{saveMsg}</div>
        </div>
        <div className="section-title">振り返り</div>
        <div className="result-list">
          {answers.map((a, i) => (
            <div className={`result-item ${a.isCorrect ? 'ok' : 'ng'}`} key={i}>
              <div className="ri-top">
                <div className="ri-name">{a.term.name}</div>
                <div>{a.isCorrect ? '⭕' : '❌'}</div>
              </div>
              <div className="ri-desc">{a.term.description}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="tbtn tbtn-primary" onClick={onHome}>ホームに戻る</button>
          <button className="tbtn tbtn-outline" onClick={onRetry}>もう一度同じ設定で</button>
        </div>
      </div>
    </div>
  );
}
