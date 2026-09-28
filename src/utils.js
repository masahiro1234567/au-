export function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function shuffle(a) {
  return [...a].sort(() => Math.random() - 0.5);
}

export function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

export const RANKS = ['秀', '優', '良', '可'];
// 知識区分のデフォルト。各ノードは children を持てて、その children もさらに children を持てる（何段でも深くできる）
export const DEFAULT_KNOWLEDGE_TYPES = [
  { name: '自社知識', children: [{ name: 'モバイル', children: [] }, { name: 'ネット', children: [] }] },
  { name: '他社知識', children: [{ name: 'モバイル', children: [] }, { name: 'ネット', children: [] }] },
  { name: '端末知識', children: [{ name: 'iPhone', children: [] }, { name: 'Android', children: [] }] },
];

// Firebaseの入れ子構造（{name, children: {childId: {name, children: {...}}}}）を再帰的に
// [{id, name, children:[...]}] へ変換する（何段ネストしても対応する）
// 子は order（並び順）で並べる。order が無い古いデータは登録順のまま
function parseKnowledgeNode(id, raw) {
  const children = Object.entries(raw.children || {})
    .map(([cid, c], i) => ({ node: parseKnowledgeNode(cid, c), order: typeof c.order === 'number' ? c.order : i }))
    .sort((a, b) => a.order - b.order)
    .map((x) => x.node);
  return { id, name: raw.name, children };
}
function parseDefaultNode(t) {
  return { id: null, name: t.name, children: (t.children || []).map(parseDefaultNode) };
}

// Firebaseの knowledge_types コレクションをツリー配列に変換する。
// デフォルト値は常に含めるが、同名のものがFirebaseに実体化済みならそちらを優先する（重複表示を防ぐ）。
// Firebaseにしか無い名前（ユーザーが新規追加したもの）は、デフォルトの後ろに連結する。
export function resolveKnowledgeTypes(knowledgeTypesDb) {
  const custom = Object.entries(knowledgeTypesDb || {}).map(([id, t]) => parseKnowledgeNode(id, t));
  const customByName = new Map(custom.map((c) => [c.name, c]));
  const defaults = DEFAULT_KNOWLEDGE_TYPES.map(parseDefaultNode);
  const merged = defaults.map((d) => customByName.get(d.name) || d);
  const defaultNames = new Set(defaults.map((d) => d.name));
  const extra = custom.filter((c) => !defaultNames.has(c.name));
  return [...merged, ...extra];
}

// 用語に保存されている知識区分の「パス」（[レベル1, レベル2, レベル3, ...]）を取得する。
// 新しい knowledgePath フィールドがあればそれを使い、無ければ旧フィールド(knowledgeType/knowledgeSubType)から組み立てる。
export function getTermPath(term) {
  if (Array.isArray(term.knowledgePath) && term.knowledgePath.length) return term.knowledgePath;
  return [term.knowledgeType, term.knowledgeSubType].filter(Boolean);
}

// パス p が prefix で始まっているか（p が prefix そのもの、またはその配下）
export function pathStartsWith(p, prefix) {
  if (!prefix || !prefix.length) return true;
  if (!p || p.length < prefix.length) return false;
  return prefix.every((x, i) => p[i] === x);
}

// 用語が登録されている知識区分のパス一覧（複数登録対応）。
// 新形式 knowledgePaths（パスの配列）→ 旧形式 knowledgePath → さらに古い knowledgeType/SubType の順に読む
export function getTermPaths(term) {
  if (!term) return [];
  if (term.knowledgePaths) {
    const raw = Array.isArray(term.knowledgePaths) ? term.knowledgePaths : Object.values(term.knowledgePaths);
    return raw
      .map((p) => (Array.isArray(p) ? p : Object.values(p || {})).filter(Boolean))
      .filter((p) => p.length);
  }
  const single = getTermPath(term);
  return single.length ? [single] : [];
}

// パス一覧を整理：重複を除き、より深いパスに含まれる親パスは省く（子に登録＝親にも登録済みとみなすため）
export function normalizePaths(paths) {
  const uniq = [];
  const seen = new Set();
  (paths || []).forEach((p) => {
    const k = p.join('\u0001');
    if (p.length && !seen.has(k)) { seen.add(k); uniq.push(p); }
  });
  return uniq.filter((p) => !uniq.some((q) => q.length > p.length && pathStartsWith(q, p)));
}

// 保存用：新形式に統一し、旧形式のフィールドは消す
export function pathsToDbFields(paths) {
  const n = normalizePaths(paths);
  return { knowledgePaths: n.length ? n : null, knowledgePath: null, knowledgeType: null, knowledgeSubType: null };
}

// 用語が、指定したパス（またはその配下）のどれかに登録されているか
export function termMatchesPath(term, path) {
  if (!path || !path.length) return true;
  return getTermPaths(term).some((tp) => pathStartsWith(tp, path));
}

// 後方互換用（旧: グローバル共有の区分リスト）。今は使わないが、まだ参照している箇所があれば安全のため残す。
export const KNOWLEDGE_TYPES = DEFAULT_KNOWLEDGE_TYPES.map((t) => t.name);
export const KNOWLEDGE_SUBTYPES = ['モバイル', 'ネット'];
// 既存の絞り込みカテゴリ
export const CATEGORIES_BASE = ['商材・プラン', '契約種別', '用語', 'ステークホルダー'];
export const CATEGORIES = CATEGORIES_BASE;
export const CATEGORY_ICONS = {
  '商材・プラン': '📦',
  '契約種別': '📋',
  '用語': '📖',
  'ステークホルダー': '👥',
};
export const RANK_COLORS = { 秀: 'var(--shu)', 優: 'var(--yu)', 良: 'var(--ryo)', 可: 'var(--ka)' };
export const ADMIN_PW = 'au2024admin';
// テスト画面ログイン用の共通パスワード（全員共通・個人ごとの設定は無し）
export const TEST_LOGIN_PW = 'orinavi.au';

// カテゴリごとの色分け（関連用語スレッド表示などで使用）
export const CATEGORY_COLORS = {
  '商材・プラン': '#D85A30',
  '契約種別': '#1D9E75',
  '用語': '#7F77DD',
  'ステークホルダー': '#BA7517',
};

// 文字列を2文字ずつ（bigram）に分割する。日本語は分かち書きが無いため簡易的な類似度判定に使う
function bigrams(s) {
  const str = s || '';
  const out = [];
  for (let i = 0; i < str.length - 1; i++) out.push(str.substr(i, 2));
  return out;
}

// 2つの文字列がどれくらい似ているか（共通するbigramの数）を返す
function overlapScore(a, b) {
  const bb = new Set(bigrams(b));
  return bigrams(a).filter((g) => bb.has(g)).length;
}

// 用語登録・編集時に、入力中の説明文・選択中のカテゴリから関連用語の候補を即時に抽出する
// APIは使わず、説明文の文字の重なり具合＋カテゴリ一致だけで判定するシンプルな方式
export function suggestRelatedTerms({ allTerms, excludeId, name, category, description, alreadySelected = [], limit = 6 }) {
  const scored = Object.entries(allTerms || {})
    .filter(([id]) => id !== excludeId && !alreadySelected.includes(id))
    .map(([id, t]) => {
      let score = overlapScore(description || '', t.description || '') * 1;
      score += overlapScore(name || '', t.name || '') * 2;
      if (category && t.category === category) score += 3;
      return { id, term: t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored;
}

// 説明がまだ入っていない用語（一括登録で「とりあえず保存」したもの）。ユーザー側・テストには出さない
export const isDescMissing = (t) => !((t && t.description) || '').trim();

// ===== 区分の重複（1つの用語が複数の区分に登録されている状態）=====
// 指定した区分（配下含む）に入っている用語のうち、ほかの区分にも入っているものを集計する
// 戻り値：{ count: 重複用語数, ids: [...], others: [{ path, count, ids }]（重複先ごと・多い順） }
export function overlapInfo(terms, path) {
  const others = new Map();
  const ids = [];
  Object.entries(terms || {}).forEach(([id, t]) => {
    const paths = getTermPaths(t);
    if (!paths.some((p) => pathStartsWith(p, path))) return;
    const outside = paths.filter((p) => !pathStartsWith(p, path));
    if (!outside.length) return;
    ids.push(id);
    outside.forEach((p) => {
      const k = p.join(' / ');
      if (!others.has(k)) others.set(k, { path: p, count: 0, ids: [] });
      const o = others.get(k);
      o.count++; o.ids.push(id);
    });
  });
  return { count: ids.length, ids, others: [...others.values()].sort((a, b) => b.count - a.count) };
}

// 全体の重複を「区分の組み合わせ」ごとにまとめる（例：au と UQ に入っている用語が3件）
export function overlapGroups(terms) {
  const groups = new Map();
  Object.entries(terms || {}).forEach(([id, t]) => {
    const paths = getTermPaths(t);
    if (paths.length < 2) return;
    const labels = paths.map((p) => p.join(' / ')).sort((a, b) => a.localeCompare(b, 'ja'));
    const k = labels.join('\u0001');
    if (!groups.has(k)) groups.set(k, { labels, ids: [] });
    groups.get(k).ids.push(id);
  });
  return [...groups.values()].sort((a, b) => b.ids.length - a.ids.length);
}

// ===== 知識区分にもとづく関連用語の自動提案 =====
function commonPrefixLen(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

// 用語の区分（paths）と「同じ区分・近い区分」に入っている用語を、関連が強い順に最大 limit 件返す。
// 優先順位：
//   1. 同じ区分に一緒に入っている数が多い（＝複数の区分で重複している）用語
//   2. 管理画面で選択中の区分（focusPath）に入っている用語
//   3. 区分の階層が近い用語（同じ親の下など。最上位だけ一致は対象外）
//   4. 同点なら、名前・説明文の文字の重なり
// 戻り値：[{ id, term, score, reason }]  reason＝提案の理由（一致した区分名など）
export function suggestByCategory({ allTerms, excludeId, paths, focusPath, alreadySelected = [], name = '', description = '', limit = 5 }) {
  const mine = normalizePaths(paths || []);
  if (!mine.length) return [];
  const mineKeys = new Set(mine.map((p) => p.join('\u0001')));
  const results = [];
  Object.entries(allTerms || {}).forEach(([id, t]) => {
    if (id === excludeId || alreadySelected.includes(id) || !t || !t.name) return;
    const theirs = getTermPaths(t);
    if (!theirs.length) return;
    const shared = theirs.filter((p) => mineKeys.has(p.join('\u0001')));
    let best = 0, bestPath = null;
    mine.forEach((a) => theirs.forEach((b) => {
      const n = commonPrefixLen(a, b);
      if (n > best) { best = n; bestPath = a.slice(0, n); }
    }));
    // 最上位（自社知識・他社知識など）だけの一致は広すぎるので提案しない。ただし自分の区分が最上位そのものなら可
    const minDepth = Math.min(2, Math.max(...mine.map((p) => p.length)));
    if (!shared.length && best < minDepth) return;
    let score = shared.length * 100 + best * 10;
    if (focusPath && focusPath.length && theirs.some((p) => pathStartsWith(p, focusPath))) score += 50;
    score += overlapScore(description, t.description || '') * 0.5 + overlapScore(name, t.name || '');
    const reason = shared.length > 1
      ? `${shared.length}つの区分が共通`
      : shared.length === 1 ? shared[0][shared[0].length - 1]
      : `${bestPath[bestPath.length - 1]}の中`;
    results.push({ id, term: t, score, reason });
  });
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
