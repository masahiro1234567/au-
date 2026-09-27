// ===== お支払い目安額のデータ（2026年9月28日時点の公開情報をもとに作成）=====
// 端末：au公式「対象機種の価格」PDF（2026/7/31掲載）と、iPhone 18 Pro/Pro Max の価格発表（2026/9/12）
// プラン：au・UQ mobile 公式の料金（2026年9月時点）
// 価格が変わったら、このファイルの数字を直せば画面にそのまま反映される

// ---- 契約種別（赤丸のプルダウン）----
// brand：au / uq、group：残価の区分（new＝新規・MNP・番号移行、kihen＝機種変更）
export const KINDS = [
  { id: '', label: '選択してください' },
  { id: 'au-new', label: 'auスマホ・ケータイ 新規', brand: 'au', group: 'new' },
  { id: 'au-mnp', label: 'auスマホ・ケータイ MNP', brand: 'au', group: 'new' },
  { id: 'au-iko', label: 'auスマホ・ケータイ 番号移行', brand: 'au', group: 'new' },
  { id: 'au-kihen', label: 'auスマホ・ケータイ 機変', brand: 'au', group: 'kihen' },
  { id: 'uq-new', label: 'UQスマホ・ケータイ 新規', brand: 'uq', group: 'new' },
  { id: 'uq-mnp', label: 'UQスマホ・ケータイ MNP', brand: 'uq', group: 'new' },
  { id: 'uq-iko', label: 'UQスマホ・ケータイ 番号移行', brand: 'uq', group: 'new' },
  { id: 'uq-kihen', label: 'UQスマホ・ケータイ 機変', brand: 'uq', group: 'kihen' },
];
export const kindOf = (id) => KINDS.find((k) => k.id === id) || KINDS[0];

// ---- 端末（緑丸のプルダウン）----
// price：一括価格、rNew / rKihen：スマトクの残価（24回目の最終回分）、fee：返却時の特典利用料
// Androidは公式の一覧に残価の記載がないため、残価は手入力（画面に入力欄が出る）。価格は最小容量の価格
const I = (name, price, rNew, rKihen, fee = 22000) => ({ name, price, rNew, rKihen, fee });
const A = (name, price) => ({ name, price, rNew: null, rKihen: null, fee: 22000 });

export const DEVICE_GROUPS = [
  { maker: 'iPhone', items: [
    I('iPhone 18 Pro Max 256GB', 295900, 169900, 147900),
    I('iPhone 18 Pro Max 512GB', 339900, 191900, 169900),
    I('iPhone 18 Pro Max 1TB', 427900, 235900, 213900),
    I('iPhone 18 Pro Max 2TB', 544900, 294400, 272400),
    I('iPhone 18 Pro 256GB', 268800, 201900, 134400),
    I('iPhone 18 Pro 512GB', 315800, 179900, 157900),
    I('iPhone 18 Pro 1TB', 402800, 223400, 201400),
    I('iPhone 18 Pro 2TB', 519800, 281900, 259900),
    I('iPhone Air 256GB', 193900, 145500, 110600),
    I('iPhone Air 512GB', 236900, 169500, 143600),
    I('iPhone Air 1TB', 279900, 189500, 181100),
    I('iPhone 17 Pro Max 256GB', 265800, 164500, 142500),
    I('iPhone 17 Pro Max 512GB', 309800, 191000, 169000),
    I('iPhone 17 Pro Max 1TB', 353800, 216500, 194500),
    I('iPhone 17 Pro Max 2TB', 429800, 257000, 235000),
    I('iPhone 17 Pro 256GB', 232800, 142000, 120000),
    I('iPhone 17 Pro 512GB', 285800, 177500, 155500),
    I('iPhone 17 Pro 1TB', 329300, 203500, 181500),
    I('iPhone 17 256GB', 168300, 134153, 83500),
    I('iPhone 17 512GB', 215800, 158000, 106500),
    I('iPhone 17e 256GB', 127900, 83853, 60000),
    I('iPhone 17e 512GB', 169900, 109000, 90000),
    I('iPhone 16e 128GB', 112800, 74253, 68753, 0),
    I('iPhone 16e 256GB', 129800, 96753, 85753, 11000),
    I('iPhone 16e 512GB', 167800, 115900, 94900, 11000),
    I('iPhone 16 128GB', 146000, 101953, 78100),
  ] },
  { maker: 'Google Pixel', items: [
    A('Google Pixel 11 Pro XL', 238800),
    A('Google Pixel 11 Pro', 194800),
    A('Google Pixel 11', 156800),
    A('Google Pixel 11 Pro Fold', 309800),
    A('Google Pixel 10a', 89800),
    A('Google Pixel 9 Pro Fold', 289800),
    A('Google Pixel 9 Pro XL', 199900),
  ] },
  { maker: 'Galaxy', items: [
    A('Galaxy Z Flip8', 209800),
    A('Galaxy Z Fold8', 279800),
    A('Galaxy Z Fold8 Ultra', 319800),
    A('Galaxy S26 Ultra', 241800),
    A('Galaxy S26+', 179800),
    A('Galaxy S26', 152900),
    A('Galaxy Z Flip7', 165000),
    A('Galaxy Z Fold7', 276800),
    A('Galaxy A25 5G', 22001),
    A('Galaxy S24 Ultra', 198800),
  ] },
  { maker: 'Xperia', items: [
    A('Xperia 1 VIII', 269800),
    A('Xperia 10 VII', 82800),
    A('Xperia 1 VII', 229900),
  ] },
  { maker: 'AQUOS・シャープ', items: [
    A('AQUOS sense10', 71800),
    A('BASIO active3', 55500),
  ] },
  { maker: 'arrows・FCNT', items: [
    A('arrows We3', 33000),
    A('らくらくスマートフォン Lite', 32800),
    A('arrows We2', 22001),
  ] },
  { maker: 'OPPO', items: [
    A('OPPO Reno13 A', 31900),
    A('OPPO Find X9', 134800),
    A('OPPO A5 5G', 22001),
  ] },
  { maker: 'motorola', items: [
    A('motorola razr 60 ultra', 189800),
  ] },
  { maker: '京セラ', items: [
    A('TORQUE G07', 131800),
    A('TORQUE G06', 98000),
  ] },
];
export const SIM_ONLY = 'SIM単体契約';
export const findDevice = (name) => {
  for (const g of DEVICE_GROUPS) {
    const d = g.items.find((x) => x.name === name);
    if (d) return d;
  }
  return null;
};

// ---- 料金プラン（青丸の「基本パック」）----
// tiers：利用データ量の段階（上から順に選択肢）、calls：通話オプション
// fam / sv：家族割・スマートバリュー（自宅セット割）の対象かどうか、card：au PAY カードお支払い割の対象か
const AU_CALLS = [
  { id: '', label: 'なし', price: 0 },
  { id: 'light', label: '通話定額ライト2（5分以内かけ放題）', price: 880 },
  { id: 'full', label: '通話定額2（24時間かけ放題）', price: 1980 },
];
const UNLIMITED = (base) => [
  { id: 'over1', label: '1GB超（使い放題）', price: base },
  { id: 'under1', label: '1GB以下（1,650円割引）', price: base - 1650 },
];
export const PLANS = {
  au: [
    { id: 'valuelink', name: 'auバリューリンクプラン', tiers: UNLIMITED(8008), calls: AU_CALLS, fam: true, sv: true, card: true },
    { id: 'valuelink-money2', name: 'auバリューリンク マネ活2', tiers: [{ id: 'unl', label: '使い放題', price: 9328 }], calls: AU_CALLS, fam: false, sv: true, card: false,
      note: 'マネ活プランは家族割プラスの割引対象外（人数には数えられます）。au PAY カードお支払い割の代わりに、通信料お支払い特典（最大1,650円をauじぶん銀行へ還元）があります' },
    { id: 'max-plus', name: '使い放題MAX＋ 5G/4G', tiers: UNLIMITED(7788), calls: AU_CALLS, fam: true, sv: true, card: true },
    { id: 'max-plus-money2', name: '使い放題MAX＋ マネ活2', tiers: [{ id: 'unl', label: '使い放題', price: 9108 }], calls: AU_CALLS, fam: false, sv: true, card: false,
      note: 'マネ活プランは家族割プラスの割引対象外（人数には数えられます）' },
    { id: 'mini-plus', name: 'スマホミニプラン＋ 5G/4G', tiers: [
      { id: '1', label: '〜1GB', price: 4928 }, { id: '3', label: '1GB超〜3GB', price: 6578 }, { id: '5', label: '3GB超〜5GB', price: 8228 },
    ], calls: AU_CALLS, fam: true, sv: true, card: true },
    { id: 'senior', name: 'シニアバリュープラン', tiers: [{ id: '5', label: '5GB（5分以内かけ放題込み）', price: 4048 }],
      calls: [{ id: '', label: 'なし（5分以内かけ放題込み）', price: 0 }, { id: 'full', label: '24時間かけ放題に変更', price: 1100 }],
      fam: false, sv: true, card: true, note: '60歳以上の方が対象。家族割プラスの割引対象外（人数には数えられます）' },
    { id: 'u18', name: 'U18バリュープラン', tiers: [
      { id: '10', label: '〜10GB', price: 2398 }, { id: '20', label: '10GB超〜20GB', price: 4048 },
    ], calls: AU_CALLS, fam: true, sv: true, card: true, u18: true, note: '加入時5〜18歳の方が対象。家族割プラス・auスマートバリューの割引額は550円（2人の家族割は220円）' },
    { id: 'u12', name: 'U12バリュープラン', tiers: [{ id: 'low', label: '最大300kbps', price: 1870 }], calls: AU_CALLS, fam: false, sv: false, card: true,
      note: '加入時5〜12歳の方が対象。家族割プラス・auスマートバリューは対象外（別途U12家族割があります）' },
  ],
  uq: [
    { id: 'tokutoku2', name: 'トクトクプラン2', tiers: [
      { id: '5', label: '〜5GB（1,100円割引）', price: 2948 }, { id: '30', label: '5GB超〜30GB', price: 4048 },
    ], calls: [
      { id: '', label: 'なし', price: 0 },
      { id: 'pack', label: '通話パック（60分/月）', price: 660 },
      { id: 'light', label: '通話放題ライト（10分以内かけ放題）', price: 880 },
      { id: 'full', label: '通話放題（24時間かけ放題）', price: 1980 },
    ], fam: true, sv: true, card: true },
    { id: 'komikomi-value', name: 'コミコミプランバリュー', tiers: [{ id: '35', label: '35GB（10分以内かけ放題込み）', price: 3828 }],
      calls: [{ id: '', label: 'なし（10分以内かけ放題込み）', price: 0 }], fam: false, sv: false, card: false,
      note: '自宅セット割・家族セット割の対象外。新規加入から最大13か月はUQコミコミおトク割（-660円）があります' },
  ],
};
export const findPlan = (brand, id) => (PLANS[brand] || []).find((p) => p.id === id) || null;

// ---- 割引サービス（プルダウン）----
export const DISCOUNTS = {
  au: [
    { id: '', label: '' },
    { id: 'sv', label: 'スマートバリュー -1,100円', sv: 1100 },
    { id: 'fam2', label: '家族割2回線 -660円', fam: 2 },
    { id: 'fam3', label: '家族割3回線 -1,210円', fam: 3 },
    { id: 'sv-fam2', label: 'スマートバリュー -1,100円 ＋ 家族割2回線 -660円', sv: 1100, fam: 2 },
    { id: 'sv-fam3', label: 'スマートバリュー -1,100円 ＋ 家族割3回線 -1,210円', sv: 1100, fam: 3 },
  ],
  uq: [
    { id: '', label: '' },
    { id: 'home-net', label: '自宅セット割 インターネットコース -1,100円', sv: 1100 },
    { id: 'home-denki', label: '自宅セット割 でんきコース -1,100円', sv: 1100 },
    { id: 'uq-fam', label: '家族割 -550円', uqFam: 550 },
  ],
};

// 選んだ割引の金額を、プランの対象・割引額に合わせて計算する
export function discountAmount(brand, discId, plan) {
  const d = (DISCOUNTS[brand] || []).find((x) => x.id === discId);
  if (!d || !plan) return { total: 0, parts: [] };
  const parts = [];
  if (d.sv && plan.sv) parts.push([brand === 'au' ? 'auスマートバリュー' : '自宅セット割', plan.u18 ? 550 : d.sv]);
  if (d.fam && plan.fam) {
    const amt = plan.u18 ? (d.fam === 2 ? 220 : 550) : (d.fam === 2 ? 660 : 1210);
    parts.push([`家族割プラス（${d.fam}回線）`, amt]);
  }
  if (d.uqFam && plan.fam) parts.push(['家族セット割', d.uqFam]);
  return { total: parts.reduce((s, [, v]) => s + v, 0), parts };
}

export const CARD_DISCOUNT = 220; // au PAY カードお支払い割
