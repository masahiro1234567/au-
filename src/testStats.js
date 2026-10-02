// ===== テストの進捗・メンバー進捗・ランキングの集計 =====
// 人のまとめ方：名前のスペース・全角半角の違いを無視して同じ人にする（「服部将大」と「服部 将大」は同じ人）
// 進捗：全用語を100%として、テストで一度でも正解できた用語の割合
// ランキング：月曜〜日曜の週ごとに「ログイン日数」「テスト回数」「その週に新しく正解できた用語の数」
import { dbSet } from './useFirebase.js';

export const normName = (s) => String(s || '').normalize('NFKC').replace(/[\s　]/g, '');
// Firebaseのキーに使える形（名前をそのまま使うと記号で弾かれることがあるため）
export const nameKey = (s) => {
  const n = normName(s);
  try { return btoa(unescape(encodeURIComponent(n))).replace(/[=+/]/g, (c) => ({ '=': '', '+': '-', '/': '_' }[c])); } catch { return n; }
};

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const ym = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
// 月曜はじまりの週。offset=0 が今週、-1 が先週
export function weekRange(offset = 0) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7) + offset * 7);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const end = new Date(sun); end.setDate(sun.getDate() + 1);
  return { start: mon.getTime(), end: end.getTime(), startStr: ymd(mon), endStr: ymd(sun), label: `${mon.getMonth() + 1}/${mon.getDate()}（月）〜${sun.getMonth() + 1}/${sun.getDate()}（日）` };
}

// テストの記録（練習は数えない。練習機能は廃止したが、以前の練習の記録が残っていても除く）
const testsOf = (results) => Object.values(results || {}).filter((r) => r && r.mode !== 'practice' && r.userName);

// 人ごとにまとめる：{ key: { name, pos, tests:[...], firstCorrect:{用語名: 時刻} } }
export function buildPeople(results, profiles) {
  const people = {};
  const get = (name) => {
    const k = normName(name);
    if (!k) return null;
    if (!people[k]) people[k] = { key: k, name, pos: '', cr: '', tests: [], firstCorrect: {} };
    return people[k];
  };
  Object.values(profiles || {}).forEach((p) => { const u = p && get(p.name); if (u) { u.pos = p.pos || u.pos; u.cr = p.closerRank || u.cr; } });
  testsOf(results).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).forEach((r) => {
    const u = get(r.userName);
    if (!u) return;
    if (!u.pos) u.pos = r.userPos || '';
    u.tests.push(r);
    (r.detail || []).forEach((d) => { if (d && d.correct && d.name && !u.firstCorrect[d.name]) u.firstCorrect[d.name] = r.createdAt || 0; });
  });
  return people;
}

// 進捗：今ある用語のうち、正解できた用語の割合（ランク別の内訳つき）
export const RANK_ORDER = ['秀', '優', '良', '可'];
export function progressOf(person, terms) {
  const list = Object.values(terms || {}).filter((t) => t && t.name);
  const byRank = {};
  RANK_ORDER.forEach((r) => { byRank[r] = { done: 0, total: 0 }; });
  let done = 0;
  list.forEach((t) => {
    const r = byRank[t.rank] ? t.rank : null;
    const ok = !!(person && person.firstCorrect[t.name]);
    if (r) { byRank[r].total++; if (ok) byRank[r].done++; }
    if (ok) done++;
  });
  return { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0, byRank };
}

// ランキング
export function weeklyRanking(people, activity, offset) {
  const w = weekRange(offset);
  return Object.values(people).map((u) => {
    const days = Object.keys(((activity || {})[nameKey(u.name)] || {}).days || {}).filter((d) => d >= w.startStr && d <= w.endStr).length;
    const tests = u.tests.filter((r) => (r.createdAt || 0) >= w.start && (r.createdAt || 0) < w.end).length;
    const prog = Object.values(u.firstCorrect).filter((t) => t >= w.start && t < w.end).length;
    return { key: u.key, name: u.name, login: days, test: tests, prog };
  });
}

// au navi を開いた日を記録（1日1回）。ランキングの「ログイン」に使う
export function recordOpen(user) {
  if (!user || !user.name) return;
  const today = ymd(new Date());
  const k = `aunavi_open_${normName(user.name)}`;
  try { if (localStorage.getItem(k) === today) return; localStorage.setItem(k, today); } catch { /* 記録だけ続ける */ }
  dbSet(`user_activity/${nameKey(user.name)}/days/${today}`, true);
  dbSet(`user_activity/${nameKey(user.name)}/name`, user.name);
}
