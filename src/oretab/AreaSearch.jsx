import React, { useState } from 'react';
import { TopBar, KpField, Keypad, Toast, SuccessNotice, useForm, useToast, formatValue, Icons } from './common.jsx';

// 郵便番号データ：public/zip/上3桁.json（全国・約14万件を上3桁ごとに分割）。読んだ分は覚えておく
const zipCache = {};
async function lookupZip(zip7) {
  const key = zip7.slice(0, 3);
  if (!zipCache[key]) {
    const res = await fetch(`/zip/${key}.json`);
    zipCache[key] = res.ok ? await res.json() : {};
  }
  return zipCache[key][zip7] || null; // [都道府県, 市区町村, 町域]
}

// エリア検索：住居種別 → 郵便番号 → 住所取得（丁目の手前まで）→ 検索
export default function AreaSearch({ onClose, onMultitask }) {
  const form = useForm({ maxLen: { zip: 7, tel: 11 }, fmt: { zip: 'zip', tel: 'tel' }, labels: { zip: '郵便番号', tel: '電話番号' } });
  const [jk, setJk] = useState('');
  const [addr, setAddr] = useState('');
  const [addrMsg, setAddrMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();
  const noop = () => toast.say('練習用では操作できません');
  const hasTel = form.get('tel').length > 0;

  const getAddr = async () => {
    const z = form.get('zip');
    setAddr('');
    if (z.length !== 7) return setAddrMsg('郵便番号を7桁で入力してください');
    setLoading(true);
    try {
      const hit = await lookupZip(z);
      if (!hit) setAddrMsg('該当する住所が見つかりません');
      else { setAddr(hit[0] + hit[1] + (hit[2] || '')); setAddrMsg(''); }
    } catch { setAddrMsg('住所データを読み込めませんでした。通信状況を確認してください'); }
    setLoading(false);
  };
  const search = () => {
    if (!jk) return toast.say('住居種別を選んでください');
    if (!addr) return toast.say('郵便番号を入れて「住所取得」を押してください');
    setDone(true);
  };
  const clearAll = () => { form.reset(); setJk(''); setAddr(''); setAddrMsg(''); setDone(false); };

  return (
    <div className="ot-screen">
      <TopBar right={['multi', 'manual', 'eye', 'x']} onMultitask={onMultitask} onClose={onClose} noop={noop} />
      <main className="ot-main" style={{ padding: '14px 24px', gap: 12 }}>
        <div className="ot-crumb">エリア検索 <span>｜</span> 検索条件入力</div>
        <div className="ot-tbl">
          <div className="ot-tr"><div className="ot-th" style={{ width: 200 }}>住所欄</div><div className="ot-td" /></div>
          <div className="ot-tr" style={{ borderBottom: 'none' }}><div className="ot-th" style={{ width: 200 }}>連絡先電話番号1</div><div className="ot-td" /><div className="ot-th" style={{ width: 200, borderLeft: '1px solid #e0d6cc' }}>連絡先電話番号2</div><div className="ot-td" /></div>
        </div>
        <div className="ot-tbl" style={{ borderColor: '#ead3c4' }}>
          <div className="ot-band">検索条件 <span className="ot-q">?</span></div>
          <div className="ot-tr"><div className="ot-th">住居種別</div><div className="ot-td row">
            <label className="ot-radio"><input type="radio" name="jk" checked={jk === 'house'} onChange={() => setJk('house')} />一戸建て</label>
            <label className="ot-radio"><input type="radio" name="jk" checked={jk === 'mansion'} onChange={() => setJk('mansion')} />マンション・アパートなど</label>
          </div></div>
          <div className="ot-tr"><div className="ot-th">郵便番号 <span className="ot-req">必須</span></div><div className="ot-td row" style={{ gap: 10 }}>
            <KpField form={form} name="zip" label="郵便番号" placeholder="000-0000" style={{ width: 160 }} />
            <span style={{ fontSize: 12 }}>※郵便番号がわからない方は、入力せず以下の住所取得ボタンを押してください。</span>
          </div></div>
          <div className="ot-tr"><div className="ot-th">住所 <span className="ot-req">必須</span></div><div className="ot-td">
            <button className="ot-btn" style={{ alignSelf: 'flex-start' }} onClick={getAddr} disabled={loading}>{loading ? '取得中…' : '住所取得'}</button>
            <span style={{ fontSize: 13 }}>住所: {addr || addrMsg}</span>
          </div></div>
          <div className="ot-tr"><div className="ot-th">電話番号(番号ポータ判定用)</div><div className="ot-td">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <KpField form={form} name="tel" label="電話番号" style={{ width: 200 }} />
              <span style={{ fontSize: 12 }}>※現在、ご利用の電話番号がある場合、こちらに入力して下さい。</span>
            </div>
            <span style={{ fontSize: 12 }}>現在ご利用の電話番号を引継ぐ(番号ポータビリティ)にあたり、入力された住所の詳細を選択してください。</span>
            <label className="ot-radio" style={{ fontSize: 13, color: hasTel ? '#1a0f08' : '#b8aca2' }}><input type="radio" name="np" disabled={!hasTel} />入力した住所は現在お住まいの住所である</label>
            <label className="ot-radio" style={{ fontSize: 13, color: hasTel ? '#1a0f08' : '#b8aca2' }}><input type="radio" name="np" disabled={!hasTel} />入力した住所はこれから引っ越し先予定の住所である</label>
            <label className="ot-chk" style={{ paddingLeft: 22, color: hasTel ? '#1a0f08' : '#b8aca2' }}><input type="checkbox" disabled={!hasTel} />同じ敷地内やマンション・アパートの中で引っ越しをする</label>
          </div></div>
          <div className="ot-tr"><div className="ot-th">検索用マンション名</div><div className="ot-td"><input className="ot-inp" aria-label="検索用マンション名" value={form.get('mansion')} onChange={form.onChange('mansion')} /></div></div>
          <div style={{ display: 'flex', alignItems: 'center', padding: 12 }}>
            <button className="ot-btn" style={{ width: 120 }} onClick={clearAll}>クリア</button>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}><button className="ot-primary" onClick={search}>{Icons.search}検索</button></div>
            <div style={{ width: 120 }} />
          </div>
        </div>
      </main>
      {done && (
        <SuccessNotice
          title="エリア検索の手順は完璧です！"
          sub={`〒${formatValue('zip', form.get('zip'))}　${addr}（${jk === 'mansion' ? 'マンション・アパートなど' : '一戸建て'}）`}
          sub2="本番ではこのあと画面が変わり、丁目以降の住所を選びます"
          onClose={() => setDone(false)}
        />
      )}
      <Keypad form={form} />
      <Toast msg={toast.msg} />
    </div>
  );
}
