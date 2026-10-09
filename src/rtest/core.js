// ===== 定期テスト：問題の種類・採点・ひな形 =====
// 保存先（au-data-base）
//   rtests/{テストID} = { title, start, end, target:{ mode:'all'|'roles'|'people', roles:[], people:[] }, status:'draft'|'open'|'closed',
//                         sections:[{ id, name, questions:[問題] }], createdAt, updatedAt, by }
//   rtest_answers/{テストID}/{名前キー} = { name, answers:{ 問題ID: 回答 }, status:'draft'|'submitted'|'published',
//                         auto:{ 問題ID: 点 }, manual:{ 問題ID:{ mark:'o'|'h'|'x', score, comment } }, total, max, savedAt, submittedAt, publishedAt }
import { normName } from '../evalSheets.js';

export const QTYPES = [
  ['blank', '穴埋め'],
  ['ox', '〇×'],
  ['short', 'ひとこと'],
  ['multi', 'いくつか答える'],
  ['order', '並び替え'],
  ['essay', '記述'],
  ['case', 'ケース問題'],
];
export const QTYPE_LABEL = Object.fromEntries(QTYPES);
export const MANUAL_TYPES = ['essay', 'case']; // トレーナーが採点する
export const POSITIONS = ['責任者', 'MQ', 'SAM', 'IN', 'NV'];

const arr = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []);
export const uid = () => Math.random().toString(36).slice(2, 9);
// 正解の候補は「、」で区切る（数字のカンマとぶつからないように）
export const splitAns = (s) => String(s || '').split(/[、\n]/).map((x) => x.trim()).filter(Boolean);
// 比べるときにそろえる：全角半角・大文字小文字・空白・記号
export const normText = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60)) // ひらがな→カタカナ
  .replace(/[\s　・,，.。、()（）「」『』"'＂-]/g, '');
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
export const normNum = (s) => String(s || '').normalize('NFKC').replace(/[^0-9.]/g, '');

// 穴埋めの文章から、空欄の番号を出てきた順に（同じ番号は1回）
export function blankIds(text) {
  const out = [];
  String(text || '').replace(/\{([^{}]+)\}/g, (m, id) => { if (!out.includes(id)) out.push(id); return m; });
  return out;
}
// 穴埋めの文章を、文字と空欄に分ける
export function blankSegments(text) {
  return String(text || '').split(/(\{[^{}]+\})/).filter(Boolean).map((p) => (p[0] === '{' && p.endsWith('}') ? { blank: p.slice(1, -1) } : { text: p }));
}

// ---- 1問の形をそろえる（古いデータや途中のデータでも落ちないように）----
export function normQuestion(q) {
  const x = { id: q.id || uid(), type: q.type || 'essay', text: q.text || '', points: q.points == null ? '' : q.points, ...q };
  if (x.type === 'blank') {
    const ids = blankIds(x.text);
    const old = arr(x.blanks);
    x.blanks = ids.map((id) => ({ id, answers: '', unit: '', mode: 'text', choices: '', pt: 1, ...(old.find((b) => b.id === id) || {}) }));
  }
  if (x.type === 'ox') x.items = arr(x.items).map((it) => ({ id: it.id || uid(), text: '', ans: '', pt: 1, ...it }));
  if (x.type === 'short') x.fields = arr(x.fields).map((f) => ({ id: f.id || uid(), label: '', answers: '', unit: '', mode: 'text', pt: 1, ...f }));
  if (x.type === 'multi') { x.answers = x.answers || ''; x.need = +x.need || 1; }
  // 並び替え：正しい順に1行ずつ（optionsText）。古い形（options の配列）も読める
  if (x.type === 'order') {
    if (x.optionsText == null) x.optionsText = arr(x.options).join('\n');
    x.options = lines(x.optionsText);
  }
  // 採点のポイント：「、」区切りの文字（keysText）
  if (x.type === 'essay' || x.type === 'case') {
    x.model = x.model || '';
    if (x.keysText == null) x.keysText = arr(x.keys).join('、');
    x.keys = splitAns(x.keysText);
  }
  // ケース問題：答える欄の名前を1行ずつ（fieldsText）。答えは f0, f1… に入る
  if (x.type === 'case') {
    x.info = x.info || '';
    if (x.fieldsText == null) x.fieldsText = arr(x.fields).map((f) => (typeof f === 'string' ? f : f.label || '')).join('\n');
    x.fields = lines(x.fieldsText).map((label, i) => ({ id: `f${i}`, label }));
  }
  return x;
}
export function normTest(t) {
  return {
    title: '', start: '', end: '', status: 'draft', ...t,
    target: { mode: 'all', roles: [], people: [], ...(t && t.target) },
    sections: arr(t && t.sections).map((s) => ({ id: s.id || uid(), name: s.name || '', questions: arr(s.questions).map(normQuestion) })),
  };
}

// ---- 配点 ----
export function maxOf(q) {
  if (q.type === 'blank') return q.blanks.reduce((a, b) => a + (+b.pt || 0), 0);
  if (q.type === 'ox') return q.items.reduce((a, b) => a + (+b.pt || 0), 0);
  if (q.type === 'short') return q.fields.reduce((a, b) => a + (+b.pt || 0), 0);
  return +q.points || 0;
}
export const testMax = (t) => t.sections.reduce((a, s) => a + s.questions.reduce((b, q) => b + maxOf(q), 0), 0);
export const allQuestions = (t) => t.sections.flatMap((s) => s.questions.map((q) => ({ ...q, sectionName: s.name })));

// ---- 答えたかどうか ----
export function isAnswered(q, a) {
  if (a == null) return false;
  if (q.type === 'blank') return q.blanks.every((b) => String((a || {})[b.id] || '').trim());
  if (q.type === 'ox') return q.items.every((it) => (a || {})[it.id]);
  if (q.type === 'short') return q.fields.every((f) => String((a || {})[f.id] || '').trim());
  if (q.type === 'multi') return arr(a).some((x) => String(x || '').trim());
  if (q.type === 'order') return arr(a).length === q.options.length;
  if (q.type === 'case') return Object.values(a || {}).some((x) => String(x || '').trim());
  return !!String(a || '').trim();
}

// ---- 1つの答えが正解か（数字は数字だけで比べる）----
function matchOne(given, answers, mode) {
  const list = splitAns(answers);
  if (!list.length) return false;
  if (mode === 'num') { const g = normNum(given); return !!g && list.some((x) => normNum(x) === g); }
  const g = normText(given);
  return !!g && list.some((x) => normText(x) === g);
}
// ---- 自動採点：{ score, max, parts:[{ label, ok, given, correct, pt }] }（手で採点する問題は null）----
export function autoGrade(q, a) {
  const max = maxOf(q);
  if (MANUAL_TYPES.includes(q.type)) return null;
  const parts = [];
  if (q.type === 'blank') q.blanks.forEach((b) => { const g = (a || {})[b.id] || ''; const ok = matchOne(g, b.answers, b.mode === 'num' ? 'num' : 'text'); parts.push({ label: b.id, ok, given: g, correct: splitAns(b.answers)[0] || '', pt: ok ? +b.pt || 0 : 0 }); });
  if (q.type === 'ox') q.items.forEach((it, i) => { const g = (a || {})[it.id] || ''; const ok = !!it.ans && g === it.ans; parts.push({ label: String(i + 1), text: it.text, ok, given: g === 'o' ? '〇' : g === 'x' ? '×' : '', correct: it.ans === 'o' ? '〇' : it.ans === 'x' ? '×' : '', pt: ok ? +it.pt || 0 : 0 }); });
  if (q.type === 'short') q.fields.forEach((f) => { const g = (a || {})[f.id] || ''; const ok = matchOne(g, f.answers, f.mode); parts.push({ label: f.label, ok, given: g, correct: splitAns(f.answers)[0] || '', pt: ok ? +f.pt || 0 : 0 }); });
  if (q.type === 'multi') {
    const list = splitAns(q.answers).map((x) => ({ raw: x, n: normText(x) })).filter((x) => x.n);
    const hit = new Set();
    arr(a).forEach((g) => {
      const n = normText(g); if (n.length < 2) return;
      const m = list.find((x) => !hit.has(x.raw) && (x.n === n || x.n.includes(n) || n.includes(x.n)));
      if (m) hit.add(m.raw);
    });
    const need = Math.max(1, +q.need || 1);
    const score = Math.round((max * Math.min(hit.size, need)) / need * 10) / 10;
    parts.push({ label: `${hit.size}つ正解（${need}つ以上で満点）`, ok: hit.size >= need, given: arr(a).filter(Boolean).join('、'), correct: list.map((x) => x.raw).join('、'), pt: score });
  }
  if (q.type === 'order') {
    const ok = arr(a).length === q.options.length && q.options.every((o, i) => arr(a)[i] === o);
    parts.push({ label: '順番', ok, given: arr(a).join(' → '), correct: q.options.join(' → '), pt: ok ? max : 0 });
  }
  return { score: Math.round(parts.reduce((x, p) => x + p.pt, 0) * 10) / 10, max, parts };
}
// 記述の「採点のポイント」がどれだけ入っているか
export function keyHits(q, a) {
  const txt = normText(q.type === 'case' ? Object.values(a || {}).join(' ') : a);
  return q.keys.map((k) => ({ k, hit: !!normText(k) && txt.includes(normText(k)) }));
}
// 全体の点数
export function computeTotals(t, rec) {
  const qs = allQuestions(t);
  const auto = {}; let total = 0; let manualLeft = 0;
  qs.forEach((q) => {
    const g = autoGrade(q, (rec.answers || {})[q.id]);
    if (g) { auto[q.id] = g.score; total += g.score; } else {
      const m = (rec.manual || {})[q.id];
      if (m && m.mark) total += +m.score || 0; else manualLeft++;
    }
  });
  return { auto, total: Math.round(total * 10) / 10, max: testMax(t), manualLeft };
}

// 自分が受けるテストか
export function isTarget(t, userName, position) {
  const tg = t.target || {};
  if (tg.mode === 'roles') return arr(tg.roles).includes(position || '');
  if (tg.mode === 'people') return arr(tg.people).some((n) => normName(n) === normName(userName));
  return true;
}
// 受付中か（期限を過ぎたら終わり）
export function isOpen(t) {
  if (t.status !== 'open') return false;
  const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (t.start && today < t.start) return false;
  if (t.end && today > t.end) return false;
  return true;
}
export const mdLabel = (d) => { if (!d) return ''; const x = new Date(d + 'T00:00:00'); return `${x.getMonth() + 1}/${x.getDate()}`; };

// ---- ひな形：知識試験（もらった問題用紙から。正解・配点は管理画面で入れる）----
const S = (name, questions) => ({ id: uid(), name, questions: questions.map((q) => normQuestion({ id: uid(), ...q })) });
const ox = (texts) => texts.map((text) => ({ id: uid(), text, ans: '', pt: 1 }));
const fld = (labels, mode) => labels.map((label) => ({ id: uid(), label, answers: '', unit: '', mode: mode || 'text', pt: 1 }));
export function knowledgeTemplate() {
  return normTest({
    title: '知識試験 第1回', status: 'draft',
    sections: [
      S('プラン編', [
        { type: 'blank', text: 'UQ　（{①}）プランと（{②}）プランがあり、（{①}）プランは（{③}）GBまでだと最安（{④}）円/月、（{③}）～（{⑤}）GBで最安（{⑥}）円/月になる。',
          blanks: [{ id: '③', unit: 'GB', mode: 'num' }, { id: '④', unit: '円/月', mode: 'num' }, { id: '⑤', unit: 'GB', mode: 'num' }, { id: '⑥', unit: '円/月', mode: 'num' }, { id: '①', unit: 'プラン' }, { id: '②', unit: 'プラン' }] },
        { type: 'blank', text: 'UQ　通話の3種類あり、60分/月かけ放題で（{⑦}）円/月、（{⑧}）分/回かけ放題で（{⑨}）円、24時間かけ放題で（{★}）円/月となっており、（{⑩}）歳以上の方は24時間かけ放題が（{⑪}）円/月となる。また、（{②}）プランでかけ放題を適用する場合は＋（{⑫}）円/月かかる。',
          blanks: ['⑦', '⑧', '⑨', '★', '⑩', '⑪', '⑫'].map((id) => ({ id, mode: 'num', unit: { '⑧': '分/回', '⑨': '円', '⑩': '歳' }[id] || '円/月' })).concat([{ id: '②', unit: 'プラン' }]) },
        { type: 'blank', text: 'au　無制限＋pontaパスやstarlinkdirectなどがついた（{⑬}）プラン、（{⑭}）歳以下が使える（{⑮}）のプラン、（{⑯}）歳以上の方が5分通話＋（{⑰}）GBで利用出来るプランが主に存在する。',
          blanks: [{ id: '⑬', unit: 'プラン' }, { id: '⑭', unit: '歳', mode: 'num' }, { id: '⑮', mode: 'choice', choices: '定額、変動' }, { id: '⑯', unit: '歳', mode: 'num' }, { id: '⑰', unit: 'GB', mode: 'num' }] },
        { type: 'blank', text: 'au　通話の2種類あり、（{⑱}）分/回かけ放題で（{⑲}）円/月、24時間かけ放題で（{⑳}）円/月となっている。',
          blanks: [{ id: '⑱', unit: '分/回', mode: 'num' }, { id: '⑲', unit: '円/月', mode: 'num' }, { id: '⑳', unit: '円/月', mode: 'num' }] },
        { type: 'essay', text: '家族間通話とは何か、または適用条件を正確に記入してください。', points: 2 },
        { type: 'essay', text: '通話オプションに入っていない際、通話した時の金額を答えてください。', points: 1 },
        { type: 'essay', text: '現在、UQの（②）プランで行っているキャンペーンを記載してください。', points: 2 },
        { type: 'essay', text: 'UQ→auの番号移行プログラム適用時の割引金額と期間、または適用条件と適用有無の確認方法を教えてください。', points: 3 },
      ]),
      S('施策編', [
        { type: 'ox', text: '下記設問に〇か×で答えてください。', items: ox(['UQ, au共にSIM単でのポイントは現在20,000ptである', 'UQの場合、適用条件として増量オプションは必須となっている', 'インターネットやでんきが絡むとポイントは増額するが、増額するのはUQ, au共に行える', 'インターネットセットで5000pt、でんきセットで5000pt増額する', '上記の増額ポイントは、端末が絡んだ場合には発生しない', 'その他適用可能な施策が存在する為、案件対応時は必ずディレクターに共有する']) },
      ]),
      S('オプション編', [
        { type: 'essay', text: 'pontaパスについて、知っている限りの内容を詳しく記載してください。', points: 2 },
        { type: 'essay', text: '増量オプションについて、知っている限りの内容を詳しく記載してください。', points: 2 },
        { type: 'essay', text: 'starlinkdirectについて、知っている限りの内容を詳しく記載してください。', points: 2 },
        { type: 'short', text: 'エディオン、ジョーシンで適用出来る販路の保障サービス名をそれぞれ答えなさい。', fields: fld(['エディオン', 'ジョーシン']) },
      ]),
      S('契約事項編', [
        { type: 'short', text: 'au, UQは1名義にあたり、1日で最大何回線まで契約可能か。', fields: [{ id: uid(), label: '最大回線数', answers: '', unit: '回線', mode: 'num', pt: 1 }] },
        { type: 'essay', text: '最大回線数を契約するときの、契約種別の組み合わせ（内訳）を答えなさい。', points: 1 },
        { type: 'short', text: '1名義にて最大回線数を契約する際、再度契約を行うまでには期間が必要である。何日間か答えなさい。', fields: [{ id: uid(), label: '期間', answers: '', unit: '日間', mode: 'num', pt: 1 }] },
      ]),
      S('インターネット編', [
        { type: 'multi', text: 'au, UQのプランとセットで割引を適用出来るインターネット種類を3つ以上答えてください。', need: 3, points: 3 },
        { type: 'ox', text: '下記条件の中、auのプランでスマートバリューが適用可能か〇か×で答えてください。', items: ox(['au光（NET＋TEL）', 'j:com（NET＋TV）', 'eo光（NET＋TV）', 'BIGLOBE光（NET）', '例外）auでんきのみ']) },
        { type: 'multi', text: 'KDDI系列のインターネット既存であるがNETのみの契約の場合、解決策を2つ以上回答してください。', need: 2, points: 2 },
      ]),
      S('その他', [
        { type: 'essay', text: '「データ移行をして欲しい」と言われた際、有効な切り返しを知ってる限り答えてください。', points: 3 },
        { type: 'short', text: '獲得時、登録時に常勤様へお願いするコード（半コード）を答えてください。', fields: fld(['コード']) },
        { type: 'multi', text: 'auでんきを契約するメリットを3つ以上回答してください。', need: 3, points: 3 },
        { type: 'order', text: '下記選択肢の中、役職が低い順番に並び変えてください。', options: ['CSA', '常勤', 'GL', '営業様', 'SV'], points: 2 },
        { type: 'case', text: '下記顧客において、最適な提案と金額、施策を教えてください。', points: 10,
          info: '【顧客基本情報 & 利用状況】\n・世帯：40代夫婦（夫 43歳、妻 42歳）、子（17歳）、祖父（71歳）\n・主（43歳）：SoftBank / 60〜∞GB / 10分通話付き / iPhone13\n・奥（42歳）：Y!mobile / 2〜3/4GB / かけ放題付き / Pixel 8a\n・子（17歳）：SoftBank / 10/20GB / 通話無し / iPhone13\n・爺（71歳）：Y!mobile / 2/4GB / かけ放題付き / かんたんスマホ2＋\n・固定回線/電気：eo光（戸建） / 関西電力 従量電灯A\n【顧客の要望】\n1. 主・子が新しいiPhoneに変えたい。（主にこだわりは無いが、子はiPhone17が良い）\n2. 20万円のエアコンを買いたい為、出来るだけ安くしたい。\n3. キャリアを2年毎に変えており、今回もその予定。',
          fields: ['提案するプラン（1人ずつ）', '端末', '月額（家族の合計と1人ずつ）', '使う施策・ポイント', 'その提案にした理由'] },
      ]),
    ],
  });
}
