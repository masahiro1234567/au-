// ===== オレタブの担当者ID・パスワード（練習用） =====
// 担当者ID：AUK＋数字5桁。メンバー管理で一人ずつ登録する（fp_users の oretabId）
// パスワード：その日に初めてログインするときは、パスワードにも担当者IDを入れる → パスワード変更へ。
//             変更したパスワードは、その日のあいだだけ有効（日付が変わると、また初期設定から）
// 保存先：au-data-base の oretab_login/{担当者ID} = { date: 'YYYY-MM-DD', pwHash }
import { dbGet, dbSet } from '../useFirebase.js';

export const STORE_LINE = '［拠点コード］　［店舗名］';

// 英字は大文字に、全角は半角に、空白は取る
export const normId = (v) => String(v || '').normalize('NFKC').replace(/\s/g, '').toUpperCase();
export const isOreId = (v) => /^AUK\d{5}$/.test(normId(v));

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 名簿（fp_users）から担当者IDの人を探す
export function findStaff(roster, id) {
  const key = normId(id);
  if (!key) return null;
  const hit = (roster || []).find((u) => u && normId(u.oretabId) === key && u.permission !== 'disabled');
  return hit ? { id: key, name: hit.name || '' } : null;
}

// 今日のパスワードの状態：'new'（今日はまだ）／'ok'（合っている）／'ng'（違う）
export async function checkPassword(id, pw) {
  const rec = await dbGet(`oretab_login/${id}`);
  if (!rec || rec.date !== todayKey() || !rec.pwHash) return pw === id ? 'new' : 'ng';
  return (await sha256(`${id}:${pw}`)) === rec.pwHash ? 'ok' : 'ng';
}
export async function isSetToday(id) {
  const rec = await dbGet(`oretab_login/${id}`);
  return !!(rec && rec.date === todayKey() && rec.pwHash);
}
export async function savePassword(id, pw) {
  await dbSet(`oretab_login/${id}`, { date: todayKey(), pwHash: await sha256(`${id}:${pw}`), at: Date.now() });
}

// パスワードルール（実機の画面と同じ内容）。合っていれば ''、だめなら理由
export function pwRuleError(pw, id) {
  if (pw.length < 8 || pw.length > 20) return '文字数は8〜20文字にしてください。';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'パスワードは英字・数字をそれぞれ1つ以上使用してください。';
  if (/([A-Za-z0-9])\1\1\1/.test(pw)) return 'パスワードは同じ英数字を4回以上連続使用することはできません。';
  if (pw === id) return '担当者IDと同じパスワードは指定できません。';
  return '';
}
