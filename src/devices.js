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
// 追加項目（iPhone・Android共通）。文字項目で「×」と入れると表では×として表示される
const EXTRA_FEATURES = [
  ['バッテリー', 'text'], ['急速充電', 'text'], ['ワイヤレス充電', 'mark'], ['逆ワイヤレス給電', 'mark'],
  ['画面サイズ', 'text'], ['重さ', 'text'], ['イヤホンジャック', 'mark'], ['望遠カメラ', 'text'],
  ['OSアップデート', 'text'], ['ストレージ', 'text'],
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
  ['Xperia 1 VIII', 2026, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 1 VII', 2025, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 10 VII', 2025, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 1 VI', 2024, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 10 VI', 2024, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 1 V', 2023, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 10 V', 2023, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 5 V', 2023, 'Xperia', [O, O, O, O, O, O, '指紋']],
  ['Xperia 1 IV', 2022, 'Xperia', [O, O, O, O, O, O, '指紋']],
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


// 追加項目の値：機種名 → [バッテリー, 急速充電, ワイヤレス充電, 逆ワイヤレス給電, 画面サイズ, 重さ, イヤホンジャック, 望遠カメラ, OSアップデート, ストレージ]
// iPhoneはAppleが容量(mAh)を公表していないため、バッテリーは「動画再生◯時間」。急速充電もAppleの表記（◯分で50%）に合わせる
// 空欄は未確認（画面では「－」）
const I_OS = '公表なし';
const P7 = '7年';
const P35 = 'OS3年・セキュリティ5年';
const G45 = 'OS4年・セキュリティ5年';
const EXTRA_VALUES = {
  // ===== iPhone =====
  'iPhone 18 Pro': ['動画36時間', '15分で50%（60W）', O, X, '6.3インチ', '211g', X, '光学4倍', I_OS, '256GB/512GB/1TB/2TB'],
  'iPhone 18 Pro Max': ['動画45時間', '15分で50%（60W）', O, X, '6.9インチ', '249g', X, '光学4倍', I_OS, '256GB/512GB/1TB/2TB'],
  'iPhone Duo': ['動画31時間（内側）', '', O, X, '7.6／5.4インチ', '254g', X, X, I_OS, '256GB/512GB/1TB/2TB'],
  'iPhone 17': ['動画30時間', '20分で50%（40W）', O, X, '6.3インチ', '177g', X, X, I_OS, '256GB/512GB'],
  'iPhone Air': ['動画27時間', '30分で50%（20W）', O, X, '6.5インチ', '165g', X, X, I_OS, '256GB/512GB/1TB'],
  'iPhone 17 Pro': ['動画33時間', '20分で50%（40W）', O, X, '6.3インチ', '206g', X, '光学4倍', I_OS, '256GB/512GB/1TB'],
  'iPhone 17e': ['', '30分で50%（20W）', O, X, '6.1インチ', '', X, X, I_OS, '256GB/512GB'],
  'iPhone 16 Pro': ['動画27時間', '30分で50%（20W）', O, X, '6.3インチ', '199g', X, '光学5倍', I_OS, '128GB/256GB/512GB/1TB'],
  'iPhone 16': ['動画22時間', '30分で50%（20W）', O, X, '6.1インチ', '170g', X, X, I_OS, '128GB/256GB/512GB'],
  'iPhone 16e': ['動画26時間', '30分で50%（20W）', O, X, '6.1インチ', '167g', X, X, I_OS, '128GB/256GB/512GB'],
  'iPhone 15 Pro': ['動画23時間', '30分で50%（20W）', O, X, '6.1インチ', '187g', X, '光学3倍', I_OS, '128GB/256GB/512GB/1TB'],
  'iPhone 15': ['動画20時間', '30分で50%（20W）', O, X, '6.1インチ', '171g', X, X, I_OS, '128GB/256GB/512GB'],
  'iPhone 14': ['動画20時間', '30分で50%（20W）', O, X, '6.1インチ', '172g', X, X, I_OS, '128GB/256GB/512GB'],
  'iPhone 13': ['動画19時間', '30分で50%（20W）', O, X, '6.1インチ', '173g', X, X, I_OS, '128GB/256GB/512GB'],
  'iPhone 13 mini': ['動画17時間', '30分で50%（20W）', O, X, '5.4インチ', '140g', X, X, I_OS, '128GB/256GB/512GB'],
  'iPhone 12': ['動画17時間', '30分で50%（20W）', O, X, '6.1インチ', '162g', X, X, I_OS, '64GB/128GB/256GB'],
  'iPhone SE（第3世代）': ['動画15時間', '30分で50%（20W）', O, X, '4.7インチ', '144g', X, X, I_OS, '64GB/128GB/256GB'],
  'iPhone 11': ['動画17時間', '30分で50%（18W）', O, X, '6.1インチ', '194g', X, X, I_OS, '64GB/128GB/256GB'],
  'iPhone XR': ['動画16時間', '30分で50%（18W）', O, X, '6.1インチ', '194g', X, X, I_OS, '64GB/128GB/256GB'],

  // ===== Pixel =====
  'Google Pixel 11': ['4,985mAh', '', O, '', '6.3インチ', '197g', X, '光学5倍', P7, ''],
  'Google Pixel 10': ['4,970mAh', '30W', O, X, '6.3インチ', '204g', X, '光学5倍', P7, '128GB/256GB'],
  'Google Pixel 9': ['4,700mAh', '27W', O, O, '6.3インチ', '198g', X, X, P7, '128GB/256GB'],
  'Google Pixel 8': ['4,575mAh', '27W', O, O, '6.2インチ', '187g', X, X, P7, '128GB/256GB'],
  'Google Pixel 7': ['4,355mAh', '21W', O, O, '6.3インチ', '197g', X, X, P35, '128GB/256GB'],
  'Google Pixel 6': ['4,614mAh', '21W', O, O, '6.4インチ', '207g', X, X, P35, '128GB/256GB'],
  'Google Pixel 10a': ['', '', '', '', '', '', X, X, '', ''],
  'Google Pixel 9a': ['5,100mAh', '23W', O, X, '6.3インチ', '186g', X, X, P7, '128GB/256GB'],
  'Google Pixel 8a': ['4,492mAh', '18W', O, X, '6.1インチ', '188g', X, X, P7, '128GB/256GB'],
  'Google Pixel 7a': ['4,385mAh', '18W', O, X, '6.1インチ', '193g', X, X, P35, '128GB'],
  'Google Pixel 6a': ['4,410mAh', '18W', X, X, '6.1インチ', '178g', X, X, P35, '128GB'],
  'Google Pixel 11 Pro': ['4,850mAh', '', O, '', '6.3インチ', '', X, '光学5倍', P7, ''],
  'Google Pixel 11 Pro XL': ['5,115mAh', '', O, '', '6.8インチ', '', X, '光学5倍', P7, ''],
  'Google Pixel 11 Pro Fold': ['4,806mAh', '30W', O, '', '8.0インチ（内側）', '239g', X, '光学5倍', P7, '256GB/512GB'],
  'Google Pixel 10 Pro': ['4,870mAh', '30W', O, X, '6.3インチ', '207g', X, '光学5倍', P7, '128GB/256GB/512GB/1TB'],
  'Google Pixel 10 Pro XL': ['5,200mAh', '45W', O, X, '6.8インチ', '232g', X, '光学5倍', P7, '256GB/512GB/1TB'],
  'Google Pixel 10 Pro Fold': ['5,015mAh', '30W', O, X, '8.0／6.4インチ', '258g', X, '光学5倍', P7, '256GB/512GB/1TB'],
  'Google Pixel 9 Pro': ['4,700mAh', '27W', O, O, '6.3インチ', '199g', X, '光学5倍', P7, '128GB/256GB/512GB'],
  'Google Pixel 9 Pro XL': ['5,060mAh', '37W', O, O, '6.8インチ', '221g', X, '光学5倍', P7, '128GB/256GB/512GB/1TB'],
  'Google Pixel 9 Pro Fold': ['4,650mAh', '21W', O, O, '8.0／6.3インチ', '257g', X, '光学5倍', P7, '256GB/512GB'],
  'Google Pixel 8 Pro': ['5,050mAh', '30W', O, O, '6.7インチ', '213g', X, '光学5倍', P7, '128GB/256GB/512GB'],
  'Google Pixel Fold': ['4,821mAh', '30W', O, O, '7.6／5.8インチ', '283g', X, '光学5倍', P35, '256GB'],
  'Google Pixel 7 Pro': ['5,000mAh', '23W', O, O, '6.7インチ', '212g', X, '光学5倍', P35, '128GB/256GB'],
  'Google Pixel 6 Pro': ['5,003mAh', '23W', O, O, '6.7インチ', '210g', X, '光学4倍', P35, '128GB/256GB'],

  // ===== Galaxy =====
  'Galaxy A57 5G': ['', '', '', '', '', '', '', '', '', ''],
  'Galaxy A36 5G': ['5,000mAh', '45W', X, X, '6.7インチ', '195g', X, X, '6年', '128GB'],
  'Galaxy A25 5G': ['5,000mAh', '', X, X, '6.7インチ', '', O, X, '', '64GB'],
  'Galaxy A55 5G': ['5,000mAh', '25W', X, X, '6.6インチ', '213g', X, X, G45, '128GB'],
  'Galaxy A54 5G': ['5,000mAh', '25W', X, X, '6.4インチ', '202g', X, X, G45, '128GB'],
  'Galaxy A23 5G': ['4,000mAh', '', X, X, '5.8インチ', '168g', O, X, '', '64GB'],
  'Galaxy A53 5G': ['4,500mAh', '', X, X, '6.5インチ', '189g', X, X, G45, '128GB'],
  'Galaxy S26 Ultra': ['5,000mAh', '60W', O, O, '6.9インチ', '214g', X, '光学3倍・5倍', P7, '256GB/512GB/1TB'],
  'Galaxy S26+': ['4,900mAh', '45W', O, O, '6.7インチ', '', X, '光学3倍', P7, ''],
  'Galaxy S26': ['4,300mAh', '25W', O, O, '6.3インチ', '', X, '光学3倍', P7, ''],
  'Galaxy S25 Ultra': ['5,000mAh', '45W', O, O, '6.9インチ', '218g', X, '光学3倍・5倍', P7, '256GB/512GB/1TB'],
  'Galaxy S25': ['4,000mAh', '25W', O, O, '6.2インチ', '162g', X, '光学3倍', P7, '256GB/512GB'],
  'Galaxy S24 FE': ['4,700mAh', '25W', O, O, '6.7インチ', '213g', X, '光学3倍', P7, ''],
  'Galaxy S24 Ultra': ['5,000mAh', '45W', O, O, '6.8インチ', '233g', X, '光学3倍・5倍', P7, '256GB/512GB/1TB'],
  'Galaxy S24': ['4,000mAh', '25W', O, O, '6.2インチ', '167g', X, '光学3倍', P7, '256GB/512GB'],
  'Galaxy S23 FE': ['4,500mAh', '25W', O, O, '6.4インチ', '209g', X, '光学3倍', G45, ''],
  'Galaxy S23 Ultra': ['5,000mAh', '45W', O, O, '6.8インチ', '233g', X, '光学3倍・10倍', G45, '256GB/512GB/1TB'],
  'Galaxy S23': ['3,900mAh', '25W', O, O, '6.1インチ', '168g', X, '光学3倍', G45, '256GB'],
  'Galaxy S22 Ultra': ['5,000mAh', '45W', O, O, '6.8インチ', '228g', X, '光学3倍・10倍', G45, '256GB'],
  'Galaxy S22': ['3,700mAh', '25W', O, O, '6.1インチ', '168g', X, '光学3倍', G45, '256GB'],
  'Galaxy Z Fold8 Ultra': ['5,000mAh', '45W', O, O, '8.0／6.5インチ', '215g', X, '光学3倍', P7, '256GB/512GB/1TB'],
  'Galaxy Z Fold8': ['4,800mAh', '45W', O, '', '7.6／5.5インチ', '201g', X, X, P7, '256GB/512GB/1TB'],
  'Galaxy Z Flip8': ['4,300mAh', '', O, '', '6.9／4.1インチ', '', X, X, P7, '256GB/512GB'],
  'Galaxy Z Fold7': ['4,400mAh', '25W', O, O, '8.0／6.5インチ', '215g', X, '光学3倍', P7, '256GB/512GB/1TB'],
  'Galaxy Z Flip7': ['4,300mAh', '25W', O, O, '6.9／4.1インチ', '188g', X, X, P7, '256GB/512GB'],
  'Galaxy Z Fold6': ['4,400mAh', '25W', O, O, '7.6／6.3インチ', '239g', X, '光学3倍', P7, '256GB/512GB/1TB'],
  'Galaxy Z Flip6': ['4,000mAh', '25W', O, O, '6.7／3.4インチ', '187g', X, X, P7, '256GB/512GB'],
  'Galaxy Z Fold5': ['4,400mAh', '25W', O, O, '7.6／6.2インチ', '253g', X, '光学3倍', G45, '256GB/512GB/1TB'],
  'Galaxy Z Flip5': ['3,700mAh', '25W', O, O, '6.7／3.4インチ', '187g', X, X, G45, '256GB/512GB'],
  'Galaxy Z Fold4': ['4,400mAh', '25W', O, O, '7.6／6.2インチ', '263g', X, '光学3倍', G45, '256GB/512GB'],
  'Galaxy Z Flip4': ['3,700mAh', '25W', O, O, '6.7／1.9インチ', '187g', X, X, G45, '128GB/256GB'],
  'Galaxy Z Fold3 5G': ['4,400mAh', '25W', O, O, '7.6／6.2インチ', '271g', X, '光学2倍', '', '256GB'],
  'Galaxy Z Flip3 5G': ['3,300mAh', '15W', O, O, '6.7／1.9インチ', '183g', X, X, '', '128GB'],

  // ===== OPPO =====
  'OPPO Find X9': ['', '', O, '', '', '', X, '光学3倍', '', ''],
  'OPPO Reno13 A': ['5,800mAh', '45W', X, X, '6.7インチ', '192g', X, X, '', '128GB'],
  'OPPO Find X8': ['5,630mAh', '80W', O, O, '6.6インチ', '193g', X, '光学3倍', '', '256GB/512GB'],
  'OPPO Reno11 A': ['5,000mAh', '67W', X, X, '6.7インチ', '177g', X, X, '', '128GB'],
  'OPPO A79 5G': ['5,000mAh', '33W', X, X, '6.7インチ', '193g', O, X, '', '128GB'],
  'OPPO Reno9 A': ['4,500mAh', '18W', X, X, '6.4インチ', '183g', O, X, '', '128GB'],
  'OPPO Reno7 A': ['4,500mAh', '18W', X, X, '6.4インチ', '175g', O, X, '', '128GB'],
  'OPPO A55s 5G': ['4,000mAh', '18W', X, X, '6.5インチ', '186g', O, X, '', '64GB'],

  // ===== AQUOS（急速充電はUSB PD対応だがW数の公表が少ないため空欄）=====
  'AQUOS R11': ['', '', '', '', '', '', '', '', '', ''],
  'AQUOS R10': ['5,000mAh', '', O, '', '6.5インチ', '197g', '', X, '', ''],
  'AQUOS sense10': ['5,000mAh', '', X, X, '6.1インチ', '166g', '', X, '', ''],
  'AQUOS R9 pro': ['5,000mAh', '', O, '', '6.7インチ', '', '', '', '', ''],
  'AQUOS R9': ['5,000mAh', '', O, '', '6.5インチ', '195g', '', X, '', ''],
  'AQUOS sense9': ['5,000mAh', '', X, X, '6.1インチ', '166g', '', X, '', '128GB/256GB'],
  'AQUOS wish4': ['5,000mAh', '', X, X, '6.6インチ', '', O, X, '', ''],
  'AQUOS R8 pro': ['5,000mAh', '', O, '', '6.6インチ', '203g', X, X, '', '256GB'],
  'AQUOS R8': ['4,570mAh', '', O, '', '6.4インチ', '179g', X, X, '', '256GB'],
  'AQUOS sense8': ['5,000mAh', '', X, X, '6.1インチ', '159g', O, X, '', '128GB/256GB'],
  'AQUOS wish3': ['3,730mAh', '', X, X, '5.7インチ', '161g', O, X, '', '64GB'],
  'AQUOS R7': ['5,000mAh', '', O, '', '6.6インチ', '208g', '', X, '', '256GB'],
  'AQUOS sense7': ['4,570mAh', '', X, X, '6.1インチ', '158g', O, X, '', '128GB'],
  'AQUOS sense7 plus': ['5,050mAh', '', X, X, '6.4インチ', '172g', O, X, '', '128GB'],
  'AQUOS sense6s': ['4,570mAh', '', X, X, '6.1インチ', '156g', O, X, '', '64GB'],
  'AQUOS wish2': ['3,730mAh', '', X, X, '5.7インチ', '162g', O, X, '', '64GB'],
  'AQUOS wish': ['3,730mAh', '', X, X, '5.7インチ', '162g', O, X, '', '64GB'],
  'AQUOS sense6': ['4,570mAh', '', X, X, '6.1インチ', '156g', O, X, '', '64GB/128GB'],
  'AQUOS zero6': ['4,010mAh', '', X, X, '6.4インチ', '146g', '', X, '', '128GB'],

  // ===== Xperia =====
  'Xperia 1 VIII': ['5,000mAh', '', O, '', '6.5インチ', '200g', O, O, 'OS4回', '256GB/512GB/1TB'],
  'Xperia 1 VII': ['5,000mAh', '30W', O, O, '6.5インチ', '197g', O, '光学3.5〜7.1倍', 'OS4回', '256GB/512GB'],
  'Xperia 10 VII': ['5,000mAh', '', X, X, '6.1インチ', '', O, X, '', '128GB'],
  'Xperia 1 VI': ['5,000mAh', '30W', O, O, '6.5インチ', '192g', O, '光学3.5〜7.1倍', 'OS3回', '256GB/512GB'],
  'Xperia 10 VI': ['5,000mAh', '', X, X, '6.1インチ', '164g', O, X, '', '128GB'],
  'Xperia 1 V': ['5,000mAh', '30W', O, O, '6.5インチ', '187g', O, '光学3.5〜5.2倍', '', '256GB/512GB'],
  'Xperia 10 V': ['5,000mAh', '', X, X, '6.1インチ', '159g', O, X, '', '128GB'],
  'Xperia 5 V': ['5,000mAh', '30W', O, O, '6.1インチ', '182g', O, X, '', '128GB/256GB'],
  'Xperia 1 IV': ['5,000mAh', '30W', O, O, '6.5インチ', '185g', O, '光学3.5〜5.2倍', '', '256GB/512GB'],
  'Xperia 10 IV': ['5,000mAh', '', X, X, '6.0インチ', '161g', O, X, '', '128GB'],
  'Xperia 5 IV': ['5,000mAh', '30W', O, O, '6.1インチ', '172g', O, '光学2.5倍', '', '128GB/256GB'],
  'Xperia Ace III': ['4,500mAh', '', X, X, '5.5インチ', '162g', O, X, '', '64GB'],
  'Xperia 5 III': ['4,500mAh', '30W', O, O, '6.1インチ', '168g', O, '光学3〜4.4倍', '', '128GB/256GB'],

  // ===== motorola =====
  'moto g37j': ['', '', '', '', '', '', '', '', '', ''],
  'motorola razr 60 ultra': ['4,700mAh', '68W', O, O, '7.0／4.0インチ', '199g', X, X, '', '512GB'],
  'motorola razr 60': ['4,500mAh', '30W', O, X, '6.9／3.6インチ', '188g', X, X, '', '256GB'],
  'moto g66j 5G': ['5,200mAh', '', X, X, '6.7インチ', '', O, X, '', '128GB'],
  'motorola razr 50 ultra': ['4,000mAh', '45W', O, O, '6.9／4.0インチ', '189g', X, '光学2倍', '', '512GB'],
  'motorola razr 50': ['4,200mAh', '30W', O, X, '6.9／3.6インチ', '188g', X, X, '', '256GB'],
  'moto g64 5G': ['5,000mAh', '30W', X, X, '6.5インチ', '192g', O, X, '', '128GB'],
  'motorola razr 40 ultra': ['3,800mAh', '30W', O, X, '6.9／3.6インチ', '184g', X, X, '', '256GB'],
  'motorola razr 40': ['4,200mAh', '30W', O, X, '6.9／1.5インチ', '189g', X, X, '', '256GB'],
  'motorola edge 40': ['4,400mAh', '68W', O, X, '6.55インチ', '171g', X, X, '', '256GB'],
  'moto g52j 5G': ['5,000mAh', '', X, X, '6.8インチ', '206g', O, X, '', '128GB'],

  // ===== arrows =====
  'arrows Alpha2': ['', '', '', '', '', '', '', '', '', ''],
  'arrows We3': ['5,000mAh', '', '', '', '', '', '', X, '', ''],
  'arrows Alpha': ['5,000mAh', '90W', X, X, '6.4インチ', '188g', X, X, '', '512GB'],
  'arrows We2 Plus': ['5,000mAh', '', X, X, '6.6インチ', '196g', O, X, '', '128GB'],
  'arrows We2': ['4,500mAh', '', X, X, '6.1インチ', '', O, X, '', '64GB'],
  'arrows N': ['', '', X, X, '6.24インチ', '', '', X, '', ''],
  'arrows We': ['4,000mAh', '', X, X, '6.1インチ', '172g', O, X, '', '64GB'],

  // ===== nubia =====
  'nubia Flip 3': ['', '', '', '', '6.9インチ', '', '', X, '', '128GB'],
  'nubia Flip 2': ['', '', X, X, '6.9インチ', '', X, X, '', ''],
  'nubia Flip 5G': ['4,310mAh', '33W', X, X, '6.9／1.43インチ', '', X, X, '', '256GB'],
  'nubia Ivy': ['5,000mAh', '', X, X, '6.6インチ', '', '', X, '', '128GB'],

  // ===== nothing =====
  'Nothing Phone (3)': ['5,150mAh', '65W', O, O, '6.67インチ', '218g', X, '光学3倍', 'OS5年・セキュリティ7年', '256GB/512GB'],
  'Nothing Phone (3a) Lite': ['5,000mAh', '33W', X, X, '6.77インチ', '199g', X, X, '', '128GB'],
  'Nothing Phone (3a)': ['5,000mAh', '50W', X, X, '6.77インチ', '201g', X, '光学2倍', 'OS3年・セキュリティ6年', '128GB/256GB'],
  'Nothing Phone (2a)': ['5,000mAh', '45W', X, X, '6.7インチ', '190g', X, X, 'OS3年・セキュリティ4年', '128GB/256GB'],
  'Nothing Phone (2)': ['4,700mAh', '45W', O, O, '6.7インチ', '201g', X, X, 'OS3年・セキュリティ4年', '256GB/512GB'],
  'Nothing Phone (1)': ['4,500mAh', '33W', O, O, '6.55インチ', '193g', X, X, 'OS3年・セキュリティ4年', '128GB/256GB'],
};


// Android専用の追加項目：リフレッシュレート（最大値）。iPhoneは既存の「120Hz」（○×）で比較する
const ANDROID_REFRESH_FEATURE = ['リフレッシュレート', 'text'];
const H = (n) => `${n}Hz`;
const ANDROID_REFRESH = {
  'Google Pixel 10': H(120), 'Google Pixel 9': H(120), 'Google Pixel 8': H(120), 'Google Pixel 7': H(90), 'Google Pixel 6': H(90),
  'Google Pixel 9a': H(120), 'Google Pixel 8a': H(120), 'Google Pixel 7a': H(90), 'Google Pixel 6a': H(60),
  'Google Pixel 10 Pro': H(120), 'Google Pixel 10 Pro XL': H(120), 'Google Pixel 10 Pro Fold': H(120),
  'Google Pixel 9 Pro': H(120), 'Google Pixel 9 Pro XL': H(120), 'Google Pixel 9 Pro Fold': H(120),
  'Google Pixel 8 Pro': H(120), 'Google Pixel Fold': H(120), 'Google Pixel 7 Pro': H(120), 'Google Pixel 6 Pro': H(120),
  'Galaxy A36 5G': H(120), 'Galaxy A55 5G': H(120), 'Galaxy A54 5G': H(120), 'Galaxy A53 5G': H(120), 'Galaxy A23 5G': H(60),
  'Galaxy S26 Ultra': H(120), 'Galaxy S26+': H(120), 'Galaxy S26': H(120), 'Galaxy S25 Ultra': H(120), 'Galaxy S25': H(120),
  'Galaxy S24 FE': H(120), 'Galaxy S24 Ultra': H(120), 'Galaxy S24': H(120), 'Galaxy S23 FE': H(120),
  'Galaxy S23 Ultra': H(120), 'Galaxy S23': H(120), 'Galaxy S22 Ultra': H(120), 'Galaxy S22': H(120),
  'Galaxy Z Fold8 Ultra': H(120), 'Galaxy Z Fold8': H(120), 'Galaxy Z Flip8': H(120), 'Galaxy Z Fold7': H(120), 'Galaxy Z Flip7': H(120),
  'Galaxy Z Fold6': H(120), 'Galaxy Z Flip6': H(120), 'Galaxy Z Fold5': H(120), 'Galaxy Z Flip5': H(120),
  'Galaxy Z Fold4': H(120), 'Galaxy Z Flip4': H(120), 'Galaxy Z Fold3 5G': H(120), 'Galaxy Z Flip3 5G': H(120),
  'OPPO Find X9': H(120), 'OPPO Reno13 A': H(120), 'OPPO Find X8': H(120), 'OPPO Reno11 A': H(120), 'OPPO A79 5G': H(90),
  'OPPO Reno9 A': H(90), 'OPPO Reno7 A': H(90), 'OPPO A55s 5G': H(90),
  'AQUOS R10': H(240), 'AQUOS sense10': H(240), 'AQUOS R9 pro': H(240), 'AQUOS R9': H(240), 'AQUOS sense9': H(240),
  'AQUOS R8 pro': H(240), 'AQUOS R8': H(240), 'AQUOS sense8': H(90), 'AQUOS R7': H(240), 'AQUOS sense7': H(60),
  'AQUOS sense7 plus': H(120), 'AQUOS wish4': H(90), 'AQUOS wish3': H(60), 'AQUOS wish2': H(60), 'AQUOS wish': H(60), 'AQUOS zero6': H(240),
  'Xperia 1 VIII': H(120), 'Xperia 1 VII': H(120), 'Xperia 1 VI': H(120), 'Xperia 1 V': H(120), 'Xperia 1 IV': H(120),
  'Xperia 5 V': H(120), 'Xperia 5 IV': H(120), 'Xperia 5 III': H(120),
  'Xperia 10 VI': H(60), 'Xperia 10 V': H(60), 'Xperia 10 IV': H(60), 'Xperia Ace III': H(60),
  'motorola razr 60 ultra': H(165), 'motorola razr 60': H(120), 'moto g66j 5G': H(120), 'motorola razr 50 ultra': H(165),
  'motorola razr 50': H(120), 'moto g64 5G': H(120), 'motorola razr 40 ultra': H(165), 'motorola razr 40': H(144),
  'motorola edge 40': H(144), 'moto g52j 5G': H(120),
  'arrows Alpha': H(144), 'arrows We2 Plus': H(144), 'arrows We': H(60),
  'nubia Flip 5G': H(120), 'nubia Flip 2': H(120),
  'Nothing Phone (3)': H(120), 'Nothing Phone (3a) Lite': H(120), 'Nothing Phone (3a)': H(120),
  'Nothing Phone (2a)': H(120), 'Nothing Phone (2)': H(120), 'Nothing Phone (1)': H(120),
};


// カメラの画素数（iPhone・Android共通の追加項目）
// iPhoneはApple公式の表記（48MP Fusion など）、Androidは国内の公式表記に合わせて「◯万画素」で入れる。空欄は未確認
const CAMERA_FEATURES = [['アウトカメラ', 'text'], ['インカメラ', 'text']];
const CAMERAS = {
  // ===== iPhone =====
  'iPhone 18 Pro': ['48MP Fusion／48MP 超広角／48MP 望遠', '18MP センターフレーム'],
  'iPhone 18 Pro Max': ['48MP Fusion／48MP 超広角／48MP 望遠', '18MP センターフレーム'],
  'iPhone Duo': ['48MP Fusion／48MP 超広角', ''],
  'iPhone 17': ['48MP Fusion／48MP 超広角', '18MP センターフレーム'],
  'iPhone Air': ['48MP Fusion', '18MP センターフレーム'],
  'iPhone 17 Pro': ['48MP Fusion／48MP 超広角／48MP 望遠', '18MP センターフレーム'],
  'iPhone 17e': ['48MP Fusion', ''],
  'iPhone 16 Pro': ['48MP Fusion／48MP 超広角／12MP 5倍望遠', '12MP'],
  'iPhone 16': ['48MP Fusion／12MP 超広角', '12MP'],
  'iPhone 16e': ['48MP Fusion', '12MP'],
  'iPhone 15 Pro': ['48MP メイン／12MP 超広角／12MP 3倍望遠', '12MP'],
  'iPhone 15': ['48MP メイン／12MP 超広角', '12MP'],
  'iPhone 14': ['12MP メイン／12MP 超広角', '12MP'],
  'iPhone 13': ['12MP 広角／12MP 超広角', '12MP'],
  'iPhone 13 mini': ['12MP 広角／12MP 超広角', '12MP'],
  'iPhone 12': ['12MP 広角／12MP 超広角', '12MP'],
  'iPhone SE（第3世代）': ['12MP 広角', '7MP'],
  'iPhone 11': ['12MP 広角／12MP 超広角', '12MP'],
  'iPhone XR': ['12MP 広角', '7MP'],

  // ===== Pixel =====
  'Google Pixel 11': ['広角4,800万／超広角1,300万／望遠1,080万', ''],
  'Google Pixel 10': ['広角4,800万／超広角1,300万／望遠1,080万', '1,050万'],
  'Google Pixel 9': ['広角5,000万／超広角4,800万', '1,050万'],
  'Google Pixel 8': ['広角5,000万／超広角1,200万', '1,050万'],
  'Google Pixel 7': ['広角5,000万／超広角1,200万', '1,080万'],
  'Google Pixel 6': ['広角5,000万／超広角1,200万', '800万'],
  'Google Pixel 9a': ['広角4,800万／超広角1,300万', '1,300万'],
  'Google Pixel 8a': ['広角6,400万／超広角1,300万', '1,300万'],
  'Google Pixel 7a': ['広角6,400万／超広角1,300万', '1,300万'],
  'Google Pixel 6a': ['広角1,220万／超広角1,200万', '800万'],
  'Google Pixel 11 Pro Fold': ['広角4,800万（ほかは未確認）', ''],
  'Google Pixel 10 Pro': ['広角5,000万／超広角4,800万／望遠4,800万', '4,200万'],
  'Google Pixel 10 Pro XL': ['広角5,000万／超広角4,800万／望遠4,800万', '4,200万'],
  'Google Pixel 10 Pro Fold': ['広角4,800万／超広角1,050万／望遠1,080万', '1,000万'],
  'Google Pixel 9 Pro': ['広角5,000万／超広角4,800万／望遠4,800万', '4,200万'],
  'Google Pixel 9 Pro XL': ['広角5,000万／超広角4,800万／望遠4,800万', '4,200万'],
  'Google Pixel 9 Pro Fold': ['広角4,800万／超広角1,050万／望遠1,080万', '1,000万'],
  'Google Pixel 8 Pro': ['広角5,000万／超広角4,800万／望遠4,800万', '1,050万'],
  'Google Pixel Fold': ['広角4,800万／超広角1,080万／望遠1,080万', '外950万／内800万'],
  'Google Pixel 7 Pro': ['広角5,000万／超広角1,200万／望遠4,800万', '1,080万'],
  'Google Pixel 6 Pro': ['広角5,000万／超広角1,200万／望遠4,800万', '1,110万'],

  // ===== Galaxy =====
  'Galaxy A36 5G': ['広角5,000万／超広角800万／マクロ500万', '1,200万'],
  'Galaxy A55 5G': ['広角5,000万／超広角1,200万／マクロ500万', '3,200万'],
  'Galaxy A54 5G': ['広角5,000万／超広角1,200万／マクロ500万', '3,200万'],
  'Galaxy A53 5G': ['広角6,400万／超広角1,200万／深度500万／マクロ500万', '3,200万'],
  'Galaxy S26 Ultra': ['広角2億／超広角5,000万／望遠5,000万', ''],
  'Galaxy S26+': ['広角5,000万／超広角1,200万／望遠1,000万', ''],
  'Galaxy S26': ['広角5,000万／超広角1,200万／望遠1,000万', ''],
  'Galaxy S25 Ultra': ['広角2億／超広角5,000万／望遠5,000万／望遠1,000万', '1,200万'],
  'Galaxy S25': ['広角5,000万／超広角1,200万／望遠1,000万', '1,200万'],
  'Galaxy S24 FE': ['広角5,000万／超広角1,200万／望遠800万', '1,000万'],
  'Galaxy S24 Ultra': ['広角2億／超広角1,200万／望遠5,000万／望遠1,000万', '1,200万'],
  'Galaxy S24': ['広角5,000万／超広角1,200万／望遠1,000万', '1,200万'],
  'Galaxy S23 FE': ['広角5,000万／超広角1,200万／望遠800万', '1,000万'],
  'Galaxy S23 Ultra': ['広角2億／超広角1,200万／望遠1,000万／望遠1,000万', '1,200万'],
  'Galaxy S23': ['広角5,000万／超広角1,200万／望遠1,000万', '1,200万'],
  'Galaxy S22 Ultra': ['広角1億800万／超広角1,200万／望遠1,000万／望遠1,000万', '4,000万'],
  'Galaxy S22': ['広角5,000万／超広角1,200万／望遠1,000万', '1,000万'],
  'Galaxy Z Fold8 Ultra': ['広角2億／超広角5,000万／望遠1,000万', '外1,000万／内1,000万'],
  'Galaxy Z Fold8': ['広角5,000万／超広角5,000万', '外1,000万／内1,000万'],
  'Galaxy Z Fold7': ['広角2億／超広角1,200万／望遠1,000万', '外1,000万／内1,000万'],
  'Galaxy Z Flip7': ['広角5,000万／超広角1,200万', '1,000万'],
  'Galaxy Z Fold6': ['広角5,000万／超広角1,200万／望遠1,000万', '外1,000万／内400万'],
  'Galaxy Z Flip6': ['広角5,000万／超広角1,200万', '1,000万'],
  'Galaxy Z Fold5': ['広角5,000万／超広角1,200万／望遠1,000万', '外1,000万／内400万'],
  'Galaxy Z Flip5': ['広角1,200万／超広角1,200万', '1,000万'],
  'Galaxy Z Fold4': ['広角5,000万／超広角1,200万／望遠1,000万', '外1,000万／内400万'],
  'Galaxy Z Flip4': ['広角1,200万／超広角1,200万', '1,000万'],
  'Galaxy Z Fold3 5G': ['広角1,200万／超広角1,200万／望遠1,200万', '外1,000万／内400万'],
  'Galaxy Z Flip3 5G': ['広角1,200万／超広角1,200万', '1,000万'],

  // ===== OPPO =====
  'OPPO Find X9': ['広角5,000万／超広角5,000万／望遠5,000万', '3,200万'],
  'OPPO Reno13 A': ['広角5,000万／超広角800万／マクロ200万', '3,200万'],
  'OPPO Find X8': ['広角5,000万／超広角5,000万／望遠5,000万', '3,200万'],
  'OPPO Reno11 A': ['広角6,400万／超広角800万／マクロ200万', '3,200万'],
  'OPPO A79 5G': ['広角5,000万／深度200万', '800万'],
  'OPPO Reno9 A': ['広角4,800万／超広角800万／マクロ200万', '1,600万'],
  'OPPO Reno7 A': ['広角4,800万／超広角800万／マクロ200万', '1,600万'],
  'OPPO A55s 5G': ['広角1,300万／深度200万', '800万'],

  // ===== AQUOS =====
  'AQUOS R10': ['広角5,030万／超広角5,030万', '5,030万'],
  'AQUOS sense9': ['広角5,030万／超広角5,030万', '3,200万'],
  'AQUOS R9 pro': ['広角5,030万／超広角5,030万／望遠5,030万', '5,030万'],
  'AQUOS R9': ['広角5,030万／超広角5,030万', '5,030万'],
  'AQUOS wish4': ['広角5,000万', '800万'],
  'AQUOS R8 pro': ['広角4,720万', '1,260万'],
  'AQUOS R8': ['広角4,720万', '800万'],
  'AQUOS sense8': ['広角5,030万／超広角800万', '800万'],
  'AQUOS wish3': ['広角1,300万', '800万'],
  'AQUOS R7': ['広角4,720万', '1,260万'],
  'AQUOS sense7': ['広角5,030万／超広角800万', '800万'],
  'AQUOS sense7 plus': ['広角5,030万／超広角800万', '800万'],
  'AQUOS sense6s': ['広角4,800万／超広角800万／望遠800万', '800万'],
  'AQUOS wish2': ['広角1,300万', '800万'],
  'AQUOS wish': ['広角1,300万', '800万'],
  'AQUOS sense6': ['広角4,800万／超広角800万／望遠800万', '800万'],
  'AQUOS zero6': ['広角4,800万／超広角800万／望遠800万', ''],

  // ===== Xperia =====
  'Xperia 1 VIII': ['広角4,800万／超広角4,800万／望遠4,800万', '1,200万'],
  'Xperia 1 VII': ['広角4,800万／超広角4,800万／望遠1,200万', '1,200万'],
  'Xperia 1 VI': ['広角4,800万／超広角1,200万／望遠1,200万', '1,200万'],
  'Xperia 10 VI': ['広角4,800万／超広角800万', '800万'],
  'Xperia 1 V': ['広角4,800万／超広角1,220万／望遠1,220万', '1,200万'],
  'Xperia 10 V': ['広角4,800万／超広角800万／望遠800万', '800万'],
  'Xperia 5 V': ['広角4,800万／超広角1,200万', '1,200万'],
  'Xperia 1 IV': ['広角1,220万／超広角1,220万／望遠1,220万', '1,220万'],
  'Xperia 10 IV': ['広角1,200万／超広角800万／望遠800万', '800万'],
  'Xperia 5 IV': ['広角1,220万／超広角1,220万／望遠1,220万', '1,220万'],
  'Xperia Ace III': ['広角1,300万', '500万'],
  'Xperia 5 III': ['広角1,220万／超広角1,220万／望遠1,220万', '800万'],

  // ===== motorola =====
  'motorola razr 60 ultra': ['広角5,000万／超広角5,000万', '5,000万'],
  'motorola razr 60': ['広角5,000万／超広角1,300万', '3,200万'],
  'moto g66j 5G': ['広角5,000万／超広角800万', '3,200万'],
  'motorola razr 50 ultra': ['広角5,000万／望遠5,000万', '3,200万'],
  'motorola razr 50': ['広角5,000万／超広角1,300万', '3,200万'],
  'moto g64 5G': ['広角5,000万／超広角800万', '1,600万'],
  'motorola razr 40 ultra': ['広角1,200万／超広角1,300万', '3,200万'],
  'motorola razr 40': ['広角6,400万／超広角1,300万', '3,200万'],
  'motorola edge 40': ['広角5,000万／超広角1,300万', '3,200万'],
  'moto g52j 5G': ['広角5,000万／超広角800万／マクロ200万', '1,300万'],

  // ===== arrows・nubia =====
  'arrows Alpha': ['広角5,030万／超広角4,990万', '4,990万'],
  'nubia Flip 5G': ['広角5,000万／深度200万', '1,600万'],

  // ===== nothing =====
  'Nothing Phone (3)': ['広角5,000万／超広角5,000万／望遠5,000万', '5,000万'],
  'Nothing Phone (3a) Lite': ['広角5,000万／超広角800万／マクロ200万', '1,600万'],
  'Nothing Phone (3a)': ['広角5,000万／超広角800万／望遠5,000万', '3,200万'],
  'Nothing Phone (2a)': ['広角5,000万／超広角5,000万', '3,200万'],
  'Nothing Phone (2)': ['広角5,000万／超広角5,000万', '3,200万'],
  'Nothing Phone (1)': ['広角5,000万／超広角5,000万', '1,600万'],
};

// サンプル定義を返す（項目は名前・種類、機種は値を項目名で持つ）
export function getSample(os) {
  const featDefs = [...(os === 'ios' ? IOS_FEATURES : ANDROID_FEATURES), ...EXTRA_FEATURES, ...(os === 'ios' ? [] : [ANDROID_REFRESH_FEATURE]), ...CAMERA_FEATURES];
  const baseCount = (os === 'ios' ? IOS_FEATURES : ANDROID_FEATURES).length;
  const modelDefs = os === 'ios' ? IOS_MODELS : ANDROID_MODELS;
  return {
    features: featDefs.map(([name, type]) => ({ name, type })),
    models: modelDefs.map(([name, year, series, vals]) => {
      const extra = EXTRA_VALUES[name] || Array(EXTRA_FEATURES.length).fill('');
      const all = [...vals, ...extra, ...(os === 'ios' ? [] : [ANDROID_REFRESH[name] || '']), ...(CAMERAS[name] || ['', ''])];
      const values = {};
      all.forEach((v, j) => { if (v && featDefs[j]) values[featDefs[j][0]] = v; });
      return { name, year, series, values };
    }),
  };
}
