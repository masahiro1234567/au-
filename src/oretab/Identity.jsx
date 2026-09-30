import React, { useState } from 'react';
import { TopBar, KpField, Keypad, Toast, SuccessNotice, useForm, useToast, formatValue, Icons, OtSelect } from './common.jsx';

const TABS = ['au/UQ/povo1.0', '固定', 'au ID', 'WiMAX', 'povo2.0'];
const DOCS = ['運転免許証', 'マイナンバーカード', '在留カード', '身体障がい者手帳', '健康保険証＋補助書類', '日本国パスポート＋補助書類'];
const emptySlot = () => ({ f: {}, tab: 0, tried: false, done: false });

// お客様照会（本人確認）。上の1〜5は別のお客様の照会枠で、それぞれ入力を持つ
export default function Identity({ onClose, onMultitask }) {
  const [slots, setSlots] = useState([emptySlot(), emptySlot(), emptySlot(), emptySlot(), emptySlot()]);
  const [cur, setCur] = useState(0);
  const [auth, setAuth] = useState(null); // { id, pw }
  const [notice, setNotice] = useState(false);
  const toast = useToast();
  const slot = slots[cur];
  const patch = (p) => setSlots((ss) => ss.map((s, i) => (i === cur ? { ...s, ...p } : s)));

  const form = useForm({
    values: slot.f,
    setValue: (name, v) => setSlots((ss) => ss.map((s, i) => (i === cur ? { ...s, f: { ...s.f, [name]: v } } : s))),
    maxLen: { tel: 11, pin: 4, birth: 4 },
    fmt: { tel: 'tel', birth: 'md' },
    labels: { tel: '電話番号', pin: '暗証番号', birth: '誕生日（月日）' },
  });

  const birthOk = () => {
    const v = form.get('birth');
    if (v.length !== 4) return false;
    const m = Number(v.slice(0, 2)), d = Number(v.slice(2));
    return m >= 1 && m <= 12 && d >= 1 && d <= 31;
  };
  const miss = { tel: form.get('tel').length < 10, birth: !birthOk(), doc: !form.get('docType') };
  const anyMiss = miss.tel || miss.birth || miss.doc;
  const red = (k) => (slot.tried && miss[k] ? '#fde2e2' : 'transparent');

  const search = () => {
    if (anyMiss) return patch({ tried: true });
    patch({ tried: false });
    setAuth({ id: '', pw: '' });
  };
  const noop = () => toast.say('練習用では操作できません');
  const L = { width: 150, flexShrink: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 };

  return (
    <div className="ot-screen">
      <TopBar right={['multi', 'manual', 'eye', 'rw', 'sync', 'q']} onMultitask={onMultitask} noop={noop} />
      <div className="ot-steps">
        {slots.map((s, i) => {
          const on = i === cur;
          const label = on ? '選択中' : s.done ? '照会済み' : s.f.tel ? formatValue('tel', s.f.tel) : '';
          return (
            <button key={i} className={`ot-step ${on ? 'on' : ''}`} onClick={() => { setCur(i); form.closeKp(); setNotice(false); }} aria-label={`${i + 1}番目のお客様照会`}>
              <span className="ot-step-no">{i + 1}</span><span className="ot-ellipsis">{label}</span>
            </button>
          );
        })}
        <div className="ot-steps-end"><button className="ot-pill-blue" onClick={onClose}>× 一括終了</button></div>
      </div>

      <main className="ot-main" style={{ padding: '14px 24px' }}>
        <h1 className="ot-h1" style={{ marginBottom: 10 }}>本人確認</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map((t, i) => (
            <button key={t} className={`ot-tab ${slot.tab === i ? 'on' : ''}`} onClick={() => patch({ tab: i })}>{t}</button>
          ))}
        </div>
        <div className="ot-card" style={{ borderTop: '3px solid #e8590c' }}>
          <div className="ot-row">
            <div className="ot-half"><div style={L}>個人/法人区分 <span className="ot-req">必須</span></div>
              <label className="ot-radio"><input type="radio" name={`kojin${cur}`} defaultChecked />個人</label>
              <label className="ot-radio"><input type="radio" name={`kojin${cur}`} />法人</label></div>
            <div className="ot-half"><div style={L}>来店者区分 <span className="ot-req">必須</span></div>
              <OtSelect style={{ flex: 1 }}><option>契約者本人</option><option>代理人</option></OtSelect></div>
          </div>
          <div className="ot-row"><div style={L}><span className="ot-link">照会区分</span></div>
            <label className="ot-radio"><input type="radio" name={`shokai${cur}`} defaultChecked />サービス中</label>
            <label className="ot-radio"><input type="radio" name={`shokai${cur}`} />一時休止／解約</label></div>
          <div className="ot-row" style={{ alignItems: 'flex-start' }}>
            <div className="ot-half ot-hl" style={{ background: red('tel') }}><div style={L}>電話番号 <span className="ot-req">必須</span></div>
              <KpField form={form} name="tel" label="電話番号" style={{ flex: 1 }} /></div>
            <div className="ot-half" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={L}>製造番号/ICCID</div>
                <input className="ot-inp" style={{ flex: 1 }} aria-label="製造番号/ICCID" value={form.get('iccid')} onChange={form.onChange('iccid')} /></div>
              <div style={{ paddingLeft: 162 }}><button className="ot-btn" onClick={noop}>読取</button></div>
            </div>
          </div>
          <div className="ot-row">
            <div className="ot-half"><div style={L}>暗証番号</div><KpField form={form} name="pin" label="暗証番号" style={{ width: 200 }} /></div>
            <div className="ot-half ot-hl" style={{ background: red('birth') }}><div style={L}>誕生日（月日） <span className="ot-req">必須</span></div>
              <KpField form={form} name="birth" label="誕生日（月日）" placeholder="MM/DD" style={{ width: 200 }} /></div>
          </div>
          <div className="ot-row" style={{ background: '#faf6f2' }}><span className="ot-link" style={{ fontSize: 14, fontWeight: 700 }}>本人確認</span></div>
          <div className="ot-row" style={{ borderBottom: 'none', background: red('doc') }}>
            <div style={L}>来店者証明書類 <span className="ot-req">必須</span></div>
            <OtSelect style={{ width: 230 }} aria-label="来店者証明書類" value={form.get('docType')} onChange={form.onChange('docType')}>
              <option value="">選択してください</option>
              {DOCS.map((d) => <option key={d} value={d}>{d}</option>)}
            </OtSelect>
            <input className="ot-inp" style={{ width: 230 }} aria-label="証明書類の詳細" value={form.get('doc')} onChange={form.onChange('doc')} />
            <label className="ot-chk"><input type="checkbox" />親権者同伴</label>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
          <button className="ot-btn" onClick={() => patch({ f: {}, tried: false, done: false })} style={{ background: '#2f5f9e', color: '#fff', border: 'none' }}>× 全てクリア</button>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
            {slot.tried && anyMiss && <div role="alert" className="ot-alert">必須項目です</div>}
            <button className="ot-primary" onClick={search}>{Icons.search}照会</button>
          </div>
          <div style={{ width: 110 }} />
        </div>
      </main>

      {auth && (
        <div className="ot-ov center">
          <div className="ot-dialog" role="dialog" aria-label="担当者認証">
            <div className="ot-dialog-title">担当者認証</div>
            <div className="ot-dialog-note">お客様照会を行う担当者のIDとパスワードを入力してください（練習用：何を入れてもOK）</div>
            <label className="ot-field">担当者ID<input className="ot-inp" autoComplete="off" value={auth.id} onChange={(e) => setAuth({ ...auth, id: e.target.value })} /></label>
            <label className="ot-field">パスワード<input className="ot-inp" type="password" autoComplete="off" value={auth.pw} onChange={(e) => setAuth({ ...auth, pw: e.target.value })} /></label>
            <div className="ot-dialog-foot">
              <button className="ot-btn" onClick={() => setAuth(null)}>キャンセル</button>
              <button className="ot-ok" disabled={!auth.id || !auth.pw} onClick={() => { setAuth(null); patch({ done: true }); setNotice(true); }}>照会</button>
            </div>
          </div>
        </div>
      )}
      {notice && <SuccessNotice title="お客様照会の手順は完璧です！" sub="本番ではここでお客様情報の画面に進みます" onClose={() => setNotice(false)} />}
      <Keypad form={form} />
      <Toast msg={toast.msg} />
    </div>
  );
}
