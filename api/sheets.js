// ===== 評価一覧：Googleスプレッドシートの読み取り（Vercelのサーバー側で動く）=====
// 鍵（サービスアカウント）は Vercel の環境変数 GOOGLE_SERVICE_ACCOUNT_JSON にだけ置き、画面側には出さない
// GET /api/sheets?id=スプレッドシートのID → { title, sheets: [{ title, values: [[...], ...] }] }
import crypto from 'node:crypto';

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

let cached = { token: null, exp: 0 };
async function accessToken() {
  if (cached.token && Date.now() < cached.exp - 60000) return cached.token;
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
  if (!sa.client_email || !sa.private_key) throw new Error('サービスアカウントの鍵が設定されていません');
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${head}.${body}`);
  const jwt = `${head}.${body}.${b64url(sign.sign(sa.private_key.replace(/\\n/g, '\n')))}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Googleへのログインに失敗しました：' + (j.error_description || j.error || r.status));
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return cached.token;
}

export default async function handler(req, res) {
  try {
    const id = String((req.query && req.query.id) || '').trim();
    if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) return res.status(400).json({ error: 'スプレッドシートのIDが正しくありません' });
    const token = await accessToken();
    const H = { Authorization: `Bearer ${token}` };
    const metaR = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=properties.title,sheets.properties(title,index,hidden)`, { headers: H });
    const meta = await metaR.json();
    if (!metaR.ok) {
      const msg = metaR.status === 403 ? 'スプレッドシートが共有されていません（サービスアカウントを「閲覧者」で追加してください）'
        : metaR.status === 404 ? 'スプレッドシートが見つかりません' : (meta.error && meta.error.message) || '読み取りに失敗しました';
      return res.status(metaR.status).json({ error: msg });
    }
    const tabs = (meta.sheets || []).map((s) => s.properties).filter((p) => !p.hidden).sort((a, b) => a.index - b.index);
    const ranges = tabs.map((t) => `ranges=${encodeURIComponent(`'${t.title.replace(/'/g, "''")}'`)}`).join('&');
    const valR = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchGet?${ranges}&valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`, { headers: H });
    const vals = await valR.json();
    if (!valR.ok) return res.status(valR.status).json({ error: (vals.error && vals.error.message) || '読み取りに失敗しました' });
    const sheets = tabs.map((t, i) => ({ title: t.title, values: ((vals.valueRanges || [])[i] || {}).values || [] }));
    // 少しの間だけキャッシュ（開き直しが続いても読み取り回数が増えすぎないように）
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ title: meta.properties && meta.properties.title, sheets, at: Date.now() });
  } catch (e) {
    return res.status(500).json({ error: e.message || '読み取りに失敗しました' });
  }
}
