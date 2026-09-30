import React, { useEffect, useState } from 'react';
import { shuffle, suggestByCategory, getTermPaths } from '../utils.js';
import { ConfirmButton } from './ConfirmButton.jsx';
import { MarkOk, MarkNg } from './TestMarks.jsx';

// 出題の作り方
// ・問題の形は2つ：「説明 → 用語を選ぶ」（メイン・約7割）と「用語 → 説明を選ぶ」（約3割）
// ・まちがいの選択肢は、関連用語や同じ知識区分・同じカテゴリの近い用語から選ぶ（見分けないと解けないように）
// ・ランク別のときは、出題する用語はそのランクだけ（選択肢は全用語から）
const CHOICES = 4;
function distractors(id, t, entries, terms) {
  const picked = [];
  const add = (x) => { if (x && x[0] !== id && x[1].name !== t.name && !picked.some((p) => p[1].name === x[1].name)) picked.push(x); };
  const near = [];
  Object.keys(t.related || {}).forEach((rid) => terms[rid] && near.push([rid, terms[rid]]));
  suggestByCategory({ allTerms: terms, excludeId: id, paths: getTermPaths(t), name: t.name, description: t.description, limit: 8 })
    .forEach((r) => near.push([r.id, r.term]));
  entries.filter(([oid, o]) => oid !== id && o.category && o.category === t.category).forEach((x) => near.push(x));
  // 近い用語の上位から少し広めに取り、その中から選ぶ（毎回同じ組み合わせにならないように）
  shuffle(near.slice(0, 8)).forEach(add);
  if (picked.length < CHOICES - 1) shuffle(entries).forEach(add);
  return picked.slice(0, CHOICES - 1);
}
// 説明文に用語名そのものが入っていたら伏せる（答えが丸見えにならないように）
const mask = (text, name) => (name ? String(text || '').split(name).join('〇〇') : String(text || ''));

function buildQuiz(terms, qtype, selRank) {
  const entries = Object.entries(terms).filter(([, t]) => t && t.name && t.description);
  const pool = qtype === 'rank' ? entries.filter(([, t]) => t.rank === selRank) : entries;
  const count = qtype === 'rank' ? 5 : 10;
  if (pool.length < 1 || entries.length < CHOICES) return null;
  return shuffle(pool).slice(0, Math.min(count, pool.length)).map(([id, q]) => ({
    term: q,
    reverse: Math.random() < 0.7,
    choices: shuffle([[id, q], ...distractors(id, q, entries, terms)]).map(([, t]) => t),
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
          <p>問題にできる用語が足りません（説明のある用語が4つ以上必要です）</p>
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

  const done = picked !== null;
  const ok = done && q.choices[picked].name === q.term.name;
  return (
    <div className="page">
      <div className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>{mode === 'practice' ? '練習' : '本番'}テスト</h1></div>
        <div className="hdr-right">
          <ConfirmButton label="終了" message="テストを終了しますか？" onConfirm={onQuit} className="btn-back" />
        </div>
      </div>
      <div className="t-body tq-body">
        <div className="tq-stack">
          <div className="tq-progress">
            <b>問題 {idx + 1} / {total}</b>
            <div className="tq-bar"><i style={{ width: `${(idx / total) * 100}%` }} /></div>
            {q.term.rank && <span className="tq-pill">{q.term.rank}</span>}
          </div>
          <div className="tq-card">
            <div className="tq-kind">{q.reverse ? 'この説明にあてはまる用語はどれ？' : 'この用語の説明として正しいものはどれ？'}</div>
            <div className="tq-q">{q.reverse ? mask(q.term.description, q.term.name) : `「${q.term.name}」`}</div>
          </div>
          <div className="tq-choices">
            {q.choices.map((c, i) => {
              const right = c.name === q.term.name;
              const cls = !done ? '' : right ? 'ok' : i === picked ? 'ng' : 'dim';
              return (
                <button key={i} className={`tq-choice ${cls} ${q.reverse ? 'name' : ''}`} disabled={done} onClick={() => handleAnswer(i)}>
                  <span className="tq-key">{'ABCDE'[i]}</span>
                  <span className="tq-grow">{q.reverse ? c.name : mask(c.description, c.name)}</span>
                  {done && right && <MarkOk size={30} />}
                  {done && !right && i === picked && <MarkNg size={26} />}
                </button>
              );
            })}
          </div>
          {done && (
            <div className="tq-card tq-judge" role="status">
              <div className="tq-judge-h">
                {ok ? <><MarkOk size={52} /><b style={{ color: '#dc2626' }}>正解</b></> : <><MarkNg size={44} /><b style={{ color: '#1d4ed8' }}>不正解</b></>}
              </div>
              {!ok && (<>
                <div className="tq-explain"><b>正解は「{q.term.name}」</b><br />{q.term.description}</div>
                {q.term.note && <div className="tq-explain-sub">補足：{q.term.note}</div>}
                <div className="tq-explain-sub dash">選んだ「{q.choices[picked].name}」は：{q.choices[picked].description}</div>
              </>)}
            </div>
          )}
          {done && <button className="tq-go" onClick={handleNext}>{idx >= quiz.length - 1 ? '結果を見る' : '次の問題へ'}</button>}
        </div>
      </div>
    </div>
  );
}
