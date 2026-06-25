import React, { useEffect, useState } from 'react';
import { shuffle } from '../utils.js';

function buildQuiz(terms, qtype, selRank) {
  const all = Object.values(terms);
  const pool = qtype === 'rank' ? all.filter((t) => t.rank === selRank) : all;
  const count = qtype === 'rank' ? 5 : 10;
  if (pool.length < 4) return null;
  return shuffle(pool).slice(0, Math.min(count, pool.length)).map((q) => ({
    term: q,
    choices: shuffle([q, ...shuffle(all.filter((t) => t.name !== q.name)).slice(0, 3)]),
  }));
}

export default function Quiz({ terms, mode, qtype, selRank, onFinish, onQuit }) {
  const [quiz, setQuiz] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    setQuiz(buildQuiz(terms, qtype, selRank));
    setIdx(0); setAnswers([]); setPicked(null);
  }, []); // eslint-disable-line

  if (!quiz) {
    return (
      <div className="page">
        <div className="t-body tc" style={{ paddingTop: 60 }}>
          <p>問題が少なすぎます（最低4問）</p>
          <button className="tbtn tbtn-outline mt13" onClick={onQuit}>戻る</button>
        </div>
      </div>
    );
  }

  const q = quiz[idx];
  const total = quiz.length;

  const handleAnswer = (choiceIdx) => {
    if (picked !== null) return;
    const correct = q.term;
    const isOk = q.choices[choiceIdx].name === correct.name;
    setAnswers((a) => [...a, { term: correct, isCorrect: isOk }]);
    setPicked(choiceIdx);
  };

  const handleNext = () => {
    if (idx >= quiz.length - 1) {
      onFinish(answers);
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  };

  const confirmQuit = () => {
    if (confirm('テストを終了しますか？')) onQuit();
  };

  return (
    <div className="page">
      <div className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>{mode === 'practice' ? '練習' : '本番'}テスト</h1></div>
        <div className="hdr-right">
          <span className={`mode-badge ${mode === 'practice' ? 'mode-practice' : 'mode-official'}`}>
            {mode === 'practice' ? '練習モード' : '本番モード'}
          </span>
          <button className="btn-ghost" onClick={confirmQuit}>終了</button>
        </div>
      </div>
      <div className="t-body">
        <div className="quiz-prog-bar"><div className="quiz-prog-fill" style={{ width: `${(idx / total) * 100}%` }} /></div>
        <div className="quiz-meta">
          <span className="quiz-no">問題 {idx + 1}/{total}</span>
          <span className={`quiz-rbadge badge-rank-${q.term.rank || ''}`}>{q.term.rank}</span>
        </div>
        <div className="t-card" style={{ marginBottom: 12 }}>
          <div className="quiz-q">「{q.term.name}」とは何ですか？</div>
          <div className="quiz-hint">カテゴリ：{q.term.category}</div>
        </div>
        <div className="quiz-choices">
          {q.choices.map((c, i) => {
            let cls = 'choice-btn';
            if (picked !== null) {
              if (c.name === q.term.name) cls += ' correct';
              else if (i === picked) cls += ' wrong';
              else cls += ' reveal';
            }
            return (
              <button key={i} className={cls} disabled={picked !== null} onClick={() => handleAnswer(i)}>
                {c.description}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div style={{ marginTop: 12 }}>
            <button className="tbtn tbtn-primary" onClick={handleNext}>
              {idx >= quiz.length - 1 ? '結果を見る 📊' : '次の問題へ ▶'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
