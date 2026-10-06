import React, { useEffect, useMemo, useState } from 'react';
import { useDbCollection, dbSet, dbPush, dbRemove, dbUpdateMany } from '../useFirebase.js';
import { useFirebaseList } from '../nippou/lib/useFirebaseList.js';
import { nameKey } from '../testStats.js';
import { normName } from '../evalSheets.js';
import { showToast } from '../utils.js';
import { AutoTA } from '../components/EvalEditors.jsx';
import { TestRunner, ResultView } from './TakeTest.jsx';
import { QTYPES, QTYPE_LABEL, MANUAL_TYPES, POSITIONS, normTest, normQuestion, uid, testMax, maxOf, allQuestions, autoGrade, keyHits, computeTotals, isTarget, knowledgeTemplate, mdLabel } from './core.js';
import './rtest.css';

const arr = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []);
const clean = (x) => JSON.parse(JSON.stringify(x)); // undefined を消す（Firebase に保存できる形に）
const STATUS = { draft: '下書き', open: '受付中', closed: '終了' };
const fmtDay = (t) => { if (!t) return ''; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };

// 新しい問題のひな形（答え方ごと）
function blankQuestion(type) {
  const base = { id: uid(), type, text: '' };
  if (type === 'blank') return normQuestion({ ...base, text: '（{①}）は（{②}）円/月。' });
  if (type === 'ox') return normQuestion({ ...base, text: '下記設問に〇か×で答えてください。', items: [{ id: uid(), text: '', ans: '', pt: 1 }] });
  if (type === 'short') return normQuestion({ ...base, fields: [{ id: uid(), label: '', answers: '', unit: '', mode: 'text', pt: 1 }] });
  if (type === 'multi') return normQuestion({ ...base, need: 3, points: 3 });
  if (type === 'order') return normQuestion({ ...base, optionsText: '', points: 2 });
  if (type === 'case') return normQuestion({ ...base, points: 10, fieldsText: '提案内容\n金額\n施策\nその提案にした理由' });
  return normQuestion({ ...base, points: 2 });
}

// 正解・配点が入っていない問題（公開の前に知らせる）
function missingAnswers(t) {
  const out = [];
  t.sections.forEach((s) => s.questions.forEach((q, i) => {
    const name = `${s.name} ${i + 1}`;
    const none = (q.type === 'blank' && q.blanks.some((b) => !String(b.answers || '').trim()))
      || (q.type === 'ox' && q.items.some((it) => !it.ans))
      || (q.type === 'short' && q.fields.some((f) => !String(f.answers || '').trim()))
      || (q.type === 'multi' && !String(q.answers || '').trim())
      || (q.type === 'order' && q.options.length < 2);
    if (none) out.push(name);
  }));
  return out;
}

// ===== 1問の編集 =====
function QuestionEditor({ q, onChange, onRemove, onMove, idx, count }) {
  const set = (k, v) => onChange(normQuestion({ ...q, [k]: v }));
  const setSub = (list, i, k, v) => { const n = q[list].map((x, j) => (j === i ? { ...x, [k]: v } : x)); onChange(normQuestion({ ...q, [list]: n })); };
  const delSub = (list, i) => onChange(normQuestion({ ...q, [list]: q[list].filter((_, j) => j !== i) }));
  const changeType = (type) => {
    if (type === q.type) return;
    if (!window.confirm('答え方を変えると、この問題の正解の設定は消えます。よろしいですか？')) return;
    onChange({ ...blankQuestion(type), id: q.id, text: q.text });
  };
  return (
    <div className="ra-q">
      <div className="ra-qside">
        <select className="ra-sel" value={q.type} onChange={(e) => changeType(e.target.value)} aria-label="答え方">
          {QTYPES.map(([k, l]) => <option key={k} value={k}>{l}{MANUAL_TYPES.includes(k) ? '（手で採点）' : ''}</option>)}
        </select>
        <div className="ra-pts">{maxOf(q)}点</div>
        <div className="ra-row">
          <button className="ra-ib" disabled={idx === 0} onClick={() => onMove(-1)} aria-label="上へ">▲</button>
          <button className="ra-ib" disabled={idx === count - 1} onClick={() => onMove(1)} aria-label="下へ">▼</button>
          <button className="ra-ib del" onClick={onRemove}>削除</button>
        </div>
      </div>
      <div className="ra-qmain">
        <label className="ra-fld"><span>{q.type === 'blank' ? '文章（{①} のように書いたところが空欄になります。同じ番号は1回だけ答えます）' : '問題文'}</span>
          <AutoTA className="ra-ta" rows={2} value={q.text} onChange={(e) => set('text', e.target.value)} /></label>

        {q.type === 'blank' && (
          <div className="ra-tbl">
            <div className="ra-tr head"><span>空欄</span><span>正解（書き方がいくつかあるときは「、」で区切る）</span><span>単位</span><span>答え方</span><span>点</span></div>
            {!q.blanks.length && <div className="ra-note">文章に {'{①}'} のような空欄がありません</div>}
            {q.blanks.map((b, i) => (
              <div className="ra-tr" key={b.id}>
                <b className="ra-bid">{b.id}</b>
                {b.mode === 'choice'
                  ? <div className="ra-row"><input className="ra-inp" placeholder="選択肢（「、」区切り）" value={b.choices} onChange={(e) => setSub('blanks', i, 'choices', e.target.value)} /><input className="ra-inp" placeholder="正解" value={b.answers} onChange={(e) => setSub('blanks', i, 'answers', e.target.value)} /></div>
                  : <input className="ra-inp" value={b.answers} onChange={(e) => setSub('blanks', i, 'answers', e.target.value)} />}
                <input className="ra-inp" value={b.unit} onChange={(e) => setSub('blanks', i, 'unit', e.target.value)} />
                <select className="ra-sel" value={b.mode} onChange={(e) => setSub('blanks', i, 'mode', e.target.value)}><option value="text">文字</option><option value="num">数字</option><option value="choice">選ぶ</option></select>
                <input className="ra-inp" inputMode="decimal" value={b.pt} onChange={(e) => setSub('blanks', i, 'pt', e.target.value)} />
              </div>
            ))}
            <div className="ra-note">「数字」は、カンマや「円」があっても数字だけで採点します。「文字」は全角・半角・空白の違いを気にせず採点します。</div>
          </div>
        )}

        {q.type === 'ox' && (
          <div className="ra-tbl">
            {q.items.map((it, i) => (
              <div className="ra-tr ox" key={it.id}>
                <span className="ra-bid">{i + 1}</span>
                <input className="ra-inp" placeholder="設問" value={it.text} onChange={(e) => setSub('items', i, 'text', e.target.value)} />
                <div className="ra-row">{[['o', '〇'], ['x', '×']].map(([k, l]) => <button key={k} className={`ra-ox ${it.ans === k ? 'on' : ''}`} onClick={() => setSub('items', i, 'ans', k)} aria-label={`正解は${l}`}>{l}</button>)}</div>
                <input className="ra-inp" inputMode="decimal" value={it.pt} onChange={(e) => setSub('items', i, 'pt', e.target.value)} aria-label="点" />
                <button className="ra-ib del" onClick={() => delSub('items', i)}>削除</button>
              </div>
            ))}
            <button className="ra-ib" onClick={() => onChange(normQuestion({ ...q, items: [...q.items, { id: uid(), text: '', ans: '', pt: 1 }] }))}>＋ 設問を追加</button>
          </div>
        )}

        {q.type === 'short' && (
          <div className="ra-tbl">
            <div className="ra-tr head sh"><span>欄の名前</span><span>正解（「、」区切り）</span><span>単位</span><span>答え方</span><span>点</span><span /></div>
            {q.fields.map((f, i) => (
              <div className="ra-tr sh" key={f.id}>
                <input className="ra-inp" placeholder="（なくてもOK）" value={f.label} onChange={(e) => setSub('fields', i, 'label', e.target.value)} />
                <input className="ra-inp" value={f.answers} onChange={(e) => setSub('fields', i, 'answers', e.target.value)} />
                <input className="ra-inp" value={f.unit} onChange={(e) => setSub('fields', i, 'unit', e.target.value)} />
                <select className="ra-sel" value={f.mode} onChange={(e) => setSub('fields', i, 'mode', e.target.value)}><option value="text">文字</option><option value="num">数字</option></select>
                <input className="ra-inp" inputMode="decimal" value={f.pt} onChange={(e) => setSub('fields', i, 'pt', e.target.value)} />
                <button className="ra-ib del" disabled={q.fields.length < 2} onClick={() => delSub('fields', i)}>削除</button>
              </div>
            ))}
            <button className="ra-ib" onClick={() => onChange(normQuestion({ ...q, fields: [...q.fields, { id: uid(), label: '', answers: '', unit: '', mode: 'text', pt: 1 }] }))}>＋ 欄を追加</button>
          </div>
        )}

        {q.type === 'multi' && (
          <>
            <label className="ra-fld"><span>正解に数える答え（「、」区切り。似た書き方も足しておくと採点しやすくなります）</span><AutoTA className="ra-ta" rows={2} value={q.answers} onChange={(e) => set('answers', e.target.value)} /></label>
            <div className="ra-row"><label className="ra-fld in"><span>いくつ当たれば満点</span><input className="ra-inp n" inputMode="numeric" value={q.need} onChange={(e) => set('need', e.target.value)} /></label>
              <label className="ra-fld in"><span>配点</span><input className="ra-inp n" inputMode="decimal" value={q.points} onChange={(e) => set('points', e.target.value)} /></label></div>
            <div className="ra-note">足りないときは、当たった数に合わせて点が入ります（3つ以上で満点、2つなら3分の2）。</div>
          </>
        )}

        {q.type === 'order' && (
          <>
            <label className="ra-fld"><span>正しい順番に、1行に1つずつ（メンバーの画面ではまぜて出します）</span><AutoTA className="ra-ta" rows={3} value={q.optionsText} onChange={(e) => set('optionsText', e.target.value)} /></label>
            <label className="ra-fld in"><span>配点（全部合っていたら）</span><input className="ra-inp n" inputMode="decimal" value={q.points} onChange={(e) => set('points', e.target.value)} /></label>
          </>
        )}

        {(q.type === 'essay' || q.type === 'case') && (
          <>
            {q.type === 'case' && <label className="ra-fld"><span>お客様の情報・要望</span><AutoTA className="ra-ta" rows={4} value={q.info} onChange={(e) => set('info', e.target.value)} /></label>}
            {q.type === 'case' && <label className="ra-fld"><span>答える欄（1行に1つずつ）</span><AutoTA className="ra-ta" rows={3} value={q.fieldsText} onChange={(e) => set('fieldsText', e.target.value)} /></label>}
            <label className="ra-fld"><span>模範解答（採点するときと、結果の画面に出ます）</span><AutoTA className="ra-ta" rows={2} value={q.model} onChange={(e) => set('model', e.target.value)} /></label>
            <label className="ra-fld"><span>採点のポイント（「、」区切り。回答に入っていたら採点画面で色が付きます）</span><input className="ra-inp" value={q.keysText} onChange={(e) => set('keysText', e.target.value)} /></label>
            <label className="ra-fld in"><span>配点</span><input className="ra-inp n" inputMode="decimal" value={q.points} onChange={(e) => set('points', e.target.value)} /></label>
          </>
        )}
      </div>
    </div>
  );
}

// ===== テストの編集 =====
function TestEditor({ id, saved, users, hasAnswers, onPreview }) {
  const [t, setT] = useState(() => normTest(saved));
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setT(normTest(saved)); }, [JSON.stringify(saved)]); // eslint-disable-line react-hooks/exhaustive-deps
  const up = (fn) => { setT((x) => fn(clean(x))); setDirty(true); };
  const setSec = (si, fn) => up((x) => { x.sections[si] = fn(x.sections[si]); return x; });
  const save = async (status) => {
    if (status === 'open' && !t.title.trim()) return showToast('テストの名前を入れてください');
    if (status === 'open' && !allQuestions(t).length) return showToast('問題がありません');
    if (status === 'open') {
      const miss = missingAnswers(t);
      if (miss.length && !window.confirm(`正解が入っていない問題が${miss.length}問あります（${miss.slice(0, 5).join('、')}${miss.length > 5 ? ' など' : ''}）。\nこのまま公開すると、その問題は全員不正解になります。公開しますか？`)) return;
    }
    if (hasAnswers && dirty && !window.confirm('すでに答えている人がいます。問題を変えると、その人の採点にも反映されます。保存しますか？')) return;
    const data = clean({ ...t, status: status || t.status, updatedAt: Date.now() });
    await dbSet(`rtests/${id}`, data); setDirty(false);
    showToast(status === 'open' ? '公開しました（受付中）' : status === 'closed' ? '受付を終わりました' : '保存しました');
  };
  const people = users.map((u) => u.name);
  const tg = t.target;
  return (
    <div className="ra-col">
      <div className="ra-card ra-meta">
        <label className="ra-fld"><span>テストの名前</span><input className="ra-inp" value={t.title} onChange={(e) => up((x) => ({ ...x, title: e.target.value }))} /></label>
        <label className="ra-fld"><span>受付開始</span><input type="date" className="ra-inp" value={t.start} onChange={(e) => up((x) => ({ ...x, start: e.target.value }))} /></label>
        <label className="ra-fld"><span>提出期限</span><input type="date" className="ra-inp" value={t.end} onChange={(e) => up((x) => ({ ...x, end: e.target.value }))} /></label>
        <label className="ra-fld"><span>受ける人</span><select className="ra-sel" value={tg.mode} onChange={(e) => up((x) => ({ ...x, target: { ...x.target, mode: e.target.value } }))}><option value="all">全員</option><option value="roles">役職で選ぶ</option><option value="people">1人ずつ選ぶ</option></select></label>
        {tg.mode === 'roles' && <div className="ra-wrap ra-full">{POSITIONS.map((r) => <label key={r} className="ra-check"><input type="checkbox" checked={tg.roles.includes(r)} onChange={(e) => up((x) => ({ ...x, target: { ...x.target, roles: e.target.checked ? [...x.target.roles, r] : x.target.roles.filter((y) => y !== r) } }))} />{r}</label>)}</div>}
        {tg.mode === 'people' && <div className="ra-wrap ra-full">{people.map((n) => { const on = tg.people.some((p) => normName(p) === normName(n)); return <label key={n} className="ra-check"><input type="checkbox" checked={on} onChange={(e) => up((x) => ({ ...x, target: { ...x.target, people: e.target.checked ? [...x.target.people, n] : x.target.people.filter((p) => normName(p) !== normName(n)) } }))} />{n}</label>; })}</div>}
        <div className="ra-full ra-note">全{allQuestions(t).length}問・{testMax(t)}点　状態：{STATUS[t.status]}{t.status === 'draft' ? '（メンバーにはまだ見えません）' : ''}
          {missingAnswers(t).length > 0 && <b className="ra-warn">　正解がまだの問題：{missingAnswers(t).length}問（{missingAnswers(t).slice(0, 6).join('、')}{missingAnswers(t).length > 6 ? ' など' : ''}）</b>}</div>
      </div>

      {t.sections.map((s, si) => (
        <div className="ra-card" key={s.id}>
          <div className="ra-sechead">
            <input className="ra-inp ra-secname" value={s.name} placeholder="編の名前" aria-label="編の名前" onChange={(e) => setSec(si, (x) => ({ ...x, name: e.target.value }))} />
            <span className="ra-note">{s.questions.length}問・{s.questions.reduce((a, q) => a + maxOf(q), 0)}点</span>
            <span className="ra-row" style={{ marginLeft: 'auto' }}>
              <button className="ra-ib" disabled={si === 0} onClick={() => up((x) => { const a = x.sections; [a[si - 1], a[si]] = [a[si], a[si - 1]]; return x; })} aria-label="編を上へ">▲</button>
              <button className="ra-ib" disabled={si === t.sections.length - 1} onClick={() => up((x) => { const a = x.sections; [a[si + 1], a[si]] = [a[si], a[si + 1]]; return x; })} aria-label="編を下へ">▼</button>
              <button className="ra-ib del" onClick={() => { if (window.confirm(`「${s.name || 'この編'}」と中の問題を消します。よろしいですか？`)) up((x) => ({ ...x, sections: x.sections.filter((_, j) => j !== si) })); }}>編を削除</button>
            </span>
          </div>
          {s.questions.map((q, qi) => (
            <QuestionEditor key={q.id} q={q} idx={qi} count={s.questions.length}
              onChange={(nq) => setSec(si, (x) => ({ ...x, questions: x.questions.map((y, j) => (j === qi ? nq : y)) }))}
              onRemove={() => { if (window.confirm('この問題を削除します。よろしいですか？')) setSec(si, (x) => ({ ...x, questions: x.questions.filter((_, j) => j !== qi) })); }}
              onMove={(d) => setSec(si, (x) => { const a = x.questions; const j = qi + d; [a[j], a[qi]] = [a[qi], a[j]]; return x; })} />
          ))}
          <div className="ra-add"><span className="ra-note">問題を追加：</span>{QTYPES.map(([k, l]) => <button key={k} className="ra-ib" onClick={() => setSec(si, (x) => ({ ...x, questions: [...x.questions, blankQuestion(k)] }))}>{l}</button>)}</div>
        </div>
      ))}
      <button className="ra-ib big" onClick={() => up((x) => ({ ...x, sections: [...x.sections, { id: uid(), name: '', questions: [] }] }))}>＋ 編を追加</button>

      <div className="ra-savebar">
        {dirty && <span className="ra-note">保存していない変更があります</span>}
        <button className="ev-btn" onClick={() => onPreview(t)}>メンバーの画面で確認</button>
        <button className="ev-btn" onClick={() => save()}>保存</button>
        {t.status !== 'open' && <button className="ev-btn p" onClick={() => save('open')}>{t.status === 'closed' ? 'もう一度受付する' : '公開する'}</button>}
        {t.status === 'open' && <button className="ev-btn" onClick={() => save('closed')}>受付を終わる</button>}
        {t.status !== 'draft' && <button className="ev-btn" onClick={() => save('draft')}>下書きに戻す</button>}
      </div>
    </div>
  );
}

// ===== 採点 =====
function Grader({ id, test, answers, users }) {
  const recs = answers || {};
  const targets = users.filter((u) => isTarget(test, u.name, u.position));
  const rows = useMemo(() => {
    const map = new Map();
    targets.forEach((u) => map.set(nameKey(u.name), { key: nameKey(u.name), name: u.name, position: u.position, rec: null }));
    Object.entries(recs).forEach(([k, r]) => { if (r) map.set(k, { ...(map.get(k) || { key: k, name: r.name }), rec: r }); });
    const order = { submitted: 0, published: 1, draft: 2 };
    return [...map.values()].sort((a, b) => (order[a.rec?.status] ?? 3) - (order[b.rec?.status] ?? 3) || String(a.name).localeCompare(String(b.name), 'ja'));
  }, [JSON.stringify(recs), targets.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState(null);
  const [showAuto, setShowAuto] = useState(false);
  const [manual, setManual] = useState({});
  const [dirty, setDirty] = useState(false);
  const cur = rows.find((r) => r.key === sel) || rows.find((r) => r.rec && r.rec.status === 'submitted') || rows[0];
  useEffect(() => { setManual((cur && cur.rec && cur.rec.manual) || {}); setDirty(false); }, [cur && cur.key, cur && cur.rec && JSON.stringify(cur.rec.manual || {})]); // eslint-disable-line react-hooks/exhaustive-deps
  const qs = allQuestions(test);
  const mqs = qs.filter((q) => MANUAL_TYPES.includes(q.type));
  const submitted = rows.filter((r) => r.rec && ['submitted', 'published'].includes(r.rec.status));
  const pick = (k) => { if (dirty && !window.confirm('保存していない採点があります。破棄して別の人に移りますか？')) return; setSel(k); };
  const setM = (qid, patch) => { setManual((m) => ({ ...m, [qid]: { ...(m[qid] || {}), ...patch } })); setDirty(true); };

  const saveGrade = async (publish) => {
    if (!cur || !cur.rec) return;
    const rec = { ...cur.rec, manual: clean(manual) };
    const tot = computeTotals(test, rec);
    if (publish && tot.manualLeft) return showToast(`まだ採点していない問題が${tot.manualLeft}問あります`);
    const up = { [`rtest_answers/${id}/${cur.key}/manual`]: rec.manual, [`rtest_answers/${id}/${cur.key}/total`]: tot.total, [`rtest_answers/${id}/${cur.key}/max`]: tot.max, [`rtest_answers/${id}/${cur.key}/auto`]: tot.auto };
    if (publish) { up[`rtest_answers/${id}/${cur.key}/status`] = 'published'; up[`rtest_answers/${id}/${cur.key}/publishedAt`] = Date.now(); }
    await dbUpdateMany(up); setDirty(false);
    showToast(publish ? '結果を本人に公開しました' : '採点を保存しました');
  };
  const publishAll = async () => {
    const ready = submitted.filter((r) => r.rec.status === 'submitted' && !computeTotals(test, r.rec).manualLeft);
    if (!ready.length) return showToast('公開できる人がいません（記述の採点が終わった人だけ公開できます）');
    if (!window.confirm(`採点が終わっている${ready.length}人の結果を公開します。よろしいですか？`)) return;
    const up = {};
    ready.forEach((r) => { const tot = computeTotals(test, r.rec); up[`rtest_answers/${id}/${r.key}/status`] = 'published'; up[`rtest_answers/${id}/${r.key}/publishedAt`] = Date.now(); up[`rtest_answers/${id}/${r.key}/total`] = tot.total; up[`rtest_answers/${id}/${r.key}/max`] = tot.max; });
    await dbUpdateMany(up); showToast('公開しました');
  };
  const csv = () => {
    const head = ['名前', '状態', '合計', '満点', ...test.sections.map((s) => s.name)];
    const lines = submitted.map((r) => {
      const tot = computeTotals(test, r.rec);
      const secs = test.sections.map((s) => s.questions.reduce((a, q) => { const g = autoGrade(q, (r.rec.answers || {})[q.id]); return a + (g ? g.score : +(((r.rec.manual || {})[q.id] || {}).score) || 0); }, 0));
      return [r.name, r.rec.status === 'published' ? '公開済み' : '採点待ち', tot.total, tot.max, ...secs];
    });
    const body = [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + body], { type: 'text/csv' })); a.download = `${test.title || '定期テスト'}.csv`; a.click();
  };
  const stLabel = (r) => (!r.rec ? '未着手' : r.rec.status === 'draft' ? '解いている途中' : r.rec.status === 'submitted' ? '採点待ち' : `公開済み ${r.rec.total}点`);
  const tot = cur && cur.rec ? computeTotals(test, { ...cur.rec, manual }) : null;
  const autoSum = cur && cur.rec ? qs.reduce((a, q) => { const g = autoGrade(q, (cur.rec.answers || {})[q.id]); return a + (g ? g.score : 0); }, 0) : 0;
  const autoMax = qs.filter((q) => !MANUAL_TYPES.includes(q.type)).reduce((a, q) => a + maxOf(q), 0);

  return (
    <div className="ra-grade">
      <div className="ra-card ra-mlist">
        <div className="ra-note">提出 {submitted.length} / {targets.length}人</div>
        {rows.map((r) => (
          <button key={r.key} className={`ra-li ${cur && cur.key === r.key ? 'on' : ''}`} onClick={() => pick(r.key)}>
            <b>{r.name}</b><span className={`ra-st ${r.rec ? r.rec.status : 'none'}`}>{r.position ? `${r.position}・` : ''}{stLabel(r)}</span>
          </button>
        ))}
        <div className="ra-col" style={{ marginTop: 8 }}><button className="ev-btn" onClick={publishAll}>採点済みの人をまとめて公開</button><button className="ev-btn" onClick={csv}>CSVで書き出す</button></div>
      </div>
      <div className="ra-col">
        {!cur && <div className="ra-card ra-note">まだ受ける人がいません</div>}
        {cur && !cur.rec && <div className="ra-card ra-note">{cur.name}さんはまだ解いていません</div>}
        {cur && cur.rec && cur.rec.status === 'draft' && <div className="ra-card ra-note">{cur.name}さんは解いている途中です（提出されたら採点できます）</div>}
        {cur && cur.rec && cur.rec.status !== 'draft' && (
          <>
            <div className="ra-card ra-sum">
              <b className="ra-name">{cur.name}</b>
              <span>自動採点 <b className="ra-o">{Math.round(autoSum * 10) / 10}</b> / {autoMax}点</span>
              <span>合計 <b className="ra-o">{tot.total}</b> / {tot.max}点</span>
              {tot.manualLeft > 0 && <span className="ra-warn">手で採点する問題が あと{tot.manualLeft}問</span>}
              <span className="ra-note">提出 {fmtDay(cur.rec.submittedAt)}{cur.rec.status === 'published' ? `・公開 ${fmtDay(cur.rec.publishedAt)}` : ''}</span>
              <button className="ev-btn" style={{ marginLeft: 'auto' }} onClick={() => setShowAuto(!showAuto)}>{showAuto ? '自動採点の答えを閉じる' : '自動採点の答えを見る'}</button>
            </div>
            {showAuto && <div className="ra-card"><ResultView test={test} rec={{ ...cur.rec, manual, status: 'published', total: tot.total }} adminView onClose={() => {}} /></div>}
            {mqs.map((q) => {
              const a = (cur.rec.answers || {})[q.id]; const m = manual[q.id] || {}; const mx = maxOf(q);
              return (
                <div className="ra-card ra-gq" key={q.id}>
                  <div className="ra-col">
                    <span className="ra-note">{q.sectionName}　{QTYPE_LABEL[q.type]}　メンバーの回答</span>
                    <b className="ra-qt">{q.text}</b>
                    <div className="ra-ansbox">{q.type === 'case' ? q.fields.map((f) => <div key={f.id}><b>{f.label}</b><br />{(a || {})[f.id] || '（空欄）'}</div>) : (a || '（空欄）')}</div>
                  </div>
                  <div className="ra-col">
                    <span className="ra-note">模範解答</span>
                    <div className="ra-model">{q.model || '（未登録）'}</div>
                    {q.keys.length > 0 && <div><span className="ra-note">採点のポイント</span><div className="ra-wrap">{keyHits(q, a).map((k) => <span key={k.k} className={`ra-tag ${k.hit ? 'hit' : ''}`}>{k.hit ? 'あり' : 'なし'}　{k.k}</span>)}</div></div>}
                  </div>
                  <div className="ra-col">
                    <span className="ra-note">採点（{mx}点）</span>
                    {[['o', '〇 正解'], ['h', '△ 部分点'], ['x', '× 不正解']].map(([k, l]) => (
                      <button key={k} className={`ra-mark ${k} ${m.mark === k ? 'on' : ''}`} onClick={() => setM(q.id, { mark: k, score: k === 'o' ? mx : k === 'x' ? 0 : (m.mark === 'h' ? m.score : Math.round(mx / 2)) })}>{l}</button>
                    ))}
                    {m.mark === 'h' && <label className="ra-row ra-note">部分点<input className="ra-inp n" inputMode="decimal" value={m.score ?? ''} onChange={(e) => setM(q.id, { score: Math.min(mx, Math.max(0, +e.target.value || 0)) })} />点</label>}
                    <AutoTA className="ra-ta" rows={2} placeholder="ひとこと（本人に表示）" value={m.comment || ''} onChange={(e) => setM(q.id, { comment: e.target.value })} />
                  </div>
                </div>
              );
            })}
            {!mqs.length && <div className="ra-card ra-note">このテストは全部自動で採点されます。「結果を本人に公開」で結果が届きます。</div>}
            <div className="ra-savebar">
              {tot.manualLeft > 0 && <span className="ra-note">すべて採点すると、結果を本人に公開できます</span>}
              <button className="ev-btn" onClick={() => saveGrade(false)}>保存</button>
              <button className="ev-btn p" onClick={() => saveGrade(true)}>{cur.rec.status === 'published' ? '公開し直す' : '結果を本人に公開'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== 管理画面「定期テスト」タブ =====
export default function AdminRTest({ user }) {
  const [tests, loaded] = useDbCollection('rtests');
  const [answers] = useDbCollection('rtest_answers');
  const { data: fpUsers } = useFirebaseList('fp_users');
  const [sel, setSel] = useState(null);
  const [mode, setMode] = useState('edit');
  const [newOpen, setNewOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const users = useMemo(() => Object.values(fpUsers || {}).filter((u) => u && u.name && u.permission !== 'pending'), [fpUsers]);
  const list = Object.entries(tests || {}).filter(([, t]) => t).map(([id, t]) => ({ id, ...normTest(t) })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const cur = list.find((x) => x.id === sel) || list[0];
  // 最初の1回だけ：今回の知識試験（問題用紙）を下書きとして入れておく
  const [cfg, cfgLoaded] = useDbCollection('rtest_config');
  useEffect(() => {
    if (!loaded || !cfgLoaded || (cfg && cfg.seeded)) return;
    (async () => {
      await dbSet('rtest_config/seeded', Date.now());
      if (!Object.keys(tests || {}).length) {
        const r = await dbPush('rtests', clean({ ...knowledgeTemplate(), status: 'draft', createdAt: Date.now(), updatedAt: Date.now(), by: user?.name || '管理者' }));
        setSel(r.key);
      }
    })();
  }, [loaded, cfgLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (tpl) => {
    const base = tpl === 'knowledge' ? knowledgeTemplate() : normTest({ title: '新しいテスト', sections: [{ id: uid(), name: '', questions: [] }] });
    const r = await dbPush('rtests', clean({ ...base, status: 'draft', createdAt: Date.now(), updatedAt: Date.now(), by: user?.name || '管理者' }));
    setSel(r.key); setMode('edit'); setNewOpen(false); showToast('下書きを作りました');
  };
  const copy = async () => {
    if (!cur) return;
    const { id, ...rest } = cur;
    const r = await dbPush('rtests', clean({ ...rest, title: `${rest.title}（コピー）`, status: 'draft', createdAt: Date.now(), updatedAt: Date.now() }));
    setSel(r.key); showToast('コピーしました');
  };
  const remove = async () => {
    if (!cur) return;
    const n = Object.keys((answers || {})[cur.id] || {}).length;
    if (!window.confirm(`「${cur.title}」を削除します。${n ? `\n${n}人分の答えも消えます。` : ''}よろしいですか？`)) return;
    await dbRemove(`rtests/${cur.id}`); await dbRemove(`rtest_answers/${cur.id}`); setSel(null); showToast('削除しました');
  };

  if (preview) return <div className="ra-preview"><TestRunner preview test={normTest(preview)} rec={null} onSave={() => {}} onSubmit={() => {}} onClose={() => setPreview(null)} /></div>;

  return (
    <div className="ra">
      <div className="ra-card ra-tlist">
        <button className="ev-btn p" onClick={() => setNewOpen(!newOpen)}>＋ 新しいテストを作る</button>
        {newOpen && (
          <div className="ra-col ra-newbox">
            <button className="ev-btn" onClick={() => create('blank')}>何もない状態から作る</button>
            <button className="ev-btn" onClick={() => create('knowledge')}>知識試験（問題用紙）のひな形から作る</button>
          </div>
        )}
        {!loaded && <div className="loading"><div className="spinner" /></div>}
        {list.map((t) => {
          const rs = Object.values((answers || {})[t.id] || {}).filter(Boolean);
          const wait = rs.filter((r) => r.status === 'submitted').length;
          return (
            <button key={t.id} className={`ra-li ${cur && cur.id === t.id ? 'on' : ''}`} onClick={() => setSel(t.id)}>
              <b>{t.title || '（名前なし）'}</b>
              <span className="ra-note">{STATUS[t.status]}{t.end ? `・期限 ${mdLabel(t.end)}` : ''}・提出 {rs.filter((r) => r.status !== 'draft').length}人{wait ? `・採点待ち ${wait}` : ''}</span>
            </button>
          );
        })}
        {loaded && !list.length && <div className="ra-note">まだテストがありません</div>}
      </div>
      {cur && (
        <div className="ra-col ra-main">
          <div className="ra-row ra-modes">
            <button className={`ra-mode ${mode === 'edit' ? 'on' : ''}`} onClick={() => setMode('edit')}>問題を作る</button>
            <button className={`ra-mode ${mode === 'grade' ? 'on' : ''}`} onClick={() => setMode('grade')}>採点・結果</button>
            <span style={{ marginLeft: 'auto' }} className="ra-row"><button className="ra-ib" onClick={copy}>コピーして新しく作る</button><button className="ra-ib del" onClick={remove}>このテストを削除</button></span>
          </div>
          {mode === 'edit' && <TestEditor key={cur.id} id={cur.id} saved={tests[cur.id]} users={users} hasAnswers={Object.keys((answers || {})[cur.id] || {}).length > 0} onPreview={setPreview} />}
          {mode === 'grade' && <Grader key={cur.id} id={cur.id} test={cur} answers={(answers || {})[cur.id]} users={users} />}
        </div>
      )}
    </div>
  );
}
