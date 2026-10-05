import React, { useEffect, useMemo, useState } from 'react';
import { OS_LIST, MARK_O, MARK_X, getDeviceData, seriesOf, getSample } from '../devices.js';
import { dbPush, dbSet, dbUpdateMany, newDbKey } from '../useFirebase.js';
import { showToast } from '../utils.js';
import { ConfirmButton } from './ConfirmButton.jsx';

// 並び替え：隣と入れ替える。order を 0,1,2… に振り直してから入れ替えて、まとめて保存する
async function moveItem(basePath, list, index, dir) {
  const j = index + dir;
  if (j < 0 || j >= list.length) return;
  const ids = list.map((x) => x.id);
  [ids[index], ids[j]] = [ids[j], ids[index]];
  const updates = {};
  ids.forEach((id, i) => { updates[`${basePath}/${id}/order`] = i; });
  await dbUpdateMany(updates);
}

function OrderButtons({ onUp, onDown, upDisabled, downDisabled }) {
  return (
    <span className="adv-order">
      <button type="button" onClick={onUp} disabled={upDisabled} aria-label="上へ">▲</button>
      <button type="button" onClick={onDown} disabled={downDisabled} aria-label="下へ">▼</button>
    </span>
  );
}

// 入力欄：フォーカスが外れたとき・Enterで保存
function BlurInput({ value, onSave, placeholder, className, list, inputMode }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => { setV(value ?? ''); }, [value]);
  return (
    <input
      className={className || 'adv-input'}
      value={v}
      placeholder={placeholder}
      list={list}
      inputMode={inputMode}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      onBlur={() => { if (String(v) !== String(value ?? '')) onSave(v); }}
    />
  );
}

// ===== 項目（機能）の管理 =====
function FeatureSection({ os, features, models }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('mark');
  const base = `devices/${os}/features`;

  const add = async () => {
    const n = name.trim();
    if (!n) return showToast('項目名を入力してください');
    if (features.some((f) => f.name === n)) return showToast('同じ名前の項目がすでにあります');
    await dbPush(base, { name: n, type, order: features.length });
    setName('');
    showToast(`「${n}」を追加しました`);
  };

  const remove = async (f) => {
    // 項目を消すときは、各機種に入っている値も一緒に消す
    const updates = { [`${base}/${f.id}`]: null };
    models.forEach((m) => { if (m.values[f.id] !== undefined) updates[`devices/${os}/models/${m.id}/values/${f.id}`] = null; });
    await dbUpdateMany(updates);
    showToast(`「${f.name}」を削除しました`);
  };

  return (
    <div className="adv-sec">
      <div className="adv-sec-head">
        <div className="adv-sec-title">比較する項目（{features.length}）</div>
        <div className="adv-sec-sub">表の縦に並ぶ項目です。「○×」は絞り込みの条件にも使われます。</div>
      </div>
      <div className="adv-list">
        {features.map((f, i) => (
          <div key={f.id} className="adv-row">
            <OrderButtons
              onUp={() => moveItem(base, features, i, -1)} onDown={() => moveItem(base, features, i, 1)}
              upDisabled={i === 0} downDisabled={i === features.length - 1}
            />
            <BlurInput value={f.name} onSave={(v) => v.trim() && dbSet(`${base}/${f.id}/name`, v.trim())} />
            <select className="adv-select" value={f.type} onChange={(e) => dbSet(`${base}/${f.id}/type`, e.target.value)}>
              <option value="mark">○×</option>
              <option value="text">文字</option>
            </select>
            <ConfirmButton label="削除" message="削除しますか？" onConfirm={() => remove(f)} className="adv-del" />
          </div>
        ))}
        {features.length === 0 && <div className="adv-empty">まだ項目がありません</div>}
      </div>
      <div className="adv-add">
        <input className="adv-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="新しい項目名（例：防水）"
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
        <select className="adv-select" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="mark">○×</option>
          <option value="text">文字</option>
        </select>
        <button className="adv-add-btn" onClick={add}>追加</button>
      </div>
    </div>
  );
}

// ===== 機種1台分の編集 =====
function ModelItem({ os, model, features, index, total, models, seriesListId }) {
  const [open, setOpen] = useState(false);
  const base = `devices/${os}/models/${model.id}`;
  const setVal = (fid, v) => dbSet(`${base}/values/${fid}`, v || null);
  const filled = features.filter((f) => model.values[f.id]).length;

  return (
    <div className={`adv-model ${open ? 'open' : ''}`}>
      <div className="adv-model-head">
        <OrderButtons
          onUp={() => moveItem(`devices/${os}/models`, models, index, -1)} onDown={() => moveItem(`devices/${os}/models`, models, index, 1)}
          upDisabled={index === 0} downDisabled={index === total - 1}
        />
        <button className="adv-model-toggle" onClick={() => setOpen((o) => !o)}>
          <span className="adv-model-name">{model.name || '（名前なし）'}</span>
          <span className="adv-model-meta">{[model.series, model.year && `${model.year}年`].filter(Boolean).join('・')}</span>
          <span className="adv-model-fill">{filled}/{features.length}</span>
          <span className="adv-model-caret">{open ? '▲' : '▼'}</span>
        </button>
      </div>
      {open && (
        <div className="adv-model-body">
          <div className="adv-grid3">
            <label>機種名<BlurInput value={model.name} onSave={(v) => v.trim() && dbSet(`${base}/name`, v.trim())} /></label>
            <label>発売年<BlurInput value={model.year} inputMode="numeric" onSave={(v) => dbSet(`${base}/year`, v.trim() ? (Number(v) || v.trim()) : null)} /></label>
            <label>シリーズ<BlurInput value={model.series} list={seriesListId} placeholder="例：Pro" onSave={(v) => dbSet(`${base}/series`, v.trim() || null)} /></label>
          </div>
          <div className="adv-values">
            {features.map((f) => {
              const v = model.values[f.id] || '';
              return (
                <div key={f.id} className="adv-value-row">
                  <span className="adv-value-label">{f.name}</span>
                  {f.type === 'mark' ? (
                    <span className="adv-seg">
                      <button className={v === MARK_O ? 'on o' : ''} onClick={() => setVal(f.id, MARK_O)}>○</button>
                      <button className={v === MARK_X ? 'on x' : ''} onClick={() => setVal(f.id, MARK_X)}>×</button>
                      <button className={!v ? 'on none' : ''} onClick={() => setVal(f.id, '')}>－</button>
                    </span>
                  ) : (
                    <BlurInput className="adv-input adv-value-text" value={v} placeholder="未入力" onSave={(nv) => setVal(f.id, nv.trim())} />
                  )}
                </div>
              );
            })}
            {features.length === 0 && <div className="adv-empty">先に「比較する項目」を追加してください</div>}
          </div>
          <div className="adv-model-foot">
            <ConfirmButton label="この機種を削除" message={`「${model.name}」を削除しますか？`} onConfirm={async () => { await dbSet(base, null); showToast('削除しました'); }} className="adv-del" />
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 機種の管理 =====
function ModelSection({ os, features, models }) {
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [series, setSeries] = useState('');
  const seriesListId = `adv-series-${os}`;
  const seriesList = seriesOf(models);

  const add = async () => {
    const n = name.trim();
    if (!n) return showToast('機種名を入力してください');
    if (models.some((m) => m.name === n)) return showToast('同じ名前の機種がすでにあります');
    // 新しい機種は一覧の先頭（最新機種が左に来る並び）
    const updates = {};
    models.forEach((m, i) => { updates[`devices/${os}/models/${m.id}/order`] = i + 1; });
    await dbUpdateMany(updates);
    await dbPush(`devices/${os}/models`, { name: n, year: Number(year) || year.trim() || null, series: series.trim() || null, order: 0, values: {} });
    setName(''); setYear('');
    showToast(`「${n}」を追加しました。▼を開いて○×を入れてください`);
  };

  return (
    <div className="adv-sec">
      <div className="adv-sec-head">
        <div className="adv-sec-title">機種（{models.length}）</div>
        <div className="adv-sec-sub">表の横に並ぶ機種です。上にあるものほど表の左に出ます。▼で開いて○×を入れます。</div>
      </div>
      <datalist id={seriesListId}>{seriesList.map((s) => <option key={s} value={s} />)}</datalist>
      <div className="adv-add adv-add-model">
        <input className="adv-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="機種名（例：iPhone 18）" />
        <input className="adv-input adv-year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="発売年" inputMode="numeric" />
        <input className="adv-input adv-series" value={series} onChange={(e) => setSeries(e.target.value)} placeholder="シリーズ" list={seriesListId} />
        <button className="adv-add-btn" onClick={add}>追加</button>
      </div>
      <div className="adv-list">
        {models.map((m, i) => (
          <ModelItem key={m.id} os={os} model={m} features={features} index={i} total={models.length} models={models} seriesListId={seriesListId} />
        ))}
        {models.length === 0 && <div className="adv-empty">まだ機種がありません</div>}
      </div>
    </div>
  );
}

export default function AdminDevicesTab({ devices }) {
  const [os, setOs] = useState('ios');
  const { features, models } = useMemo(() => getDeviceData(devices, os), [devices, os]);
  const sample = useMemo(() => getSample(os), [os]);
  // サンプルのうち、まだ登録されていない機種（名前で判定）
  const missing = useMemo(() => {
    const have = new Set(models.map((m) => m.name));
    return sample.models.filter((m) => !have.has(m.name));
  }, [sample, models]);
  // 登録済みの機種のうち、サンプルに値があって、まだ空欄のマスの数
  const fillCount = useMemo(() => {
    const fidByName = new Map(features.map((f) => [f.name, f.id]));
    let n = 0;
    sample.models.forEach((sm) => {
      const m = models.find((x) => x.name === sm.name);
      if (!m) return;
      Object.keys(sm.values).forEach((fname) => {
        const fid = fidByName.get(fname);
        if (!fid || !m.values[fid]) n++;
      });
    });
    return n;
  }, [sample, models, features]);
  const missingFeatures = sample.features.filter((f) => !features.some((x) => x.name === f.name)).length;
  const [saving, setSaving] = useState(false);

  // 足りない項目・機種・空欄の値だけを追加する（すでに入っている値は上書きしない）
  const loadSample = async () => {
    setSaving(true);
    try {
      const updates = {};
      const idByName = new Map(features.map((f) => [f.name, f.id]));
      let order = features.length;
      sample.features.forEach((f) => {
        if (idByName.has(f.name)) return;
        const id = newDbKey(`devices/${os}/features`);
        idByName.set(f.name, id);
        updates[`devices/${os}/features/${id}`] = { name: f.name, type: f.type, order: order++ };
      });
      let mOrder = models.length;
      missing.forEach((m) => {
        const id = newDbKey(`devices/${os}/models`);
        const values = {};
        Object.entries(m.values).forEach(([fname, v]) => { const fid = idByName.get(fname); if (fid) values[fid] = v; });
        updates[`devices/${os}/models/${id}`] = { name: m.name, year: m.year || null, series: m.series || null, order: mOrder++, values };
      });
      // 登録済みの機種：空欄のマスだけサンプルの値で埋める
      let filled = 0;
      sample.models.forEach((sm) => {
        const m = models.find((x) => x.name === sm.name);
        if (!m) return;
        Object.entries(sm.values).forEach(([fname, v]) => {
          const fid = idByName.get(fname);
          if (fid && !m.values[fid]) { updates[`devices/${os}/models/${m.id}/values/${fid}`] = v; filled++; }
        });
      });
      await dbUpdateMany(updates);
      showToast([missing.length && `${missing.length}機種を追加`, filled && `${filled}マスを入力`].filter(Boolean).join('・') + 'しました');
    } catch (e) { showToast('エラー:' + e.message); }
    setSaving(false);
  };

  return (
    <div className="adv">
      <div className="kc-seg adv-os">
        {OS_LIST.map((o) => (
          <button key={o.id} className={os === o.id ? 'on' : ''} onClick={() => setOs(o.id)}>{o.label}</button>
        ))}
      </div>

      {(missing.length > 0 || fillCount > 0 || missingFeatures > 0) && (
        <div className="adv-sample">
          <div>
            <div className="adv-sec-title">
              サンプルから追加できるデータがあります（{[missingFeatures && `項目${missingFeatures}件`, missing.length && `機種${missing.length}件`, fillCount && `空欄${fillCount}マス`].filter(Boolean).join('・')}）
            </div>
            <div className="adv-sec-sub">
              {os === 'ios'
                ? 'iPhone X以降の主な機種です。'
                : '2021年秋以降に日本で発売された主なAndroid（Pixel・Galaxy・OPPO・AQUOS・Xperia・motorola・arrows・nubia・nothing）です。'}
              すでに入っている値は上書きせず、足りない項目・機種と空欄のマスだけを埋めます。未確認の値は空欄（－）のままです。
            </div>
          </div>
          <button className="adv-add-btn" disabled={saving} onClick={loadSample}>{saving ? '追加中…' : 'まとめて追加'}</button>
        </div>
      )}

      <FeatureSection os={os} features={features} models={models} />
      <ModelSection os={os} features={features} models={models} />
    </div>
  );
}
