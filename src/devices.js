// ===== 機種比較のデータ =====
// Firebase の保存場所：
//   devices/{os}/features/{id} = { name, type: 'mark'（○×）| 'text'（文字）, order }
//   devices/{os}/models/{id}   = { name, year, series, order, values: { [featureId]: '○' | '×' | 文字 } }
// os は 'ios'（iPhone）と 'android'（Android）

export const OS_LIST = [
  { id: 'ios', label: 'iPhone' },
  { id: 'android', label: 'Android' },
];

export const MARK_O = '○';
export const MARK_X = '×';

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name || '').localeCompare(String(b.name || ''), 'ja');

// 指定OSの項目・機種を、並び順どおりの配列にして返す
export function getDeviceData(devices, os) {
  const raw = (devices && devices[os]) || {};
  const features = Object.entries(raw.features || {})
    .map(([id, f]) => ({ id, name: f.name || '', type: f.type === 'text' ? 'text' : 'mark', order: f.order ?? 0 }))
    .sort(byOrder);
  const models = Object.entries(raw.models || {})
    .map(([id, m]) => ({ id, name: m.name || '', year: m.year || '', series: m.series || '', order: m.order ?? 0, values: m.values || {} }))
    .sort(byOrder);
  return { features, models };
}

// シリーズ名の一覧（機種の並び順で最初に出てきた順）
export function seriesOf(models) {
  const seen = [];
  models.forEach((m) => { if (m.series && !seen.includes(m.series)) seen.push(m.series); });
  return seen;
}

// サンプルデータ（管理画面の「サンプルを読み込む」で投入）
const IOS_FEATURES = [
  ['5G', 'mark'], ['MagSafe', 'mark'], ['USB-C', 'mark'], ['生体認証', 'text'], ['SIMカード', 'mark'], ['eSIM', 'mark'],
  ['Dynamic Island', 'mark'], ['120Hz', 'mark'], ['Apple Intelligence', 'mark'], ['iOS 27', 'mark'],
];
const O = MARK_O, X = MARK_X;
const IOS_MODELS = [
  ['iPhone 18 Pro', 2026, 'Pro', [O, O, O, 'Face ID', X, O, O, O, O, O]],
  ['iPhone 18 Pro Max', 2026, 'Pro', [O, O, O, 'Face ID', X, O, O, O, O, O]],
  ['iPhone Duo', 2026, '折りたたみ', [O, O, O, 'Touch ID', X, O, '', '', O, O]],
  ['iPhone 17', 2025, '無印', [O, O, O, 'Face ID', X, O, O, O, O, O]],
  ['iPhone Air', 2025, 'Air', [O, O, O, 'Face ID', X, O, O, O, O, O]],
  ['iPhone 17 Pro', 2025, 'Pro', [O, O, O, 'Face ID', X, O, O, O, O, O]],
  ['iPhone 17e', 2026, 'e・SE', [O, O, O, 'Face ID', X, O, '', '', O, O]], // 未確認の項目は空欄（画面では「－」）
  ['iPhone 16 Pro', 2024, 'Pro', [O, O, O, 'Face ID', O, O, O, O, O, O]],
  ['iPhone 16', 2024, '無印', [O, O, O, 'Face ID', O, O, O, X, O, O]],
  ['iPhone 16e', 2025, 'e・SE', [O, X, O, 'Face ID', O, O, X, X, O, O]],
  ['iPhone 15 Pro', 2023, 'Pro', [O, O, O, 'Face ID', O, O, O, O, O, O]],
  ['iPhone 15', 2023, '無印', [O, O, O, 'Face ID', O, O, O, X, X, O]],
  ['iPhone 14', 2022, '無印', [O, O, X, 'Face ID', O, O, X, X, X, O]],
  ['iPhone 13', 2021, '無印', [O, O, X, 'Face ID', O, O, X, X, X, O]],
  ['iPhone 13 mini', 2021, 'mini', [O, O, X, 'Face ID', O, O, X, X, X, O]],
  ['iPhone 12', 2020, '無印', [O, O, X, 'Face ID', O, O, X, X, X, O]],
  ['iPhone SE（第3世代）', 2022, 'e・SE', [O, X, X, 'Touch ID', O, O, X, X, X, O]],
  ['iPhone 11', 2019, '無印', [X, X, X, 'Face ID', O, O, X, X, X, O]],
  ['iPhone XR', 2018, '無印', [X, X, X, 'Face ID', O, O, X, X, X, X]],
];
const ANDROID_FEATURES = [
  ['5G', 'mark'], ['おサイフケータイ', 'mark'], ['SIMカード', 'mark'], ['eSIM', 'mark'], ['防水', 'mark'], ['microSD', 'mark'], ['生体認証', 'text'],
];
// Android：シリーズは用語管理のandroid区分（pixel・galaxy・各メーカー）に合わせる。
// 対象は2021年秋以降に日本で発売された主な機種（キャリア・SIMフリー問わず）。
// 値は確認できたものだけ入れて、未確認は空欄（画面では「－」）。管理画面から埋めていく前提。
// 防水は「IPX7以上」を○とし、IP54（防滴）程度は×にしている
//   並び：5G, おサイフケータイ, SIMカード, eSIM, 防水, microSD, 生体認証
const ANDROID_MODELS = [
  // --- Pixel（無印）
  ['Google Pixel 11', 2026, 'Pixel', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 10', 2025, 'Pixel', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 9', 2024, 'Pixel', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 8', 2023, 'Pixel', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 7', 2022, 'Pixel', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 6', 2021, 'Pixel', [O, O, O, O, O, X, '指紋']],
  // --- Pixel a
  ['Google Pixel 10a', 2026, 'Pixel a', [O, O, O, O, O, X, '']],
  ['Google Pixel 9a', 2025, 'Pixel a', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 8a', 2024, 'Pixel a', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 7a', 2023, 'Pixel a', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 6a', 2022, 'Pixel a', [O, O, O, O, O, X, '指紋']],
  // --- Pixel Pro（Fold含む）
  ['Google Pixel 11 Pro', 2026, 'Pixel Pro', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 11 Pro XL', 2026, 'Pixel Pro', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 11 Pro Fold', 2026, 'Pixel Pro', [O, O, O, O, O, X, '']],
  ['Google Pixel 10 Pro', 2025, 'Pixel Pro', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 10 Pro XL', 2025, 'Pixel Pro', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 10 Pro Fold', 2025, 'Pixel Pro', [O, O, O, O, O, X, '']],
  ['Google Pixel 9 Pro', 2024, 'Pixel Pro', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 9 Pro XL', 2024, 'Pixel Pro', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 9 Pro Fold', 2024, 'Pixel Pro', [O, O, O, O, O, X, '']],
  ['Google Pixel 8 Pro', 2023, 'Pixel Pro', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel Fold', 2023, 'Pixel Pro', [O, O, O, O, O, X, '']],
  ['Google Pixel 7 Pro', 2022, 'Pixel Pro', [O, O, O, O, O, X, '指紋・顔']],
  ['Google Pixel 6 Pro', 2021, 'Pixel Pro', [O, O, O, O, O, X, '指紋']],
  // --- Galaxy A
  ['Galaxy A57 5G', 2026, 'Galaxy A', [O, '', O, '', '', '', '']],
  ['Galaxy A36 5G', 2025, 'Galaxy A', [O, O, O, '', O, '', '']],
  ['Galaxy A25 5G', 2025, 'Galaxy A', [O, O, O, '', O, '', '']],
  ['Galaxy A55 5G', 2024, 'Galaxy A', [O, O, O, '', O, '', '']],
  ['Galaxy A54 5G', 2023, 'Galaxy A', [O, O, O, '', O, '', '']],
  ['Galaxy A23 5G', 2022, 'Galaxy A', [O, O, O, '', O, '', '']],
  ['Galaxy A53 5G', 2022, 'Galaxy A', [O, O, O, '', O, '', '']],
  // --- Galaxy S
  ['Galaxy S26 Ultra', 2026, 'Galaxy S', [O, O, O, O, O, X, '指紋・顔']],
  ['Galaxy S26+', 2026, 'Galaxy S', [O, O, O, O, O, X, '指紋・顔']],
  ['Galaxy S26', 2026, 'Galaxy S', [O, O, O, O, O, X, '指紋・顔']],
  ['Galaxy S25 Ultra', 2025, 'Galaxy S', [O, O, O, O, O, X, '指紋・顔']],
  ['Galaxy S25', 2025, 'Galaxy S', [O, O, O, O, O, X, '指紋・顔']],
  ['Galaxy S24 FE', 2025, 'Galaxy S', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy S24 Ultra', 2024, 'Galaxy S', [O, O, O, O, O, X, '指紋・顔']],
  ['Galaxy S24', 2024, 'Galaxy S', [O, O, O, O, O, X, '指紋・顔']],
  ['Galaxy S23 FE', 2024, 'Galaxy S', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy S23 Ultra', 2023, 'Galaxy S', [O, O, O, O, O, X, '指紋・顔']],
  ['Galaxy S23', 2023, 'Galaxy S', [O, O, O, O, O, X, '指紋・顔']],
  ['Galaxy S22 Ultra', 2022, 'Galaxy S', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy S22', 2022, 'Galaxy S', [O, O, O, '', O, X, '指紋・顔']],
  // --- Galaxy Z
  ['Galaxy Z Fold8 Ultra', 2026, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy Z Fold8', 2026, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy Z Flip8', 2026, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy Z Fold7', 2025, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy Z Flip7', 2025, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy Z Fold6', 2024, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy Z Flip6', 2024, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy Z Fold5', 2023, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy Z Flip5', 2023, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy Z Fold4', 2022, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy Z Flip4', 2022, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy Z Fold3 5G', 2021, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  ['Galaxy Z Flip3 5G', 2021, 'Galaxy Z', [O, O, O, '', O, X, '指紋・顔']],
  // --- OPPO
  ['OPPO Find X9', 2025, 'OPPO', [O, O, O, '', O, X, '']],
  ['OPPO Reno13 A', 2025, 'OPPO', [O, O, O, O, O, O, '']],
  ['OPPO Find X8', 2024, 'OPPO', [O, X, O, '', O, X, '']],
  ['OPPO Reno11 A', 2024, 'OPPO', [O, O, O, O, O, O, '']],
  ['OPPO A79 5G', 2024, 'OPPO', [O, '', O, '', '', '', '']],
  ['OPPO Reno9 A', 2023, 'OPPO', [O, O, O, O, O, O, '']],
  ['OPPO Reno7 A', 2022, 'OPPO', [O, O, O, O, O, O, '']],
  ['OPPO A55s 5G', 2021, 'OPPO', [O, O, O, '', O, O, '']],
  // --- AQUOS
  ['AQUOS R11', 2026, 'AQUOS', [O, O, O, O, O, '', '']],
  ['AQUOS R10', 2025, 'AQUOS', [O, O, O, O, O, O, '']],
  ['AQUOS sense10', 2025, 'AQUOS', [O, O, O, O, O, O, '指紋・顔']],
  ['AQUOS R9 pro', 2024, 'AQUOS', [O, O, O, O, O, '', '']],
  ['AQUOS R9', 2024, 'AQUOS', [O, O, O, O, O, O, '']],
  ['AQUOS sense9', 2024, 'AQUOS', [O, O, O, O, O, O, '指紋・顔']],
  ['AQUOS wish4', 2024, 'AQUOS', [O, O, O, '', O, O, '']],
  ['AQUOS R8 pro', 2023, 'AQUOS', [O, O, O, O, O, '', '']],
  ['AQUOS R8', 2023, 'AQUOS', [O, O, O, O, O, O, '']],
  ['AQUOS sense8', 2023, 'AQUOS', [O, O, O, O, O, O, '指紋・顔']],
  ['AQUOS wish3', 2023, 'AQUOS', [O, O, O, '', O, O, '']],
  ['AQUOS R7', 2022, 'AQUOS', [O, O, O, '', O, O, '']],
  ['AQUOS sense7', 2022, 'AQUOS', [O, O, O, O, O, O, '指紋・顔']],
  ['AQUOS sense7 plus', 2022, 'AQUOS', [O, O, O, '', O, O, '']],
  ['AQUOS sense6s', 2022, 'AQUOS', [O, O, O, '', O, O, '指紋・顔']],
  ['AQUOS wish2', 2022, 'AQUOS', [O, O, O, '', O, O, '']],
  ['AQUOS wish', 2022, 'AQUOS', [O, O, O, '', O, O, '']],
  ['AQUOS sense6', 2021, 'AQUOS', [O, O, O, '', O, O, '指紋・顔']],
  ['AQUOS zero6', 2021, 'AQUOS', [O, O, O, '', O, O, '']],
  // --- Xperia
  ['Xperia 1 VIII', 2026, 'Xperia', [O, O, O, O, O, '', '指紋']],
  ['Xperia 1 VII', 2025, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 10 VII', 2025, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 1 VI', 2024, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 10 VI', 2024, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 1 V', 2023, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 10 V', 2023, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 5 V', 2023, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 1 IV', 2022, 'Xperia', [O, O, O, '', O, O, '指紋']],
  ['Xperia 10 IV', 2022, 'Xperia', [O, O, O, '', O, O, '指紋']],
  ['Xperia 5 IV', 2022, 'Xperia', [O, O, O, '', O, O, '指紋']],
  ['Xperia Ace III', 2022, 'Xperia', [O, O, O, '', O, O, '指紋']],
  ['Xperia 5 III', 2021, 'Xperia', [O, O, O, '', O, O, '指紋']],
  // --- motorola
  ['moto g37j', 2026, 'motorola', [O, '', O, '', '', '', '']],
  ['motorola razr 60 ultra', 2025, 'motorola', [O, '', O, '', '', X, '']],
  ['motorola razr 60', 2025, 'motorola', [O, '', O, '', '', X, '']],
  ['moto g66j 5G', 2025, 'motorola', [O, '', O, '', '', '', '']],
  ['motorola razr 50 ultra', 2024, 'motorola', [O, '', O, '', '', X, '']],
  ['motorola razr 50', 2024, 'motorola', [O, '', O, '', '', X, '']],
  ['moto g64 5G', 2024, 'motorola', [O, O, O, '', '', O, '']],
  ['motorola razr 40 ultra', 2023, 'motorola', [O, '', O, '', '', X, '']],
  ['motorola razr 40', 2023, 'motorola', [O, '', O, '', '', X, '']],
  ['motorola edge 40', 2023, 'motorola', [O, '', O, '', '', X, '']],
  ['moto g52j 5G', 2022, 'motorola', [O, O, O, '', O, O, '']],
  // --- arrows
  ['arrows Alpha2', 2026, 'arrows', [O, O, O, '', O, '', '']],
  ['arrows We3', 2026, 'arrows', [O, O, O, '', O, '', '']],
  ['arrows Alpha', 2025, 'arrows', [O, O, O, '', O, '', '']],
  ['arrows We2 Plus', 2024, 'arrows', [O, O, O, '', O, O, '']],
  ['arrows We2', 2024, 'arrows', [O, O, O, '', O, O, '']],
  ['arrows N', 2022, 'arrows', [O, O, O, '', O, '', '']],
  ['arrows We', 2021, 'arrows', [O, O, O, '', O, O, '']],
  // --- nubia
  ['nubia Flip 3', '', 'nubia', [O, '', O, '', '', '', '']],
  ['nubia Flip 2', 2025, 'nubia', [O, '', O, '', '', '', '']],
  ['nubia Flip 5G', 2024, 'nubia', [O, O, O, '', '', '', '']],
  ['nubia Ivy', 2024, 'nubia', [O, O, O, '', O, '', '']],
  // --- nothing
  ['Nothing Phone (3)', 2025, 'nothing', [O, O, O, '', O, X, '']],
  ['Nothing Phone (3a) Lite', 2025, 'nothing', [O, O, O, O, X, O, '指紋・顔']],
  ['Nothing Phone (3a)', 2025, 'nothing', [O, O, O, O, X, X, '']],
  ['Nothing Phone (2a)', 2024, 'nothing', [O, O, O, '', X, X, '']],
  ['Nothing Phone (2)', 2023, 'nothing', [O, X, O, '', X, X, '']],
  ['Nothing Phone (1)', 2022, 'nothing', [O, X, O, '', X, X, '']],
];

// サンプル定義を返す（項目は名前・種類、機種は値を項目名で持つ）
export function getSample(os) {
  const featDefs = os === 'ios' ? IOS_FEATURES : ANDROID_FEATURES;
  const modelDefs = os === 'ios' ? IOS_MODELS : ANDROID_MODELS;
  return {
    features: featDefs.map(([name, type]) => ({ name, type })),
    models: modelDefs.map(([name, year, series, vals]) => {
      const values = {};
      vals.forEach((v, j) => { if (v) values[featDefs[j][0]] = v; });
      return { name, year, series, values };
    }),
  };
}
