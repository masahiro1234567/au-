import React, { useMemo, useState } from 'react';
import { dbSet } from '../useFirebase.js';
import { ConfirmButton } from './ConfirmButton.jsx';
import { buildConfig, DEFAULTS } from '../oretab/payConfig.js';

// ===== 管理画面「オレタブ設定」=====
// 左：お支払い目安額の画面（縮小）。枠を押すと、右側でその部分の設定を編集できる
// 保存先：Firebase「oretab_pay/◯◯」。まだ保存していない項目は初期データ（payData.js）が使われる

const BRAND = [['au', 'au'], ['uq', 'UQ']];
const BRAND3 = [['both', 'au・UQ両方'], ['au', 'auのみ'], ['uq', 'UQのみ']];
const KIND_TYPES = ['新規', 'MNP', '番号移行', '機変'].map((v) => [v, v]);
const CAMP_TYPES = ['表示のみ', '端末値引き', '月額割引', 'ポイント還元'].map((v) => [v, v]);
const OPT_DEVICE = ['すべて', 'iPhone', 'Android'].map((v) => [v, v]);
const AUTO_WHEN = [['', '自動では出さない（追加/変更で選ぶ）'], ['zouryou', '増量オプション付きプランのとき'], ['ponta', 'Pontaパス込み・追加のとき']];

// 各部分の設定項目。type：text / yen / select / check / date / list（段階・通話オプションの一覧）
const SECTIONS = {
  kinds: {
    label: '契約種別', desc: '端末料金の横のプルダウン。表示名と、残価の区分（機変かそれ以外か）を決めます',
    fields: [['label', '表示名', 'text'], ['brand', 'ブランド', 'select', BRAND], ['type', '契約の種類', 'select', KIND_TYPES]],
    cols: ['label', 'brand', 'type'],
  },
  devices: {
    label: '端末・価格・残価', desc: '端末のプルダウン。新機種の追加、価格改定、残価の変更はここで。残価が空欄だと、auは手入力・UQはスマトク不可になります',
    fields: [['name', '機種名', 'text'], ['maker', 'メーカー見出し（【】の中）', 'text'], ['brand', '販売ブランド', 'select', BRAND],
      ['price', '販売価格', 'yen'], ['rNew', '残価（新規・MNP・番号移行）', 'yen'], ['rKihen', '残価（機変）', 'yen'], ['fee', '特典利用料（返却時）', 'yen']],
    cols: ['name', 'brand', 'price', 'rNew', 'rKihen'], filter: true,
  },
  plans: {
    label: '料金プラン', desc: '基本パックのプルダウンと、料金プランの枠を押すと出るデータ量・通話オプション',
    fields: [['name', 'プラン名', 'text'], ['brand', 'ブランド', 'select', BRAND],
      ['fam', '家族割の対象', 'check'], ['sv', 'スマートバリュー／自宅セット割の対象', 'check'], ['card', 'au PAYカード割の対象', 'check'],
      ['u18', 'U18の割引額を使う', 'check'], ['noDiscount', '割引をすべて空白にする（コミコミなど）', 'check'], ['ponta', 'Pontaパスがプランに含まれる', 'check'], ['zouryou', '増量オプション付き', 'check'], ['note', '注意書き（空欄なら表示なし）', 'text'],
      ['tiers', 'データ量の段階（上から順に選択肢）', 'list'], ['calls', '通話オプション（1つ目が「なし」）', 'list']],
    cols: ['name', 'brand', 'tiers'], filter: true,
  },
  discounts: {
    label: '割引サービス', desc: '割引サービスのプルダウン。セット割と家族割の額を分けて入れると、プランの対象外の分だけ自動で引かれなくなります',
    fields: [['label', '表示名', 'text'], ['brand', 'ブランド', 'select', BRAND], ['sv', 'セット割の額（スマートバリュー／自宅セット割）', 'yen'],
      ['fam', '家族割の額', 'yen'], ['u18sv', 'U18のときのセット割の額', 'yen'], ['u18fam', 'U18のときの家族割の額', 'yen']],
    cols: ['label', 'brand', 'sv', 'fam'], filter: true,
  },
  campaigns: {
    label: 'キャンペーン・期間限定割引', desc: '「表示のみ」は、オレタブの「追加/変更」で選ぶと案内が出ます（計算には入りません）。自動で表示する条件も設定できます。契約種別に「番号移行」と入れると、番号移行のときだけ選択肢に出ます。値引き・割引は期間中だけ自動で計算されます。対象は機種名（月額割引はプラン名）に含まれる言葉を「、」区切りで。空欄ならすべて対象',
    fields: [['name', 'キャンペーン名（1行目）', 'text'], ['detail', '内容（2行目）', 'text'], ['type', '種類', 'select', CAMP_TYPES], ['amount', '金額（ポイント還元はpt／表示のみは空欄）', 'yen'],
      ['target', '対象（例：iPhone 17、Galaxy Z）', 'text'], ['brand', 'ブランド', 'select', BRAND3], ['kinds', '契約種別（例：MNP、新規　空欄はすべて）', 'text'],
      ['start', '開始日', 'date'], ['end', '終了日（空欄は終了日未定）', 'date'], ['autoWhen', '自動で表示する条件（表示のみ）', 'select', AUTO_WHEN]],
    cols: ['name', 'detail', 'type', 'brand', 'end'],
  },
  options: {
    label: 'オプションサービス', desc: '「追加」ボタンで選べるオプション。機種で金額が変わるものは「機種別の金額」に、機種名に含まれる言葉と金額を入れます（上から順に最初に当てはまったもの）',
    fields: [['name', 'オプション名', 'text'], ['price', '月額（機種別に当てはまらないとき）', 'yen'], ['brand', 'ブランド', 'select', BRAND3],
      ['device', '対象の端末（参考）', 'select', OPT_DEVICE], ['note', '適用条件など（選択画面に小さく表示）', 'text'], ['byDevice', '機種別の金額（例：「18 Pro」→ 2,450円）', 'list']],
    cols: ['name', 'price', 'device', 'brand'],
  },
  card: { label: 'au PAYカード割', single: true, desc: 'インターネット接続サービスの下のプルダウン', fields: [['label', '表示名', 'text'], ['amount', '割引額', 'yen']] },
  pay: { label: '支払方法', single: true, desc: '分割支払金のプルダウンに出す支払方法と、通常割賦の回数',
    fields: [['smatoku', 'スマトクを表示', 'check'], ['kappu', '通常割賦を表示', 'check'], ['ikkatsu', '一括を表示', 'check'], ['kappuTimes', '通常割賦の回数（「,」区切り）', 'text']] },
};

// 画面上の枠（1024×768の座標）
const HOTS = [
  ['kinds', 34, 150, 344, 40], ['devices', 34, 190, 344, 78], ['pay', 34, 326, 344, 128],
  ['plans', 394, 186, 312, 78], ['card', 394, 300, 312, 38], ['options', 394, 340, 312, 168], ['discounts', 394, 516, 312, 70], ['campaigns', 714, 142, 300, 184],
];

const yenStr = (v) => (v === '' || v == null ? '－' : Number(v).toLocaleString('ja-JP') + '円');
const brandStr = (v) => ({ au: 'au', uq: 'UQ', both: 'au・UQ' }[v] || v || '－');

function cellText(sec, key, row) {
  const f = sec.fields.find((x) => x[0] === key);
  const v = row[key];
  if (!f) return String(v ?? '');
  if (f[2] === 'yen') return yenStr(v);
  if (f[2] === 'list') return (v || []).map((t) => `${t.label} ${yenStr(t.price)}`).join(' / ') || '－';
  if (key === 'brand') return brandStr(v);
  if (f[2] === 'check') return v ? '○' : '－';
  return v === '' || v == null ? '－' : String(v);
}

// 画面の縮小図（編集できる部分を枠で囲む）
function ScreenMap({ sel, onPick }) {
  const B = (x, y, w, h, bg, bd, children, extra = {}) => (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: bg, border: `1.5px solid ${bd}`, borderRadius: 6, boxSizing: 'border-box', fontSize: 12, color: '#6b5a4e', padding: '4px 8px', overflow: 'hidden', ...extra }}>{children}</div>
  );
  return (
    <div className="ota-map">
      <div className="ota-map-inner">
        {B(0, 0, 1024, 52, '#fff', '#fff', <b style={{ color: '#1a0f08' }}>緊急0　未読0　応対要請</b>, { borderBottom: '2px solid #ff6600', borderRadius: 0 })}
        {B(30, 60, 300, 30, 'transparent', 'transparent', <b style={{ fontSize: 18, color: '#1a0f08' }}>お支払い目安額</b>)}
        {B(30, 98, 660, 36, '#ece6e0', '#e0d6cc', '見積もりタブ 1〜5　／　コピー・保存・鉛筆・削除')}
        {B(30, 146, 352, 554, '#eef4f8', '#c9dbe7')}
        {B(38, 154, 336, 32, '#fff', '#c9dbe7', <><b style={{ color: '#2f5f7e' }}>端末料金</b>　契約種別 ▾</>)}
        {B(38, 194, 336, 32, '#fff', '#c9dbe7', '－選択してください－ ▾')}
        {B(38, 232, 336, 32, '#fff', '#c9dbe7', '販売価格')}
        {B(38, 276, 336, 44, '#fff', '#c9dbe7', '割引内訳')}
        {B(38, 330, 336, 120, '#fff', '#c9dbe7', <>分割支払金　[スマトク ▾] 24回<br />初回・月々・最終回・延長後</>)}
        {B(38, 460, 336, 60, '#fff', '#c9dbe7', '実質負担金')}
        {B(38, 628, 336, 64, '#dce9f1', '#c9dbe7', '店頭お支払い額／月々のお支払い額')}
        {B(390, 146, 320, 554, '#fbf1f1', '#ecd2d2')}
        {B(398, 154, 304, 28, 'transparent', 'transparent', <b style={{ color: '#9c3d3d' }}>月々のご利用料金</b>)}
        {B(398, 190, 304, 32, '#fff', '#ecd2d2', '基本パック ▾')}
        {B(398, 228, 304, 32, '#f6ecec', '#ecd2d2', '料金プラン（データ量・通話）')}
        {B(398, 266, 304, 32, '#f6ecec', '#ecd2d2', 'インターネット接続サービス')}
        {B(398, 304, 304, 30, '#fff', '#ecd2d2', 'au PAYカードお支払い割 ▾')}
        {B(398, 344, 304, 160, '#fff', '#ecd2d2', <>オプションサービス　[追加]<br />Pontaパス／AppleCare など</>)}
        {B(398, 520, 304, 62, '#fff', '#ecd2d2', <>割引サービス<br />[▾] ON／OFF</>)}
        {B(398, 592, 304, 100, '#f6e3e3', '#ecd2d2', '月々のお支払い額')}
        {B(718, 146, 292, 176, '#f1f6ea', '#d5e3c3', <b style={{ color: '#4d6b2c' }}>キャンペーン関連</b>)}
        {B(718, 330, 292, 190, '#fbf8e6', '#ebe2b3', <b style={{ color: '#6e5f1c' }}>au +1collection</b>)}
        {B(718, 528, 292, 80, '#f7ebe3', '#ead3c4', <b style={{ color: '#9c4a1c' }}>月々のお支払い目安額</b>)}
        {HOTS.map(([id, x, y, w, h]) => (
          <button key={id} className={`ota-hot ${sel === id ? 'on' : ''}`} style={{ left: x, top: y, width: w, height: h }} onClick={() => onPick(id)} aria-label={`${SECTIONS[id].label}を編集`} />
        ))}
      </div>
    </div>
  );
}

// データ量の段階・通話オプションの一覧エディタ
function ListEditor({ value, onChange }) {
  const list = value || [];
  const set = (i, k, v) => onChange(list.map((x, j) => (j === i ? { ...x, [k]: k === 'price' ? v.replace(/[^0-9]/g, '') : v } : x)));
  return (
    <div className="ota-list">
      {list.map((x, i) => (
        <div key={i} className="ota-list-row">
          <input className="input" placeholder="表示名" value={x.label || ''} onChange={(e) => set(i, 'label', e.target.value)} />
          <input className="input" placeholder="金額" inputMode="numeric" value={x.price ?? ''} onChange={(e) => set(i, 'price', e.target.value)} style={{ width: 90 }} />
          <button type="button" className="ota-mini-btn" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="この行を削除">×</button>
        </div>
      ))}
      <button type="button" className="ota-mini-btn add" onClick={() => onChange([...list, { label: '', price: 0 }])}>＋ 行を追加</button>
    </div>
  );
}

function FieldInput({ f, value, onChange }) {
  const [key, , type, opts] = f;
  if (type === 'select') return <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
  if (type === 'check') return <label className="ota-check"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />{value ? '対象' : '対象外'}</label>;
  if (type === 'list') return <ListEditor value={value} onChange={onChange} />;
  if (type === 'yen') return <input className="input" inputMode="numeric" placeholder="空欄＝未登録" value={value ?? ''} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))} />;
  if (type === 'date') return <input className="input" type="date" value={String(value || '').replace(/\//g, '-')} onChange={(e) => onChange(e.target.value)} />;
  return <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} name={key} />;
}

const toNum = (sec, row) => {
  const out = { ...row };
  sec.fields.forEach(([k, , t]) => {
    if (t === 'yen') out[k] = row[k] === '' || row[k] == null ? '' : Number(row[k]);
    if (t === 'list') out[k] = (row[k] || []).filter((x) => x.label).map((x) => ({ label: x.label, price: Number(x.price) || 0 }));
    if (t === 'check') out[k] = !!row[k];
  });
  return out;
};

export default function AdminOreTabTab({ payConfig }) {
  const cfg = useMemo(() => buildConfig(payConfig), [payConfig]);
  const [sel, setSel] = useState('devices');
  const [brandFilter, setBrandFilter] = useState('all');
  const [edit, setEdit] = useState(null); // 行の番号 or 'new'
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState('');
  const sec = SECTIONS[sel];
  const saved = !!(payConfig && payConfig[sel] != null);

  // 一覧（buildConfigの付与分は外して、保存用の形に戻す）
  const rows = sec.single ? [] : (cfg[sel] || []).map(({ id, group, ...rest }) => rest);
  const visible = rows.map((r, i) => [r, i]).filter(([r]) => !sec.filter || brandFilter === 'all' || r.brand === brandFilter);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2200); };
  const saveList = async (list) => { await dbSet(`oretab_pay/${sel}`, list.map((r) => toNum(sec, r))); };
  const pick = (id) => { setSel(id); setEdit(null); setBrandFilter('all'); };
  const openEdit = (i) => {
    setEdit(i);
    if (i === 'new') {
      const blank = {};
      sec.fields.forEach(([k, , t, o]) => { blank[k] = t === 'check' ? (k !== 'noDiscount' && k !== 'u18') : t === 'list' ? [] : t === 'select' ? o[0][0] : ''; });
      if (sel === 'plans') blank.calls = [{ label: 'なし', price: 0 }];
      if (sel === 'plans') blank.ponta = false;
      if (brandFilter !== 'all' && 'brand' in blank) blank.brand = brandFilter;
      setDraft(blank);
    } else setDraft(JSON.parse(JSON.stringify(rows[i])));
  };
  const saveRow = async () => {
    const first = sec.fields[0][0];
    if (!draft[first]) return flash(`「${sec.fields[0][1]}」を入力してください`);
    const list = rows.slice();
    if (edit === 'new') list.push(draft); else list[edit] = draft;
    await saveList(list);
    setEdit(null);
    flash('保存しました。オレタブの画面にすぐ反映されます');
  };
  const deleteRow = async () => {
    await saveList(rows.filter((_, i) => i !== edit));
    setEdit(null);
    flash('削除しました');
  };
  const move = async (i, d) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const list = rows.slice();
    [list[i], list[j]] = [list[j], list[i]];
    await saveList(list);
  };
  const resetDefault = async () => { await dbSet(`oretab_pay/${sel}`, null); setEdit(null); flash('初期データに戻しました'); };

  // 1件だけの設定（支払方法・カード割）
  const single = sec.single ? { ...cfg[sel] } : null;
  const [singleDraft, setSingleDraft] = useState(null);
  const sd = singleDraft && singleDraft.__sel === sel ? singleDraft : { ...single, __sel: sel };
  const saveSingle = async () => {
    const { __sel, ...v } = sd;
    await dbSet(`oretab_pay/${sel}`, toNum(sec, v));
    setSingleDraft(null);
    flash('保存しました');
  };

  return (
    <div className="ota">
      <div className="ota-left">
        <div className="ota-left-head"><b>お支払い目安額</b><span>枠を押すと、その部分の設定を右側で編集できます</span></div>
        <ScreenMap sel={sel} onPick={pick} />
        <div className="ota-chips">
          {Object.entries(SECTIONS).map(([id, s]) => (
            <button key={id} className={`ota-chip ${sel === id ? 'on' : ''}`} onClick={() => pick(id)}>{s.label}</button>
          ))}
        </div>
      </div>

      <div className="ota-right">
        <div className="ota-right-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ota-title">{sec.label}</div>
            <div className="ota-desc">{sec.desc}</div>
            <div className="ota-state">{saved ? '管理画面で編集した内容を使用中' : '初期データを使用中（保存すると管理画面の内容に切り替わります）'}</div>
          </div>
          {!sec.single && <button className="btn-primary ota-add" onClick={() => openEdit('new')}>＋ 追加</button>}
        </div>

        {sec.filter && (
          <div className="ota-filter">
            {[['all', 'すべて'], ...BRAND].map(([v, l]) => (
              <button key={v} className={`ota-chip ${brandFilter === v ? 'on' : ''}`} onClick={() => setBrandFilter(v)}>{l}</button>
            ))}
          </div>
        )}

        {sec.single ? (
          <div className="ota-form">
            {sec.fields.map((f) => (
              <label key={f[0]} className="ota-field"><span>{f[1]}</span>
                <FieldInput f={f} value={sd[f[0]]} onChange={(v) => setSingleDraft({ ...sd, [f[0]]: v })} />
              </label>
            ))}
            <div className="ota-form-foot"><button className="btn-primary" onClick={saveSingle}>保存</button></div>
          </div>
        ) : (
          <>
            <div className="ota-table-wrap">
              <table className="ota-table">
                <thead><tr>{sec.cols.map((k) => <th key={k}>{sec.fields.find((f) => f[0] === k)[1].replace(/（.*）/, '')}</th>)}<th style={{ width: 64 }}>順番</th></tr></thead>
                <tbody>
                  {visible.length === 0 && <tr><td colSpan={sec.cols.length + 1} className="ota-empty">まだ登録がありません。「＋ 追加」から登録できます</td></tr>}
                  {visible.map(([r, i]) => (
                    <tr key={i} className={edit === i ? 'on' : ''} onClick={() => openEdit(i)}>
                      {sec.cols.map((k) => <td key={k}>{cellText(sec, k, r)}</td>)}
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="ota-mini-btn" onClick={() => move(i, -1)} aria-label="上へ">▲</button>
                        <button className="ota-mini-btn" onClick={() => move(i, 1)} aria-label="下へ">▼</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {edit !== null && (
              <div className="ota-form">
                <div className="ota-form-title">{edit === 'new' ? '新しく追加' : `編集中：${rows[edit] ? rows[edit][sec.fields[0][0]] : ''}`}</div>
                <div className="ota-grid">
                  {sec.fields.map((f) => (
                    <label key={f[0]} className={`ota-field ${f[2] === 'list' ? 'wide' : ''}`}><span>{f[1]}</span>
                      <FieldInput f={f} value={draft[f[0]]} onChange={(v) => setDraft({ ...draft, [f[0]]: v })} />
                    </label>
                  ))}
                </div>
                <div className="ota-form-foot">
                  {edit !== 'new' && <ConfirmButton label="削除" onConfirm={deleteRow} style={{ background: '#fee2e2', border: '1.5px solid #fecaca', borderRadius: 7, padding: '7px 12px', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', color: '#dc2626', fontFamily: 'inherit' }} />}
                  <span style={{ flex: 1 }} />
                  <button className="btn-ghost" onClick={() => setEdit(null)}>キャンセル</button>
                  <button className="btn-primary" onClick={saveRow}>保存</button>
                </div>
              </div>
            )}
          </>
        )}
        {msg && <div className="ota-msg">{msg}</div>}
        {saved && (
          <div className="ota-reset">
            <ConfirmButton label="この項目を初期データに戻す" message="管理画面で編集した内容が消えます。よろしいですか？" onConfirm={resetDefault}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', color: 'var(--sub)', fontFamily: 'inherit' }} />
          </div>
        )}
      </div>
    </div>
  );
}

export { DEFAULTS };
