import React, { useState } from 'react';
import { TopBar, KpField, Keypad, Toast, useForm, useToast, yen, Icons, OtSelect } from './common.jsx';
import { buildConfig, SIM_ONLY, kindOf, deviceGroupsFor, findDevice, plansFor, findPlan, discountsFor, discountAmount, discountLabel, activeCampaigns, optionsFor } from './payConfig.js';

// ===== お支払い目安額 =====
// 上の5つのタブがそれぞれ別の見積もり。プルダウンも含め、すべての入力をタブごとに持つ（コピーでまるごと複製）
// 端末・プランの金額は payData.js。契約事務手数料・Pontaポイント還元・キャンペーンは今後追加

const LATER = '[後で追加]';
const PAY_TYPES = [['smatoku', 'スマトク'], ['kappu', '通常割賦'], ['ikkatsu', '一括']];
const tri = (v) => (v ? '▲' + v.toLocaleString('ja-JP') + '円' : '- 円'); // 値引きの表記（▲44,000円）

// ===== 自動計算（金額はすべて税込の円）=====
export function calcEstimate(e, cfg) {
  const n = (k) => Number(String(e[k] || '').replace(/[^0-9]/g, '')) || 0;
  const kind = kindOf(cfg, e.kind);
  const brand = kind.brand || '';
  const sim = e.device === SIM_ONLY;
  const dev = !sim && e.device ? findDevice(cfg, e.device, brand || 'au') : null;
  // 販売価格：端末データがあれば自動、なければ手入力
  const autoPrice = dev && dev.price != null ? dev.price : null;
  const price = sim ? 0 : autoPrice != null ? autoPrice : n('price');
  // 残価：登録済みなら自動。auで未登録は手入力、UQで未登録はスマトク不可
  const autoResidual = dev ? (kind.group === 'kihen' ? dev.rKihen : dev.rNew) : null;
  const smatokuOk = cfg.pay.smatoku && (brand !== 'uq' || autoResidual != null);
  const residual = autoResidual != null ? autoResidual : n('residual');
  // 期間限定の端末値引き（管理画面の「キャンペーン・期間限定割引」）
  const plan = brand ? findPlan(cfg, brand, e.plan) : null;
  const list = (k) => String(e[k] || '').split(',').filter(Boolean);

  // ---- オプションサービス ----
  // 追加（チェック）したもの＋Pontaパス込みプランの自動表示。画面で枠を押すと「計算に入れない」に切り替わる
  const optAvail = optionsFor(cfg, { deviceName: sim ? '' : e.device });
  const picked = list('opts');
  const pontaIncluded = !!(plan && plan.ponta);
  const optShown = optAvail.filter((o) => picked.includes(o.id) && !(pontaIncluded && /^Pontaパス$/.test(o.name)));
  if (pontaIncluded && !list('optHide').includes('ponta-in')) optShown.unshift({ id: 'ponta-in', name: 'Pontaパス（プランに含む）', price: 0, auto: true });
  const optOff = list('optOff');

  // ---- キャンペーン関連 ----
  // 「追加/変更」で選んだもの＋自動表示（増量オプション付きプラン、Pontaパス込み／追加時、値引き・割引のキャンペーン）
  const campAvail = brand ? activeCampaigns(cfg, { brand, kind, deviceName: sim ? '' : e.device, planName: plan ? plan.name : '' }) : [];
  const pontaActive = optShown.some((o) => /Pontaパス/.test(o.name));
  // 自動で表示するのは、管理画面の「自動で表示する条件」に当てはまるときだけ（「自動では出さない」は、追加/変更で選んだときだけ表示）
  const campAuto = (c) => c.autoWhen === 'always' || (c.autoWhen === 'zouryou' && !!(plan && plan.zouryou)) || (c.autoWhen === 'ponta' && pontaActive);
  const campPick = list('campOn'), campHide = list('campHide'), campOff = list('campOff');
  const campShown = campAvail.filter((c) => campPick.includes(c.id) || (campAuto(c) && !campHide.includes(c.id)));
  const campOn = campShown.filter((c) => !campOff.includes(c.id));
  const campDev = campOn.filter((c) => c.type === '端末値引き').reduce((a, c) => a + c.amount, 0);
  const campMon = campOn.filter((c) => c.type === '月額割引').reduce((a, c) => a + c.amount, 0);
  // 無料キャンペーン（Pontaパス30日無料・増量オプション7か月無料など）がオンなら、その料金は0円で計算
  const freeWords = campOn.map((c) => String(c.frees || '').trim()).filter(Boolean);
  const isFree = (name) => freeWords.some((w) => String(name || '').includes(w));
  optShown.forEach((o) => { o.free = !o.auto && isFree(o.name); });
  const optTotal = optShown.filter((o) => !optOff.includes(o.id) && !o.free).reduce((a, o) => a + (o.price || 0), 0);
  // プランの追加料金（増量オプションⅡ 550円など）。無料キャンペーンをオフにすると上乗せされる
  const extras = (plan && plan.extra ? plan.extra : []).map((x) => ({ ...x, price: Number(x.price) || 0, free: isFree(x.label) }));
  const extraTotal = extras.filter((x) => !x.free).reduce((a, x) => a + x.price, 0);
  const sd = n('shopDisc'), pd = n('ptDisc');
  const allowed = PAY_TYPES.filter(([v]) => (v === 'smatoku' ? smatokuOk : cfg.pay[v])).map(([v]) => v);
  let payType = sim || !e.device ? '' : e.payType || allowed[0] || '';
  if (payType && !allowed.includes(payType)) payType = allowed[0] || '';
  const disc0 = sd + pd + (sim ? 0 : campDev);

  let financed = 0, monthly = 0, first = 0, store = 0, real = 0, count = 0;
  let last = 0, extFirst = 0, extMonthly = 0;
  if (payType === 'smatoku') {
    // スマトク：残価を除いた前半を23回（初回＋22回）で支払い。値引きは前半から引く
    financed = Math.max(price - residual - disc0, 0);
    monthly = Math.floor(financed / 23);
    first = financed - monthly * 22;
    count = 24;
    last = residual;
    // 返却しない場合は残価を24回で再分割。端数は延長後の初回に上乗せ
    extMonthly = Math.floor(residual / 24);
    extFirst = residual - extMonthly * 23;
    real = financed;
  } else if (payType === 'kappu') {
    const t = Number(e.times || kappuTimes(cfg)[0] || 24);
    financed = Math.max(price - disc0, 0);
    monthly = Math.floor(financed / t);
    first = financed - monthly * (t - 1);
    count = t;
    real = financed;
  } else if (payType === 'ikkatsu') {
    store = Math.max(price - disc0, 0); // 一括：値引き後の機種代を店頭で
    real = store;
  }

  // 料金プラン（プランのみ：基本料＋通話オプション − 割引）
  const tier = plan ? plan.tiers[Number(e.tier || 0)] || plan.tiers[0] : null;
  const call = plan ? plan.calls[Number(e.call || 0)] || plan.calls[0] : null;
  const planBase = (tier ? Number(tier.price) || 0 : 0) + (call ? Number(call.price) || 0 : 0) + extraTotal;
  // コミコミプランバリューなど割引対象外のプランは、割引をすべて0にする
  const noDisc = !!(plan && plan.noDiscount);
  const discTotal = e.discOn && !noDisc ? discountAmount(cfg, brand, e.discSvc, plan) : 0;
  const card = !noDisc && e.card === 'card' && plan && plan.card ? Number(cfg.card.amount) || 0 : 0;
  const planDisc = discTotal + card + (plan ? campMon : 0);
  const planMonthly = Math.max(planBase - planDisc, 0);


  return {
    kind, brand, sim, dev, price, autoPrice, residual, autoResidual, smatokuOk, allowed, sd, pd, payType,
    financed, monthly, first, store, real, count, last, extFirst, extMonthly, otoku: disc0,
    plan, tier, call, planBase, card, planDisc, planMonthly, noDisc, campAvail, campShown, campAuto, campPick, campHide, campOff, campDev,
    net: n('net'), plus1: n('plus1'), optAvail, optShown, optOff, optTotal, pontaIncluded, picked, optHide: list('optHide'), extras,
    total: monthly + planMonthly + optTotal, // 月々のお支払い目安額＝端末＋プラン＋オプション
    showFee: brand === 'au' && payType === 'smatoku' && dev && dev.fee > 0,
    fee: dev ? dev.fee : 0,
  };
}
const kappuTimes = (cfg) => String(cfg.pay.kappuTimes || '24').split(/[,、\s]+/).filter(Boolean);

const DIALOGS = {
  disc: { title: '割引内訳入力', note: '店頭値引き・ポイント値引きの金額を入力します', fields: [['shopDisc', '店頭値引き'], ['ptDisc', 'ポイント値引き']] },
  net: { title: 'インターネット接続サービス', note: '練習用：月額を入力してください', fields: [['net', '月額']] },
  plus1: { title: 'au +1collection', note: '練習用：月額を入力してください', fields: [['plus1', '月額']] },
};

const isEmpty = (e) => !Object.keys(e || {}).some((k) => e[k]);

// web：ブラウザで開く「Web版お支払い目安額」（上のバーと、レイアウト（鉛筆）→印刷のボタンが無い。ほかの機能は同じ）
// ctrl：見積もりの中身を外から渡す（Web版で、印刷プレビューにも同じ内容を出すため）
// preview：印刷プレビュー用（見るだけ）
export const WEB_PAY_H = 805; // 横向きの印刷で、縮尺90%以上だと2枚目に回る高さ（実際の現場と同じ）
export default function Payment({ onClose, onMultitask, config, web, ctrl, preview }) {
  const cfg = React.useMemo(() => buildConfig(config), [config]);
  const [estsIn, setEstsIn] = useState([{}, {}, {}, {}, {}]);
  const [curIn, setCurIn] = useState(0);
  const ests = ctrl ? ctrl.ests : estsIn, setEsts = ctrl ? ctrl.setEsts : setEstsIn;
  const cur = ctrl ? ctrl.cur : curIn, setCur = ctrl ? ctrl.setCur : setCurIn;
  const [dlg, setDlg] = useState(null);
  const [planDlg, setPlanDlg] = useState(false);
  const [optDlg, setOptDlg] = useState(false);
  const [campDlg, setCampDlg] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [layout, setLayout] = useState(false);
  const [printCode, setPrintCode] = useState('');
  const toast = useToast();
  const noop = () => toast.say('練習用では操作できません');
  const e = ests[cur];
  const patchE = (p) => setEsts((es) => es.map((x, i) => (i === cur ? { ...x, ...p } : x)));
  const setE = (name, v) => patchE({ [name]: v });
  // カンマ区切りの一覧に出し入れする（計算に入れない一覧など）
  const toggleIn = (key, id) => {
    const l = String(e[key] || '').split(',').filter(Boolean);
    setE(key, (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]).join(','));
  };

  const form = useForm({
    values: e, setValue: setE,
    maxLen: { price: 7, shopDisc: 7, ptDisc: 7, residual: 7, net: 6, plus1: 6 },
    labels: { price: '販売価格', shopDisc: '店頭値引き', ptDisc: 'ポイント値引き', residual: '残価（最終回分）', net: 'インターネット接続サービス（月額）', option: 'オプション（月額合計）', plus1: 'au +1collection（月額）' },
  });
  const r = calcEstimate(e, cfg);
  const brand = r.brand;
  const pickBtn = (label, onClick, style) => <button className="ot-btn sm" onClick={onClick} style={style}>{Icons.pick}{label}</button>;

  // 契約種別を変えたとき：ブランドが変わるならプラン・割引を選び直し
  const changeKind = (ev) => {
    const next = kindOf(cfg, ev.target.value);
    const p = { kind: ev.target.value };
    if ((next.brand || '') !== brand) {
      Object.assign(p, { plan: '', tier: '', call: '', discSvc: '', discOn: '', card: '' });
      if (e.device && e.device !== SIM_ONLY && !findDevice(cfg, e.device, next.brand || 'au')) Object.assign(p, { device: '', payType: '', price: '', residual: '' });
    }
    patchE(p);
  };
  const changeDevice = (ev) => {
    const v = ev.target.value;
    patchE({ device: v, payType: '', price: '', residual: '' }); // 支払方法は機種に合わせて自動（スマトク可ならスマトク）
  };
  const changePlan = (ev) => {
    const p = findPlan(cfg, brand, ev.target.value);
    patchE({ plan: ev.target.value, tier: '', call: '', ...(p && p.noDiscount ? { discSvc: '', discOn: '', card: '' } : {}) });
  };
  const changeDiscSvc = (ev) => patchE({ discSvc: ev.target.value, discOn: ev.target.value ? '1' : '' });

  // コピー：開いているタブの内容を、空いているタブのうち一番左へ
  const copyEst = () => {
    const to = ests.findIndex((x, i) => i !== cur && isEmpty(x));
    if (to < 0) return toast.say('空いているタブがありません');
    setEsts((es) => es.map((x, i) => (i === to ? { ...es[cur] } : x)));
    toast.say(`${cur + 1}のタブを${to + 1}にコピーしました`);
  };
  const d = dlg ? DIALOGS[dlg] : null;
  const Y = { fontSize: 12, color: '#4a3528' };
  const plans = brand ? plansFor(cfg, brand) : [];
  const discounts = brand ? [{ id: '', label: '' }, ...discountsFor(cfg, brand)] : [{ id: '', label: '' }];

  return (
    <div className="ot-screen" style={{ background: layout ? '#cfc8c1' : undefined, height: web ? WEB_PAY_H : undefined, pointerEvents: preview ? 'none' : undefined }}>
      <div className={`ot-pay-wrap ${layout ? 'layout' : ''}`}>
        {!web && <TopBar right={['multi', 'manual', 'x']} onMultitask={onMultitask} onClose={onClose} noop={noop} />}
        <main className="ot-main" style={{ padding: '8px 14px 8px 30px' }}>
          <button className="ot-side-tab" onClick={noop}>ご説明コンテンツ</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h1 className="ot-h1" style={{ marginRight: 'auto' }}>お支払い目安額{web ? '（Web版）' : ''}</h1>
            <button className="ot-btn sm" onClick={noop}>回線紐づけ</button>
            <button className="ot-btn sm" onClick={noop}>お支払い目安額(固定)</button>
            <button className="ot-btn sm" onClick={noop}>サマリ表示 <b className="ot-badge">1</b></button>
            <button className="ot-btn sm" onClick={noop}>補助帳票 <b className="ot-badge">1</b></button>
            <button className="ot-btn sm" onClick={noop} style={{ color: '#b8aca2' }}>お申し込み</button>
          </div>
          <div className="ot-est-bar">
            {ests.map((x, i) => {
              const t = calcEstimate(x, cfg).total;
              return (
                <button key={i} className={`ot-est ${i === cur ? 'on' : ''}`} onClick={() => { setCur(i); form.closeKp(); setDlg(null); setPlanDlg(false); }}>
                  <span className="ot-est-check">{i === cur ? '✓' : ''}</span>
                  <span className="ot-est-total">{t ? t.toLocaleString('ja-JP') + '円' : '-円'}</span>
                </button>
              );
            })}
            <div className="ot-est-tools">
              <button className="ot-btn sm" onClick={copyEst}><Tool d="copy" />コピー</button>
              <button className="ot-btn icon" onClick={noop} aria-label="保存"><Tool d="up" /></button>
              <button className="ot-btn icon" onClick={noop} aria-label="読込"><Tool d="down" /></button>
              {!web && <button className="ot-btn icon" onClick={() => { setLayout(true); form.closeKp(); setDlg(null); setPlanDlg(false); }} aria-label="レイアウト"><Tool d="pen" /></button>}
              <button className="ot-btn icon" onClick={noop} aria-label="グラフ"><Tool d="chart" /></button>
              <button className="ot-btn icon" onClick={noop} aria-label="ヘルプ"><Tool d="q" /></button>
              <button className="ot-btn icon" onClick={() => setAskDelete(true)} aria-label="このタブを削除"><Tool d="re" /></button>
            </div>
          </div>

          <div className="ot-pay-grid">
            {/* ===== 端末料金 ===== */}
            <section className="ot-col blue">
              <div className="ot-col-head">
                <b>端末料金</b>
                <OtSelect aria-label="契約種別" value={e.kind || ''} onChange={changeKind} style={{ flex: 1, height: 30, fontSize: 12 }}>
                  <option value="">選択してください</option>
                  {cfg.kinds.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                </OtSelect>
                {pickBtn('機種比較', noop)}
              </div>
              <div className="ot-col-body" style={{ gap: 6 }}>
                <OtSelect aria-label="機種" value={e.device || ''} onChange={changeDevice} style={{ height: 32 }}>
                  <option value="">－選択してください－</option>
                  {brand === 'uq' && <option value={SIM_ONLY}>{SIM_ONLY}</option>}
                  {deviceGroupsFor(cfg, brand).map((g) => (
                    <React.Fragment key={g.maker}>
                      <option disabled value={`__${g.maker}`}>【{g.maker}】</option>
                      {g.items.map((dv) => <option key={dv.name} value={dv.name}>{dv.name}</option>)}
                    </React.Fragment>
                  ))}
                  {brand !== 'uq' && <option disabled value="__sim">――――――</option>}
                  {brand !== 'uq' && <option value={SIM_ONLY}>{SIM_ONLY}</option>}
                </OtSelect>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...Y }}>
                  <span style={{ marginLeft: 'auto' }}>販売価格</span>
                  {r.sim ? <span className="ot-pay-auto">0 円</span>
                    : r.autoPrice != null ? <span className="ot-pay-auto">{r.autoPrice.toLocaleString('ja-JP')} 円</span>
                    : <KpField form={form} name="price" label="販売価格" left align="right" placeholder="- 円" style={{ width: 170, height: 32 }} />}
                </div>
                <div className="ot-sep" />
                <b className="ot-col-sub">割引内訳</b>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {pickBtn('割引内訳入力', () => setDlg('disc'))}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div className="ot-kv" style={Y}><span>店頭値引き</span><span>{tri(r.sd)}</span></div>
                    <div className="ot-kv" style={Y}><span>ポイント値引き</span><span>{tri(r.pd)}</span></div>
                  </div>
                </div>
                <div className="ot-sep" />
                <div className="ot-kv"><b className="ot-col-sub">分割支払金</b><span style={Y}>{yen(r.financed)}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <OtSelect aria-label="支払方法" value={r.payType} disabled={!e.device || r.sim}
                    onChange={(ev) => patchE({ payType: ev.target.value, times: ev.target.value === 'kappu' ? e.times || kappuTimes(cfg)[0] : e.times })} style={{ width: 120, height: 30 }}>
                    {!e.device || r.sim ? <option value="">－</option> : null}
                    {PAY_TYPES.filter(([v]) => r.allowed.includes(v)).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </OtSelect>
                  {r.payType === 'smatoku' && <b style={{ fontSize: 13, color: '#2f5f7e' }}>24回</b>}
                  {r.payType === 'kappu' && (
                    <OtSelect aria-label="支払回数" value={e.times || kappuTimes(cfg)[0]} onChange={form.onChange('times')} style={{ width: 90, height: 30 }}>
                      {kappuTimes(cfg).map((v) => <option key={v} value={v}>{v}回</option>)}
                    </OtSelect>
                  )}
                  {r.payType === 'smatoku' && r.autoResidual == null && brand !== 'uq' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', ...Y }}>残価<KpField form={form} name="residual" label="残価（最終回分）" align="right" placeholder="手入力" style={{ width: 120, height: 30 }} /></span>
                  )}
                </div>
                <div style={{ ...Y, textAlign: 'right', lineHeight: 1.65 }}>
                  初回 {yen(r.first)}　月々 {yen(r.monthly)}<br />
                  最終回支払金額 {r.payType === 'smatoku' ? yen(r.last) : '-円'}　延長回数 {r.payType === 'smatoku' ? '24回' : '-回'}<br />
                  延長後初回 {r.payType === 'smatoku' ? yen(r.extFirst) : '-円'}　延長後月々 {r.payType === 'smatoku' ? yen(r.extMonthly) : '-円'}
                </div>
                {r.showFee && <div className="ot-pay-note">端末返却時に{r.fee.toLocaleString('ja-JP')}円の特典利用料が発生する可能性がございます。</div>}
                <div className="ot-sep" />
                <div className="ot-kv" style={{ alignItems: 'flex-start' }}>
                  <div><b className="ot-col-sub">実質負担金</b><div style={{ fontSize: 11, color: '#4a3528' }}>(ポイント値引き含む)</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontSize: 14, fontWeight: 800 }}>{yen(r.real)}</div><div style={{ fontSize: 12, color: '#cc4f00' }}>{r.otoku ? tri(r.otoku) + ' お得' : '- 円 お得'}</div></div>
                </div>
              </div>
              <div className="ot-col-foot blue">
                <div><b>店頭お支払い額</b><div className="ot-big">{r.store.toLocaleString('ja-JP')} 円</div><div className="ot-mini">(初回のみ -円)</div></div>
                <div><b>月々のお支払い額</b><div className="ot-big">{r.monthly.toLocaleString('ja-JP')} 円</div></div>
              </div>
            </section>

            {/* ===== 月々のご利用料金 ===== */}
            <section className="ot-col pink">
              <div className="ot-col-head"><b>月々のご利用料金</b></div>
              <div className="ot-col-body" style={{ flexGrow: 0, gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...Y }}><span style={{ width: 84 }}>基本パック</span>
                  <OtSelect aria-label="基本パック" value={e.plan || ''} onChange={changePlan} disabled={!brand} style={{ flex: 1, height: 32 }}>
                    <option value="">{brand ? '' : '契約種別を選んでください'}</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </OtSelect>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...Y }}><b style={{ width: 84 }}>料金プラン</b>
                  <PickField onClick={() => (r.plan ? setPlanDlg(true) : toast.say('先に基本パックを選んでください'))}
                    value={r.plan ? yen(r.planBase) : ''} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...Y }}><span style={{ width: 84 }}>インターネット<br />接続サービス</span><PickField onClick={() => setDlg('net')} value={r.net ? '月額 ' + yen(r.net) : ''} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...Y }}><span style={{ width: 84 }} />
                  <OtSelect aria-label="au PAYカードお支払い割" value={r.noDisc ? '' : e.card || ''} onChange={form.onChange('card')} disabled={!brand || r.noDisc} style={{ flex: 1, height: 30 }}>
                    <option value="" />
                    <option value="card">{r.plan && !r.plan.card ? `${cfg.card.label}（対象外）` : `${cfg.card.label} -${Number(cfg.card.amount || 0).toLocaleString('ja-JP')}円`}</option>
                    <option value="none">ー</option>
                  </OtSelect>
                </div>
                {r.plan && r.plan.note && <div className="ot-pay-note" style={{ marginTop: 0 }}>{r.plan.note}</div>}
              </div>
              <div className="ot-col-body" style={{ flexGrow: 1, gap: 6, borderTop: '1px solid #ecd2d2' }}>
                <div className="ot-kv"><b className="ot-col-sub">オプションサービス</b>{pickBtn('追加', () => (brand ? setOptDlg(true) : toast.say('先に契約種別を選んでください')), { height: 28, fontSize: 11 })}</div>
                {r.optShown.map((o) => {
                  const off = r.optOff.includes(o.id);
                  return (
                    <button key={o.id} className={`ot-tg ${off ? 'off' : ''}`} onClick={() => toggleIn('optOff', o.id)} aria-pressed={!off}>
                      <span className="ot-tg-box">{off ? '' : '✓'}</span>
                      <span className="ot-ellipsis" style={{ flex: 1 }}>{o.name}</span>
                      <span className="ot-tg-price">{o.auto ? 'プランに含む' : o.price == null ? '金額未登録' : yen(o.price)}</span>
                    </button>
                  );
                })}
                {r.optShown.length > 0 && <div className="ot-kv" style={{ ...Y, fontWeight: 800, borderTop: '1px dashed #ecd2d2', paddingTop: 4 }}><span>オプション合計</span><span>{yen(r.optTotal)}</span></div>}
              </div>
              <div className="ot-col-body" style={{ flexGrow: 0, borderTop: '1px solid #ecd2d2' }}>
                <b className="ot-col-sub">割引サービス</b>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <OtSelect aria-label="割引サービス" value={r.noDisc ? '' : e.discSvc || ''} onChange={changeDiscSvc} disabled={!brand || r.noDisc} style={{ flex: 1, minWidth: 0, height: 30, fontSize: 11 }}>
                    {discounts.map((x) => <option key={x.id} value={x.id}>{x.id ? discountLabel(cfg, brand, x, r.plan) : ''}</option>)}
                  </OtSelect>
                  <button className={`ot-onoff ${e.discOn && !r.noDisc ? 'on' : ''}`} disabled={!e.discSvc || r.noDisc} onClick={() => setE('discOn', e.discOn ? '' : '1')}>{e.discOn && !r.noDisc ? 'ON' : 'OFF'}</button>
                </div>
              </div>
              <div className="ot-pink-foot">
                <div className="ot-pink-left">
                  <b>契約事務手数料</b><div className="ot-r">- 円</div>
                  <b>翌月請求額</b><div className="ot-r">- 円</div>
                  <div className="ot-mini">(初回のご利用料金と併<br />せてのご請求)</div>
                </div>
                <div className="ot-pink-right">
                  <div className="ot-pink-pay">
                    <b>月々のお支払い額</b>
                    <div style={{ fontSize: 11, marginTop: 2 }}>小計 {yen(r.planBase)}</div>
                    <div style={{ fontSize: 11 }}>{r.planDisc ? tri(r.planDisc) + ' お得' : '- 円 お得'}</div>
                    <div className="ot-big" style={{ marginTop: 4 }}>{r.plan ? r.planMonthly.toLocaleString('ja-JP') + ' 円' : '- 円'}</div>
                  </div>
                  <div className="ot-ponta">Pontaポイント還元 -Pt</div>
                </div>
              </div>
            </section>

            {/* ===== キャンペーン・+1collection（今回は変更なし）===== */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="ot-box green">
                <div className="ot-kv"><b>キャンペーン関連</b>{pickBtn('追加/変更', () => (brand ? setCampDlg(true) : toast.say('先に契約種別を選んでください')), { height: 28, fontSize: 11 })}</div>
                {r.campShown.map((c) => {
                  const off = r.campOff.includes(c.id);
                  return (
                    <button key={c.id} className={`ot-camp-card ${off ? 'off' : ''}`} onClick={() => toggleIn('campOff', c.id)} aria-pressed={!off}>
                      <span className="ot-tg-box">{off ? '' : '✓'}</span>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left' }}>
                        <b>{c.name}</b>{c.detail && <span>{c.detail}</span>}
                      </span>
                      {c.type !== '表示のみ' && <span className="ot-tg-price">{c.type === 'ポイント還元' ? `${c.amount.toLocaleString('ja-JP')}pt` : `▲${c.amount.toLocaleString('ja-JP')}円${c.type === '月額割引' ? '/月' : ''}`}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="ot-box yellow">
                <div className="ot-kv"><b>au +1collection</b>{pickBtn('追加/変更', () => setDlg('plus1'), { height: 28, fontSize: 11 })}</div>
                <div style={{ flex: 1 }} />
                <OtSelect aria-label="au +1collection" value={e.plus1Sel || ''} onChange={form.onChange('plus1Sel')} style={{ width: 110, height: 30 }}>
                  <option value="" /><option value={LATER}>{LATER}</option>
                </OtSelect>
                <div className="ot-kv" style={Y}><span>月々のお支払い額</span><b style={{ color: '#cc4f00' }}>{yen(r.plus1)}</b></div>
                <div className="ot-mini" style={{ textAlign: 'right' }}>(初回のみ -円)</div>
              </div>
              <div className="ot-box total"><b>月々のお支払い目安額</b><div className="ot-big" style={{ fontSize: 20, fontWeight: 900 }}>{r.total ? r.total.toLocaleString('ja-JP') + ' 円' : '- 円'}～</div><div className="ot-mini" style={{ textAlign: 'right' }}>端末＋料金プラン＋オプション</div></div>
              <button className="ot-orange" onClick={noop}>ポイントシミュレーターに連携</button>
            </section>
          </div>
          <div className="ot-mini" style={{ paddingTop: 5, lineHeight: 1.5 }}>※見積りは作成時の情報です。料金や提供条件は変更の可能性があります。<br />※税込価格です。※ポイント数は試算値で、実際と異なることがあります。</div>
        </main>
      </div>

      {/* 料金プランの詳細（利用データ量・通話オプション）*/}
      {planDlg && r.plan && (
        <div className="ot-ov center" style={{ zIndex: 45 }}>
          <div className="ot-dialog" role="dialog" aria-label="料金プランの詳細" style={{ width: 480 }}>
            <div className="ot-dialog-title">{r.plan.name}</div>
            <div className="ot-plan-sec">ご利用データ量</div>
            <div className="ot-plan-opts">
              {r.plan.tiers.map((t, ti) => (
                <button key={ti} className={`ot-plan-opt ${r.tier === t ? 'on' : ''}`} onClick={() => setE('tier', String(ti))}>
                  <span>{t.label}</span><b>{(Number(t.price) || 0).toLocaleString('ja-JP')}円</b>
                </button>
              ))}
            </div>
            <div className="ot-plan-sec">通話オプション</div>
            <div className="ot-plan-list">
              {r.plan.calls.map((c, ci) => (
                <label key={ci} className="ot-plan-row">
                  <input type="radio" name="call" checked={r.call === c} onChange={() => setE('call', String(ci))} />
                  <span style={{ flex: 1 }}>{c.label}</span>
                  <b>{Number(c.price) ? '+' + Number(c.price).toLocaleString('ja-JP') + '円' : '0円'}</b>
                </label>
              ))}
            </div>
            {r.extras.map((x, i) => (
              <div key={i} className="ot-kv" style={{ fontSize: 13 }}>
                <span>{x.label}</span><b>{x.free ? `${x.price.toLocaleString('ja-JP')}円 → 無料中（キャンペーン）` : `+${x.price.toLocaleString('ja-JP')}円`}</b>
              </div>
            ))}
            <div className="ot-kv" style={{ fontSize: 13, fontWeight: 800, borderTop: '1px solid #ebe2d9', paddingTop: 10 }}>
              <span>プラン料金（割引前）</span><span style={{ color: '#cc4f00', fontSize: 16 }}>{r.planBase.toLocaleString('ja-JP')}円</span>
            </div>
            <div className="ot-dialog-foot"><button className="ot-ok" onClick={() => setPlanDlg(false)}>OK</button></div>
          </div>
        </div>
      )}

      {/* オプションの追加（チェックで付ける／付けない）*/}
      {optDlg && (
        <div className="ot-ov center" style={{ zIndex: 45 }}>
          <div className="ot-dialog" role="dialog" aria-label="オプションの追加" style={{ width: 760 }}>
            <div className="ot-dialog-title">オプションサービス</div>
            <div className="ot-dialog-note">付けるオプションにチェックを入れてください。機種別の金額は、端末を選ぶと自動で入ります</div>
            <div className="ot-opt-grid">
              {r.pontaIncluded && (() => {
                const on = !r.optHide.includes('ponta-in');
                return (
                  <label className={`ot-opt ${on ? 'on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleIn('optHide', 'ponta-in')} />
                    <span className="ot-opt-name">Pontaパス（プランに含む）</span>
                    <b>プランに含む</b>
                  </label>
                );
              })()}
              {r.optAvail.filter((o) => !(r.pontaIncluded && /^Pontaパス$/.test(o.name))).map((o) => {
                const on = r.picked.includes(o.id);
                return (
                  <label key={o.id} className={`ot-opt ${on ? 'on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => setE('opts', (on ? r.picked.filter((x) => x !== o.id) : [...r.picked, o.id]).join(','))} />
                    <span className="ot-opt-name">{o.name}</span>
                    {o.note && <span className="ot-opt-note">{o.note}</span>}
                    <b>{o.price == null ? '金額未登録' : `月額 ${o.price.toLocaleString('ja-JP')}円`}</b>
                  </label>
                );
              })}
            </div>
            <div className="ot-kv" style={{ fontSize: 13, fontWeight: 800, borderTop: '1px solid #ebe2d9', paddingTop: 10 }}>
              <span>オプション合計（計算に入れているもの）</span><span style={{ color: '#cc4f00', fontSize: 16 }}>{r.optTotal.toLocaleString('ja-JP')}円</span>
            </div>
            <div className="ot-dialog-foot"><button className="ot-ok" onClick={() => setOptDlg(false)}>OK</button></div>
          </div>
        </div>
      )}

      {/* キャンペーン関連の追加/変更（チェックで表示する／しない）*/}
      {campDlg && (
        <div className="ot-ov center" style={{ zIndex: 45 }}>
          <div className="ot-dialog" role="dialog" aria-label="キャンペーン関連" style={{ width: 760 }}>
            <div className="ot-dialog-title">キャンペーン関連</div>
            <div className="ot-dialog-note">画面に表示するキャンペーンにチェックを入れてください（契約種別・プランに合わせて選べるものだけ出ます）</div>
            <div className="ot-opt-grid">
              {r.campAvail.length === 0 && <div className="ot-dialog-note">選べるキャンペーンはありません</div>}
              {r.campAvail.map((c) => {
                const auto = r.campAuto(c);
                const on = r.campPick.includes(c.id) || (auto && !r.campHide.includes(c.id));
                const flip = () => {
                  if (on) patchE({ campOn: r.campPick.filter((x) => x !== c.id).join(','), campHide: auto ? [...r.campHide, c.id].join(',') : r.campHide.join(',') });
                  else patchE({ campOn: auto ? r.campPick.join(',') : [...r.campPick, c.id].join(','), campHide: r.campHide.filter((x) => x !== c.id).join(',') });
                };
                return (
                  <label key={c.id} className={`ot-opt ${on ? 'on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={flip} />
                    <span className="ot-opt-name">{c.name}</span>
                    {c.detail && <span className="ot-opt-note">{c.detail}</span>}
                    <b>{c.type === '表示のみ' ? (auto ? '自動で表示' : '') : c.type === 'ポイント還元' ? `${c.amount.toLocaleString('ja-JP')}pt還元` : `▲${c.amount.toLocaleString('ja-JP')}円${c.type === '月額割引' ? '/月' : ''}`}</b>
                  </label>
                );
              })}
            </div>
            <div className="ot-dialog-foot"><button className="ot-ok" onClick={() => setCampDlg(false)}>OK</button></div>
          </div>
        </div>
      )}

      {/* 入力ダイアログ */}
      {d && (
        <div className="ot-ov center" style={{ zIndex: 45 }}>
          <div className="ot-dialog" role="dialog" aria-label={d.title}>
            <div className="ot-dialog-title">{d.title}</div>
            <div className="ot-dialog-note">{d.note}</div>
            {d.fields.map(([name, label]) => (
              <div key={name} className="ot-kv" style={{ fontSize: 13, fontWeight: 700, gap: 10 }}>
                <span>{label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><KpField form={form} name={name} label={label} align="right" placeholder="0" style={{ width: 200 }} />円</span>
              </div>
            ))}
            <div className="ot-dialog-foot">
              <button className="ot-btn" onClick={() => d.fields.forEach(([n]) => setE(n, ''))}>クリア</button>
              <button className="ot-ok" onClick={() => { setDlg(null); form.closeKp(); }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* レイアウト（鉛筆）：戻る矢印と印刷 */}
      {layout && !printCode && (
        <div className="ot-layer">
          <button className="ot-layout-back" onClick={() => setLayout(false)} aria-label="レイアウトを閉じる">
            <svg width="58" height="46" viewBox="0 0 58 46" aria-hidden="true"><path d="M24 3L3 23l21 20V31h31V15H24z" fill="#fff" stroke="#4a3528" strokeWidth="2.5" strokeLinejoin="round" /></svg>
          </button>
          <button className="ot-layout-print" onClick={() => setPrintCode(String(Math.floor(1000 + Math.random() * 9000)))}>印刷</button>
        </div>
      )}
      {printCode && (
        <div className="ot-print">
          <div className="ot-print-card"><div className="ot-print-label">印刷番号</div><div className="ot-print-code">{printCode}</div></div>
          <button className="ot-print-ok" onClick={() => setPrintCode('')}>OK</button>
        </div>
      )}

      {/* タブの削除確認 */}
      {askDelete && (
        <div className="ot-dim">
          <div className="ot-dialog" role="dialog" aria-label="タブの削除" style={{ width: 400, alignItems: 'center', gap: 20, padding: '26px 24px 20px' }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>現在のタブを削除します</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="ot-btn" style={{ height: 44, minWidth: 130, fontSize: 14 }} onClick={() => setAskDelete(false)}>いいえ</button>
              <button className="ot-ok" style={{ height: 44, minWidth: 130 }} onClick={() => { setEsts((es) => es.map((x, i) => (i === cur ? {} : x))); setAskDelete(false); }}>はい</button>
            </div>
          </div>
        </div>
      )}
      <Keypad form={form} money />
      <Toast msg={toast.msg} />
    </div>
  );
}

function PickField({ onClick, value }) {
  return <button className="ot-pickfield" onClick={onClick}>{Icons.pick}<span style={{ marginLeft: 'auto' }}>{value}</span></button>;
}

// 右上ツールのアイコン
const TS = { stroke: '#4a3528', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
function Tool({ d }) {
  const p = {
    copy: <><rect x="8" y="8" width="11" height="12" rx="2" {...TS} /><path d="M5 16V5a1 1 0 011-1h9" {...TS} /></>,
    up: <path d="M7 17a4 4 0 010-8 5 5 0 019.6-1.5A4 4 0 0117 17M12 11v7M9 14l3-3 3 3" {...TS} />,
    down: <path d="M7 17a4 4 0 010-8 5 5 0 019.6-1.5A4 4 0 0117 17M12 11v7M9 15l3 3 3-3" {...TS} />,
    pen: <path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" {...TS} />,
    chart: <><rect x="4" y="4" width="16" height="16" rx="2" {...TS} /><path d="M8 16v-4M12 16V8M16 16v-6" {...TS} /></>,
    q: <><circle cx="12" cy="12" r="9" {...TS} /><path d="M9.5 9.5a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4M12 17v.5" {...TS} /></>,
    re: <path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" {...TS} />,
  }[d];
  return <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">{p}</svg>;
}
