import React, { useState } from 'react';
import { Toast, useToast, InfoDialog, OtSelect } from './common.jsx';

// ===== eo光契約照会（Orange業務メニューから、ブラウザで開く） =====
// 検索キー1の「ｅｏ光電話番号」と、検索キー2の「契約者氏名（カナ・漢字のどちらか）」の両方で照会できる
// 照会できたら、スマバリ申込可否の欄に〇。ほかの結果は空欄
const nowText = () => {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const Maru = () => <svg width="22" height="22" viewBox="0 0 24 24" aria-label="〇"><circle cx="12" cy="12" r="8" fill="none" stroke="#1a0f08" strokeWidth="2" /></svg>;

export default function EoInquiry({ staff, onClose }) {
  const toast = useToast();
  const [v, setV] = useState({});
  const [found, setFound] = useState(false);
  const [err, setErr] = useState('');
  const [loginAt] = useState(nowText);
  const get = (k) => v[k] || '';
  const set = (k, num) => (e) => setV((s) => ({ ...s, [k]: num ? e.target.value.replace(/[^0-9]/g, '') : e.target.value }));
  const inp = (k, label, w, num) => <input className="eo-inp" style={{ width: w }} aria-label={label} inputMode={num ? 'numeric' : undefined} value={get(k)} onChange={set(k, num)} />;
  const run = () => {
    if (!get('tel').trim() || !(get('kana').trim() || get('kanji').trim())) {
      setFound(false);
      return setErr('検索キー1の「ｅｏ光電話番号」と、検索キー2の「契約者氏名（カナ・漢字のどちらか）」を入力して下さい。');
    }
    setFound(true);
  };
  const copy = () => toast.say('練習用ではコピーできません');
  const Copy = () => <button className="eo-pill" onClick={copy}>コピー</button>;
  const Reason = () => (
    <table className="eo-reason"><tbody><tr><td>申込不可理由</td></tr><tr><td>お客様の案内</td></tr></tbody></table>
  );
  const ok = found ? <Maru /> : null;
  return (
    <div className="ot-screen eo">
      <div className="eo-chrome">
        <button aria-label="タブ一覧" onClick={() => toast.say('練習用では使えません')}><svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="5" width="22" height="22" rx="6" fill="none" stroke="#6aa2e8" strokeWidth="2" /><text x="16" y="20.5" fontSize="10" textAnchor="middle" fill="#6aa2e8">1</text></svg></button>
        <button aria-label="共有" onClick={() => toast.say('練習用では使えません')}><svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="5" width="22" height="22" rx="6" fill="none" stroke="#6aa2e8" strokeWidth="2" /><path d="M11 21c0-5 3-8 8-8v-3l4 4-4 4v-3c-3 0-6 1-8 6z" fill="#6aa2e8" /></svg></button>
      </div>
      <div className="eo-body">
        <div className="eo-top">担当者：{staff ? staff.id : ''}<span>ログイン日時：{loginAt}</span><button className="eo-pill" onClick={onClose}>×閉じる</button></div>
        <div className="eo-band">ｅｏ光契約照会</div>
        <div className="eo-band" style={{ marginTop: 2 }}>ｅｏ光契約照会条件</div>
        <div style={{ display: 'flex', gap: 28, marginTop: 8, alignItems: 'flex-start' }}>
          <div className="eo-key" style={{ flex: 1.1 }}>
            <div className="eo-key-h">検索キー１</div>
            <table className="eo-t"><tbody>
              <tr><th>ｅｏ光電話番号</th><td>{inp('tel', 'ｅｏ光電話番号', 220, true)}</td></tr>
              <tr><th>ｅｏ申込番号／受付番号</th><td>{inp('no', 'ｅｏ申込番号／受付番号', 220)}</td></tr>
              <tr><th>連絡先電話番号</th><td>{inp('renraku', '連絡先電話番号', 220, true)}</td></tr>
              <tr><th>生年月日</th><td><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <OtSelect className="ot-sel" aria-label="元号" value={get('era')} onChange={set('era')} style={{ width: 70, height: 26, fontSize: 12 }}>
                  <option value="">　</option><option>西暦</option><option>昭和</option><option>平成</option><option>令和</option>
                </OtSelect>
                {inp('y', '年', 50, true)}年{inp('m', '月', 38, true)}月{inp('d', '日', 38, true)}日</div></td></tr>
            </tbody></table>
          </div>
          <div className="eo-key" style={{ flex: 1 }}>
            <div className="eo-key-h">検索キー２</div>
            <table className="eo-t"><tbody>
              <tr><th>契約者氏名（カナ）<i>(全一致)</i></th><td>{inp('kana', '契約者氏名（カナ）', '100%')}</td></tr>
              <tr><th>契約者氏名（漢字）<i>(全一致)</i></th><td>{inp('kanji', '契約者氏名（漢字）', '100%')}</td></tr>
              <tr><th>法人契約<i>(前方一致)</i></th><td><input type="checkbox" aria-label="法人契約" checked={!!v.houjin} onChange={() => setV((s) => ({ ...s, houjin: !s.houjin }))} style={{ width: 18, height: 18 }} /></td></tr>
            </tbody></table>
          </div>
        </div>
        <table className="eo-t" style={{ marginTop: 8 }}><tbody>
          <tr><th style={{ width: 170 }}>ｅｏ光利用場所住所<i className="b">(前方一致)</i></th><td>{inp('addr', 'ｅｏ光利用場所住所', '100%')}</td></tr>
        </tbody></table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <button className="eo-pill lg" onClick={() => { setV({}); setFound(false); }}>クリア</button>
          <button className="eo-pill lg" onClick={run}>照会</button>
        </div>
        <div className="eo-band" style={{ marginTop: 6 }}>ｅｏ光契約照会実行結果</div>
        <table className="eo-r"><tbody>
          <tr><th colSpan={2}>ｅｏ申込番号／受付番号</th><td colSpan={2}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>ｅｏ申込番号：<Copy /><span style={{ marginLeft: 18 }}>受付番号：</span><Copy /></div></td></tr>
          <tr><th colSpan={2}>契約者氏名（漢字）</th><td colSpan={2} /></tr>
          <tr><th colSpan={2}>契約者氏名（カナ）</th><td colSpan={2} /></tr>
          <tr><th colSpan={2}>生年月日</th><td colSpan={2} /></tr>
          <tr><th rowSpan={2}>利用場所</th><th>郵便番号</th><td colSpan={2} /></tr>
          <tr><th>ｅｏ光利用場所住所</th><td colSpan={2} /></tr>
          <tr><th colSpan={2}>連絡先電話番号</th><td colSpan={2} /></tr>
          <tr><th colSpan={2}><span style={{ color: '#d0261a' }}>ａｕスマートバリューコード</span></th><td colSpan={2}><Copy /></td></tr>
          <tr><th rowSpan={2}>ｅｏネット</th><th>スマバリ申込可否</th><td className="eo-ok">{ok}</td><td><Reason /></td></tr>
          <tr><th>契約状態</th><td colSpan={2} /></tr>
          <tr><th rowSpan={3}>ｅｏ光電話</th><th>スマバリ申込可否</th><td className="eo-ok">{ok}</td><td><Reason /></td></tr>
          <tr><th>契約状態</th><td colSpan={2} /></tr>
          <tr><th>電話番号</th><td colSpan={2} /></tr>
          <tr><th>ｅｏ光テレビ</th><th>契約状態</th><td colSpan={2} /></tr>
          <tr><th colSpan={2}>卸先事業社名</th><td colSpan={2} /></tr>
        </tbody></table>
      </div>
      <Toast msg={toast.msg} />
      {err && <InfoDialog text={err} onOk={() => setErr('')} />}
    </div>
  );
}
