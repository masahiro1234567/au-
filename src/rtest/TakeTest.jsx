import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDbCollection, dbSet } from '../useFirebase.js';
import { useFirebaseList } from '../nippou/lib/useFirebaseList.js';
import { nameKey } from '../testStats.js';
import { normName } from '../evalSheets.js';
import { showToast } from '../utils.js';
import { onAppBack } from '../backStack.js';
import { AutoTA } from '../components/EvalEditors.jsx';
import { normTest, isTarget, isOpen, isAnswered, allQuestions, autoGrade, computeTotals, testMax, maxOf, blankSegments, splitAns, QTYPE_LABEL, MANUAL_TYPES, mdLabel } from './core.js';
import './rtest.css';

const arr = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []);
const fmtDay = (t) => { if (!t) return ''; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };

// ===== 1問ぶんの入力欄（答え方ごと）=====
export function QuestionInput({ q, value, onChange, locked }) {
  const v = value;
  const set = (k, x) => onChange({ ...(v || {}), [k]: x });
  if (q.type === 'blank') {
    return (
      <>
        <div className="rt-sentence">{blankSegments(q.text).map((s, i) => (s.text != null ? <span key={i}>{s.text}</span>
          : <span key={i} className={`rt-chip ${(v || {})[s.blank] ? 'f' : ''}`}>{(v || {})[s.blank] || s.blank}</span>))}</div>
        <div className="rt-bgrid">
          {q.blanks.map((b) => (b.mode === 'choice' ? (
            <div key={b.id} className="rt-bf wide"><b>{b.id}</b>
              {splitAns(b.choices).map((c) => <button key={c} type="button" disabled={locked} className={`rt-opt ${(v || {})[b.id] === c ? 'on' : ''}`} onClick={() => set(b.id, c)}>{c}</button>)}
            </div>
          ) : (
            <label key={b.id} className="rt-bf"><b>{b.id}</b>
              <input className="rt-inp" disabled={locked} inputMode={b.mode === 'num' ? 'decimal' : 'text'} aria-label={b.id} value={(v || {})[b.id] || ''} onChange={(e) => set(b.id, e.target.value)} />
              {b.unit && <span>{b.unit}</span>}
            </label>
          )))}
        </div>
      </>
    );
  }
  if (q.type === 'ox') {
    return (
      <div className="rt-oxlist">
        {q.items.map((it, i) => (
          <div key={it.id} className="rt-oxrow">
            <span className="rt-no">{i + 1}</span><span className="rt-grow">{it.text}</span>
            {[['o', '〇', 'まる'], ['x', '×', 'ばつ']].map(([k, l, aria]) => (
              <button key={k} type="button" disabled={locked} aria-label={aria} aria-pressed={(v || {})[it.id] === k} className={`rt-ox ${(v || {})[it.id] === k ? 'on' : ''}`} onClick={() => set(it.id, k)}>{l}</button>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (q.type === 'short') {
    return (
      <div className="rt-fields">
        {q.fields.map((f) => (
          <label key={f.id} className="rt-bf">{f.label && <b className="lbl">{f.label}</b>}
            <input className="rt-inp" disabled={locked} inputMode={f.mode === 'num' ? 'decimal' : 'text'} aria-label={f.label || '回答'} value={(v || {})[f.id] || ''} onChange={(e) => set(f.id, e.target.value)} />
            {f.unit && <span>{f.unit}</span>}
          </label>
        ))}
      </div>
    );
  }
  if (q.type === 'multi') {
    const need = Math.max(1, +q.need || 1);
    const list = arr(v).length ? arr(v) : Array(need).fill('');
    return (
      <div className="rt-fields">
        <div className="rt-hint">1つの欄に1つずつ書いてください（{need}つ以上）</div>
        {list.map((x, i) => (
          <label key={i} className="rt-bf"><b>{i + 1}</b>
            <input className="rt-inp" disabled={locked} aria-label={`${i + 1}つ目`} value={x || ''} onChange={(e) => { const n = [...list]; n[i] = e.target.value; onChange(n); }} />
          </label>
        ))}
        {!locked && <button type="button" className="rt-btn sm" onClick={() => onChange([...list, ''])}>＋ もう1つ書く</button>}
      </div>
    );
  }
  if (q.type === 'order') {
    const picked = arr(v);
    // 選択肢の並びは、問題ごとに決まった順でまぜる（正解の順のまま出さない）
    const shown = [...q.options].sort((a, b) => (hash(q.id + a) - hash(q.id + b)));
    return (
      <div className="rt-fields">
        <div className="rt-hint">順番に押していってください</div>
        <div className="rt-ordbox">
          {!picked.length && <span className="rt-hint">まだ選んでいません</span>}
          {picked.map((o, i) => <div key={o} className="rt-orditem"><b>{i + 1}</b>{o}</div>)}
        </div>
        <div className="rt-wrap">{shown.filter((o) => !picked.includes(o)).map((o) => <button key={o} type="button" disabled={locked} className="rt-opt" onClick={() => onChange([...picked, o])}>{o}</button>)}</div>
        {!locked && picked.length > 0 && <button type="button" className="rt-btn sm" onClick={() => onChange([])}>やり直す</button>}
      </div>
    );
  }
  if (q.type === 'case') {
    return (
      <div className="rt-fields">
        {q.info && <div className="rt-case">{q.info}</div>}
        {q.fields.map((f) => (
          <label key={f.id} className="rt-col"><span className="lbl">{f.label}</span>
            <AutoTA className="rt-ta" rows={2} disabled={locked} value={(v || {})[f.id] || ''} onChange={(e) => set(f.id, e.target.value)} />
          </label>
        ))}
      </div>
    );
  }
  return <AutoTA className="rt-ta" rows={3} disabled={locked} placeholder="ここに回答" aria-label="回答" value={v || ''} onChange={(e) => onChange(e.target.value)} />;
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

// ===== 解く画面 =====
export function TestRunner({ test, rec, onSave, onSubmit, onClose, preview }) {
  const [ans, setAns] = useState(() => (rec && rec.answers) || {});
  const [sec, setSec] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const top = useRef(null);
  const qs = allQuestions(test);
  const done = qs.filter((q) => isAnswered(q, ans[q.id])).length;
  const s = test.sections[sec];
  const left = qs.length - done;

  const save = async (quiet) => {
    if (preview) { setDirty(false); if (!quiet) showToast('確認用なので保存しません'); return; }
    await onSave(ans); setDirty(false); if (!quiet) showToast('途中まで保存しました');
  };
  const goSec = (i) => { if (dirty) save(true); setSec(i); top.current && top.current.scrollIntoView({ block: 'start' }); };
  const close = () => { if (dirty && !preview && !window.confirm('保存していない答えがあります。保存せずに閉じますか？')) return; onClose(); };
  // ブラウザの「戻る」：確認を閉じる → 解く画面を閉じる
  const backRef = useRef(null);
  backRef.current = () => { if (confirm) { setConfirm(false); return true; } close(); return true; };
  useEffect(() => onAppBack(() => backRef.current()), []);

  return (
    <div className="rt-run">
      <div className="rt-runhead" ref={top}>
        <button className="btn-back" onClick={close}>← {preview ? '確認を終わる' : '定期テスト'}</button>
        <b className="rt-grow rt-title">{test.title}{preview && '（メンバーの画面の確認）'}</b>
      </div>
      <div className="rt-progbar">
        <div className="rt-prog"><div><i style={{ width: `${qs.length ? Math.round((done / qs.length) * 100) : 0}%` }} /></div><span>{done} / {qs.length}問</span></div>
        <div className="rt-secs">{test.sections.map((x, i) => {
          const sd = x.questions.filter((q) => isAnswered(q, ans[q.id])).length;
          return <button key={x.id} className={`rt-sec ${i === sec ? 'on' : ''} ${sd === x.questions.length && x.questions.length ? 'done' : ''}`} onClick={() => goSec(i)}>{x.name || `編${i + 1}`}</button>;
        })}</div>
      </div>
      <div className="rt-body">
        {s && s.questions.map((q, qi) => (
          <div key={q.id} className="rt-card">
            <div className="rt-qhead"><span className="rt-kind">{QTYPE_LABEL[q.type]}</span><span className="lbl">{s.name} {qi + 1}.</span><span className="rt-pt">{maxOf(q)}点</span></div>
            {q.type !== 'blank' && <div className="rt-qtext">{q.text}</div>}
            <QuestionInput q={q} value={ans[q.id]} onChange={(x) => { setAns((a) => ({ ...a, [q.id]: x })); setDirty(true); }} />
          </div>
        ))}
        {s && !s.questions.length && <div className="rt-hint">この編にはまだ問題がありません</div>}
        <div className="rt-foot">
          {sec > 0 && <button className="rt-btn" onClick={() => goSec(sec - 1)}>← 前へ</button>}
          <button className="rt-btn" onClick={() => save()}>途中で保存</button>
          {sec < test.sections.length - 1
            ? <button className="rt-btn p rt-grow" onClick={() => goSec(sec + 1)}>次の編へ →</button>
            : <button className="rt-btn p rt-grow" onClick={() => setConfirm(true)}>提出する</button>}
        </div>
      </div>
      {confirm && (
        <div className="rt-dim" onClick={() => setConfirm(false)}>
          <div className="rt-dlg" onClick={(e) => e.stopPropagation()}>
            <b>提出しますか？</b>
            <p>提出すると、答えは直せません。<br />〇×・穴埋めなどはすぐに採点され、記述はトレーナーの採点を待ちます。</p>
            {left > 0 && <p className="rt-warn">まだ答えていない問題が {left} 問あります</p>}
            <div className="rt-row"><button className="rt-btn rt-grow" onClick={() => setConfirm(false)}>戻る</button>
              <button className="rt-btn p rt-grow" onClick={async () => { setConfirm(false); if (preview) { showToast('確認用なので提出しません'); return; } await onSubmit(ans); }}>提出する</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 結果 =====
export function ResultView({ test, rec, onClose, adminView }) {
  const published = rec.status === 'published';
  const tot = computeTotals(test, rec);
  const backRef = useRef(null);
  backRef.current = () => { onClose(); return true; };
  useEffect(() => (adminView ? undefined : onAppBack(() => backRef.current())), [adminView]);
  return (
    <div className="rt-run">
      {!adminView && <div className="rt-runhead"><button className="btn-back" onClick={onClose}>← 定期テスト</button><b className="rt-grow rt-title">結果：{test.title}</b></div>}
      <div className="rt-body">
        <div className="rt-card rt-score">
          <div className="rt-donut"><b>{published ? rec.total : (rec.autoTotal ?? tot.total)}</b><span>/ {tot.max}点</span></div>
          <div className="rt-col">
            {published ? <><span className="rt-pill ok">結果が出ました</span><span className="rt-hint">{fmtDay(rec.publishedAt)} 公開</span></>
              : <><span className="rt-pill wait">採点待ち</span><span className="rt-hint">いま出ているのは自動で採点できた問題の点数です。記述はトレーナーの採点後に入ります。</span></>}
          </div>
        </div>
        {published && (
          <>
            <div className="rt-card"><div className="lbl" style={{ marginBottom: 8 }}>編ごとの得点</div>
              <div className="rt-secscore">{test.sections.map((s) => {
                const got = s.questions.reduce((a, q) => { const g = autoGrade(q, (rec.answers || {})[q.id]); return a + (g ? g.score : +(((rec.manual || {})[q.id] || {}).score) || 0); }, 0);
                const mx = s.questions.reduce((a, q) => a + maxOf(q), 0);
                return <React.Fragment key={s.id}><span>{s.name}</span><b>{Math.round(got * 10) / 10} / {mx}</b></React.Fragment>;
              })}</div>
            </div>
            {allQuestions(test).map((q) => <ResultItem key={q.id} q={q} a={(rec.answers || {})[q.id]} m={(rec.manual || {})[q.id]} />)}
          </>
        )}
      </div>
    </div>
  );
}
function ResultItem({ q, a, m }) {
  const g = autoGrade(q, a);
  const score = g ? g.score : +((m || {}).score) || 0;
  const mx = maxOf(q);
  const mark = g ? (score >= mx ? 'o' : score > 0 ? 'h' : 'x') : (m || {}).mark;
  return (
    <div className="rt-card">
      <div className="rt-qhead"><span className={`rt-mark ${mark || ''}`}>{mark === 'o' ? '〇' : mark === 'h' ? '△' : mark === 'x' ? '×' : '－'}</span><span className="rt-kind">{QTYPE_LABEL[q.type]}</span><span className="lbl">{q.sectionName}</span><span className="rt-pt">{score} / {mx}点</span></div>
      <div className="rt-qtext">{q.text}</div>
      {g && g.parts.map((p, i) => (
        <div key={i} className={`rt-part ${p.ok ? 'ok' : 'ng'}`}>
          <b>{p.label}</b>{p.text && <span className="rt-grow">{p.text}</span>}
          <span>あなた：{p.given || '（空欄）'}</span>{!p.ok && <span>正解：{p.correct || '－'}</span>}
        </div>
      ))}
      {!g && (
        <>
          <div className="rt-ans">あなたの答え：{q.type === 'case' ? q.fields.map((f) => `${f.label}：${(a || {})[f.id] || ''}`).join('\n') : (a || '（空欄）')}</div>
          {m && m.comment && <div className="rt-cmt"><b>トレーナーから</b>{m.comment}</div>}
          {q.model && <div className="rt-model"><b>模範解答</b>{q.model}</div>}
        </>
      )}
    </div>
  );
}

// ===== テスト画面の「定期テスト」タブ =====
export default function RegularTests({ user }) {
  const [tests, loaded] = useDbCollection('rtests');
  const [answers] = useDbCollection('rtest_answers');
  const { data: fpUsers } = useFirebaseList('fp_users');
  const [open, setOpen] = useState(null); // { id, mode:'run'|'result' }
  const me = Object.values(fpUsers || {}).find((u) => u && normName(u.name) === normName(user?.name)) || {};
  const myKey = nameKey(user?.name || '');
  const list = useMemo(() => Object.entries(tests || {}).filter(([, t]) => t).map(([id, t]) => ({ id, ...normTest(t) }))
    .filter((t) => t.status !== 'draft' && isTarget(t, user?.name, me.position))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), [tests, user?.name, me.position]);
  const recOf = (id) => ((answers || {})[id] || {})[myKey] || null;

  if (open) {
    const t = list.find((x) => x.id === open.id);
    if (!t) return <div className="tq-stack"><div className="tq-card tq-sub">このテストは見られなくなりました</div><button className="rt-btn" onClick={() => setOpen(null)}>一覧へ</button></div>;
    const rec = recOf(t.id);
    if (open.mode === 'result' && rec) return <ResultView test={t} rec={rec} onClose={() => setOpen(null)} />;
    return (
      <TestRunner test={t} rec={rec} onClose={() => setOpen(null)}
        onSave={(ans) => dbSet(`rtest_answers/${t.id}/${myKey}`, { ...(rec || {}), name: user?.name || '', answers: ans, status: 'draft', savedAt: Date.now() })}
        onSubmit={async (ans) => {
          const base = { ...(rec || {}), name: user?.name || '', answers: ans };
          const tot = computeTotals(t, base);
          await dbSet(`rtest_answers/${t.id}/${myKey}`, { ...base, status: 'submitted', auto: tot.auto, autoTotal: tot.total, max: tot.max, submittedAt: Date.now() });
          showToast('提出しました'); setOpen({ id: t.id, mode: 'result' });
        }} />
    );
  }

  const openNow = list.filter((t) => isOpen(t) && !['submitted', 'published'].includes((recOf(t.id) || {}).status));
  const doneList = list.filter((t) => ['submitted', 'published'].includes((recOf(t.id) || {}).status));
  const missed = list.filter((t) => !isOpen(t) && !['submitted', 'published'].includes((recOf(t.id) || {}).status));
  return (
    <div className="tq-stack">
      <div className="tq-note" style={{ marginTop: 0 }}>トレーナーが出す、期間を決めたテストです。用語テストとは別に記録されます。</div>
      {!loaded && <div className="loading"><div className="spinner" /></div>}
      <div className="tq-lbl">受けられるテスト</div>
      {loaded && !openNow.length && <div className="tq-card tq-sub" style={{ textAlign: 'center' }}>いま受けられるテストはありません</div>}
      {openNow.map((t) => {
        const rec = recOf(t.id); const qs = allQuestions(t); const done = rec ? qs.filter((q) => isAnswered(q, (rec.answers || {})[q.id])).length : 0;
        return (
          <div key={t.id} className="tq-card rt-tcard on">
            <div className="rt-row"><span className="rt-pill open">受付中</span>{t.end && <span className="tq-sub">提出期限 {mdLabel(t.end)}</span>}</div>
            <b className="rt-tname">{t.title}</b>
            <div className="tq-sub">{t.sections.map((s) => s.name).filter(Boolean).join('・')}　全{qs.length}問・{testMax(t)}点</div>
            {rec && <div className="rt-prog"><div><i style={{ width: `${Math.round((done / qs.length) * 100)}%` }} /></div><span>途中まで {done} / {qs.length}</span></div>}
            <button className="rt-btn p" onClick={() => setOpen({ id: t.id, mode: 'run' })}>{rec ? '続きから解く' : '解きはじめる'}</button>
          </div>
        );
      })}
      {doneList.length > 0 && <div className="tq-lbl">受けたテスト</div>}
      {doneList.map((t) => {
        const rec = recOf(t.id);
        return (
          <div key={t.id} className="tq-card rt-tcard row">
            <div className="rt-grow"><b className="rt-tname sm">{t.title}</b><div className="tq-sub">提出 {fmtDay(rec.submittedAt)}</div></div>
            {rec.status === 'published' ? <b className="rt-big">{rec.total}<small>/{testMax(t)}点</small></b> : <span className="rt-pill wait">採点待ち</span>}
            <button className="rt-btn sm" onClick={() => setOpen({ id: t.id, mode: 'result' })}>{rec.status === 'published' ? '結果を見る' : '見る'}</button>
          </div>
        );
      })}
      {missed.length > 0 && <div className="tq-lbl">受付が終わったテスト</div>}
      {missed.map((t) => <div key={t.id} className="tq-card rt-tcard row"><div className="rt-grow"><b className="rt-tname sm">{t.title}</b><div className="tq-sub">未提出</div></div></div>)}
    </div>
  );
}
