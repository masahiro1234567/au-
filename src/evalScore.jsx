import React from 'react';
// ===== 総合評価の自動計算（スプレッドシートの計算式と同じ）=====
// 項目のランクを 秀5・優4・良3・可2・不可1 で足し、現場評価（キャッチ×3・クローズ×6・ディレクター×3）を足した点数で決める。
// 区切り（この点数以下ならそのランク）：
//   キャッチャー：〜12 不可／〜21 可／〜30 良／〜39 優／〜45 秀
//   クローズ　　：〜22 不可／〜38 可／〜54 良／〜70 優／〜80 秀
//   ディレクター：〜11 不可／〜19 可／〜27 良／〜35 優／〜40 秀
// 点数は管理者の画面だけに出す。メンバーの画面にはランクだけ。
export const PT = { 秀: 5, 優: 4, 良: 3, 可: 2, 不可: 1 };
export const SCORE_DEF = [
  { label: 'キャッチャー', sec: /キャッチ/, field: /キャッチ/, w: 3, cut: [12, 21, 30, 39], max: 45 },
  { label: 'クローズ', sec: /クローズ/, field: /クローズ/, w: 6, cut: [22, 38, 54, 70], max: 80 },
  { label: 'ディレクター', sec: /ディレク/, field: /ディレク/, w: 3, cut: [11, 19, 27, 35], max: 40 },
];
const isField = (s) => /現場/.test(s.section || '');
const rankOf = (d, sc) => (sc <= d.cut[0] ? '不可' : sc <= d.cut[1] ? '可' : sc <= d.cut[2] ? '良' : sc <= d.cut[3] ? '優' : '秀');

// skills：[{ section, item, rank, prev }]。pick(s) で使うランクを選べる（評価作成で、まだ保存していない今回のランクを使うときなど）
// 戻り値：{ キャッチャー: { rank, score, max, prevRank, prevScore }, ... }（その区分の項目が無いときは入らない）
export function autoTotals(skills, pick = (s) => s.rank) {
  const list = Array.isArray(skills) ? skills.filter(Boolean) : [];
  const out = {};
  SCORE_DEF.forEach((d) => {
    const items = list.filter((s) => !isField(s) && d.sec.test(s.section || ''));
    if (!items.length) return;
    const field = list.find((s) => isField(s) && d.field.test(s.item || ''));
    const sum = (get) => items.reduce((a, s) => a + (PT[get(s)] || 0), 0) + (field ? (PT[get(field)] || 0) * d.w : 0);
    const has = (get) => items.some((s) => PT[get(s)]) || (field && PT[get(field)]);
    const score = sum(pick), prevScore = sum((s) => s.prev);
    out[d.label] = {
      rank: has(pick) ? rankOf(d, score) : '', score, max: d.max,
      prevRank: has((s) => s.prev) ? rankOf(d, prevScore) : '', prevScore,
    };
  });
  return out;
}
// 保存用の totals（自動で出せない区分は、今までの値をそのまま使う）
export function totalsFromSkills(skills, oldTotals, labels) {
  const auto = autoTotals(skills);
  return labels.map((l) => {
    const old = (Array.isArray(oldTotals) ? oldTotals : []).find((t) => t && t.label === l) || { label: l, rank: '' };
    return auto[l] ? { ...old, label: l, rank: auto[l].rank, prev: auto[l].prevRank } : old;
  });
}

// ===== 前回との比較：▲ 上昇／▼ 低下／➖ 維持 =====
export function rankDelta(now, prev) {
  if (!PT[now] || !PT[prev]) return null;
  const d = PT[now] - PT[prev];
  return d > 0 ? 'up' : d < 0 ? 'down' : 'same';
}
const DELTA_LABEL = { up: '▲ 上昇', down: '▼ 低下', same: '➖ 維持' };
export function DeltaTag({ now, prev }) {
  const k = rankDelta(now, prev);
  if (!k) return <span className="ev-dt none" />;
  return <span className={`ev-dt ${k}`}>{DELTA_LABEL[k]}</span>;
}
// 行の色（上昇＝薄いオレンジ、低下＝薄い青）
export const deltaRowClass = (now, prev) => { const k = rankDelta(now, prev); return k && k !== 'same' ? `dt-${k}` : ''; };
