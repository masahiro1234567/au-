// ===== 日報枠（何日〜何日の日報）=====
// 新しい保存先：fp_frames/{id} = { store, channel, ta, tb, days: { 'YYYY-MM-DD': 1日分 }, mikomi: { 'YYYY-MM-DD': { g, d } }, createdBy, createdAt, updatedAt }
// 今までの日報（fp_reports：1日1件）は、同じ店舗で日付が連続しているものを自動で1つの枠にまとめて表示する。
// 旧データの枠を保存し直すと fp_frames に新しく保存し、元の fp_reports には migratedTo を付けて二重に表示しない
import { useMemo } from 'react';
import { useFirebaseList } from './useFirebaseList';

export const DOWS = ['日', '月', '火', '水', '木', '金', '土'];
export const CHANNELS = ['イオン', 'エディオン', 'ジョーシン', 'ケーズデンキ', 'ヤマダ', 'コジマ', 'その他'];
export const AU_L = ['純新規', 'MNP(UQ⇒au)', 'MNP(SB⇒au)', 'MNP(DCM⇒au)', 'MNP(YM⇒au)', 'MNP(楽天⇒au)', 'MNP(その他⇒au)', '機種変更'];
export const UQ_L = ['純新規', 'MNP(au⇒UQ)', 'MNP(SB⇒UQ)', 'MNP(DCM⇒UQ)', 'MNP(YM⇒UQ)', 'MNP(楽天⇒UQ)', 'MNP(その他⇒UQ)', '機種変更'];
export const FT_L = ['auひかり', 'BIGLOBE光', 'eo光', 'CATV', 'WiMAX'];
export const BR = [['bFp', 'アンケート（内FP）'], ['bFc', 'フリーキャッチ'], ['bPop', '什器/POP'], ['bTa', '家電/TA'], ['bFuri', '振り（常勤/他）']];
export const AL_L = ['KDDI→eo', 'eo→KDDI', 'KDDI→CATV', 'CATV→KDDI'];
export const OT_L = ['Softbank', 'docomo', 'Ymobile', '楽天'];

export const parseDate = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayStr = () => ymd(new Date());
export const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return ymd(d); };
export const md = (s) => { const d = parseDate(s); return `${d.getMonth() + 1}/${d.getDate()}（${DOWS[d.getDay()]}）`; };
export const dowLabel = (s) => DOWS[parseDate(s).getDay()] + '曜日';
// 日報枠の記入者（ディレクター）の名前。途中で交代した場合は並べる
export const directorsOf = (f) => [...new Set((f.days || []).map((d) => d.director).filter(Boolean))].join('・');
export const detectChannel = (store) => CHANNELS.find((c) => c !== 'その他' && (store || '').includes(c)) || '';
export function datesBetween(start, end) {
  const out = [];
  if (!start || !end || start > end) return out;
  for (let d = start; d <= end && out.length < 62; d = addDays(d, 1)) out.push(d);
  return out;
}

const n = (v) => +v || 0;
export function emptyDay(date) {
  return {
    date, director: '', au: Array(8).fill(''), uq: Array(8).fill(''), fpA: '', fpB: '', ank: '',
    bFp: ['', '', '', ''], bFc: ['', '', '', ''], bPop: ['', '', '', ''], bTa: ['', '', '', ''], bFuri: ['', '', '', ''],
    ft: ['', '', '', '', ''], ld: ['', ''], other: '', al: [['', ''], ['', ''], ['', ''], ['', '']], alEff: '',
    // 他社実績は空欄から（未記入は日報テキストで0になる）
    ot: [['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', '']],
    hiyari: '', txtOv: '', txtRs: '',
  };
}
// その日に実績の入力があるか（au・UQのどれかが入っている）
export const dayFilled = (d) => !!d && [...(d.au || []), ...(d.uq || [])].some((v) => v !== '' && v != null);

// 総販：au全部＋UQ（au⇒UQのMNPを除く）／リク抜き：総販からMNP(UQ⇒au)・au機変・UQ機変を除く（ダウンは数えない）
export function calcDay(d) {
  const au = (d && d.au) || [], uq = (d && d.uq) || [];
  const souhan = au.reduce((a, b) => a + n(b), 0) + uq.reduce((a, b) => a + n(b), 0) - n(uq[1]);
  return { souhan, riku: souhan - (n(au[1]) + n(au[7]) + n(uq[7])) };
}
export function calcFrame(frame, uptoDate) {
  return (frame.days || []).filter((d) => !uptoDate || d.date <= uptoDate).reduce((a, d) => {
    const c = calcDay(d); return { s: a.s + c.souhan, r: a.r + c.riku };
  }, { s: 0, r: 0 });
}

// ---- 旧データ（fp_reports）を1日分の形に ----
function legacyDay(id, r) {
  const d = emptyDay(r.date);
  const arr = (v, len) => (Array.isArray(v) ? v.map((x) => (x == null ? '' : String(x))) : Array(len).fill(''));
  d.director = r.director || r.userName || '';
  d.au = arr(r.au || (r.au_by_day && r.au_by_day[0]), 8);
  d.uq = arr(r.uq || (r.uq_by_day && r.uq_by_day[0]), 8);
  d.fpA = String(r.fpA ?? r.fp_by_day?.[0]?.a ?? '');
  d.fpB = String(r.fpB ?? r.fp_by_day?.[0]?.b ?? '');
  d.hiyari = r.hiyari === '特に無し。' ? '' : r.hiyari || '';
  d.ank = String(r.ank ?? '');
  d.bFp = r.b_fp || d.bFp; d.bFc = r.b_fc || d.bFc; d.bPop = r.b_pop || d.bPop; d.bTa = r.b_ta || d.bTa; d.bFuri = r.b_furi || d.bFuri;
  d.ft = r.ft || d.ft; d.ld = r.ld || d.ld; d.other = r.other || '';
  d.al = r.al || d.al; d.alEff = r.al_eff || ''; d.ot = r.ot || d.ot;
  d.txtOv = r.txt_ov || ''; d.txtRs = r.txt_rs || '';
  d.legacyId = id;
  return d;
}

// 保存形式（days / mikomi がオブジェクト）→ 画面で使う形（days が日付順の配列）
export function normalizeFrame(id, f) {
  const daysObj = f.days || {};
  const days = Object.keys(daysObj).sort().map((date) => ({ ...emptyDay(date), ...daysObj[date], date }));
  const mr = {};
  Object.entries(f.memberResults || {}).forEach(([k, v]) => { mr[k] = Array.isArray(v) ? v.filter(Boolean) : Object.values(v || {}).filter(Boolean); });
  return { id, ...f, days, mikomi: f.mikomi || {}, memberResults: mr, legacy: false };
}

// 旧データを「同じ店舗・日付が連続（1日以内の間隔）」でまとめる
function groupLegacy(reports) {
  const byStore = {};
  Object.entries(reports || {}).forEach(([id, r]) => {
    if (!r || !r.date || r.migratedTo) return;
    (byStore[r.store || ''] = byStore[r.store || ''] || []).push([id, r]);
  });
  const frames = [];
  Object.values(byStore).forEach((list) => {
    list.sort((a, b) => (a[1].date > b[1].date ? 1 : a[1].date < b[1].date ? -1 : 0));
    let cur = null;
    list.forEach(([id, r]) => {
      const prev = cur && cur.days[cur.days.length - 1];
      if (cur && prev && (prev.date === r.date || addDays(prev.date, 1) === r.date)) {
        if (prev.date === r.date) return; // 同じ日の重複は最初の1件だけ
        cur.days.push(legacyDay(id, r)); cur.legacyIds.push(id);
        if (r.mikomiG || r.mikomiD) cur.mikomi[r.date] = { g: String(r.mikomiG || ''), d: String(r.mikomiD || '') };
      } else {
        cur = { id: 'legacy_' + id, legacy: true, legacyIds: [id], store: r.store || '', channel: r.channel || detectChannel(r.store || ''),
          ta: String(r.r_ta || ''), tb: String(r.r_tb || ''), createdBy: r.userName || r.director || '', days: [legacyDay(id, r)], mikomi: {} };
        if (r.mikomiG || r.mikomiD) cur.mikomi[r.date] = { g: String(r.mikomiG || ''), d: String(r.mikomiD || '') };
        frames.push(cur);
      }
    });
  });
  return frames;
}

// 日報枠の一覧（新しい枠＋旧データをまとめた枠）。新しい順
export function useFrames() {
  const { data: framesRaw, loading: l1 } = useFirebaseList('fp_frames');
  const { data: reports, loading: l2 } = useFirebaseList('fp_reports');
  const frames = useMemo(() => {
    const list = [...Object.entries(framesRaw).map(([id, f]) => normalizeFrame(id, f)), ...groupLegacy(reports)]
      .filter((f) => f.days.length);
    list.forEach((f) => { f.start = f.days[0].date; f.end = f.days[f.days.length - 1].date; });
    return list.sort((a, b) => (b.start > a.start ? 1 : b.start < a.start ? -1 : 0));
  }, [framesRaw, reports]);
  return { frames, loading: l1 || l2 };
}

// 画面の形 → 保存形式
export function toStored(frame, extra) {
  const days = {};
  frame.days.forEach((d) => { const { legacyId, ...rest } = d; days[d.date] = rest; });
  const mikomi = {};
  frame.days.forEach((d) => { if (frame.mikomi && frame.mikomi[d.date]) mikomi[d.date] = frame.mikomi[d.date]; });
  // メンバーの実績記入（日付ごと）も消さずに持ち続ける
  const memberResults = {};
  frame.days.forEach((d) => { const r = frame.memberResults && frame.memberResults[d.date]; if (r) memberResults[d.date] = r; });
  // 編集権限は日ごと（days/{日付}/editors）。以前の日報枠まるごとの形は、読み込むときに各日へ移している
  return { store: frame.store, channel: frame.channel, ta: frame.ta, tb: frame.tb, days, mikomi, memberResults, editors: null, ...extra };
}

// ===== 日報テキスト =====
// その日の日報に、枠の初日からその日までの全日分の実績と、全日程分の店舗様見込み獲得を並べる。未記入は0
const blank = (v, m = '0') => (v === '' || v == null ? m : v);
const blankT = (v) => (v && String(v).trim() ? v : '-');
export function buildText(frame, date) {
  const all = frame.days;
  const d = all.find((x) => x.date === date) || all[all.length - 1];
  const upto = all.filter((x) => x.date <= d.date);
  const tot = upto.reduce((a, x) => { const c = calcDay(x); return { s: a.s + c.souhan, r: a.r + c.riku }; }, { s: 0, r: 0 });
  const mk = frame.mikomi || {};
  const mkSum = all.reduce((a, x) => ({ g: a.g + n((mk[x.date] || {}).g), d: a.d + n((mk[x.date] || {}).d) }), { g: 0, d: 0 });
  const q = (arr) => (arr || []).map((v) => blank(v)).join('/');
  return `お疲れ様です。
${d.director || frame.createdBy || '●●'}です。
本日の日報を下記に記載いたします。

⚠️ヒヤリハット報告⚠️
${blankT(d.hiyari)}

■実績：2Bダウン除き総販/2Bリク除き
目　標 : ${blank(frame.ta)}/${blank(frame.tb)}
${upto.map((x) => { const c = calcDay(x); return `${dowLabel(x.date)} : ${c.souhan}/${c.riku}（内FP獲得${blank(x.fpA)}/${blank(x.fpB)}）`; }).join('\n')}
残　数：${Math.max(n(frame.ta) - tot.s, 0)}/${Math.max(n(frame.tb) - tot.r, 0)}

■店舗様見込み獲得（${mkSum.g}組/${mkSum.d}台）
※常勤様の当日獲得は除く
${all.map((x) => `${dowLabel(x.date)}獲得 : ${blank((mk[x.date] || {}).g)}組${blank((mk[x.date] || {}).d)}台`).join('\n')}

■内訳（接客組/着座組/成約組/成約台数）
アンケート枚数（全体）：${blank(d.ank)}枚
${BR.map(([k, l]) => `${l}：${q(d[k])}`).join('\n')}

■au mobile実績
純新規獲得件数：${blank(d.au[0])}件
${AU_L.slice(1, 7).map((l, i) => `${l}：${blank(d.au[i + 1])}件`).join('\n')}
機種変更獲得件数：${blank(d.au[7])}件

■UQ mobile実績
純新規獲得件数：${blank(d.uq[0])}件
${UQ_L.slice(1, 7).map((l, i) => `${l}：${blank(d.uq[i + 1])}件`).join('\n')}
機種変更件数：${blank(d.uq[7])}件

■FTTH実績
${FT_L.map((l, i) => `${l}：${blank(d.ft[i])}件`).join('\n')}

■ライフデザイン実績
auでんき：${blank(d.ld[0])}件
auPayカード：${blank(d.ld[1])}件

■その他獲得商材
${blankT(d.other)}

■アライアンス協業
❶振り組数/成約組数
${AL_L.map((l, i) => `${l} : ${blank((d.al[i] || [])[0])}/${blank((d.al[i] || [])[1])}`).join('\n')}

❷アライアンス様連携（eo/CATV）取組み工夫
${blankT(d.alEff)}

■他社実績
(純新規/MNP/番号移行/機変)
※他社取扱がない場合は「ー」を記入ください。
${OT_L.map((l, i) => `${l}：${(d.ot[i] || []).map((v) => blank(v)).join('/')}`).join('\n')}

■全体総括（活動内容/集客状況/他社状況）
${blankT(d.txtOv)}

■【達成：達成理由】【未達：改善策】
${blankT(d.txtRs)}

■【添付】着座管理シート貼付

ご確認の程、よろしくお願いいたします。`;
}
