import React from 'react';
import { TopBar, KpField, Keypad, Toast, useForm, useToast, Icons } from './common.jsx';

// auでんき契約照会：入力の練習のみ（照会は実行しない）
export default function DenkiInquiry({ onClose, onMultitask }) {
  const form = useForm({ maxLen: { tel: 11 }, fmt: { tel: 'tel' }, labels: { tel: '連絡先電話番号' } });
  const toast = useToast();
  const noop = () => toast.say('練習用では操作できません');
  const input = (name, label, placeholder) => (
    <input className="ot-inp" style={{ width: 260 }} aria-label={label} placeholder={placeholder} value={form.get(name)} onChange={form.onChange(name)} />
  );
  const pair = (l1, f1, l2, f2) => (
    <div className="ot-tr">
      <div className="ot-th" style={{ width: 170 }}>{l1}</div><div className="ot-td row">{f1}</div>
      <div className="ot-th" style={{ width: 170, borderLeft: '1px solid #e0d6cc' }}>{l2}</div><div className="ot-td row">{f2}</div>
    </div>
  );
  return (
    <div className="ot-screen">
      <TopBar right={['multi', 'manual', 'eye', 'rw', 'q', 'x']} onMultitask={onMultitask} onClose={onClose} noop={noop} />
      <main className="ot-main" style={{ padding: '14px 24px', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>auでんき契約照会 <span className="ot-q blue">?</span></div>
        <div className="ot-tbl" style={{ borderColor: '#ead3c4' }}>
          <div className="ot-band">照会条件</div>
          {pair('連絡先電話番号', <KpField form={form} name="tel" label="連絡先電話番号" placeholder="090-0000-0000" style={{ width: 220 }} />, '供給地点特定番号', input('kyokyu', '供給地点特定番号'))}
          {pair('でんきご利用番号', input('riyou', 'でんきご利用番号'), 'でんきお客さま番号', input('okyaku', 'でんきお客さま番号'))}
          {pair('契約者カナ氏名', input('kana', '契約者カナ氏名', 'ヤマダ タロウ'), '契約者漢字氏名', input('kanji', '契約者漢字氏名', '山田 太郎'))}
          <div style={{ display: 'flex', alignItems: 'center', padding: 12 }}>
            <button className="ot-btn" style={{ width: 120 }} onClick={form.reset}>クリア</button>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}><button className="ot-gray" onClick={() => toast.say('練習用：照会は実行されません')}>{Icons.search}検索</button></div>
            <div style={{ width: 120 }} />
          </div>
        </div>
      </main>
      <Keypad form={form} />
      <Toast msg={toast.msg} />
    </div>
  );
}
