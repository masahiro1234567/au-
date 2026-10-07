import React, { useEffect, useState } from 'react';
import { dbPush } from '../useFirebase.js';
import { MarkOk, MarkNg } from './TestMarks.jsx';

export default function Result({ user, mode, qtype, selRank, answers, onHome, onRetry }) {
  const [saveMsg, setSaveMsg] = useState('');

  const score = answers.filter((a) => a.isCorrect).length;
  const total = answers.length;
  const pct = Math.round((score / total) * 100);

  useEffect(() => {
    (async () => {
      try {
        await dbPush('test_results', {
          userId: user.id, userName: user.name,
          userPos: user.pos || '', userCloserRank: user.closerRank || '',
          mode: 'official', qtype, rank: qtype === 'all' ? 'all' : selRank,
          score, total, pct,
          detail: answers.map((a) => ({ name: a.term.name, termRank: a.term.rank, correct: a.isCorrect })),
          createdAt: Date.now(),
        });
        setSaveMsg('結果を保存しました。進捗とランキングに反映されます');
      } catch {
        setSaveMsg('結果を保存できませんでした');
      }
    })();
  }, []); // eslint-disable-line

  return (
    <div className="page">
      <div className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>テスト結果</h1></div>
        <div className="hdr-right" />
      </div>
      <div className="t-body tq-body">
        <div className="tq-stack">
          <div className="tq-card tq-score">
            <div className="tq-lbl" style={{ marginBottom: 0 }}>{qtype === 'rank' ? `${selRank}ランク` : qtype === 'notyet' ? `未出題（${selRank}）` : '全範囲'}・{total}問</div>
            <div className="tq-score-num">{score}<span> / {total}問</span></div>
            <div className="tq-score-pct">正答率 {pct}%</div>
            {saveMsg && <div className="tq-score-msg saved">{saveMsg}</div>}
          </div>
          <div className="tq-card">
            <div className="tq-lbl" style={{ marginBottom: 0 }}>振り返り</div>
            {answers.map((a, i) => (
              <div className="tq-row top" key={i}>
                {a.isCorrect ? <MarkOk size={24} /> : <MarkNg size={20} />}
                <div className="tq-grow"><b>{a.term.name}</b><div className="tq-sub" style={{ lineHeight: 1.6, marginTop: 2 }}>{a.term.description}</div></div>
              </div>
            ))}
          </div>
          <button className="tq-go" onClick={onRetry}>もう一度同じ設定で</button>
          <button className="tq-sub-btn" onClick={onHome}>テストのトップへ</button>
        </div>
      </div>
    </div>
  );
}
