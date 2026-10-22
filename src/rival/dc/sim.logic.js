// AI生成のサンプル（canvas）から移したロジック。renderVals() が画面に出す値を返す
import { DCLogic } from "./DcView.jsx";

export default class Component extends DCLogic {
  renderVals() {
    const s = this.state || {};
    const yen = (v) => '¥' + Math.abs(Math.round(v)).toLocaleString();
    const num = (v) => Math.round(v).toLocaleString();
    const opt = (arr) => arr.map(([v, t]) => ({ v: String(v), t }));
    // ===================== スマホの料金表（2026/10/9時点・税込） =====================
    const FAM_AU = { 2: 660, 3: 1210 };
    const AU = (n, b, extra) => Object.assign({ c: 'au', n, b, fam: FAM_AU, hk: ['au', 1100], card: { aupay: 220, augold: 220 }, pt: 'au' }, extra || {});
    const P = {
      dmax: { c: 'docomo', n: 'ドコモMAX（無制限）', b: 8448, fam: { 2: 550, 3: 1210 }, hk: ['docomo', 1210], card: { dcard: 220, dgold: 550 }, dk: ['docomo', 110], pt: 'dgold', timed: (m, l) => ((l.age === 'o60' || l.age === 'o65') && m <= 3 ? [500, '60歳以上割（3か月）'] : null) },
      dmini4: { c: 'docomo', n: 'ドコモmini 4GB', b: 2750, hk: ['docomo', 1210], card: { dcard: 220, dgold: 550 }, dk: ['docomo', 110] },
      dmini10: { c: 'docomo', n: 'ドコモmini 10GB', b: 3850, hk: ['docomo', 1210], card: { dcard: 220, dgold: 550 }, dk: ['docomo', 110] },
      dU15: { c: 'docomo', n: 'スマホデビュープラン U15 5GB', b: 2508, age: ['u12', 'u18'], timed: (m) => (m <= 12 ? [1650, '1年目割'] : [550, '2年目から']) },
      ahamo: { c: 'ahamo', n: 'ahamo 30GB（5分込み）', b: 2970, calls: 'ahamo' },
      auvl: AU('auバリューリンクプラン（無制限）', 8008),
      aumax: AU('使い放題MAX＋（無制限）', 7788),
      aumini1: AU('スマホミニプラン＋ 〜1GB', 4928),
      aumini3: AU('スマホミニプラン＋ 〜3GB', 6578),
      aumini5: AU('スマホミニプラン＋ 〜5GB', 8228),
      ausenior: AU('シニアバリュープラン 5GB（5分込み）', 4048, { fam: null, calls: 'auSenior', age: ['o60', 'o65'] }),
      auu18a: AU('U18バリュープラン 〜10GB', 2398, { fam: { 2: 220, 3: 550 }, hk: ['au', 550], age: ['u12', 'u18', 'u22'] }),
      auu18b: AU('U18バリュープラン 〜20GB', 4048, { fam: { 2: 220, 3: 550 }, hk: ['au', 550], age: ['u12', 'u18', 'u22'] }),
      auu12: AU('U12バリュープラン', 1870, { fam: null, hk: null, u12: true, age: ['u12'] }),
      povo3: { c: 'povo', n: 'povo2.0 3GB/30日', b: 990 },
      povo30: { c: 'povo', n: 'povo2.0 30GB/30日', b: 2780 },
      sbpay2: { c: 'sb', n: 'ペイトク2（無制限）', b: 10538, fam: { 2: 660, 3: 1210 }, hk: ['sb', 1100], card: { paypay: 330, ppgold: 550 }, dk: ['sb', 110] },
      sbtei: { c: 'sb', n: 'テイガク無制限', b: 8008, fam: { 2: 660, 3: 1210 }, hk: ['sb', 1100], card: { paypay: 330, ppgold: 550 }, dk: ['sb', 110], ptFix: 200 },
      sbmini2: { c: 'sb', n: 'ミニフィット2 〜2GB', b: 5258, fam: { 2: 220, 3: 550 }, hk: ['sb', 1100], card: { paypay: 330, ppgold: 550 }, dk: ['sb', 110] },
      sbmini5: { c: 'sb', n: 'ミニフィット2 〜5GB', b: 6358, fam: { 2: 220, 3: 550 }, hk: ['sb', 1100], card: { paypay: 330, ppgold: 550 }, dk: ['sb', 110] },
      sbdebut: { c: 'sb', n: 'スマホデビュープラン＋ 20GB', b: 4246, age: ['u12', 'u18'], fixed: (m) => (m <= 7 ? 1078 : m <= 13 ? 2728 : 4246) },
      linemo3: { c: 'linemo', n: 'LINEMO ベストプラン 3GB', b: 990 },
      linemo10: { c: 'linemo', n: 'LINEMO ベストプラン 10GB', b: 2090 },
      linemoV: { c: 'linemo', n: 'LINEMO ベストプランV 30GB（5分込み）', b: 2970, calls: 'linemoV' },
      ymS: { c: 'ym', n: 'シンプル3 S 5GB', b: 3278, ym: true, hk: ['sb', 1650], card: { paypay: 550, ppgold: 770 }, dk: ['sb', 110] },
      ymM: { c: 'ym', n: 'シンプル3 M 30GB', b: 4378, ym: true, hk: ['sb', 1650], card: { paypay: 550, ppgold: 770 }, dk: ['sb', 110] },
      ymL: { c: 'ym', n: 'シンプル3 L 35GB（10分込み）', b: 5478, ym: true, hk: ['sb', 1650], card: { paypay: 550, ppgold: 770 }, dk: ['sb', 110], calls: 'ymL' },
      rk3: { c: 'rakuten', n: '最強プラン 〜3GB', b: 1078, rk: true },
      rk20: { c: 'rakuten', n: '最強プラン 〜20GB', b: 2178, rk: true },
      rkU: { c: 'rakuten', n: '最強プラン 無制限', b: 3278, rk: true },
      uqtt30: { c: 'uq', n: 'トクトクプラン2（〜30GB）', b: 4048, uq: true, card: { aupay: 220, augold: 220 }, pt: 'au' },
      uqtt5: { c: 'uq', n: 'トクトクプラン2（5GB以下の月）', b: 4048, uq: true, card: { aupay: 220, augold: 220 }, pt: 'au', fix: [1100, '5GB以下'] },
      uqcv: { c: 'uq', n: 'コミコミプランバリュー 35GB（10分込み）', b: 3828, calls: 'uqcv', timed: (m) => (m <= 13 ? [660, '13か月割'] : null) },
    };
    const CALLS = {
      docomo: [['none', '通話オプションなし', 0], ['c5', '5分通話無料 880円', 880], ['full', 'かけ放題 1,980円', 1980]],
      ahamo: [['none', '5分かけ放題（込み）', 0], ['full', 'かけ放題に変更 +1,100円', 1100]],
      au: [['none', '通話オプションなし', 0], ['c5', '通話定額ライト2（5分）880円', 880], ['full', '通話定額2（24時間）1,980円', 1980, 1100]],
      auSenior: [['none', '5分かけ放題（込み）', 0], ['full', '24時間に変更 +1,100円', 1100]],
      povo: [['none', '通話トッピングなし', 0], ['c5', '5分かけ放題 550円', 550], ['full', '通話かけ放題 1,650円', 1650]],
      uq: [['none', '通話オプションなし', 0], ['pack', '通話パック60分 660円', 660], ['c10', '通話放題ライト（10分）880円', 880], ['full', '通話放題（24時間）1,980円', 1980, 1100]],
      uqcv: [['none', '10分かけ放題（込み）', 0], ['full', '通話放題に変更 +1,100円', 1100]],
      sb: [['none', '通話オプションなし', 0], ['c5', '準定額オプション+（5分）880円', 880], ['full', '定額オプション+（24時間）1,980円', 1980]],
      linemo: [['none', '通話オプションなし', 0], ['c5', '通話準定額（5分）550円', 550], ['full', '通話定額（24時間）1,650円', 1650]],
      linemoV: [['none', '5分かけ放題（込み）', 0], ['full', '通話定額に変更 +1,100円（要確認）', 1100]],
      ym: [['none', '通話オプションなし', 0], ['c10', 'だれとでも定額+（10分）880円', 880], ['full', 'スーパーだれとでも定額+ 1,980円', 1980, 1100]],
      ymL: [['none', '10分かけ放題（込み）', 0], ['full', 'スーパーだれとでも定額+ に変更 +1,100円', 1100, 1100]],
      rakuten: [['none', 'Rakuten Link（無料）', 0], ['c15', '15分（標準）通話かけ放題 1,100円', 1100]],
    };
    const AGES = [['adult', '一般'], ['u12', '12歳以下'], ['u18', '13〜18歳'], ['u22', '19〜22歳'], ['o60', '60〜64歳'], ['o65', '65歳以上']];
    const CAR = { docomo: ['ドコモ', '#c8102e'], ahamo: ['ahamo', '#0a7d5a'], au: ['au', '#eb5505'], povo: ['povo', '#b08600'], uq: ['UQ mobile', '#1f4ba5'], sb: ['ソフトバンク', '#6b6b6b'], linemo: ['LINEMO', '#06a35c'], ym: ['ワイモバイル', '#b41e5a'], rakuten: ['楽天モバイル', '#bf0000'] };
    const CARDS = {
      docomo: [['none', '口座振替・他のカード'], ['dcard', 'dカード'], ['dgold', 'dカード GOLD／PLATINUM']],
      ahamo: [['none', '口座振替・他のカード'], ['dcard', 'dカード'], ['dgold', 'dカード GOLD']],
      au: [['none', '口座振替・他のカード'], ['aupay', 'au PAYカード'], ['augold', 'au PAY ゴールド']],
      uq: [['none', '口座振替・他のカード'], ['aupay', 'au PAYカード'], ['augold', 'au PAY ゴールド']],
      povo: [['none', 'クレジットカード']],
      sb: [['none', '口座振替・他のカード'], ['paypay', 'PayPayカード'], ['ppgold', 'PayPayカード ゴールド']],
      linemo: [['none', 'クレジットカード'], ['paypay', 'PayPayカード']],
      ym: [['none', '口座振替・他のカード'], ['paypay', 'PayPayカード'], ['ppgold', 'PayPayカード ゴールド']],
      rakuten: [['none', '口座振替・他のカード'], ['rcard', '楽天カード']],
    };
    // ===================== 家のネット（[何か月目から, 月額]）・税込 =====================
    // set：どのスマホのセット割の対象か　ph：電話サービスの月額　needPh：セット割に電話が必要か
    const NET = {
      none: { n: 'なし', h: [[1, 0]], m: [[1, 0]] },
      dhikari: { n: 'ドコモ光 1ギガ（タイプA）', g: '光回線', set: 'docomo', ph: 550, h: [[1, 5720]], m: [[1, 4400]] },
      sbhikari: { n: 'ソフトバンク光 1ギガ', g: '光回線', set: 'sb', ph: 550, needPh: true, h: [[1, 5720]], m: [[1, 4180]], newH: [[1, 0], [4, 5720]], newM: [[1, 0], [4, 4180]], note: 'おうち割は光電話などのオプションパック（月550円）が必要・新規は3か月0円（要確認）' },
      nuro: { n: 'NURO光 2ギガ', g: '光回線', set: 'sb', ph: 550, needPh: true, h: [[1, 5720]], m: [[1, 4730]], note: '独自回線・36か月契約・エリア限定' },
      auhikari: { n: 'auひかり（ずっとギガ得）', g: '光回線', set: 'au', ph: 550, needPh: true, h: [[1, 5610], [13, 5500], [25, 5390]], m: [[1, 4455]], note: '戸建ては1年目5,610円→2年目5,500円→3年目から5,390円。マンションはギガタイプ' },
      biglobe: { n: 'ビッグローブ光 1ギガ', g: '光回線', set: 'au', ph: 550, needPh: true, h: [[1, 5478]], m: [[1, 4378]], note: '光コラボ・料金は要確認' },
      eo10: { n: 'eo光 10ギガ（関西）', g: '光回線', set: 'au', ph: 314, needPh: true, h: [[1, 5605]], m: [[1, 4070]], newH: [[1, 0], [7, 500], [13, 5605]], newM: [[1, 0], [4, 4070]], note: '戸建ては1〜6か月 0円・7〜12か月 500円・2年目から5,605円。マンションは建物で変わる（要確認）' },
      eo1: { n: 'eo光 1ギガ（関西）', g: '光回線', set: 'au', ph: 314, needPh: true, h: [[1, 5605]], m: [[1, 4070]], newH: [[1, 3280], [13, 5605]], newM: [[1, 0], [4, 4070]], note: '戸建ては1年目3,280円・2年目から5,605円' },
      commufa: { n: 'コミュファ光 1ギガ（東海）', g: '光回線', set: 'au', ph: 330, needPh: true, h: [[1, 5170]], m: [[1, 4070]], newH: [[1, 2980], [13, 5170]], newM: [[1, 2450], [13, 4070]], note: '1年目は戸建て2,980円・マンション2,450円（電話料金は要確認）' },
      rhikari: { n: '楽天ひかり', g: '光回線', ph: 550, h: [[1, 5280]], m: [[1, 4180]], newH: [[1, 0], [7, 5280]], newM: [[1, 0], [7, 4180]], note: '楽天モバイルと一緒なら6か月0円（要確認）・スマホのセット割はなし' },
      jcom: { n: 'J:COM（TV＋NET 光1G）', g: 'ケーブルテレビ', set: 'au', ph: 0, tvIn: true, h: [[1, 5258]], m: [[1, 5258]], newH: [[1, 900], [7, 1900], [13, 5258]], newM: [[1, 900], [7, 5258]], note: 'テレビ（CS・BS 91ch以上）込み。新規は6か月 実質900円（戸建ては7〜12か月 1,900円）。料金は地域で変わる（要確認）' },
      home5g: { n: 'ドコモ home 5G', g: 'ホームルーター', set: 'docomo', ph: 0, h: [[1, 5280]], m: [[1, 5280]], note: '端末代は36回払いで実質0円' },
      auhr: { n: 'au ホームルーター 5G', g: 'ホームルーター', set: 'au', ph: 0, h: [[1, 5500]], m: [[1, 5500]], newH: [[1, 4950], [14, 5500]], newM: [[1, 4950], [14, 5500]], note: '13か月は5Gルーター割で4,950円' },
      air: { n: 'SoftBank Air', g: 'ホームルーター', set: 'sb', ph: 0, h: [[1, 5368]], m: [[1, 5368]], newH: [[1, 4950], [25, 5368]], newM: [[1, 4950], [25, 5368]], note: '1〜24か月 4,950円・25か月目から5,368円。12月から+330円' },
      wimax: { n: 'WiMAX（UQ WiMAX など）', g: 'ホームルーター', set: 'au', ph: 0, h: [[1, 4598]], m: [[1, 4598]], note: 'プロバイダで料金が変わる（要確認）' },
      other: { n: 'その他（金額を入力）', g: 'その他', custom: true, h: [[1, 0]], m: [[1, 0]] },
    };
    // テレビ：n 名前・h 戸建ての月額・m マンションの月額・req 必要なネット・newDisc 新しく契約したときの割引 [何か月, 円]・note
    const TVS = {
      none: { n: 'なし・アンテナで見る', h: 0 },
      dtv: { n: 'ドコモ光テレビオプション（地デジ・BS）', h: 990, req: ['dhikari'] },
      sbtv: { n: 'ソフトバンク光テレビ（地デジ・BS）', h: 990, req: ['sbhikari'] },
      bgtv: { n: 'BIGLOBE光テレビ（地デジ・BS）', h: 990, req: ['biglobe'] },
      flets: { n: 'フレッツ・テレビ（地デジ・BS）', h: 990 },
      htvBasic: { n: 'ひかりTV 基本プラン＋チューナー', h: 1760, note: '1,210円＋チューナー550円（チューナー代は要確認）' },
      htvCh: { n: 'ひかりTV 専門チャンネルプラン＋チューナー', h: 3850, note: '3,300円＋チューナー550円（要確認）' },
      htvVideo: { n: 'ひかりTV 専門チャンネル・ビデオプラン＋チューナー', h: 4950, note: '4,400円＋チューナー550円（要確認）' },
      autvG: { n: 'auひかり テレビ ジャンルパック＋STB', h: 2178, req: ['auhikari'], note: '地デジ・BSは見られない（アンテナが必要）' },
      autvAll: { n: 'auひかり テレビ オールジャンルパック＋STB', h: 3278, req: ['auhikari'], note: '2,728円＋STB 550円。地デジ・BSは見られない' },
      eoChideji: { n: 'eo光テレビ 地デジ・BSコース', h: 1700, m: 1700, req: ['eo10', 'eo1'], newDisc: [11, 1700], note: 'eo光ネットとセットの料金。ネットと同時に新しく申し込むと11か月1,700円引き（マンションは要確認）' },
      eoCompact: { n: 'eo光テレビ コンパクト', h: 2000, m: 2440, req: ['eo10', 'eo1'], newDisc: [11, 1700], note: 'eo光ネットとセットの料金。同時申込で11か月1,700円引き' },
      eoBasic: { n: 'eo光テレビ ベーシックHD（CS 38ch）', h: 3800, m: 4240, req: ['eo10', 'eo1'], newDisc: [11, 1700], note: 'eo光ネットとセットの料金。同時申込で11か月1,700円引き' },
      eoPremium: { n: 'eo光テレビ プレミアムHD（CS 55ch）', h: 4303, m: 4743, req: ['eo10', 'eo1'], newDisc: [11, 1700], note: 'eo光ネットとセットの料金。同時申込で11か月1,700円引き' },
      cmfBasic: { n: 'コミュファ光テレビ（地デジ・BS・BS4K）', h: 506, req: ['commufa'] },
      cmfPlus: { n: 'コミュファ光テレビ＋専門コース1つ', h: 3256, req: ['commufa'], note: '基本506円＋プラスチャンネル2,750円' },
      nurotv: { n: 'ひかりTV for NURO＋チューナー', h: 3850, req: ['nuro'], note: '3,300円＋チューナー550円。はじめて割あり（要確認）' },
      other: { n: 'その他（ケーブルテレビなど 金額を入力）', h: 0 },
    };
    // 専門チャンネルの追加（スカパー！など）
    const TVADD = [['none', '追加なし', 0], ['sp5', 'スカパー！ セレクト5', 2409], ['sp10', 'スカパー！ セレクト10', 3289], ['spBasic', 'スカパー！ 基本プラン（50ch）', 4389], ['spHikari', 'スカパー！ 光パックHD（62ch）', 4567], ['wowow', 'WOWOW（要確認）', 2530]];
    const DENKI = [['region', '地域の電力会社'], ['docomo', 'ドコモでんき'], ['au', 'auでんき'], ['sb', 'ソフトバンクでんき'], ['rakuten', '楽天でんき']];
    const ELAPSED = [[0, 'これから新しく契約'], [3, '契約して3か月'], [6, '契約して6か月'], [12, '契約して1年'], [18, '契約して1年半'], [24, '契約して2年以上']];

    // ===================== 入力（state） =====================
    const L = (carrier, plan, card, call, age, mo) => ({ on: true, carrier, plan, card, call: call || 'none', age: age || 'adult', mo: mo == null ? 24 : mo });
    const curDef = [L('docomo', 'dmax', 'dcard', 'c5'), L('docomo', 'dmax', 'dcard'), L('docomo', 'dmini4', 'none', 'none', 'o65'), { ...L('docomo', 'dmini4', 'none'), on: false }, { ...L('docomo', 'dmini4', 'none'), on: false }];
    const propDef = [L('au', 'auvl', 'aupay', 'c5'), L('au', 'auvl', 'aupay'), L('uq', 'uqtt30', 'aupay'), L('uq', 'uqtt30', 'aupay'), L('uq', 'uqtt30', 'aupay')];
    const cur = s.cur || curDef;
    const prop = (s.prop || propDef).map((l, i) => ({ ...l, age: cur[i].age }));
    const bld = s.bld || 'house';
    const T = s.T || 24;
    const H = {
      cur: { tvAdd: s.curTvAdd || 'none', tv: s.curTv || 'none', tvCustom: s.curTvCustom == null ? 0 : s.curTvCustom, net: s.curNet || 'dhikari', ph: s.curPh == null ? true : s.curPh, denki: s.curDenki || 'region', mo: s.curNetMo == null ? 24 : s.curNetMo, custom: s.curCustom == null ? 5000 : s.curCustom },
      prop: { tvAdd: s.propTvAdd || 'none', tv: s.propTv || 'none', tvCustom: s.propTvCustom == null ? 0 : s.propTvCustom, net: s.propNet || 'eo10', ph: s.propPh == null ? true : s.propPh, denki: s.propDenki || 'region', custom: s.propCustom == null ? 5000 : s.propCustom },
    };
    const ons = cur.map((l) => l.on);
    const famGroup = (c) => (c === 'ahamo' ? 'docomo' : c);
    const callsOf = (pid) => CALLS[P[pid].calls || P[pid].c];
    const isO60 = (l) => l.age === 'o60' || l.age === 'o65';

    // ===================== 計算 =====================
    // 家のネット：今と同じ回線を続けるなら、今の契約月数のまま
    const netPlan = (side) => {
      const h = H[side]; const nd = NET[h.net];
      const keep = side === 'prop' && H.prop.net === H.cur.net;
      const isNew = side === 'prop' ? !keep : H.cur.mo === 0;
      const sched = nd.custom ? [[1, Number(h.custom) || 0]] : (isNew && (bld === 'house' ? nd.newH : nd.newM)) || (bld === 'house' ? nd.h : nd.m);
      const offset = side === 'cur' ? H.cur.mo : keep ? H.cur.mo : 0;
      const phFee = h.ph && nd.ph ? nd.ph : 0;
      const setOk = nd.set && (!nd.needPh || h.ph);
      const tv = TVS[h.tv] || TVS.none;
      const tvBase = h.tv === 'other' ? Number(h.tvCustom) || 0 : bld === 'mansion' && tv.m != null ? tv.m : tv.h;
      const tvAdd = (TVADD.find((x) => x[0] === h.tvAdd) || TVADD[0])[2];
      const tvWarn = tv.req && !tv.req.includes(h.net) ? NET[tv.req[0]].n.replace(/（.*$/, '') + 'の契約が必要' : '';
      // 新しく契約するとき（乗り換え後でテレビかネットが今と違う）の期間割引
      const tvNew = side === 'prop' && (H.prop.tv !== H.cur.tv || !keep);
      const tvDisc = tv.newDisc && tvNew ? tv.newDisc : null;
      const tvSched = tvDisc ? [[1, tvBase - tvDisc[1] + tvAdd], [tvDisc[0] + 1, tvBase + tvAdd]] : [[1, tvBase + tvAdd]];
      const tvFee = tvBase + tvAdd;
      return { nd, sched, offset, phFee, tvFee, tvSched, tvNote: tv.note || '', tvWarn, setKey: setOk ? nd.set : null, setBlocked: nd.set && nd.needPh && !h.ph, keep };
    };
    const at = (sched, m) => { let v = sched[0][1]; sched.forEach(([from, p]) => { if (m >= from) v = p; }); return v; };
    const lineMonth = (l, ctx, idx, count, m) => {
      const p = P[l.plan]; const chips = [];
      if (p.fixed) return { after: p.fixed(m), chips: ['期間で料金が変わる'], pts: 0, base: p.b };
      let after = p.b;
      const take = (amt, label) => { if (amt > 0) { after -= amt; chips.push(label + ' -' + num(amt)); } };
      if (p.fam) take(count >= 3 ? p.fam[3] : count === 2 ? p.fam[2] : 0, '家族割');
      if (p.u12 && count >= 2) take(1100, 'U12家族割');
      const hkOk = p.hk && ctx.setKey === p.hk[0] && !(p.c === 'ym' && false);
      if (hkOk) take(p.hk[1], p.c === 'au' ? 'スマートバリュー' : p.c === 'ym' ? 'おうち割光' : '光セット割');
      if (p.ym && !hkOk && idx > 0) take(1100, '家族割');
      if (p.uq) { if (ctx.setKey === 'au' || ctx.denki === 'au') take(1100, '自宅セット割'); else if (count >= 2) take(550, '家族セット割'); }
      if (p.rk && count >= 2) take(110, '最強家族');
      if (p.rk && l.age === 'u12') take(440, 'こども割');
      if (p.rk && (l.age === 'u18' || l.age === 'u22')) take(110, '青春割');
      if (p.card && p.card[l.card]) take(p.card[l.card], 'カード払い');
      if (p.dk && ctx.denki === p.dk[0]) take(p.dk[1], 'でんき');
      if (p.fix) take(p.fix[0], p.fix[1]);
      if (p.timed) { const t = p.timed(m, l); if (t) take(t[0], t[1]); }
      const co = (callsOf(l.plan) || []).find((x) => x[0] === l.call) || ['none', '', 0];
      if (co[2] > 0) {
        let off = 0;
        if (co[3] && isO60(l) && (p.c === 'au' || p.c === 'uq' || p.c === 'ym') && l.plan !== 'uqcv') off = Math.min(co[3], co[2]);
        if (p.c === 'rakuten' && l.age === 'o65') off = Math.floor(co[2] / 2);
        after += co[2] - off;
        chips.push('通話 +' + num(co[2] - off) + (off ? '（60歳以上割）' : ''));
      }
      let pts = 0;
      if (p.pt === 'dgold' && l.card === 'dgold') pts = Math.floor(after / 1.1 / 1000) * 100;
      else if (p.pt === 'au' && l.card === 'augold') pts = Math.floor((after / 1.1) * 0.1);
      else if (p.ptFix && (l.card === 'paypay' || l.card === 'ppgold')) pts = p.ptFix;
      else if (l.card && l.card !== 'none') pts = Math.floor(after * 0.01);
      if (p.rk && l.age === 'o65') pts += 110;
      return { after, chips, pts, base: p.b };
    };
    const sideCalc = (side, lines) => {
      const np = netPlan(side); const h = H[side];
      const counts = {}, seen = {}, idxs = [];
      lines.forEach((l, i) => { if (ons[i]) { const g = famGroup(P[l.plan].c); counts[g] = (counts[g] || 0) + 1; } });
      lines.forEach((l, i) => { if (ons[i]) { const g = famGroup(P[l.plan].c); idxs[i] = seen[g] || 0; seen[g] = idxs[i] + 1; } });
      const ctx = { setKey: np.setKey, denki: h.denki };
      const months = [];
      for (let t = 1; t <= T; t++) {
        let total = 0, pts = 0; const items = [];
        lines.forEach((l, i) => {
          if (!ons[i]) return;
          const m = side === 'cur' ? (l.mo || 0) + t : t;
          const r = lineMonth(l, ctx, idxs[i], counts[famGroup(P[l.plan].c)], m);
          total += r.after; pts += r.pts; items.push({ key: 'l' + i, r });
        });
        const netFee = at(np.sched, np.offset + t);
        const tvM = at(np.tvSched, t);
        total += netFee + np.phFee + tvM;
        months.push({ total, pts, items, netFee, tvM });
      }
      return { np, months, idxs, counts, ctx };
    };
    const C = sideCalc('cur', cur), Q = sideCalc('prop', prop);
    const sumM = (X, k) => X.months.reduce((a, x) => a + x[k], 0);
    const cTot = sumM(C, 'total'), qTot = sumM(Q, 'total'), cPts = sumM(C, 'pts'), qPts = sumM(Q, 'pts');
    const c1 = C.months[0], q1 = Q.months[0];
    const d1 = q1.total - c1.total, dT = qTot - cTot, dReal = (qTot - qPts) - (cTot - cPts);
    const word = (d) => (d < 0 ? '安くなる' : d > 0 ? '高くなる' : '変わらない');

    // 料金が変わる月（イベント）
    const events = [];
    const pushEv = (side, t, label, from, to) => events.push({ t, side, label, from, to });
    ['cur', 'prop'].forEach((side) => {
      const X = side === 'cur' ? C : Q;
      for (let t = 2; t <= T; t++) {
        const a = X.months[t - 2], b = X.months[t - 1];
        if (a.netFee !== b.netFee) pushEv(side, t, X.np.nd.n, a.netFee, b.netFee);
        if (a.tvM !== b.tvM) pushEv(side, t, 'テレビ（' + TVS[H[side].tv].n + '）', a.tvM, b.tvM);
        b.items.forEach((it) => { const pa = a.items.find((x) => x.key === it.key); if (pa && pa.r.after !== it.r.after) pushEv(side, t, (Number(it.key.slice(1)) + 1) + '回線目（' + P[(side === 'cur' ? cur : prop)[Number(it.key.slice(1))].plan].n + '）', pa.r.after, it.r.after); });
      }
    });
    events.sort((a, b) => a.t - b.t);
    const evRows = events.map((e) => ({ when: e.t + 'か月目から', who: e.side === 'cur' ? '今' : '乗り換え後', label: e.label, txt: yen(e.from) + ' → ' + yen(e.to), up: e.to > e.from,
      tag: 'font-size:11px;font-weight:800;border-radius:6px;padding:2px 7px;flex-shrink:0;' + (e.side === 'cur' ? 'background:#efe8e3;color:#4a3a30' : 'background:#fff1e6;color:#c2410c'),
      arrow: 'font-size:12.5px;font-weight:800;white-space:nowrap;' + (e.to > e.from ? 'color:#9a3412' : 'color:#0a7d5a') }));

    // グラフ（月ごとの合計）
    const maxV = Math.max(1, ...C.months.map((x) => x.total), ...Q.months.map((x) => x.total));
    const bars = C.months.map((x, i) => ({ m: String(i + 1), showM: i === 0 || (i + 1) % 6 === 0, hc: Math.round((x.total / maxV) * 150) + 'px', hq: Math.round((Q.months[i].total / maxV) * 150) + 'px', tip: (i + 1) + 'か月目　今 ' + yen(x.total) + '　乗り換え後 ' + yen(Q.months[i].total) }));

    // ===================== 表示用 =====================
    const firstPlan = (c) => Object.keys(P).find((k) => P[k].c === c);
    const netOptsAll = Object.entries(NET).map(([k, v]) => ({ v: k, t: (v.g ? v.g + '｜' : '') + v.n }));
    const schedText = (sched) => sched.map(([from, p], i) => { const nx = sched[i + 1]; return (nx ? from + '〜' + (nx[0] - 1) + 'か月 ' : (sched.length > 1 ? from + 'か月目から ' : '')) + yen(p); }).join(' → ');
    const netVm = (side) => {
      const X = side === 'cur' ? C : Q; const np = X.np; const h = H[side]; const isCur = side === 'cur';
      const pre = isCur ? 'cur' : 'prop';
      const sets = { docomo: 'ドコモ光セット割の対象', au: 'auスマートバリュー・UQ自宅セット割の対象', sb: 'おうち割 光セットの対象' };
      return {
        tv: h.tv, tvCustom: String(h.tvCustom), isTvCustom: h.tv === 'other', tvWarn: np.tvWarn, hasTvWarn: !!np.tvWarn, tvIn: !!np.nd.tvIn,
        tvAdd: h.tvAdd, setTvAdd: (e) => this.setState({ [pre + 'TvAdd']: e.target.value }), tvNote: np.tvNote, hasTvNote: !!np.tvNote,
        setTv: (e) => this.setState({ [pre + 'Tv']: e.target.value }), setTvCustom: (e) => this.setState({ [pre + 'TvCustom']: e.target.value }),
        net: h.net, ph: h.ph, denki: h.denki, mo: String(H.cur.mo), custom: String(h.custom), isCustom: !!np.nd.custom, isCur, hasPh: !!np.nd.ph,
        nowT: yen(X.months[0].netFee + np.phFee + X.months[0].tvM), schedT: np.nd.custom ? '入力した金額' : (np.keep ? '今の回線をそのまま使う・' : '') + schedText(np.sched).replace(/^¥/, '¥'),
        note: np.nd.note || '', hasNote: !!np.nd.note,
        setT: np.setKey ? sets[np.setKey] : np.setBlocked ? 'セット割には電話サービスが必要' : 'スマホのセット割なし', setStyle: 'font-size:11px;font-weight:800;border-radius:6px;padding:2px 8px;' + (np.setKey ? 'background:#e7f5ee;color:#0a6b47' : np.setBlocked ? 'background:#9a3412;color:#fff' : 'background:#efe8e3;color:#6b5a4e'),
        phT: np.nd.ph ? (h.ph ? '電話あり（月' + num(np.nd.ph) + '円）' : '電話なし') : '電話なし',
        phStyle: 'height:36px;padding:0 12px;border-radius:9px;font-family:inherit;font-weight:800;font-size:12.5px;cursor:pointer;white-space:nowrap;' + (h.ph && np.nd.ph ? 'background:#1f1712;color:#fff;border:1px solid #1f1712' : 'background:#fff;color:#5a4334;border:1px solid #d8cec6'),
        setNet: (e) => this.setState({ [pre + 'Net']: e.target.value }),
        setDenki: (e) => this.setState({ [pre + 'Denki']: e.target.value }),
        togglePh: () => this.setState({ [pre + 'Ph']: !h.ph }),
        setMo: (e) => this.setState({ curNetMo: Number(e.target.value) }),
        setCustom: (e) => this.setState({ [pre + 'Custom']: e.target.value }),
      };
    };
    const lineVm = (side, i) => {
      const isCur = side === 'cur'; const lines = isCur ? cur : prop; const l = lines[i]; const X = isCur ? C : Q;
      const r = X.months[0].items.find((x) => x.key === 'l' + i).r;
      const key = isCur ? 'cur' : 'prop';
      const set = (patch) => this.setState({ [key]: (isCur ? cur : (s.prop || propDef)).map((x, j) => (j === i ? { ...x, ...patch } : x)) });
      const p = P[l.plan];
      const notes = [];
      if (p.age && !p.age.includes(l.age)) notes.push({ t: '年齢が対象外の可能性', style: 'font-size:11px;font-weight:800;border-radius:6px;padding:2px 7px;color:#fff;background:#9a3412' });
      if (l.plan === 'dmax' && isO60(l)) notes.push({ t: '60歳以上割：最初の3か月', style: 'font-size:11px;font-weight:700;border-radius:6px;padding:2px 7px;color:#5a4334;background:#f6efe6' });
      if (p.c === 'uq' && isO60(l) && l.plan !== 'uqcv') notes.push({ t: '60歳以上通話割・メール無料', style: 'font-size:11px;font-weight:700;border-radius:6px;padding:2px 7px;color:#5a4334;background:#f6efe6' });
      if (r.pts) notes.push({ t: 'ポイント ' + yen(r.pts) + '／月', style: 'font-size:11px;font-weight:700;border-radius:6px;padding:2px 7px;color:#1f4ba5;background:#e8eefb' });
      return {
        carrier: l.carrier, plan: l.plan, card: l.card, call: l.call, age: l.age, mo: String(l.mo), isCur, timed: isCur && !!(p.timed || p.fixed),
        carrierName: CAR[l.carrier][0], color: CAR[l.carrier][1], baseT: yen(r.base), afterT: yen(r.after), chips: r.chips, notes,
        canRemove: isCur && ons.filter(Boolean).length > 1,
        remove: () => this.setState({ cur: cur.map((x, j) => (j === i ? { ...x, on: false } : x)) }),
        setCarrier: (e) => { const c = e.target.value; set({ carrier: c, plan: firstPlan(c), card: (CARDS[c][1] || CARDS[c][0])[0], call: 'none' }); },
        setPlan: (e) => { const pl = e.target.value; const ok = (callsOf(pl) || []).some((x) => x[0] === l.call); set({ plan: pl, call: ok ? l.call : 'none' }); },
        setCard: (e) => set({ card: e.target.value }), setCall: (e) => set({ call: e.target.value }), setMo: (e) => set({ mo: Number(e.target.value) }),
        setAge: (e) => this.setState({ cur: cur.map((x, j) => (j === i ? { ...x, age: e.target.value } : x)) }),
        planOpts: Object.keys(P).filter((k) => P[k].c === l.carrier).map((k) => ({ v: k, t: P[k].n + '　' + num(P[k].b) + '円' })),
        cardOpts: opt(CARDS[l.carrier]), callOpts: opt((callsOf(l.plan) || [['none', '－']]).map((x) => [x[0], x[1]])),
        box: 'border-radius:14px;padding:12px 14px;min-width:0;' + (isCur ? 'background:#fff;border:1px solid #e6ddd6' : 'background:#fff;border:1.5px solid #fbd5b8'),
        chip: 'font-size:11px;font-weight:700;border-radius:6px;padding:2px 7px;' + (isCur ? 'color:#5a4334;background:#f1ebe6' : 'color:#8a3700;background:#fff1e6'),
        priceColor: isCur ? '#1f1712' : '#c2410c',
      };
    };
    const rows = cur.map((_, i) => i).filter((i) => ons[i]).map((i, n) => {
      const a = C.months[0].items.find((x) => x.key === 'l' + i).r.after, b = Q.months[0].items.find((x) => x.key === 'l' + i).r.after;
      const d = b - a;
      return { no: String(n + 1), left: lineVm('cur', i), right: lineVm('prop', i), dT: d === 0 ? '±0' : (d < 0 ? '−' : '＋') + yen(d), dStyle: 'font-size:12px;font-weight:900;white-space:nowrap;' + (d < 0 ? 'color:#c2410c' : d > 0 ? 'color:#5a4334' : 'color:#9a8b80') };
    });
    const netD = (Q.months[0].netFee + Q.np.phFee + Q.months[0].tvM) - (C.months[0].netFee + C.np.phFee + C.months[0].tvM);
    const nextOff = ons.indexOf(false);
    const PRE = [
      ['au・UQ', 'eo10', ['#eb5505', '#1f4ba5'], (i) => (i < 2 ? L('au', 'auvl', 'aupay') : L('uq', 'uqtt30', 'aupay'))],
      ['au', 'auhikari', ['#eb5505'], () => L('au', 'auvl', 'aupay')],
      ['UQ', 'auhikari', ['#1f4ba5'], () => L('uq', 'uqtt30', 'aupay')],
      ['ドコモ', 'dhikari', ['#c8102e'], () => L('docomo', 'dmax', 'dgold')],
      ['ソフトバンク', 'sbhikari', ['#6b6b6b'], () => L('sb', 'sbtei', 'ppgold')],
      ['ワイモバイル', 'sbhikari', ['#b41e5a'], () => L('ym', 'ymM', 'ppgold')],
      ['楽天', 'rhikari', ['#bf0000'], () => L('rakuten', 'rkU', 'rcard')],
    ];
    const curPre = s.pre || 'au・UQ';
    const presets = PRE.map(([t, net, cols, f]) => ({
      t, dot: 'width:10px;height:10px;border-radius:50%;flex-shrink:0;background:' + (cols.length > 1 ? `linear-gradient(135deg, ${cols[0]} 50%, ${cols[1]} 50%)` : cols[0]),
      style: 'display:flex;align-items:center;gap:6px;height:30px;padding:0 11px;border-radius:999px;font-family:inherit;font-weight:800;font-size:12px;cursor:pointer;' + (curPre === t ? 'background:#1f1712;color:#fff;border:1px solid #1f1712' : 'background:#fff;color:#3a2c24;border:1px solid #e6ddd6'),
      pick: () => this.setState({ pre: t, propNet: net, prop: cur.map((x, i) => ({ ...f(i), call: x.call })) }),
    }));
    const seg = (on) => 'height:34px;padding:0 14px;border:none;border-radius:8px;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer;' + (on ? 'background:#fff;color:#1f1712;box-shadow:0 1px 3px rgba(31,23,18,.18)' : 'background:transparent;color:#6b5a4e');
    const good = d1 < 0, goodT = dT < 0;
    const names = [...new Set(prop.filter((_, i) => ons[i]).map((l) => CAR[l.carrier][0]))];
    const breakdown = [
      ...rows.map((r) => ({ k: r.no + '回線目', a: r.left.afterT, b: r.right.afterT })),
      { k: '家のネット', a: yen(C.months[0].netFee), b: yen(Q.months[0].netFee) },
      { k: '電話サービス', a: yen(C.np.phFee), b: yen(Q.np.phFee) },
      { k: 'テレビ', a: yen(C.months[0].tvM), b: yen(Q.months[0].tvM) },
    ];
    return {
      rows, presets, canAdd: nextOff >= 0, addLabel: '＋ 回線を追加（' + ons.filter(Boolean).length + '／5）',
      addLine: () => { if (nextOff >= 0) this.setState({ cur: cur.map((x, j) => (j === nextOff ? { ...x, on: true } : x)) }); },
      netCur: netVm('cur'), netProp: netVm('prop'), tvOpts: Object.entries(TVS).map(([k, v]) => { const f = bld === 'mansion' && v.m != null ? v.m : v.h; return { v: k, t: v.n + (f ? '　' + num(f) + '円' : '') }; }),
      tvAddOpts: TVADD.map(([v, t, f]) => ({ v, t: t + (f ? '　' + num(f) + '円' : '') })), netOpts: netOptsAll, denkiOpts: opt(DENKI), elapsedOpts: opt(ELAPSED), ageOpts: opt(AGES),
      carrierOpts: opt(Object.entries(CAR).map(([k, v]) => [k, v[0]])),
      netDT: netD === 0 ? '±0' : (netD < 0 ? '−' : '＋') + yen(netD), netDStyle: 'font-size:12px;font-weight:900;white-space:nowrap;' + (netD < 0 ? 'color:#c2410c' : netD > 0 ? 'color:#5a4334' : 'color:#9a8b80'),
      segHouse: seg(bld === 'house'), segMansion: seg(bld === 'mansion'), toHouse: () => this.setState({ bld: 'house' }), toMansion: () => this.setState({ bld: 'mansion' }),
      seg12: seg(T === 12), seg24: seg(T === 24), seg36: seg(T === 36), to12: () => this.setState({ T: 12 }), to24: () => this.setState({ T: 24 }), to36: () => this.setState({ T: 36 }),
      Tlabel: String(T), propName: names.join('・'), nOn: String(ons.filter(Boolean).length),
      c1T: yen(c1.total), q1T: yen(q1.total), d1T: yen(d1), d1Word: word(d1),
      cTotT: yen(cTot), qTotT: yen(qTot), dTT: yen(dT), dTWord: word(dT), cAvgT: yen(cTot / T), qAvgT: yen(qTot / T), dAvgT: yen(dT / T),
      dRealT: yen(dReal / T), dRealWord: word(dReal), cPtsT: yen(cPts / T), qPtsT: yen(qPts / T),
      heroStyle: 'border-radius:18px;padding:18px 22px;color:#fff;display:flex;flex-direction:column;gap:4px;background:' + (goodT ? '#ff6600' : dT === 0 ? '#9a8b80' : '#3a2c24'),
      firstStyle: 'font-size:13px;font-weight:800;' + (good ? 'color:#c2410c' : 'color:#5a4334'),
      bars, events: evRows, hasEvents: evRows.length > 0, noEvents: evRows.length === 0, breakdown,
    };
  }
}
