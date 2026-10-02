import DateWheel from '../../components/DateWheel.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ref, push, set, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { parseLineBrief } from '../lib/lineParser';
import { loadDraft, saveDraft, clearDraft } from '../lib/draft';
import { useFirebaseList } from '../lib/useFirebaseList';
import { kpiDirectors, canWriteDay } from '../lib/kpiLink';
import Layout from '../components/Layout';
import {
  AU_L, UQ_L, FT_L, BR, AL_L, OT_L, useFrames, emptyDay, calcDay, dayFilled, datesBetween, addDays, md,
  detectChannel, todayStr, toStored, buildText,
} from '../lib/frames';

const Q4 = ['接客', '着座', '成約組', '成約台'];
const OTQ = ['純新', 'MNP', '移行', '機変'];
const digits = (v) => String(v).replace(/[^0-9]/g, '');

// 日報入力
//   /report/new               … 期間（何日〜何日）を決めて新しい日報枠を作る
//   /report/frame/:id         … 登録済みの日報枠を編集（?date= で開く日）
//   /report/frame/:id?append=1 … 日報の追加：まだ入力していない日を開く（全部入力済みなら翌日を追加）
export default function FrameForm() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { user, canEditReport, isAdmin } = useAuth();
  const { data: kpiData } = useFirebaseList('fp_kpi');
  const showToast = useToast();
  const { frames, loading } = useFrames();
  const me = user?.name || '';

  const [frame, setFrame] = useState(null); // { id?, legacy?, legacyIds?, store, channel, ta, tb, days:[], mikomi:{} }
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState({ jisseki: true });
  const [preview, setPreview] = useState(false);
  const [delAsk, setDelAsk] = useState(false);
  const [saving, setSaving] = useState(false);
  const delTimer = useRef(null);
  useEffect(() => () => clearTimeout(delTimer.current), []);

  // ---- 期間を決める段階（新規のみ）----
  const [setup, setSetup] = useState({ store: '', channel: '', ta: '', tb: '', start: todayStr(), end: todayStr() });
  const [lineText, setLineText] = useState('');
  const [showLine, setShowLine] = useState(false);

  const loadedRef = useRef(false);
  // 書きかけの下書きがあれば、そこから再開する（新規は下書きが新規のとき、編集はその日報枠の下書きのとき）
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const d = loadDraft(me);
    if (!d) return;
    if ((!id && !d.frameId) || (id && d.frameId === id)) {
      loadedRef.current = true;
      setFrame(d.frame); setIdx(d.idx || 0);
      if (d.setup) setSetup(d.setup);
      setRestored(true);
    }
  }, []);

  // 編集・追加：登録済みの日報枠を読み込む
  useEffect(() => {
    if (!id || loading || loadedRef.current) return;
    const f = frames.find((x) => x.id === id);
    if (!f) return;
    if (!canEditReport(f)) { showToast('この日報を編集する権限がありません'); navigate(-1); return; }
    loadedRef.current = true;
    const copy = JSON.parse(JSON.stringify(f));
    let at = Math.max(copy.days.findIndex((d) => d.date === sp.get('date')), 0);
    if (sp.get('append')) {
      const empty = copy.days.findIndex((d) => !dayFilled(d));
      if (empty >= 0) at = empty;
      else {
        copy.days.push({ ...emptyDay(addDays(copy.days[copy.days.length - 1].date, 1)), director: me });
        at = copy.days.length - 1;
        showToast(`${md(copy.days[at].date)}を追加しました`);
      }
    }
    setFrame(copy);
    setIdx(at);
  }, [id, loading, frames]);

  useEffect(() => {
    if (!frame) return;
    saveDraft({ user: me, frameId: id || null, frame, idx });
  }, [frame, idx]);
  const discardDraft = () => {
    clearDraft();
    setRestored(false);
    if (id) { const f = frames.find((x) => x.id === id); if (f) { setFrame(JSON.parse(JSON.stringify(f))); setIdx(0); } }
    else { setFrame(null); setIdx(0); }
    showToast('下書きを破棄しました');
  };

  const overlapping = useMemo(() => {
    if (!setup.store || id) return [];
    return frames.filter((f) => f.store === setup.store && f.start <= setup.end && f.end >= setup.start);
  }, [frames, setup, id]);

  const createFrame = () => {
    if (!setup.store.trim()) return showToast('店舗名を入力してください');
    const dates = datesBetween(setup.start, setup.end);
    if (!dates.length) return showToast('期間を正しく選んでください（開始日が終了日より後になっています）');
    setFrame({ store: setup.store.trim(), channel: setup.channel || detectChannel(setup.store) || 'その他', ta: setup.ta, tb: setup.tb,
      days: dates.map((d) => ({ ...emptyDay(d), director: '' })), mikomi: {} });
    setIdx(0);
  };
  const applyLine = () => {
    const p = parseLineBrief(lineText);
    const dates = (p.dates || []).slice().sort();
    setSetup((s) => ({ ...s, store: p.store || s.store, channel: detectChannel(p.store || s.store) || s.channel, ta: p.target || s.ta,
      start: dates[0] || s.start, end: dates[dates.length - 1] || s.end }));
    setShowLine(false);
    showToast('案件指示書から店舗・期間・目標を読み取りました');
  };

  if (!frame) {
    if (id) return <Layout title="日報入力"><div className="empty">{loading ? '読み込み中…' : '日報が見つかりません'}</div></Layout>;
    const days = datesBetween(setup.start, setup.end).length;
    return (
      <Layout title="新規日報" footer={<button className="btn btn-p" onClick={createFrame}>この期間で日報を作る</button>}>
        <div className="np-wrap">
          <div className="card">
            <div className="card-title">日程</div>
            <div className="np-period">
              <label className="form-group"><span>開始日</span><DateWheel className="inp" value={setup.start} onChange={(e) => setSetup({ ...setup, start: e.target.value, end: setup.end < e.target.value ? e.target.value : setup.end })} /></label>
              <span className="np-period-sep">〜</span>
              <label className="form-group"><span>終了日</span><DateWheel className="inp" value={setup.end} min={setup.start} onChange={(e) => setSetup({ ...setup, end: e.target.value })} /></label>
            </div>
            <div className="ts">{days ? `${md(setup.start)}〜${md(setup.end)}　${days}日間の日報を作ります` : '期間を選んでください'}</div>
          </div>
          <div className="card">
            <div className="card-title">現場</div>
            <label className="form-group"><span>店舗名</span><input className="inp" value={setup.store} placeholder="例：エディオン堺インター店"
              onChange={(e) => { const v = e.target.value; setSetup({ ...setup, store: v, channel: detectChannel(v) || setup.channel }); }} /></label>
            <label className="form-group"><span>販路（店舗名から自動で判定）</span><input className="inp" value={setup.channel} onChange={(e) => setSetup({ ...setup, channel: e.target.value })} /></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="form-group" style={{ flex: 1 }}><span>目標 総販</span><input className="inp" inputMode="numeric" value={setup.ta} onChange={(e) => setSetup({ ...setup, ta: digits(e.target.value) })} /></label>
              <label className="form-group" style={{ flex: 1 }}><span>目標 リク抜き</span><input className="inp" inputMode="numeric" value={setup.tb} onChange={(e) => setSetup({ ...setup, tb: digits(e.target.value) })} /></label>
            </div>
            {overlapping.length > 0 && (
              <div className="np-warn">
                同じ店舗・日程の日報がすでにあります。
                {overlapping.map((f) => (
                  <button key={f.id} className="fchip" style={{ marginTop: 6 }} onClick={() => navigate(`/report/frame/${f.id}?append=1`)}>{md(f.start)}〜{md(f.end)} の日報に追記する</button>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <button className="btn btn-outline" onClick={() => setShowLine(!showLine)}>LINEの案件指示書から自動入力</button>
            {showLine && (
              <div style={{ marginTop: 10 }}>
                <textarea className="inp" rows={6} value={lineText} onChange={(e) => setLineText(e.target.value)} placeholder="案件指示書のメッセージを貼り付けてください" />
                <button className="btn btn-p" style={{ marginTop: 8 }} onClick={applyLine}>読み取る</button>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ---- 1日ずつの入力 ----
  const cur = frame.days[Math.min(idx, frame.days.length - 1)];
  const setFrameField = (p) => setFrame((f) => ({ ...f, ...p }));
  // その日の値を変える。記入者が空なら、いま入力している人の名前を自動で入れる
  const setDay = (path, v) => setFrame((f) => {
    const days = f.days.map((d) => JSON.parse(JSON.stringify(d)));
    const d = days[idx];
    let o = d;
    for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
    o[path[path.length - 1]] = v;
    if (!d.director && me) d.director = me;
    return { ...f, days };
  });
  const getDay = (path) => path.reduce((o, k) => (o == null ? '' : o[k]), cur);
  // 日報を書けるのは、その日のKPIでディレクターに割り当てられている人（KPIが無い日は誰でも）
  const writable = canWriteDay(kpiData, frame.store, cur.date, me, isAdmin);
  const dayDirectors = kpiDirectors(kpiData, frame.store, cur.date);
  const dc = calcDay(cur);
  const cum = frame.days.filter((d) => d.date <= cur.date).reduce((a, d) => { const c = calcDay(d); return { s: a.s + c.souhan, r: a.r + c.riku }; }, { s: 0, r: 0 });
  const rest = `${Math.max((+frame.ta || 0) - cum.s, 0)}/${Math.max((+frame.tb || 0) - cum.r, 0)}`;

  const addDay = () => {
    const last = frame.days[frame.days.length - 1].date;
    setFrame((f) => ({ ...f, days: [...f.days, { ...emptyDay(addDays(last, 1)), director: '' }] }));
    setIdx(frame.days.length);
    setDelAsk(false);
  };
  const delDay = () => {
    if (!delAsk) { setDelAsk(true); clearTimeout(delTimer.current); delTimer.current = setTimeout(() => setDelAsk(false), 3000); return; }
    const date = cur.date;
    setFrame((f) => { const mk = { ...f.mikomi }; delete mk[date]; return { ...f, days: f.days.filter((d) => d.date !== date), mikomi: mk }; });
    setIdx(Math.max(idx - 1, 0));
    setDelAsk(false);
    showToast('日程を削除しました');
  };

  const save = async () => {
    if (!frame.store.trim()) return showToast('店舗名を入力してください');
    setSaving(true);
    try {
      const now = Date.now();
      // 入力のある日で記入者が空なら、保存する人の名前を入れる
      const days = frame.days.map((d) => (dayFilled(d) && !d.director && canWriteDay(kpiData, frame.store, d.date, me, isAdmin) ? { ...d, director: me } : d));
      const data = toStored({ ...frame, days }, { createdBy: frame.createdBy || me, createdAt: frame.createdAt || now, updatedAt: now, updatedBy: me });
      let fid = frame.legacy || !frame.id ? null : frame.id;
      if (fid) await set(ref(db, `fp_frames/${fid}`), data);
      else {
        const r = push(ref(db, 'fp_frames'));
        fid = r.key;
        await set(r, data);
        // 旧データから作り直した場合は、元の1日分の日報に印を付けて二重に出ないようにする
        if (frame.legacy && frame.legacyIds) {
          const up = {};
          frame.legacyIds.forEach((lid) => { up[`fp_reports/${lid}/migratedTo`] = fid; });
          await update(ref(db), up);
        }
      }
      clearDraft();
      showToast('保存しました。続けてメンバーの実績を入力してください');
      navigate(`/results/${fid}?date=${cur.date}`, { replace: true });
    } catch (e) {
      showToast('保存できませんでした：' + e.message);
    }
    setSaving(false);
  };

  // 入力の部品
  const Step = ({ label, path, k }) => {
    const v = getDay(path);
    return (
      <div className="np-row" key={k || label}>
        <div className="np-row-l">{label}</div>
        <div className="np-stp">
          <button type="button" onClick={() => setDay(path, String(Math.max((+v || 0) - 1, 0)))} aria-label={`${label}を1減らす`}>−</button>
          <input inputMode="numeric" value={v} onChange={(e) => setDay(path, digits(e.target.value))} aria-label={label} />
          <button type="button" onClick={() => setDay(path, String((+v || 0) + 1))} aria-label={`${label}を1増やす`}>＋</button>
        </div>
      </div>
    );
  };
  const Multi = ({ label, path, labels, dash, k }) => {
    const vals = getDay(path) || [];
    const none = dash && vals.every((v) => v === 'ー');
    return (
      <div className="np-row" key={k || label}>
        <div className="np-row-l">{label}</div>
        <div className="np-multi" style={{ gridTemplateColumns: `repeat(${labels.length}, 44px)` }}>
          {labels.map((l, i) => (
            <label key={i}>{l}<input inputMode="numeric" value={vals[i] ?? ''} onChange={(e) => setDay([...path, i], e.target.value.replace(/[^0-9ー]/g, ''))} /></label>
          ))}
        </div>
        {dash && <button type="button" className={`np-dash ${none ? 'on' : ''}`} onClick={() => setDay(path, none ? ['', '', '', ''] : ['ー', 'ー', 'ー', 'ー'])} aria-label={`${label}は取扱なし`}>ー</button>}
      </div>
    );
  };
  const Text = ({ label, k, grow }) => (
    <div className="np-row col" key={k}>
      <div className="np-row-l fw8">{label}</div>
      <textarea className={`inp np-ta ${grow ? 'grow' : ''}`} value={cur[k] || ''} rows={grow ? Math.max(3, String(cur[k] || '').split('\n').reduce((a, l) => a + Math.max(1, Math.ceil(l.length / 22)), 0) + 1) : 3}
        onChange={(e) => setDay([k], e.target.value)} />
    </div>
  );
  const Head = ({ children }) => <div className="np-row head" key={String(children)}>{children}</div>;
  const mikomiRows = frame.days.map((d) => {
    const m = frame.mikomi[d.date] || {};
    const setM = (k, v) => setFrame((f) => ({ ...f, mikomi: { ...f.mikomi, [d.date]: { ...(f.mikomi[d.date] || {}), [k]: digits(v) } } }));
    return (
      <div className="np-row" key={d.date}>
        <div className="np-row-l">{md(d.date)} 獲得</div>
        <div className="np-multi" style={{ gridTemplateColumns: 'repeat(2, 44px)' }}>
          <label>組<input inputMode="numeric" value={m.g || ''} onChange={(e) => setM('g', e.target.value)} /></label>
          <label>台<input inputMode="numeric" value={m.d || ''} onChange={(e) => setM('d', e.target.value)} /></label>
        </div>
      </div>
    );
  });
  const SECS = [
    ['jisseki', 'au・UQ 実績', `${dc.souhan}/${dc.riku}`, <>
      {Head({ children: 'au mobile' })}{AU_L.map((l, i) => Step({ k: 'a' + i, label: l, path: ['au', i] }))}
      {Head({ children: 'UQ mobile' })}{UQ_L.map((l, i) => Step({ k: 'u' + i, label: l, path: ['uq', i] }))}</>],
    ['fp', 'FP獲得・見込み獲得', '', <>
      {Step({ label: 'FP獲得（総販）', path: ['fpA'] })}{Step({ label: 'FP獲得（リク抜）', path: ['fpB'] })}
      {Head({ children: '店舗様見込み獲得（全日程分・常勤様の当日獲得は除く）' })}{mikomiRows}</>],
    ['uchiwake', '内訳（接客/着座/成約組/成約台）', '', <>
      {Step({ label: 'アンケート枚数（全体）', path: ['ank'] })}{BR.map(([k, l]) => Multi({ k: k, label: l, path: [k], labels: Q4 }))}</>],
    ['ftth', 'FTTH・ライフデザイン・その他', '', <>
      {FT_L.map((l, i) => Step({ k: l, label: l, path: ['ft', i] }))}
      {Step({ label: 'auでんき', path: ['ld', 0] })}{Step({ label: 'auPayカード', path: ['ld', 1] })}
      {Text({ label: 'その他獲得商材', k: 'other', grow: true })}</>],
    ['al', 'アライアンス・他社実績', '', <>
      {Head({ children: 'アライアンス協業（振り組数/成約組数）' })}
      {AL_L.map((l, i) => Multi({ k: l, label: l, path: ['al', i], labels: ['振り', '成約'] }))}
      {Text({ label: 'アライアンス様連携（eo/CATV）取組み工夫', k: 'alEff', grow: true })}
      {Head({ children: '他社実績（取扱なしは右の「ー」）' })}
      {OT_L.map((l, i) => Multi({ k: l, label: l, path: ['ot', i], labels: OTQ, dash: true }))}</>],
    ['text', 'ヒヤリハット・総括', '', <>
      {Text({ label: 'ヒヤリハット報告', k: 'hiyari' })}
      {Text({ label: '全体総括（活動内容/集客状況/他社状況）', k: 'txtOv', grow: true })}
      {Text({ label: '【達成：達成理由】【未達：改善策】', k: 'txtRs', grow: true })}</>],
  ];

  if (preview) {
    return (
      <Layout title="プレビュー" footer={<>
        <button className="btn btn-outline" onClick={() => setPreview(false)}>入力に戻る</button>
        <button className="btn btn-p" style={{ marginTop: 0 }} disabled={saving} onClick={save}>{saving ? '保存中…' : '保存する'}</button></>}>
        <div className="np-wrap">
          <button className="btn btn-gray" style={{ marginBottom: 10 }} onClick={() => { navigator.clipboard?.writeText(buildText(frame, cur.date)); showToast('日報テキストをコピーしました'); }}>コピー</button>
          <pre className="np-pre">{buildText(frame, cur.date)}</pre>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={frame.id ? '日報編集' : '日報入力'} footer={<>
      <button className="btn btn-outline" onClick={() => setPreview(true)}>プレビューを確認</button>
      <button className="btn btn-p" style={{ marginTop: 0 }} disabled={saving} onClick={save}>{saving ? '保存中…' : '保存する'}</button></>}>
      <div className="np-wrap">
        {restored && (
          <div className="np-draft">
            <span>書きかけの内容から再開しました（この端末に自動で保存されています）</span>
            <button className="fchip" onClick={discardDraft}>破棄して最初から</button>
          </div>
        )}
        <div className="card">
          <label className="form-group"><span>店舗名</span><input className="inp" value={frame.store} onChange={(e) => setFrameField({ store: e.target.value, channel: detectChannel(e.target.value) || frame.channel })} /></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <label className="form-group" style={{ flex: 1 }}><span>販路</span><input className="inp" value={frame.channel} onChange={(e) => setFrameField({ channel: e.target.value })} /></label>
            <label className="form-group" style={{ flex: 1 }}><span>目標 総販</span><input className="inp" inputMode="numeric" value={frame.ta} onChange={(e) => setFrameField({ ta: digits(e.target.value) })} /></label>
            <label className="form-group" style={{ flex: 1 }}><span>リク抜き</span><input className="inp" inputMode="numeric" value={frame.tb} onChange={(e) => setFrameField({ tb: digits(e.target.value) })} /></label>
          </div>
        </div>

        <div className="np-days">
          <div className="np-days-head">
            <span className="card-title" style={{ margin: 0, flex: 1 }}>日程</span>
            {frame.days.length > 1 && (
              <button className={`np-delbtn ${delAsk ? 'on' : ''}`} onClick={delDay}>
                {delAsk ? `もう一度押すと${md(cur.date)}を削除（この操作は戻せません）` : 'この日程を削除'}
              </button>
            )}
          </div>
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            {frame.days.map((d, i) => (
              <button key={d.date} className={`fchip np-daychip ${i === idx ? 'active' : ''}`} onClick={() => { setIdx(i); setDelAsk(false); }}>
                {md(d.date)}{dayFilled(d) ? '' : '・未入力'}
              </button>
            ))}
            <button className="fchip np-daychip" onClick={addDay}>＋ 日程を追加</button>
          </div>
        </div>

        <div className="np-res">
          <div><small>当日 総販/リク抜き</small><b style={{ color: 'var(--pd)' }}>{dc.souhan}/{dc.riku}</b></div>
          <div><small>累計</small><b>{cum.s}/{cum.r}</b></div>
          <div><small>残数</small><b>{rest}</b></div>
        </div>
        <label className="form-group np-director"><span>この日のディレクター（記入者）{dayDirectors.length > 0 && `　KPIの割り当て：${dayDirectors.join('・')}`}</span>
          <input className="inp" disabled={!writable} value={cur.director || ''} placeholder={dayDirectors[0] || me} onChange={(e) => setFrame((f) => ({ ...f, days: f.days.map((d, i) => (i === idx ? { ...d, director: e.target.value } : d)) }))} />
        </label>

        {!writable && (
          <div className="np-warn" style={{ marginBottom: 10 }}>
            {md(cur.date)}のディレクターは {dayDirectors.join('・')} さんです（KPIの割り当て）。この日の日報は、ディレクターだけが記入できます。
          </div>
        )}
        {SECS.map(([k, title, sum, body]) => (
          <div className="np-box" key={k}>
            <button className="np-acc" onClick={() => setOpen({ ...open, [k]: !open[k] })} aria-expanded={!!open[k]}>
              <span>{title}</span>{sum && <small>{sum}</small>}<i>{open[k] ? '▲' : '▼'}</i>
            </button>
            {open[k] && <fieldset className="np-fs" disabled={!writable}>{body}</fieldset>}
          </div>
        ))}
      </div>
    </Layout>
  );
}
