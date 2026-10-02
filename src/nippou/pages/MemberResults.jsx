import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ref, set, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { useFirebaseList } from '../lib/useFirebaseList';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';
import { useFrames, md } from '../lib/frames';
import { findKpis, kpiMembers, resultKey, getSavedResult, isOther, canWriteDay, kpiDirectors } from '../lib/kpiLink';

const ROLES = ['ディレクター', 'クローザー', 'キャッチャー'];

// メンバーの実績記入：日報を保存したあとに開く。社員が登録したKPI（店舗・日付・メンバー）を日報の店舗名と日付で探し、
// ディレクターは各メンバーの実績件数を入れるだけ。キャッチャーは着座件数。名簿に登録されていない人は「他社」
// KPIが無い日は、その場でメンバーを追加して入力（あとでKPIが登録されたら、KPI側に自動で反映される）
export default function MemberResults() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const showToast = useToast();
  const { frames, loading } = useFrames();
  const { data: kpiData } = useFirebaseList('fp_kpi');
  const { data: kpiResults } = useFirebaseList('fp_kpi_results');
  const { data: fpUsers } = useFirebaseList('fp_users');
  const registered = useMemo(() => new Set(Object.values(fpUsers).map((u) => u && u.name).filter(Boolean)), [fpUsers]);
  const userNames = useMemo(() => [...registered].sort(), [registered]);
  const f = frames.find((x) => x.id === id);
  const [date, setDate] = useState(sp.get('date') || '');
  const [kpiPick, setKpiPick] = useState({}); // 日付 → 選んだKPIのID
  const [vals, setVals] = useState({}); // 入力中の実績 { key: 数字 }
  const [manual, setManual] = useState(null); // KPIが無いときの手入力の行
  const [saving, setSaving] = useState(false);

  const cur = f ? (f.days.find((d) => d.date === date) || f.days[0]) : null;
  const d = cur ? cur.date : '';
  const cands = useMemo(() => (f && d ? findKpis(kpiData, f.store, d) : []), [kpiData, f, d]);
  const kpiId = kpiPick[d] || (cands[0] && cands[0][0]) || '';
  const kpi = kpiId ? kpiData[kpiId] : null;
  const members = kpi ? kpiMembers(kpi, d) : [];

  // KPIが無い日：日報枠に保存済みの手入力があればそれを、無ければ空の1行
  useEffect(() => {
    if (!f || !d || kpi) { setManual(null); return; }
    const saved = ((f.memberResults || {})[d] || []).filter(Boolean);
    setManual(saved.length ? saved.map((r) => ({ ...r, actual: String(r.actual ?? '') })) : [{ member: user?.name || '', role: 'ディレクター', actual: '', other: false }]);
  }, [f && f.id, d, !!kpi]);

  if (!f) return <Layout title="メンバーの実績記入"><div className="empty">{loading ? '読み込み中…' : '日報が見つかりません'}</div></Layout>;

  const valOf = (mi, m) => {
    const k = `${kpiId}|${d}|${mi}`;
    if (vals[k] !== undefined) return vals[k];
    const s = getSavedResult(kpiResults, kpiId, d, mi, m.member, m.role);
    return s ? String(s.actual ?? '') : '';
  };
  const setVal = (mi, v) => setVals({ ...vals, [`${kpiId}|${d}|${mi}`]: v.replace(/[^0-9]/g, '') });

  // FP全体の総販（キャッチャー以外の合計）と、日報の「FP獲得（総販）」の差
  const rows = kpi
    ? members.map((m, mi) => ({ role: m.role, actual: +valOf(mi, m) || 0 }))
    : (manual || []).map((r) => ({ role: r.role, actual: +r.actual || 0 }));
  const fpTotal = rows.filter((r) => r.role !== 'キャッチャー').reduce((a, r) => a + r.actual, 0);
  const fpReport = +cur.fpA || 0;
  const diff = fpTotal !== fpReport;

  const save = async () => {
    setSaving(true);
    try {
      const up = {};
      let memberRows;
      if (kpi) {
        memberRows = members.map((m, mi) => {
          const actual = +valOf(mi, m) || 0;
          const target = +m.target || 0;
          up[`fp_kpi_results/${resultKey(kpiId, d, mi)}`] = {
            kpiId, date: d, memberIndex: mi, memberName: m.member || '他社', role: m.role, target, actual,
            ach: target > 0 ? Math.round((actual / target) * 100) : 0, store: kpi.store || '', channel: kpi.channel || '',
            frameId: f.legacy ? null : f.id, enteredBy: user?.name || '', updatedAt: Date.now(),
          };
          return { member: m.member || '', role: m.role, actual, other: isOther(m.member, registered) };
        });
      } else {
        memberRows = (manual || []).filter((r) => r.member || r.other).map((r) => ({ member: r.other ? '' : r.member, role: r.role, actual: +r.actual || 0, other: !!r.other }));
      }
      if (!f.legacy) up[`fp_frames/${f.id}/memberResults/${d}`] = memberRows;
      await update(ref(db), up);
      showToast(`${md(d)}の実績を保存しました`);
      const next = f.days.find((x) => x.date > d);
      if (next) setDate(next.date); else navigate(`/frames/${f.id}?date=${d}`, { replace: true });
    } catch (e) { showToast('保存できませんでした：' + e.message); }
    setSaving(false);
  };

  const label = (m) => (isOther(m.member, registered) ? '他社' : m.member);
  const writable = canWriteDay(kpiData, f.store, d, user?.name, isAdmin);
  return (
    <Layout title="メンバーの実績記入" footer={<>
      <button className="btn btn-gray" onClick={() => navigate(`/frames/${f.id}?date=${d}`, { replace: true })}>あとで入力</button>
      <button className="btn btn-p" style={{ marginTop: 0 }} disabled={saving || !writable} onClick={save}>{saving ? '保存中…' : 'この日の実績を保存'}</button></>}>
      <div className="np-wrap">
        <div className="np-frame-store">{f.store}</div>
        <div className="filter-bar" style={{ marginTop: 6 }}>
          {f.days.map((x) => <button key={x.date} className={`fchip ${x.date === d ? 'active' : ''}`} onClick={() => setDate(x.date)}>{md(x.date)}</button>)}
        </div>

        {cands.length > 1 && (
          <label className="form-group"><span>KPIを選ぶ（同じ日に候補が複数あります）</span>
            <select className="inp" value={kpiId} onChange={(e) => setKpiPick({ ...kpiPick, [d]: e.target.value })}>
              {cands.map(([kid, k]) => <option key={kid} value={kid}>{k.store}（{(k.dateMembers?.[d] || []).length}人）</option>)}
            </select>
          </label>
        )}
        {!kpi && (
          <div className="np-draft"><span>この日のKPIが登録されていません。メンバーを追加して実績を入れてください（KPIが登録されたら、KPIにも自動で反映されます）</span></div>
        )}

        <div className="np-res">
          <div><small>メンバー合計（FP総販）</small><b style={{ color: 'var(--pd)' }}>{fpTotal}</b></div>
          <div><small>日報のFP獲得（総販）</small><b>{fpReport}</b></div>
          <div><small>差</small><b style={{ color: diff ? 'var(--red)' : 'var(--green)' }}>{fpTotal - fpReport > 0 ? '+' : ''}{fpTotal - fpReport}</b></div>
        </div>
        {diff && <div className="np-warn" style={{ marginBottom: 10 }}>メンバーの実績の合計（{fpTotal}件）と、日報のFP獲得（総販）（{fpReport}件）が合っていません。入力をもう一度確認してください。</div>}

        {!writable && <div className="np-warn" style={{ marginBottom: 10 }}>{md(d)}のディレクターは {kpiDirectors(kpiData, f.store, d).join('・')} さんです。実績はディレクターだけが記入できます。</div>}
        <fieldset className="np-fs" disabled={!writable}>
        <div className="np-box">
          {kpi ? members.map((m, mi) => (
            <div className="np-row" key={mi}>
              <div className="np-row-l"><b>{label(m)}</b><div className="ts">{m.role}{m.role === 'キャッチャー' ? `・着座目標 ${m.catcherCount || m.target || '-'}` : `・目標 ${m.target || '-'}件`}</div></div>
              <div className="np-stp">
                <button type="button" onClick={() => setVal(mi, String(Math.max((+valOf(mi, m) || 0) - 1, 0)))} aria-label={`${label(m)}の実績を1減らす`}>−</button>
                <input inputMode="numeric" value={valOf(mi, m)} onChange={(e) => setVal(mi, e.target.value)} aria-label={`${label(m)}の${m.role === 'キャッチャー' ? '着座件数' : '実績件数'}`} />
                <button type="button" onClick={() => setVal(mi, String((+valOf(mi, m) || 0) + 1))} aria-label={`${label(m)}の実績を1増やす`}>＋</button>
              </div>
            </div>
          )) : (manual || []).map((r, i) => (
            <div className="np-row np-mrow" key={i}>
              <select className="inp" value={r.other ? '__other' : r.member} onChange={(e) => setManual(manual.map((x, j) => (j === i ? { ...x, other: e.target.value === '__other', member: e.target.value === '__other' ? '' : e.target.value } : x)))}>
                <option value="">名前を選ぶ</option>
                {userNames.map((n) => <option key={n} value={n}>{n}</option>)}
                <option value="__other">他社</option>
              </select>
              <select className="inp" value={r.role} onChange={(e) => setManual(manual.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>
                {ROLES.map((ro) => <option key={ro} value={ro}>{ro}</option>)}
              </select>
              <input className="inp" inputMode="numeric" placeholder={r.role === 'キャッチャー' ? '着座' : '件数'} value={r.actual} onChange={(e) => setManual(manual.map((x, j) => (j === i ? { ...x, actual: e.target.value.replace(/[^0-9]/g, '') } : x)))} />
              <button type="button" className="np-dash" onClick={() => setManual(manual.filter((_, j) => j !== i))} aria-label="この行を削除">×</button>
            </div>
          ))}
          {!kpi && <div className="np-row"><button className="fchip" onClick={() => setManual([...(manual || []), { member: '', role: 'クローザー', actual: '', other: false }])}>＋ メンバーを追加</button></div>}
        </div>
        </fieldset>
        {f.legacy && !kpi && <div className="ts">※旧形式の日報のため、KPIが無い日の実績は保存できません。日報を一度保存し直してください。</div>}
      </div>
    </Layout>
  );
}
