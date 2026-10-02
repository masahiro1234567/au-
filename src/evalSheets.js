// ===== 評価一覧：スプレッドシートの読み取り結果を、画面で使う形にする =====
// タブの中身を見て、自動で種類を判定する
//   summary：スタッフ一覧／評価サマリ（「氏名」と「キャッチ」などの見出しがある表）
//   kpi：月次KPI進捗（「4月」「5月」…の見出しと、目標／実績／達成率の行）
//   standard：評価基準（秀／優／良／可／不可の説明）
//   person：個人別 育成計画シート（「氏名」「現状スキル評価」などのラベル）
//   table：上のどれでもない表（1行目を見出しとしてそのまま表示）
export const RANKS5 = ['秀', '優', '良', '可', '不可'];
export const RANK_STYLE = {
  秀: { bg: '#e53935', fg: '#fff' }, 優: { bg: '#f6ad6b', fg: '#fff' }, 良: { bg: '#fde68a', fg: '#7a5b00' },
  可: { bg: '#a7d38f', fg: '#245c12' }, 不可: { bg: '#9ca3af', fg: '#fff' },
};
export const normName = (s) => String(s || '').normalize('NFKC').replace(/[\s　]/g, '');
const t = (v) => String(v == null ? '' : v).trim();
const clean = (v) => t(v).replace(/\s*\n\s*/g, ' ');

// 文字が入っている最初のセル（ラベル探し）
function find(grid, pred, from = [0, 0]) {
  for (let r = from[0]; r < grid.length; r++) {
    const row = grid[r] || [];
    for (let c = r === from[0] ? from[1] : 0; c < row.length; c++) if (pred(t(row[c]), r, c)) return [r, c];
  }
  return null;
}
const has = (s, w) => s.replace(/\s/g, '').includes(w);
// ラベルの右にある最初の値
function rightOf(grid, label, maxGap = 4) {
  const p = find(grid, (s) => has(s, label));
  if (!p) return '';
  const row = grid[p[0]] || [];
  for (let c = p[1] + 1; c <= p[1] + maxGap && c < row.length; c++) if (t(row[c])) return t(row[c]);
  return '';
}
const rowText = (grid, r) => (grid[r] || []).map(t).filter(Boolean);

export function classify(sheet) {
  const g = sheet.values || [];
  const all = g.slice(0, 60).map((r) => (r || []).map(t).join('｜')).join('\n');
  if (/育成計画/.test(sheet.title + all) || (/現状スキル評価/.test(all) && /氏名/.test(all))) return 'person';
  if (/評価基準/.test(sheet.title + all) && /不可/.test(all)) return 'standard';
  if (/KPI/.test(sheet.title + all) && /4月/.test(all) && /目標/.test(all)) return 'kpi';
  if (/氏名/.test(all) && (/キャッチ/.test(all) || /現役割/.test(all))) return 'summary';
  return 'table';
}

// ---- スタッフ一覧／評価サマリ ----
export function parseSummary(sheet) {
  const g = sheet.values || [];
  const h = find(g, (s, r) => s === '氏名' || (has(s, '氏名') && rowText(g, r).length >= 4));
  if (!h) return { headers: [], rows: [] };
  const hr = h[0];
  const headers = (g[hr] || []).map((x, c) => ({ c, label: clean(x) })).filter((x) => x.label && !/^No\.?$/i.test(x.label.replace(/\s/g, '')));
  const nameCol = h[1];
  const rows = [];
  for (let r = hr + 1; r < g.length; r++) {
    const name = t((g[r] || [])[nameCol]);
    if (!name) continue;
    const cells = {};
    headers.forEach((x) => { cells[x.label] = t((g[r] || [])[x.c]); });
    rows.push({ name, key: normName(name), cells });
  }
  const rankCols = headers.filter((x) => rows.some((row) => RANKS5.includes(row.cells[x.label]))).map((x) => x.label);
  // まとまり：見出しの1つ上の行に、結合セルで「キャッチ力」などが書かれている（結合セルは左端だけに値が入る）
  const groups = {};
  const gr = g[hr - 1] || [];
  const gCells = gr.map((x, c) => ({ c, v: clean(x) })).filter((x) => x.v);
  if (hr >= 1 && gCells.length >= 2) {
    headers.forEach((x) => {
      const owner = [...gCells].reverse().find((y) => y.c <= x.c);
      if (owner) groups[x.label] = owner.v;
    });
  }
  return { title: t((g[0] || [])[0]) || sheet.title, headers: headers.map((x) => x.label), rankCols, groups, rows };
}

// ---- 月次KPI進捗 ----
export function parseKpi(sheet) {
  const g = sheet.values || [];
  const h = find(g, (s) => s === '4月');
  if (!h) return { months: [], items: [] };
  const hr = h[0];
  const months = [];
  (g[hr] || []).forEach((x, c) => { if (c >= h[1] && /^\d{1,2}月$/.test(t(x))) months.push({ c, label: t(x) }); });
  const items = [];
  let cur = null;
  for (let r = hr + 1; r < g.length; r++) {
    const row = g[r] || [];
    const kindCell = row.slice(0, h[1]).map(t).filter(Boolean);
    const vals = months.map((m) => t(row[m.c]));
    if (!kindCell.length && vals.every((v) => !v)) continue;
    const kindIdx = row.slice(0, h[1]).findIndex((x) => /目標|実績|達成率/.test(t(x)));
    const kind = kindIdx >= 0 ? t(row[kindIdx]) : '';
    const name = row.slice(0, kindIdx >= 0 ? kindIdx : h[1]).map(clean).filter(Boolean).join(' ');
    if (!kind) continue; // 凡例などの行は使わない
    if (name) { cur = { name, rows: [] }; items.push(cur); }
    if (!cur) { cur = { name: '', rows: [] }; items.push(cur); }
    cur.rows.push({ kind, values: vals });
  }
  const note = t((g[1] || [])[0]);
  return { title: t((g[0] || [])[0]) || sheet.title, note, months: months.map((m) => m.label), items };
}

// ---- 評価基準 ----
export function parseStandard(sheet) {
  const g = sheet.values || [];
  const list = [];
  g.forEach((row) => {
    const cells = (row || []).map(t);
    const i = cells.findIndex((x) => RANKS5.includes(x));
    if (i >= 0) { const d = cells.slice(i + 1).find(Boolean); if (d && !list.some((x) => x.rank === cells[i])) list.push({ rank: cells[i], desc: d }); }
  });
  return { title: t((g[0] || [])[0]) || sheet.title, list };
}

// 見出しの行（例：「評価項目｜観点｜ランク…」）を探して、各列の位置を返す
function headerCols(grid, labels, from = [0, 0]) {
  const p = find(grid, (s, r) => labels.every((l) => (grid[r] || []).some((x) => has(t(x), l))) && has(s, labels[0]), from);
  if (!p) return null;
  const row = grid[p[0]] || [];
  const cols = {};
  labels.forEach((l) => { cols[l] = row.findIndex((x) => has(t(x), l)); });
  return { r: p[0], cols };
}
const sectionTitle = (grid, r) => { const cells = rowText(grid, r); return cells.length === 1 ? cells[0] : ''; };

// ---- 個人別 育成計画シート ----
export function parsePerson(sheet) {
  const g = sheet.values || [];
  // 名前：「氏名」のすぐ右のセル。空のときに隣の「フリガナ」やその中身を名前として拾わない
  const np = find(g, (x) => has(x, '氏名'));
  const nameCell = np ? t((g[np[0]] || [])[np[1] + 1]) : '';
  const name = nameCell && !/フリガナ|ふりがな|現役割|稼働開始/.test(nameCell) ? nameCell : '';
  const info = { name, kana: rightOf(g, 'フリガナ'), role: rightOf(g, '現役割'), start: rightOf(g, '稼働開始日'), period: rightOf(g, '評価期間') };
  // 総合評価（キャッチャー／クローズ／ディレクター）
  const totals = [];
  const goalsSheet = [];
  g.forEach((row, r) => (row || []).forEach((x, c) => {
    const s = t(x);
    if (has(s, '総合評価')) {
      const label = clean(s).replace('総合評価', '').replace(/[（()）]/g, '').trim() || '総合';
      const v = (g[r] || []).slice(c + 1, c + 4).map(t).find((y) => RANKS5.includes(y)) || '';
      // 「クローズ秀」のように、項目名の最後にランクが付いているものは目標（右のセルが達成条件）
      const gm = label.match(/^(.*?)(秀|優|良|可|不可)$/);
      if (gm && !v) {
        const cond = (g[r] || []).slice(c + 1).map(clean).find(Boolean) || '';
        goalsSheet.push({ item: gm[1].trim(), rank: gm[2], cond });
      } else totals.push({ label, rank: v });
    }
  }));
  // 現状スキル評価・現場評価（評価項目｜観点｜ランク｜前回ランク｜コメント）
  const skills = [];
  const hc = headerCols(g, ['評価項目', '観点', 'ランク']);
  if (hc) {
    const cols = hc.cols;
    const prevCol = (g[hc.r] || []).findIndex((x) => has(t(x), '前回'));
    const comCol = (g[hc.r] || []).findIndex((x) => has(t(x), 'コメント'));
    let section = '';
    let blank = 0;
    // 右側に別の表（目標設定など）が並んでいるので、左側の列だけを見る
    const leftEnd = Math.max(cols['評価項目'], cols['観点'], cols['ランク'], prevCol, comCol) + 1;
    for (let r = hc.r + 1; r < g.length && blank < 4; r++) {
      const row = g[r] || [];
      const left = row.slice(0, leftEnd).map(t).filter(Boolean);
      const item = clean(row[cols['評価項目']]);
      if (item.startsWith('■')) { section = item.replace(/^■\s*/, ''); blank = 0; continue; }
      if (!item && left.length === 1) { section = left[0]; blank = 0; continue; }
      if (!item) { if (!left.length) blank++; continue; }
      blank = 0;
      const view = clean(row[cols['観点']]), rk = t(row[cols['ランク']]), pv = prevCol >= 0 ? t(row[prevCol]) : '', cm = comCol >= 0 ? clean(row[comCol]) : '';
      if (!view && !rk && !pv && !cm) { section = item; continue; }
      skills.push({ section, item, view: clean(row[cols['観点']]), rank: t(row[cols['ランク']]), prev: prevCol >= 0 ? t(row[prevCol]) : '', comment: comCol >= 0 ? clean(row[comCol]) : '' });
    }
  }
  // 具体評価（直近／前回／前々回）
  // 店舗名は、ラベルのかっこの中（例：「直近の評価（エディオン◯◯店）」）
  const reviews = ['直近の評価', '前回の評価', '前々回の評価'].map((l) => {
    const p = find(g, (x) => has(x, l));
    const lab = p ? clean((g[p[0]] || [])[p[1]]) : '';
    const m = lab.match(/[（(]\s*([^）)]+?)\s*[)）]/);
    return { label: l, store: m ? m[1] : '', text: rightOf(g, l, 6) };
  }).filter((x) => x.text || x.store);
  // 表（見出しの次の行から、空行まで）
  const table = (labels) => {
    const h = headerCols(g, labels);
    if (!h) return [];
    const row0 = g[h.r] || [];
    const start = h.cols[labels[0]];
    const heads = [];
    for (let c = start; c < row0.length && heads.length < 8; c++) { if (t(row0[c])) heads.push({ c, label: clean(row0[c]) }); else if (heads.length && c - heads[heads.length - 1].c > 3) break; }
    const out = [];
    for (let r = h.r + 1; r < g.length; r++) {
      const vals = heads.map((x) => clean((g[r] || [])[x.c]));
      if (vals.every((v) => !v) || sectionTitle(g, r).startsWith('■')) break;
      out.push(Object.fromEntries(heads.map((x, i) => [x.label, vals[i]])));
    }
    return { heads: heads.map((x) => x.label), rows: out };
  };
  const goals = table(['スパン', '期間']);
  const actions = table(['対象スキル', 'アクション']);
  const logs = table(['記入日']);
  const filled = (tb) => (tb && tb.rows ? { ...tb, rows: tb.rows.filter((row) => Object.entries(row).some(([k, v]) => v && !/^No\.?$/i.test(k) && !/^\d+$/.test(v))) } : { heads: [], rows: [] });
  return { title: sheet.title, key: normName(name || sheet.title), info, totals, goalsSheet, skills, reviews, goals: filled(goals), actions: filled(actions), logs: filled(logs) };
}

// ---- その他の表 ----
export function parseTable(sheet) {
  const g = (sheet.values || []).filter((r) => (r || []).some((x) => t(x)));
  return { title: sheet.title, heads: (g[0] || []).map(clean), rows: g.slice(1).map((r) => (r || []).map(clean)) };
}

export function parseBook(book) {
  const out = { summary: null, kpi: null, standard: null, persons: [], tables: [] };
  (book.sheets || []).forEach((s) => {
    const k = classify(s);
    if (k === 'summary' && !out.summary) out.summary = parseSummary(s);
    else if (k === 'kpi' && !out.kpi) out.kpi = parseKpi(s);
    else if (k === 'standard' && !out.standard) out.standard = parseStandard(s);
    else if (k === 'person') { const p = parsePerson(s); if (p.info.name) out.persons.push(p); } // 名前が空のシートは、ひな形なので出さない
    else if (k === 'table') out.tables.push(parseTable(s));
  });
  return out;
}
