// AI生成のサンプル（canvas）から移したロジック。renderVals() が画面に出す値を返す
import { DCLogic } from "./DcView.jsx";

export default class Component extends DCLogic {
  renderVals() {
    // [ブランド名, ヘッダー色, ヘッダー文字色, プラン一覧]
    // プラン：[名前, データ量, 小さな札, 月額, 割引後, 割引後の※, 店頭, メール]
    const B = [
      ['docomo', '#c8102e', '#fff', [['ドコモMAX', '無制限', '', '8,448', '5,148', '※1', '○', '○'], ['ahamo', '30GB', '12/1から段階制', '2,970', '－', '※3', '×', '△'], ['ドコモmini', '4GB', '', '2,750', '880', '※2', '○', '△']]],
      ['au', '#eb5505', '#fff', [['使い放題MAX＋', '無制限', '', '7,788', '5,258', '※4', '○', '○'], ['auバリュー リンクプラン', '無制限', 'Pontaパス付き', '8,008', '5,478', '※4', '○', '○'], ['povo2.0', '3GB', '30日間・トッピング', '990', '－', '', '×', '△']]],
      ['SoftBank', '#ffffff', '#4a4a4a', [['テイガク 無制限', '無制限', '', '8,008', '5,148', '※5', '○', '○'], ['LINEMO ベスト', '10GB', 'LINE無制限', '2,090', '－', '', '×', '△'], ['LINEMO ベスト', '3GB', 'LINE無制限', '990', '－', '', '×', '△']]],
      ['Rakuten Mobile', '#bf0a5a', '#fff', [['最強プラン', '3GB', '', '1,078', '968', '※6', '○', '○'], ['最強プラン', '20GB', '', '2,178', '2,068', '※6', '○', '○'], ['最強プラン', '無制限', '', '3,278', '3,168', '※6', '○', '○']]],
      ['UQ mobile', '#ffffff', '#1f4ba5', [['コミコミ プランバリュー', '35GB', '10分以内かけ放題', '3,828', '3,168', '※7', '○', '○'], ['トクトク プラン2', '5〜30GB', '使わなくてもトク', '4,048', '1,628〜2,728', '※8', '○', '○']]],
      ['Y!mobile', '#c8102e', '#fff', [['シンプル3 S', '5GB', 'くりこし可', '3,278', '858', '※9', '○', '○'], ['シンプル3 M', '30GB', 'くりこし可', '4,378', '1,958', '※9', '○', '○'], ['シンプル3 L', '35GB', 'くりこし可', '5,478', '3,058', '※9', '○', '○']]],
    ];
    const n = B.reduce((a, b) => a + b[3].length, 0);
    const gridStyle = `display:grid;grid-template-columns:132px repeat(${n}, minmax(0,1fr));grid-template-rows:minmax(64px,.85fr) minmax(92px,1.15fr) minmax(88px,1.1fr) minmax(76px,1fr) 34px minmax(104px,1.35fr) minmax(56px,.75fr) minmax(56px,.75fr) minmax(50px,.7fr);column-gap:0;row-gap:0;height:100%`;
    const cells = [];
    const lab = (t, sub, extra) => cells.push({ text: t, sub: sub || '', hasSub: !!sub, subStyle: 'display:block;font-size:12px;font-weight:700;margin-top:2px', style: 'background:#1f3d9c;color:#fff;font-weight:900;font-size:17px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1.2;' + (extra || '') });
    const cellBase = 'background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-left:1px solid #c9c9c9;border-top:1px solid #dcdcdc;padding:4px 3px;';
    const first = [];
    B.forEach(([, , , plans]) => plans.forEach((p, j) => first.push(j === 0)));
    const edge = (k) => (first[k] ? 'border-left:6px solid #1f3d9c;' : '');
    // 1行目：ブランド
    lab('');
    B.forEach(([name, bg, fg, plans]) => cells.push({ text: name, hasSub: false, style: `grid-column:span ${plans.length};background:${bg};color:${fg};font-weight:900;font-size:24px;display:flex;align-items:center;justify-content:center;border-radius:14px 14px 0 0;border-left:6px solid #1f3d9c;letter-spacing:.5px` }));
    let k;
    // 2行目：プラン名
    lab('プラン'); k = 0;
    B.forEach(([, , , plans]) => plans.forEach((p) => { cells.push({ text: p[0], hasSub: false, style: cellBase + edge(k) + 'font-weight:800;font-size:15px;line-height:1.3' }); k++; }));
    // 3行目：データ量
    lab('データ量'); k = 0;
    B.forEach(([, , , plans]) => plans.forEach((p) => { const big = /\d/.test(p[1]); cells.push({ text: p[1], sub: p[2], hasSub: !!p[2], subStyle: 'display:block;font-size:10.5px;font-weight:800;color:#fff;background:' + (p[2] ? '#2a8fd6' : 'transparent') + ';border-radius:5px;padding:1px 5px;margin-top:4px', style: cellBase + edge(k) + 'font-weight:900;font-size:' + (big ? '24px' : '18px') }); k++; }));
    // 4行目：月額
    lab('月額料金', '税込'); k = 0;
    B.forEach(([, , , plans]) => plans.forEach((p) => { cells.push({ text: p[3], sub: '円', hasSub: true, subStyle: 'font-size:12px;font-weight:800;color:#c8102e', style: cellBase + edge(k) + 'flex-direction:row;align-items:baseline;gap:1px;font-weight:900;font-size:' + (p[3].length > 6 ? '17px' : '24px') + ';color:#c8102e' }); k++; }));
    // 5行目：矢印
    cells.push({ text: '▼', hasSub: false, style: 'background:#1f3d9c;color:#e8382b;font-size:20px;display:flex;align-items:center;justify-content:center' }); k = 0;
    B.forEach(([, , , plans]) => plans.forEach(() => { cells.push({ text: '▼', hasSub: false, style: 'background:#fff;color:#e8382b;font-size:18px;display:flex;align-items:center;justify-content:center;border-left:1px solid #c9c9c9;' + edge(k) }); k++; }));
    // 6行目：割引後（黄色）
    lab('割引後', '最大まで割引'); k = 0;
    B.forEach(([, , , plans]) => plans.forEach((p) => { const none = p[4] === '－'; cells.push({ text: p[4], sub: none ? p[5] : (p[5] ? '円 ' + p[5] : '円'), hasSub: true, subStyle: 'display:block;font-size:11.5px;font-weight:800;color:#c8102e;margin-top:2px', style: cellBase + edge(k) + 'background:' + (none ? '#fff' : '#fbee9a') + ';font-weight:900;font-size:' + (p[4].length > 6 ? '17px' : '27px') + ';color:' + (none ? '#555' : '#c8102e') }); k++; }));
    const mark = (label, i, sub) => { lab(label, sub); k = 0; B.forEach(([, , , plans]) => plans.forEach((p) => { const v = p[i]; cells.push({ text: v.split(' ')[0], sub: v.includes(' ') ? v.split(' ').slice(1).join(' ') : '', hasSub: v.includes(' '), subStyle: 'display:block;font-size:11px;font-weight:700;color:#333', style: cellBase + edge(k) + 'font-size:24px;font-weight:900;color:' + (v.startsWith('×') ? '#555' : '#1a1a1a') }); k++; })); };
    mark('店頭申込', 6);
    mark('キャリアメール', 7);
    lab('5G対応'); k = 0;
    B.forEach(([, , , plans]) => plans.forEach(() => { cells.push({ text: '○', hasSub: false, style: cellBase + edge(k) + 'font-size:24px;font-weight:900' }); k++; }));
    return { gridStyle, cells };
  }
}
