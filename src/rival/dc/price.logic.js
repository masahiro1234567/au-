// AI生成のサンプル（canvas）から移したロジック。renderVals() が画面に出す値を返す
// PC用（price.tpl）とスマホ用（priceSp.tpl：上下2段）で同じロジックを使う
import { DCLogic } from "./DcView.jsx";

export default class Component extends DCLogic {
  renderVals() {
    // [ブランド名, ヘッダー色, ヘッダー文字色, プラン一覧]
    // プラン：[名前, データ量, 小さな札, 月額, 割引後, 割引後の※, 店頭, メール]
    const B = [
      ['docomo', '#c8102e', '#fff', [['ドコモMAX', '無制限', '', '8,448', '5,148', '※1', '○', '○', [['みんなドコモ割（3回線以上）', 1210], ['ドコモ光セット割', 1210], ['dカードお支払割（GOLD以上）', 550], ['ドコモでんきセット割', 110], ['長期利用割（20年以上）', 220]], '2回線ならみんなドコモ割は550円引き。dカード（一般）なら220円引き。'], ['ahamo', '30GB', '12/1から段階制', '2,970', '－', '※3', '×', '△', [], 'ahamo は割引なし。12/1から 40GB 3,135円の段階制に変わります。'], ['ドコモmini', '4GB', '', '2,750', '880', '※2', '○', '△', [['ドコモ光セット割', 1210], ['dカードお支払割（GOLD以上）', 550], ['ドコモでんきセット割', 110]], 'みんなドコモ割は対象外。11/30で新規受付終了、12月から mini2。']]],
      ['au', '#eb5505', '#fff', [['使い放題MAX＋', '無制限', '', '7,788', '5,258', '※4', '○', '○', [['家族割プラス（3人以上）', 1210], ['auスマートバリュー', 1100], ['au PAYカードお支払い割', 220]], '2人なら家族割プラスは660円引き。'], ['auバリュー リンクプラン', '無制限', 'Pontaパス付き', '8,008', '5,478', '※4', '○', '○', [['家族割プラス（3人以上）', 1210], ['auスマートバリュー', 1100], ['au PAYカードお支払い割', 220]], '2人なら家族割プラスは660円引き。'], ['povo2.0', '3GB', '30日間・トッピング', '990', '－', '', '×', '△', [], 'povo は割引なし。使う分だけトッピングを買う形です。']]],
      ['SoftBank', '#ffffff', '#4a4a4a', [['テイガク 無制限', '無制限', '', '8,008', '5,148', '※5', '○', '○', [['新みんな家族割（3回線以上）', 1210], ['おうち割 光セット', 1100], ['PayPayカード割（ゴールド）', 550]], '通常のPayPayカードなら330円引き。10/21から、新しくネットに入る人は1〜13か月目 3,498円になるキャンペーンあり（要確認）。'], ['LINEMO ベスト', '10GB', 'LINE無制限', '2,090', '－', '', '×', '△', [], 'LINEMO は割引なし。'], ['LINEMO ベスト', '3GB', 'LINE無制限', '990', '－', '', '×', '△', [], 'LINEMO は割引なし。']]],
      ['Rakuten Mobile', '#bf0a5a', '#fff', [['最強プラン', '3GB', '', '1,078', '968', '※6', '○', '○', [['最強家族プログラム', 110]], '家族で楽天モバイルを使うと、1人110円引き。'], ['最強プラン', '20GB', '', '2,178', '2,068', '※6', '○', '○', [['最強家族プログラム', 110]], '家族で楽天モバイルを使うと、1人110円引き。'], ['最強プラン', '無制限', '', '3,278', '3,168', '※6', '○', '○', [['最強家族プログラム', 110]], '家族で楽天モバイルを使うと、1人110円引き。']]],
      ['UQ mobile', '#ffffff', '#1f4ba5', [['コミコミ プランバリュー', '35GB', '10分以内かけ放題', '3,828', '3,168', '※7', '○', '○', [['13か月間の割引', 660]], '14か月目からは3,828円。割引の名前と条件は公式で確認（要確認）。自宅セット割は対象外。'], ['トクトク プラン2', '5〜30GB', '使わなくてもトク', '4,048', '1,628〜2,728', '※8', '○', '○', [['自宅セット割', 1100], ['au PAYカードお支払い割', 220]], '5GB以下の月は、さらに1,100円引きで1,628円。']]],
      ['Y!mobile', '#c8102e', '#fff', [['シンプル3 S', '5GB', 'くりこし可', '3,278', '858', '※9', '○', '○', [['おうち割 光セット(A)', 1650], ['PayPayカード割（ゴールド）', 770]], '通常のPayPayカードなら330円引き。おうち割は家族割と一緒には使えません。'], ['シンプル3 M', '30GB', 'くりこし可', '4,378', '1,958', '※9', '○', '○', [['おうち割 光セット(A)', 1650], ['PayPayカード割（ゴールド）', 770]], '通常のPayPayカードなら330円引き。おうち割は家族割と一緒には使えません。'], ['シンプル3 L', '35GB', 'くりこし可', '5,478', '3,058', '※9', '○', '○', [['おうち割 光セット(A)', 1650], ['PayPayカード割（ゴールド）', 770]], '通常のPayPayカードなら330円引き。おうち割は家族割と一緒には使えません。']]],
    ];
    // 最大割引以外に選べる割引：'プラン名|データ量': [[名前, 金額, ひとこと]]
    const ALT = {
      'ドコモMAX|無制限': [['home 5G セット割', 1210, 'ドコモ光の代わりに home 5G でも同じ額'], ['みんなドコモ割（2回線）', 550, '家族2人のとき'], ['dカードお支払割（一般カード）', 220, 'GOLDでないとき'], ['長期利用割（10年以上）', 110, '20年未満のとき']],
      'ドコモmini|4GB': [['home 5G セット割', 1210, 'ドコモ光の代わりに home 5G でも同じ額'], ['dカードお支払割（一般カード）', 220, 'GOLDでないとき']],
      '使い放題MAX＋|無制限': [['家族割プラス（2人）', 660, '家族2人のとき'], ['1GB以下の月の割引', 1650, 'ほとんど使わない月は自動で引かれる']],
      'auバリュー リンクプラン|無制限': [['家族割プラス（2人）', 660, '家族2人のとき']],
      'テイガク 無制限|無制限': [['おうちスマホ割（キャンペーン）', 2860, '10/21から。新しくネットに入る人は1〜13か月目に引かれる'], ['おうち割 でんきセット', 110, 'ソフトバンクでんき。25か月目から55円（対象プラン要確認）'], ['PayPayカード割（通常カード）', 330, 'ゴールドでないとき']],
      'トクトク プラン2|5〜30GB': [['自宅セット割（でんきコース）', 1100, 'ネットの代わりに auでんき でも同じ額'], ['5GB以下の月の割引', 1100, '使わない月は自動で引かれる']],
      'シンプル3 S|5GB': [['家族割引サービス', 1100, '2回線目から。おうち割とは一緒に使えない'], ['PayPayカード割（通常カード）', 330, 'ゴールドでないとき']],
      'シンプル3 M|30GB': [['家族割引サービス', 1100, '2回線目から。おうち割とは一緒に使えない'], ['おうち割 でんきセット(E)', 1100, '光の代わりにでんきで。2年間（要確認）'], ['PayPayカード割（通常カード）', 330, 'ゴールドでないとき']],
      'シンプル3 L|35GB': [['家族割引サービス', 1100, '2回線目から。おうち割とは一緒に使えない'], ['おうち割 でんきセット(E)', 1100, '光の代わりにでんきで。2年間（要確認）'], ['PayPayカード割（通常カード）', 330, 'ゴールドでないとき']],
    };
    // 条件が合えば、黄色の金額からさらに引ける割引（乗り換え・移行・年齢など、期間限定が多い）
    // [名前, 金額（なければ null）, 条件, 金額がないときの結果, 期間]
    const EXTRA = {
      'ドコモMAX|無制限': [['ahamo→MAXのりかえ割', 2750, 'ahamo を1年以上使っている人。3GB超の月（1〜3GBは1,100円引き）', '', '12か月'], ['ドコモU22割', null, '22歳以下。30GBまで', '0円', '最大7か月'], ['ドコモU29割', null, '23〜29歳。30GBまで', '0円', '最大3か月'], ['ドコモ60歳以上割', null, '60歳以上。30GBまで。手続きが必要', '858円', '最大3か月'], ['ドコモ親子割の家族特典', 550, '子どもがスマホデビュープランU15で親子割を使っている家族', '', '12か月']],
      '使い放題MAX＋|無制限': [['UQ mobile→au 移行プログラム', 2640, 'UQ mobile を6か月以上使っていて、同じ番号で au に移る人。1GB以下の月は引かれない', '', '12か月']],
      'auバリュー リンクプラン|無制限': [['UQ mobile→au 移行プログラム', 2640, 'UQ mobile を6か月以上使っていて、同じ番号で au に移る人。1GB以下の月は引かれない', '', '12か月']],
      'テイガク 無制限|無制限': [['ワイモバイル→ソフトバンク のりかえ特典＋', 2420, 'ワイモバイルを1年以上使っていて、解約せずに番号移行する人。おうちスマホ割とは一緒に使えない', '', '12か月'], ['LINEMO→ソフトバンク のりかえ特典', 2288, 'LINEMO から番号移行する人', '', '12か月']],
    };
    const NOTE = {
      'ドコモMAX|無制限': '', 'ドコモmini|4GB': 'みんなドコモ割は対象外。11/30で新規受付終了、12月から mini2。',
      '使い放題MAX＋|無制限': '', 'auバリュー リンクプラン|無制限': '',
      'テイガク 無制限|無制限': 'PayPayポイント200円分を充てると、実質4,948円。',
      'トクトク プラン2|5〜30GB': '', 'シンプル3 S|5GB': '', 'シンプル3 M|30GB': '', 'シンプル3 L|35GB': '',
    };
    const st = this.state || {};
    const flat = [];
    B.forEach(([brand, bg, fg, plans]) => plans.forEach((p) => flat.push({ brand, bg, fg, p })));
    // 表をつくる。BB：入れる会社、off：flat の何番目からか、sp：スマホ用（文字を大きく・高さは中身なり）
    const build = (BB, off, sp) => {
      const z = (v) => (sp ? Math.round(v * 1.25) : v) + 'px';
      // スマホ：変なところで改行しないよう、区切りたい所にだけスペースを入れて、スペースでだけ折り返す
      const SPBR = { '使い放題MAX＋': '使い放題 MAX＋', 'ドコモMAX': 'ドコモ MAX', 'ドコモmini': 'ドコモ mini', 'コミコミ プランバリュー': 'コミコミ プラン バリュー', '12/1から段階制': '12/1から 段階制', 'Pontaパス付き': 'Pontaパス 付き', '30日間・トッピング': '30日間 トッピング', 'LINE無制限': 'LINE 無制限', '10分以内かけ放題': '10分以内 かけ放題', '使わなくてもトク': '使わなくても トク', '1,628〜2,728': '1,628〜 2,728', 'キャリアメール': 'キャリア メール', '5〜30GB': '5〜 30GB' };
      const br = (t) => (sp && SPBR[t]) || t;
      const zn = (v) => (sp ? Math.round(v * 0.82) : v) + 'px'; // 数字（スマホは列が細いので少し小さく）
      const n = BB.reduce((a, b) => a + b[3].length, 0);
      const rows = sp ? '64px 104px 118px 66px 28px 104px 54px 54px 48px' : 'minmax(64px,.85fr) minmax(92px,1.15fr) minmax(88px,1.1fr) minmax(76px,1fr) 34px minmax(104px,1.35fr) minmax(56px,.75fr) minmax(56px,.75fr) minmax(50px,.7fr)';
      const gridStyle = `display:grid;grid-template-columns:${sp ? 88 : 132}px repeat(${n}, minmax(0,1fr));grid-template-rows:${rows};column-gap:0;row-gap:0;${sp ? '' : 'height:100%'}`;
      const cells = [];
      const lab = (t, sub, extra) => cells.push({ text: br(t), sub: sub || '', hasSub: !!sub, subStyle: 'display:block;font-size:' + z(12) + ';font-weight:700;margin-top:2px', style: 'background:#1f3d9c;color:#fff;font-weight:900;font-size:' + (sp ? '16px' : '17px') + ';display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1.2;' + (sp ? 'word-break:keep-all;' : '') + (extra || '') });
      const cellBase = 'background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-left:1px solid #c9c9c9;border-top:1px solid #dcdcdc;padding:4px 3px;min-width:0;overflow:hidden;' + (sp ? 'word-break:keep-all;overflow-wrap:normal;' : 'overflow-wrap:anywhere;');
      const first = [];
      BB.forEach(([, , , plans]) => plans.forEach((p, j) => first.push(j === 0)));
      const edge = (k) => (first[k] ? 'border-left:6px solid #1f3d9c;' : '');
      const each = (fn) => { let k = 0; BB.forEach(([, , , plans]) => plans.forEach((p) => { fn(p, k); k++; })); };
      lab('');
      BB.forEach(([name, bg, fg, plans]) => cells.push({ text: name, hasSub: false, style: `grid-column:span ${plans.length};background:${bg};color:${fg};font-weight:900;font-size:${z(24)};display:flex;align-items:center;justify-content:center;border-radius:14px 14px 0 0;border-left:6px solid #1f3d9c;letter-spacing:.5px` }));
      lab('プラン');
      each((p, k) => cells.push({ text: br(p[0]), hasSub: false, style: cellBase + edge(k) + 'font-weight:800;font-size:' + (sp ? '12.5px' : '15px') + ';line-height:1.3' }));
      lab('データ量');
      each((p, k) => { const big = /\d/.test(p[1]); cells.push({ text: br(p[1]), sub: br(p[2]), hasSub: !!p[2], subStyle: 'display:block;font-size:' + (sp ? '10.5px' : '10.5px') + ';line-height:1.25;font-weight:800;color:#fff;background:' + (p[2] ? '#2a8fd6' : 'transparent') + ';border-radius:5px;padding:2px 4px;margin-top:4px;max-width:100%', style: cellBase + edge(k) + 'font-weight:900;font-size:' + (big ? zn(24) : z(15)) }); });
      lab('月額料金', '税込');
      each((p, k) => cells.push({ text: p[3], sub: '円', hasSub: true, subStyle: 'font-size:' + zn(12) + ';font-weight:800;color:#c8102e', style: cellBase + edge(k) + 'flex-direction:row;align-items:baseline;gap:1px;font-weight:900;font-size:' + zn(p[3].length > 6 ? 17 : 24) + ';color:#c8102e' }));
      cells.push({ text: '▼', hasSub: false, style: 'background:#1f3d9c;color:#e8382b;font-size:20px;display:flex;align-items:center;justify-content:center' });
      each((p, k) => cells.push({ text: '▼', hasSub: false, style: 'background:#fff;color:#e8382b;font-size:18px;display:flex;align-items:center;justify-content:center;border-left:1px solid #c9c9c9;' + edge(k) }));
      lab('割引後', '最大まで割引');
      each((p, k) => { const none = p[4] === '－'; const idx = off + k; cells.push({ open: () => this.setState({ pop: idx }), text: br(p[4]), sub: none ? p[5] : (p[5] ? '円 ' + p[5] : '円'), hasSub: true, subStyle: 'display:block;font-size:' + (sp ? '12.5px' : '11.5px') + ';font-weight:800;color:#c8102e;margin-top:2px', style: cellBase + edge(k) + 'cursor:pointer;background:' + (none ? '#fff' : '#fbee9a') + ';font-weight:900;font-size:' + (sp ? (p[4].length > 6 ? '15px' : '25px') : (p[4].length > 6 ? '17px' : '27px')) + ';color:' + (none ? '#555' : '#c8102e') }); });
      const mark = (label, i) => { lab(label); each((p, k) => { const v = p[i]; cells.push({ text: v, hasSub: false, style: cellBase + edge(k) + 'font-size:' + z(24) + ';font-weight:900;color:' + (v.startsWith('×') ? '#555' : '#1a1a1a') }); }); };
      mark('店頭申込', 6);
      mark('キャリアメール', 7);
      lab('5G対応');
      each((p, k) => cells.push({ text: '○', hasSub: false, style: cellBase + edge(k) + 'font-size:' + z(24) + ';font-weight:900' }));
      return { gridStyle, cells: cells.map((c) => ({ open: () => {}, ...c })) };
    };
    const all = build(B, 0, false);
    const top = build(B.slice(0, 3), 0, true);
    const bot = build(B.slice(3), B.slice(0, 3).reduce((a, b) => a + b[3].length, 0), true);
    const f = flat[st.pop];
    let pop = { lines: [] };
    if (f) {
      const p = f.p;
      const yen = (v) => v.toLocaleString();
      const sum = (p[8] || []).reduce((a, l) => a + l[1], 0);
      pop = { brand: f.brand, bg: f.bg === '#ffffff' ? '#f2f2f2' : f.bg, fg: f.bg === '#ffffff' ? f.fg : '#fff', plan: p[0] + '（' + p[1] + '）', base: p[3], after: p[4] === '－' ? p[3] : p[4].split('〜').pop(),
        lines: (p[8] || []).map(([k, v]) => ({ k, v: yen(v) })), total: sum ? '合計 ' + yen(sum) + '円引き' : '割引なし', note: '', hasNote: false, alts: [], hasAlt: false, extras: [], hasExtra: false };
      const key = p[0] + '|' + p[1];
      const note = key in NOTE ? NOTE[key] : (p[9] || '');
      const alts = (ALT[key] || []).map(([k, v, sub]) => ({ k, v: yen(v), sub }));
      const afterNum = Number(String(pop.after).replace(/,/g, '')) || 0;
      const extras = (EXTRA[key] || []).map(([k, v, sub, res, term]) => ({ k, sub, v: v ? '－' + yen(v) + '円' : '', res: (v ? yen(Math.max(0, afterNum - v)) + '円' : res), term }));
      Object.assign(pop, { note, hasNote: !!note, alts, hasAlt: alts.length > 0, extras, hasExtra: extras.length > 0 });
    }
    return { gridStyle: all.gridStyle, cells: all.cells, gridTop: top.gridStyle, cellsTop: top.cells, gridBot: bot.gridStyle, cellsBot: bot.cells, hasPop: !!f, popTop: (st.pop >= B.slice(0, 3).reduce((a, b) => a + b[3].length, 0) ? 900 : 200) + 'px', pop, close: () => this.setState({ pop: null }) };
  }
}
