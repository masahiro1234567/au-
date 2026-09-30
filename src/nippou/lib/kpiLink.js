// ===== KPI（社員が登録）と日報（ディレクターが記入）の突き合わせ =====
// 店舗名は「エディオン堺インター」と「エディオン堺インター店」のようなずれを許す（スペース・末尾の「店」を無視、片方がもう片方を含めば一致）
export const normStore = (s) => String(s || '').replace(/[\s　]/g, '').replace(/店$/, '').toLowerCase();
export function storeMatch(a, b) {
  const x = normStore(a), y = normStore(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
}
// その日・その店舗のKPI（[id, kpi] の一覧）
export function findKpis(kpiData, store, date) {
  return Object.entries(kpiData || {}).filter(([, k]) => k && (k.dates || []).includes(date) && storeMatch(k.store, store));
}
export const kpiMembers = (k, date) => ((k && k.dateMembers && k.dateMembers[date]) || []).filter((m) => m && (m.member || m.role));
// 実績は「KPIのID_日付_メンバーの行番号」で1件に決めて保存する
export const resultKey = (kpiId, date, mi) => `${kpiId}_${date}_${mi}`;
export function getSavedResult(kpiResults, kpiId, date, mi, member, role) {
  const all = kpiResults || {};
  if (all[resultKey(kpiId, date, mi)]) return all[resultKey(kpiId, date, mi)];
  const list = Object.values(all).filter((r) => r && r.kpiId === kpiId && r.date === date &&
    (r.memberIndex === mi || (r.memberIndex === undefined && r.memberName === member && r.role === role)));
  return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;
}
// 登録されていない人は「他社」
export const isOther = (name, registeredNames) => !name || name === '他社' || !registeredNames.has(name);
// KPIが後から登録された場合：日報の実績記入（memberResults）から、その人の実績を探す
// 登録メンバーは名前で、他社は「同じ役割の何人目か」で対応させる
export function resultFromFrames(frames, kpi, date, mi, registeredNames) {
  const members = kpiMembers(kpi, date);
  const m = members[mi];
  if (!m) return null;
  for (const f of frames || []) {
    if (!storeMatch(f.store, kpi.store)) continue;
    const rows = ((f.memberResults || {})[date] || []).filter(Boolean);
    if (!rows.length) continue;
    if (!isOther(m.member, registeredNames)) {
      const hit = rows.find((r) => r.member === m.member);
      if (hit) return hit;
    } else {
      const nth = members.slice(0, mi + 1).filter((x) => isOther(x.member, registeredNames) && x.role === m.role).length - 1;
      const others = rows.filter((r) => r.other && r.role === m.role);
      if (others[nth]) return others[nth];
    }
  }
  return null;
}

// その日のKPIでディレクターに割り当てられている人（KPIが無ければ空）
export function kpiDirectors(kpiData, store, date) {
  const names = [];
  findKpis(kpiData, store, date).forEach(([, k]) => kpiMembers(k, date).forEach((m) => { if (m.role === 'ディレクター' && m.member) names.push(m.member); }));
  return [...new Set(names)];
}
// 日報を書けるか：管理者、KPIが無い日、またはその日のディレクターに割り当てられている人
export const canWriteDay = (kpiData, store, date, userName, isAdmin) => {
  if (isAdmin) return true;
  const ds = kpiDirectors(kpiData, store, date);
  return !ds.length || ds.includes(userName);
};
