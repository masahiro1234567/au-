import React, { useState } from 'react';
import { TopBar, KpField, Keypad, Toast, useForm, useToast, Icons, InfoDialog } from './common.jsx';

// ===== 照会条件を入れて「検索」する画面（固定通信サービス契約照会・auでんき契約照会） =====
// rows：照会条件の並び。[[左の項目], [右の項目]] または [[横いっぱいの項目]]。項目 = { name, label, tel?, wide? }
// canSearch(get)：照会できる条件か。だめなら needText を出す
// result：照会できたときに出す結果の項目名（中身は空欄）
function CondInquiry({ title, rows, canSearch, needText, result, onClose, onMultitask }) {
  const tels = rows.flat().filter((f) => f.tel);
  const form = useForm({
    maxLen: Object.fromEntries(tels.map((f) => [f.name, 11])),
    fmt: Object.fromEntries(tels.map((f) => [f.name, 'tel'])),
    labels: Object.fromEntries(rows.flat().map((f) => [f.name, f.label])),
  });
  const toast = useToast();
  const [found, setFound] = useState(false);
  const [err, setErr] = useState('');
  const noop = () => toast.say('練習用では操作できません');
  const field = (f) => (f.tel
    ? <KpField form={form} name={f.name} label={f.label} style={{ width: 230 }} />
    : <input className="ot-inp" style={{ width: f.wide ? 520 : 230 }} aria-label={f.label} value={form.get(f.name)} onChange={form.onChange(f.name)} />);
  const search = () => {
    if (!canSearch(form.get)) { setFound(false); return setErr(needText); }
    setFound(true);
  };
  return (
    <div className="ot-screen">
      <TopBar right={['multi', 'manual', 'eye', 'rw', 'q', 'x']} onMultitask={onMultitask} onClose={onClose} noop={noop} />
      <main className="ot-main" style={{ padding: '14px 24px', gap: 12, overflowY: 'auto' }}>
        <div style={{ fontSize: 16, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{title} <span className="ot-q blue">?</span></div>
        <div className="ot-tbl" style={{ borderColor: '#ead3c4', flexShrink: 0 }}>
          <div className="ot-band">照会条件</div>
          {rows.map((r, i) => (
            <div className="ot-tr" key={i}>
              {r.map((f, j) => (
                <React.Fragment key={f.name}>
                  <div className="ot-th" style={{ width: 170, borderLeft: j ? '1px solid #e0d6cc' : undefined }}>{f.label}</div>
                  <div className="ot-td row">{field(f)}</div>
                </React.Fragment>
              ))}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', padding: 12 }}>
            <button className="ot-btn" style={{ width: 120 }} onClick={() => { form.reset(); setFound(false); }}>クリア</button>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}><button className="ot-gray" onClick={search}>{Icons.search}検索</button></div>
            <div style={{ width: 120 }} />
          </div>
        </div>
        {found && (
          <div className="ot-tbl" style={{ borderColor: '#ead3c4', flexShrink: 0 }}>
            <div className="ot-band">照会結果</div>
            {result.map((l) => (
              <div className="ot-tr" key={l}><div className="ot-th" style={{ width: 220 }}>{l}</div><div className="ot-td" style={{ minHeight: 38 }} /></div>
            ))}
          </div>
        )}
      </main>
      <Keypad form={form} />
      <Toast msg={toast.msg} />
      {err && <InfoDialog text={err} onOk={() => setErr('')} />}
    </div>
  );
}

const has = (get, ...names) => names.some((n) => get(n).trim());

// 固定通信サービス契約照会：氏名（漢字・カナのどちらか）＋電話番号（固定・連絡先のどちらか）で照会
export function KoteiInquiry(props) {
  return (
    <CondInquiry {...props} title="固定通信サービス契約照会"
      rows={[
        [{ name: 'kotei', label: '固定電話番号', tel: true }, { name: 'tel', label: '連絡先電話番号', tel: true }],
        [{ name: 'mail', label: 'Eメールアドレス', wide: true }],
        [{ name: 'code', label: '契約コード', wide: true }],
        [{ name: 'kanji', label: '契約者氏名漢字' }, { name: 'kana', label: '契約者氏名カナ' }],
      ]}
      canSearch={(get) => has(get, 'kanji', 'kana') && has(get, 'kotei', 'tel')}
      needText={'契約者氏名（漢字・カナのどちらか）と、電話番号（固定電話番号・連絡先電話番号のどちらか）を入力して下さい。'}
      result={['契約コード', '契約者氏名漢字', '契約者氏名カナ', '固定電話番号', '連絡先電話番号', '契約状態']}
    />
  );
}

// auでんき契約照会：連絡先電話番号＋氏名（カナ・漢字のどちらか）で照会
export function DenkiInquiry(props) {
  return (
    <CondInquiry {...props} title="auでんき契約照会"
      rows={[
        [{ name: 'tel', label: '連絡先電話番号', tel: true }, { name: 'kyokyu', label: '供給地点特定番号' }],
        [{ name: 'riyou', label: 'でんきご利用番号' }, { name: 'okyaku', label: 'でんきお客さま番号' }],
        [{ name: 'kana', label: '契約者カナ氏名' }, { name: 'kanji', label: '契約者漢字氏名' }],
      ]}
      canSearch={(get) => has(get, 'tel') && has(get, 'kana', 'kanji')}
      needText={'連絡先電話番号と、契約者氏名（カナ・漢字のどちらか）を入力して下さい。'}
      result={['でんきご利用番号', 'でんきお客さま番号', '供給地点特定番号', '契約者カナ氏名', '契約者漢字氏名', '契約状態']}
    />
  );
}
