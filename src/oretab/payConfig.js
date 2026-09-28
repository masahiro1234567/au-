// ===== お支払い目安額の設定（管理画面で編集 → Firebase「oretab_pay」に保存）=====
// Firebaseにまだ何も無い項目は、payData.js の初期データを使う
import { KINDS, DEVICE_GROUPS, UQ_DEVICE_GROUPS, PLANS, DISCOUNTS, SIM_ONLY } from './payData.js';

export { SIM_ONLY };

// ---- 初期データ（今までコードに書いていた内容をそのまま変換）----
const KIND_TYPE = { new: '新規', mnp: 'MNP', iko: '番号移行', kihen: '機変' };
const devicesFrom = (groups, brand) => groups.flatMap((g) => g.items.map((d) => ({
  name: d.name, maker: g.maker, brand,
  price: d.price == null ? '' : d.price, rNew: d.rNew == null ? '' : d.rNew, rKihen: d.rKihen == null ? '' : d.rKihen,
  fee: d.fee == null ? '' : d.fee,
})));
const discFrom = (brand) => DISCOUNTS[brand].filter((d) => d.id).map((d) => {
  const famAmt = d.fam === 2 ? 660 : d.fam === 3 ? 1210 : d.uqFam || 0;
  const u18Fam = d.fam === 2 ? 220 : d.fam === 3 ? 550 : 0;
  return {
    brand, label: d.label.replace(/ -[0-9,]+円/g, ''),
    sv: d.sv || 0, fam: famAmt, u18sv: d.sv ? 550 : 0, u18fam: u18Fam,
  };
});

export const DEFAULTS = {
  kinds: KINDS.filter((k) => k.id).map((k) => ({ label: k.label, brand: k.brand, type: KIND_TYPE[k.id.split('-')[1]] })),
  devices: [...devicesFrom(DEVICE_GROUPS, 'au'), ...devicesFrom(UQ_DEVICE_GROUPS, 'uq')],
  plans: [...PLANS.au.map((p) => ({ ...p, brand: 'au' })), ...PLANS.uq.map((p) => ({ ...p, brand: 'uq' }))].map((p) => ({
    name: p.name, brand: p.brand,
    tiers: p.tiers.map((t) => ({ label: t.label, price: t.price })),
    calls: p.calls.map((c) => ({ label: c.label, price: c.price })),
    fam: !!p.fam, sv: !!p.sv, card: !!p.card, u18: !!p.u18, noDiscount: !!p.noDiscount, note: p.note || '',
  })),
  discounts: [...discFrom('au'), ...discFrom('uq')],
  card: { label: 'au PAYカードお支払い割', amount: 220 },
  pay: { smatoku: true, kappu: true, ikkatsu: true, kappuTimes: '24,36,48' },
  campaigns: [],
};

// Firebaseの値（配列が {0:..,1:..} で返ることもある）を配列にそろえる
const toList = (v) => (Array.isArray(v) ? v.filter(Boolean) : v && typeof v === 'object' ? Object.values(v).filter(Boolean) : null);

export function buildConfig(raw) {
  const r = raw || {};
  const pick = (k) => { const l = toList(r[k]); return l || DEFAULTS[k]; };
  const cfg = {
    kinds: pick('kinds'),
    devices: pick('devices'),
    plans: pick('plans').map((p) => ({ ...p, tiers: toList(p.tiers) || [], calls: toList(p.calls) || [{ label: 'なし', price: 0 }] })),
    discounts: pick('discounts'),
    card: r.card && typeof r.card === 'object' ? { ...DEFAULTS.card, ...r.card } : DEFAULTS.card,
    pay: r.pay && typeof r.pay === 'object' ? { ...DEFAULTS.pay, ...r.pay } : DEFAULTS.pay,
    campaigns: toList(r.campaigns) || [],
  };
  // 契約種別に id を振る（プルダウンの値として使う）
  cfg.kinds = cfg.kinds.map((k, i) => ({ ...k, id: `k${i}`, group: k.type === '機変' ? 'kihen' : 'new' }));
  return cfg;
}

const num = (v) => (v === '' || v == null ? null : Number(v));

// ---- 画面から使う関数 ----
export const kindOf = (cfg, id) => cfg.kinds.find((k) => k.id === id) || { id: '', label: '選択してください' };

// メーカー見出しごとにまとめる（登録順を保つ）
export function deviceGroupsFor(cfg, brand) {
  const b = brand || 'au';
  const groups = [];
  cfg.devices.filter((d) => d.brand === b).forEach((d) => {
    let g = groups.find((x) => x.maker === d.maker);
    if (!g) { g = { maker: d.maker, items: [] }; groups.push(g); }
    g.items.push({ ...d, price: num(d.price), rNew: num(d.rNew), rKihen: num(d.rKihen), fee: num(d.fee) == null ? 22000 : num(d.fee) });
  });
  return groups;
}
export function findDevice(cfg, name, brand) {
  for (const g of deviceGroupsFor(cfg, brand)) {
    const d = g.items.find((x) => x.name === name);
    if (d) return d;
  }
  return null;
}
export const plansFor = (cfg, brand) => cfg.plans.map((p, i) => ({ ...p, id: `p${i}` })).filter((p) => p.brand === brand);
export const findPlan = (cfg, brand, id) => plansFor(cfg, brand).find((p) => p.id === id) || null;
export const discountsFor = (cfg, brand) => cfg.discounts.map((d, i) => ({ ...d, id: `d${i}` })).filter((d) => d.brand === brand);

// 割引の金額（プランの対象・U18の金額に合わせる）
export function discountAmount(cfg, brand, discId, plan) {
  const d = discountsFor(cfg, brand).find((x) => x.id === discId);
  if (!d || !plan) return 0;
  const sv = plan.sv ? Number(plan.u18 ? d.u18sv || d.sv : d.sv) || 0 : 0;
  const fam = plan.fam ? Number(plan.u18 ? d.u18fam || d.fam : d.fam) || 0 : 0;
  return sv + fam;
}
export function discountLabel(cfg, brand, d, plan) {
  if (!plan) return d.label;
  const amt = discountAmount(cfg, brand, d.id, plan);
  return amt ? `${d.label} -${amt.toLocaleString('ja-JP')}円` : `${d.label}（対象外）`;
}

// ---- 期間限定割引・キャンペーン ----
// 今日が期間内で、ブランド・契約種別・対象（機種名／プラン名に含まれる言葉）に当てはまるものだけ適用
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const normDate = (s) => String(s || '').trim().replace(/\//g, '-');
export function activeCampaigns(cfg, { brand, kind, deviceName, planName }) {
  const t = today();
  return cfg.campaigns.filter((c) => {
    if (!c.name) return false;
    if (normDate(c.start) && normDate(c.start) > t) return false;
    if (normDate(c.end) && normDate(c.end) < t) return false;
    if (c.brand && c.brand !== 'both' && c.brand !== brand) return false;
    if (c.kinds && c.kinds !== 'すべて' && kind && kind.type && !String(c.kinds).split(/[、,・\s]+/).includes(kind.type)) return false;
    const words = String(c.target || '').split(/[、,]+/).map((w) => w.trim()).filter(Boolean);
    const subject = c.type === '月額割引' ? planName : deviceName;
    if (!subject) return false;
    return !words.length || words.some((w) => subject.includes(w));
  }).map((c) => ({ ...c, amount: Number(c.amount) || 0 }));
}
