import DateWheel from '../../components/DateWheel.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ref, push, set, remove, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { useFirebaseList } from '../lib/useFirebaseList';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';
import MonthPicker from '../components/MonthPicker';
import { useFrames } from '../lib/frames';
import { resultKey, getSavedResult, resultFromFrames, kpiMembers } from '../lib/kpiLink';

const CHANNELS = ['エディオン','イオン','ジョーシン','ケーズデンキ','ヤマダ','コジマ','その他'];
const DOWS = ['日','月','火','水','木','金','土'];

function parseDateLocal(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function dowLabel(str) {
  return str ? DOWS[parseDateLocal(str).getDay()] + '曜' : '';
}
function todayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
}
function nextDay(str) {
  const d = parseDateLocal(str);
  d.setDate(d.getDate()+1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
// 「その月の1回目の土日を含む週」を1週目とする（木曜始まり）※日報確認・管理者画面と同一ロジック
function weekLabelOf(dateStr) {
  if (!dateStr) return '';
  const d = parseDateLocal(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysToFirstSat = (6 - firstDow + 7) % 7;
  const firstSatDate = 1 + daysToFirstSat;
  const week1ThuDate = firstSatDate - 2;
  let week = Math.floor((d.getDate() - week1ThuDate) / 7) + 1;
  if (week < 1) week = 1;
  return `${year}年${month + 1}月${week}週目`;
}
function WeekSectionHeader({ label, count, isOpen, onClick }) {
  return (
    <div onClick={onClick} style={{
      fontSize: 14, fontWeight: 800, color: 'var(--pd)',
      background: 'var(--pl)', border: '1px solid #fed7aa', borderRadius: 10,
      padding: '12px 14px', margin: '16px 0 10px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
    }}>
      <span>{label}<span style={{ fontWeight: 600, marginLeft: 6, fontSize: 12, opacity: .85 }}>（{count}現場）</span></span>
      <span style={{ fontSize: 15 }}>{isOpen ? '▾' : '›'}</span>
    </div>
  );
}

const ROLE_CLS = { ディレクター: 'dir', クローザー: 'clo', キャッチャー: 'cat' };
const ROLE_SHORT = { ディレクター: 'ディレ', クローザー: 'クロ', キャッチャー: 'キャッチ' };

export default function Kpi() {
  const { data: kpiData } = useFirebaseList('fp_kpi');
  const { data: kpiResults } = useFirebaseList('fp_kpi_results');
  const { data: fpUsers } = useFirebaseList('fp_users');
  const { frames } = useFrames();
  const { isAdmin, user } = useAuth();
  const showToast = useToast();
  const [editing, setEditing] = useState(null);
  const [pickerVal, setPickerVal] = useState(null);
  const [channelFilter, setChannelFilter] = useState('');
  const [openIds, setOpenIds] = useState({});
  const [openWeeks, setOpenWeeks] = useState({});
  // 実績入力 state: { [kpiId_date_memberName]: actual }
  const [actuals, setActuals] = useState({});

  const registeredNames = useMemo(() =>
    new Set(Object.values(fpUsers).map(u => u.name).filter(Boolean)), [fpUsers]);

  const autoSaved = useRef(new Set());
  useEffect(() => {
    if (!frames.length || !Object.keys(kpiData).length) return;
    const up = {};
    Object.entries(kpiData).forEach(([kid, k]) => (k.dates || []).forEach((dt) => kpiMembers(k, dt).forEach((m, mi) => {
      const key = resultKey(kid, dt, mi);
      if (autoSaved.current.has(key) || getSavedResult(kpiResults, kid, dt, mi, m.member, m.role)) return;
      const fr = resultFromFrames(frames, k, dt, mi, registeredNames);
      if (!fr) return;
      const target = +m.target || 0, actual = +fr.actual || 0;
      up[`fp_kpi_results/${key}`] = { kpiId: kid, date: dt, memberIndex: mi, memberName: m.member || '他社', role: m.role, target, actual,
        ach: target > 0 ? Math.round((actual / target) * 100) : 0, store: k.store || '', channel: k.channel || '', fromReport: true, updatedAt: Date.now() };
      autoSaved.current.add(key);
    })));
    if (Object.keys(up).length) update(ref(db), up).catch(() => {});
  }, [frames, kpiData, kpiResults, registeredNames]);

  // ---- 自分のKPI（名前のスペース・全角半角の違いは無視して判定）----
  const nn = (x) => String(x || '').normalize('NFKC').replace(/[\s　]/g, '');
  const isMe = (name) => !!user && !!name && nn(name) === nn(user.name);
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const mdLabel = (dt) => { const [, mo, da] = String(dt).split('-').map(Number); return `${mo}/${da}（${dowLabel(dt).replace('曜日', '')}）`; };
  const [myIdx, setMyIdx] = useState(0);
  // ---- ディレクターが自社メンバーでない日は、各メンバーが自分の実績を入力する ----
  const { data: fpActual } = useFirebaseList('fp_kpi_fp'); // その日のFP全体の獲得件数（日報が無い日用）
  const [drafts, setDrafts] = useState({});
  const ours = (name) => !!name && name !== '他社' && [...registeredNames].some((r) => nn(r) === nn(name));
  const selfMode = (ms) => !ms.some((m) => m.role === 'ディレクター' && ours(m.member));
  const saveMine = async (kid, dt, mi, m) => {
    const k = `${kid}_${dt}_${mi}`;
    const v = drafts[k];
    if (v === undefined || v === '') return showToast('実績件数を入力してください');
    const target = +(m.role === 'キャッチャー' ? (m.catcherCount || m.target) : m.target) || 0;
    const actual = +v || 0;
    await set(ref(db, `fp_kpi_results/${resultKey(kid, dt, mi)}`), {
      kpiId: kid, date: dt, memberIndex: mi, memberName: m.member, role: m.role, target, actual,
      ach: target > 0 ? Math.round((actual / target) * 100) : 0, store: kpiData[kid]?.store || '', channel: kpiData[kid]?.channel || '',
      selfEntered: true, enteredBy: user?.name || '', updatedAt: Date.now(),
    });
    setDrafts((d) => { const x = { ...d }; delete x[k]; return x; });
    showToast('実績を保存しました');
  };
  const saveFp = async (kid, dt) => {
    const k = `fp_${kid}_${dt}`;
    if (drafts[k] === undefined) return;
    await set(ref(db, `fp_kpi_fp/${kid}_${dt}`), { value: +drafts[k] || 0, by: user?.name || '', at: Date.now() });
    setDrafts((d) => { const x = { ...d }; delete x[k]; return x; });
    showToast('FP全体の獲得件数を保存しました');
  };
  const myDays = useMemo(() => {
    const out = [];
    Object.entries(kpiData || {}).forEach(([kid, k]) => (k.dates || []).forEach((dt) => {
      if (dt < todayStr) return;
      const ms = (k.dateMembers && k.dateMembers[dt]) || [];
      const m = ms.find((x) => isMe(x.member));
      if (!m) return;
      out.push({ kid, k, dt, m, target: m.role === 'キャッチャー' ? (m.catcherCount || m.target) : m.target,
        fp: ms.filter((x) => x.role !== 'キャッチャー').reduce((a, x) => a + (+x.target || 0), 0) });
    }));
    return out.sort((a, b) => (a.dt > b.dt ? 1 : -1)).slice(0, 6);
  }, [kpiData, user && user.name, todayStr]);

  const myPending = useMemo(() => {
    const out = [];
    Object.entries(kpiData || {}).forEach(([kid, k]) => (k.dates || []).forEach((dt) => {
      if (dt > todayStr) return;
      const ms = (k.dateMembers && k.dateMembers[dt]) || [];
      if (!selfMode(ms)) return;
      ms.forEach((m, mi) => { if (isMe(m.member) && !getSavedResult(kpiResults, kid, dt, mi, m.member, m.role)) out.push({ kid, dt, store: k.store }); });
    }));
    return out.sort((a, b) => (a.dt < b.dt ? 1 : -1));
  }, [kpiData, kpiResults, registeredNames, user && user.name, todayStr]);

  const cards = useMemo(() => {
    return Object.entries(kpiData)
      .filter(([, k]) => {
        const cOk = !channelFilter || k.channel === channelFilter;
        const mOk = !pickerVal || (k.dates || [k.date]).some(dt => {
          if (!dt) return false;
          const d = parseDateLocal(dt);
          return d.getFullYear() === pickerVal.year && (d.getMonth()+1) === pickerVal.month;
        });
        return cOk && mOk;
      })
      .map(([id, k]) => {
        const dates = k.dates || [k.date].filter(Boolean);
        const dateMembers = k.dateMembers || {};
        return { id, k, dates, dateMembers };
      })
      .sort((a, b) => (b.dates[0]||'').localeCompare(a.dates[0]||''));
  }, [kpiData, pickerVal, channelFilter]);

  const weekGroups = useMemo(() => {
    const out = [];
    let curLabel = null;
    cards.forEach((card) => {
      const label = weekLabelOf(card.dates[0]);
      if (label !== curLabel) {
        out.push({ label, cards: [] });
        curLabel = label;
      }
      out[out.length - 1].cards.push(card);
    });
    return out;
  }, [cards]);

  // 実績保存：「KPIのID_日付_行番号」で1件に決めて上書き保存（日報の実績記入と同じ保存先）
  async function saveResult(kpiId, date, memberIndex, memberName, target, role) {
    const key = `${kpiId}_${date}_${memberIndex}`;
    const actual = +actuals[key] || 0;
    const ach = +target > 0 ? Math.round((actual / +target) * 100) : 0;
    await set(ref(db, `fp_kpi_results/${resultKey(kpiId, date, memberIndex)}`), {
      kpiId, date, memberIndex, memberName, target: +target || 0, actual, role, ach,
      store: kpiData[kpiId]?.store || '',
      channel: kpiData[kpiId]?.channel || '',
      updatedAt: Date.now(),
    });
  }

  // 既存の実績。KPIに実績が無ければ、日報の実績記入（KPI登録前に入れた分）から自動で拾う
  function getResult(kpiId, date, memberIndex, memberName, role) {
    const saved = getSavedResult(kpiResults, kpiId, date, memberIndex, memberName, role);
    if (saved) return saved;
    const fr = resultFromFrames(frames, kpiData[kpiId], date, memberIndex, registeredNames);
    return fr ? { actual: fr.actual, fromReport: true } : undefined;
  }

  function openNew() {
    const d0 = todayStr();
    setEditing({ store:'', channel:'', mode:'souhan', overallTarget:'', dates:[d0],
      dateMembers:{ [d0]:[{ member:'', role:'クローザー', target:'', catcherCount:'', _custom:false }] } });
  }
  function openEdit(id) {
    const k = kpiData[id];
    setEditing({ id, store:k.store||'', channel:k.channel||'', mode:k.mode||'souhan',
      overallTarget:k.overallTarget||'', dates:k.dates||[k.date].filter(Boolean), dateMembers:k.dateMembers||{} });
  }
  function updateMember(date,idx,patch) {
    setEditing(prev=>{
      const dm={...prev.dateMembers};
      dm[date]=dm[date].map((m,i)=>i===idx?{...m,...patch}:m);
      return {...prev,dateMembers:dm};
    });
  }
  function addMember(date) {
    setEditing(prev=>{
      const dm={...prev.dateMembers};
      dm[date]=[...(dm[date]||[]),{member:'',role:'クローザー',target:'',catcherCount:'',_custom:false}];
      return {...prev,dateMembers:dm};
    });
  }
  function removeMember(date,idx) {
    setEditing(prev=>{
      const dm={...prev.dateMembers};
      dm[date]=dm[date].filter((_,i)=>i!==idx);
      return {...prev,dateMembers:dm};
    });
  }
  function addDate() {
    setEditing(prev=>{
      const last=prev.dates[prev.dates.length-1];
      const nd=nextDay(last);
      return {...prev,dates:[...prev.dates,nd],dateMembers:{...prev.dateMembers,[nd]:[{member:'',role:'クローザー',target:'',catcherCount:'',_custom:false}]}};
    });
  }
  const memberSum = useMemo(()=>{
    if(!editing) return 0;
    return editing.dates.reduce((s,dt)=>{
      const ms=editing.dateMembers[dt]||[];
      return s+ms.filter(m=>m.role!=='キャッチャー').reduce((s2,m)=>s2+(+m.target||0),0);
    },0);
  },[editing]);

  async function handleSave() {
    if(!editing.store||!editing.dates.length){showToast('店舗名・日程は必須です');return;}
    const data={
      store:editing.store, channel:editing.channel||'', mode:editing.mode,
      overallTarget:editing.overallTarget, dates:editing.dates, date:editing.dates[0],
      dateMembers:Object.fromEntries(
        Object.entries(editing.dateMembers).map(([dt,ms])=>[dt,ms.map(({_custom,...rest})=>rest)])
      ),
      updatedAt:Date.now(),
    };
    if(editing.id){await set(ref(db,`fp_kpi/${editing.id}`),data);}
    else{await set(push(ref(db,'fp_kpi')),data);}
    showToast('保存しました'); setEditing(null);
  }
  async function handleDelete(id) {
    if(!confirm('このKPIを削除しますか？')) return;
    await remove(ref(db,`fp_kpi/${id}`));
    showToast('削除しました'); setEditing(null);
  }

  return (
    <Layout title="KPI" showBack>
      {/* 一番上：自分のKPI（名前で判定。今日、なければ次に入っている日）。右下にその日のFP全体 */}
      {myDays.length > 0 && (() => {
        const h = myDays[Math.min(myIdx, myDays.length - 1)];
        return (
          <div className="kp-wrap">
            {myDays.length > 1 && (
              <div className="filter-bar" style={{ marginBottom: 8 }}>
                {myDays.map((x, i) => (
                  <button key={x.kid + x.dt} className={`fchip ${i === myIdx ? 'active' : ''}`} onClick={() => setMyIdx(i)}>
                    {x.dt === todayStr ? '今日 ' : ''}{mdLabel(x.dt)}
                  </button>
                ))}
              </div>
            )}
            <div className="kp-hero">
              <div className="kp-hero-sub">{mdLabel(h.dt)}　{h.k.store}</div>
              <div className="kp-hero-num"><b>{h.target || 0}</b><span>{h.m.role === 'キャッチャー' ? '組' : '件'}</span></div>
              <span className={`kp-role ${ROLE_CLS[h.m.role] || ''}`}>{h.m.role}</span>
              <div className="kp-hero-fp"><small>{dowLabel(h.dt).replace('曜日', '')}曜 FP全体</small><b>{h.fp}<span>件</span></b></div>
            </div>
          </div>
        );
      })()}

      {myPending.length > 0 && (
        <div className="np-warn" style={{ marginBottom: 12 }}>
          <b>実績が未入力の日があります</b>
          <span style={{ fontWeight: 500 }}>ディレクターが自社メンバーでない日は、自分の実績を自分で入力してください</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {myPending.map((x) => <button key={x.kid + x.dt} className="fchip" onClick={() => { setPickerVal(null); setOpenIds((prev) => ({ ...prev, [x.kid]: true })); }}>{mdLabel(x.dt)} {x.store}</button>)}
          </div>
        </div>
      )}
      <MonthPicker value={pickerVal} onChange={setPickerVal} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <select className="inp" style={{ flex: '0 0 auto', width: 'auto', padding: '8px 10px', fontSize: '.84rem' }}
          value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
          <option value="">すべての販路</option>
          {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {isAdmin && <button className="btn btn-p" style={{ flex: 1 }} onClick={openNew}>＋ KPIを登録</button>}
      </div>

      {cards.length === 0 && <div className="empty">この月のKPIはありません</div>}
      <div className="card-title" style={{ margin: '6px 0 6px' }}>現場ごと</div>
      {cards.map(({ id, k, dates, dateMembers }) => {
        const on = !!openIds[id];
        const mine = dates.some((dt) => (dateMembers[dt] || []).some((m) => isMe(m.member)));
        return (
          <div key={id} className={`kp-site ${on ? 'on' : ''}`}>
            <button className="kp-site-head" onClick={() => setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }))} aria-expanded={on}>
              <span className="kp-grow"><b>{k.store}</b><small>{dates.map((dt) => mdLabel(dt)).join('・')}</small></span>
              {mine && <span className="kp-me-pill">あなた</span>}
              <span className="kp-arrow">{on ? '▲' : '▼'}</span>
            </button>
            {on && (
              <div className="kp-site-body">
                {dates.map((dt) => {
                  const ms = dateMembers[dt] || [];
                  const fp = ms.filter((m) => m.role !== 'キャッチャー').reduce((a, m) => a + (+m.target || 0), 0);
                  return (
                    <div key={dt}>
                      <div className="kp-day"><b>{mdLabel(dt)}</b><span>FP全体 目標 <strong>{fp}件</strong></span></div>
                      {selfMode(ms) && dt <= todayStr && (() => {
                        const canFp = isAdmin || ms.some((m) => isMe(m.member));
                        const fk = `fp_${id}_${dt}`;
                        const cur = (fpActual || {})[`${id}_${dt}`];
                        return (
                          <div className="kp-self">
                            <span>ディレクターが自社メンバーでない日です。各自で自分の実績を入力してください</span>
                            <div className="kp-self-fp">FP全体の獲得
                              {canFp ? (<>
                                <input className="inp" inputMode="numeric" value={drafts[fk] ?? (cur ? cur.value : '')} onChange={(e) => setDrafts({ ...drafts, [fk]: e.target.value.replace(/[^0-9]/g, '') })} aria-label="FP全体の獲得件数" />件
                                {drafts[fk] !== undefined && <button className="fchip active" onClick={() => saveFp(id, dt)}>保存</button>}
                              </>) : <b>{cur ? `${cur.value}件` : '未入力'}</b>}
                            </div>
                          </div>
                        );
                      })()}
                      {ms.map((m, mi) => {
                        const cat = m.role === 'キャッチャー';
                        const target = cat ? (m.catcherCount || m.target) : m.target;
                        const res = getResult(id, dt, mi, m.member, m.role);
                        const me = isMe(m.member);
                        return (
                          <div key={mi} className={`kp-mem ${me ? 'me' : ''}`}>
                            <span className="kp-grow" style={{ fontWeight: me ? 900 : 500 }}>{me ? 'あなた' : (m.member || '－')}</span>
                            <span className={`kp-role ${m.member === '他社' ? 'oth' : ROLE_CLS[m.role] || ''}`}>{ROLE_SHORT[m.role] || m.role}</span>
                            <b className="kp-t">{res && res.actual !== undefined && res.actual !== '' ? <small>{res.actual}/</small> : null}{target || 0}<small>{cat ? '組' : '件'}</small></b>
                            {selfMode(ms) && dt <= todayStr && (me || isAdmin) && m.member !== '他社' && (() => {
                              const dk = `${id}_${dt}_${mi}`;
                              return (
                                <span className="kp-in">
                                  <input className="inp" inputMode="numeric" placeholder="実績" value={drafts[dk] ?? (res && res.actual !== undefined ? String(res.actual) : '')} onChange={(e) => setDrafts({ ...drafts, [dk]: e.target.value.replace(/[^0-9]/g, '') })} aria-label={`${me ? '自分' : m.member}の実績件数`} />
                                  {drafts[dk] !== undefined && <button className="fchip active" onClick={() => saveMine(id, dt, mi, m)}>保存</button>}
                                </span>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 8, paddingTop: 10 }}>
                    <button className="btn btn-outline" style={{ fontSize: '.8rem', padding: '7px 12px', marginTop: 0 }} onClick={() => openEdit(id)}>編集</button>
                    <button style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '7px 12px', color: '#dc2626', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => handleDelete(id)}>削除</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* 登録・編集モーダル（管理者のみ） */}
      {editing && (
        <div className="modal-overlay" onClick={()=>setEditing(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{marginBottom:10}}>{editing.id?'KPIを編集':'KPIを登録'}</h3>
            <div className="form-group">
              <label>店舗名 <span className="req">*</span></label>
              <input className="inp" value={editing.store} onChange={e=>setEditing({...editing,store:e.target.value})} />
            </div>
            <div className="form-group">
              <label>販路</label>
              <select className="inp" value={editing.channel||''} onChange={e=>setEditing({...editing,channel:e.target.value})}>
                <option value="">選択</option>
                {CHANNELS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* カウント方式・現場全体目標 */}
            <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:10,marginBottom:10,flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:'.7rem',color:'var(--sub)',marginBottom:4}}>カウント方式</div>
                <div onClick={()=>setEditing({...editing,mode:editing.mode==='souhan'?'riku':'souhan'})}
                  style={{display:'flex',border:'1.5px solid var(--border)',borderRadius:8,overflow:'hidden',width:128,cursor:'pointer'}}>
                  <div style={{width:64,textAlign:'center',padding:'6px 0',fontSize:'.72rem',fontWeight:700,background:editing.mode==='souhan'?'var(--primary)':'#fff',color:editing.mode==='souhan'?'#fff':'var(--sub)'}}>総販</div>
                  <div style={{width:64,textAlign:'center',padding:'6px 0',fontSize:'.72rem',fontWeight:700,background:editing.mode==='riku'?'var(--primary)':'#fff',color:editing.mode==='riku'?'#fff':'var(--sub)'}}>リク抜き</div>
                </div>
              </div>
              <div style={{flex:'0 0 100px'}}>
                <div style={{fontSize:'.7rem',color:'var(--sub)',marginBottom:4}}>現場全体の目標</div>
                <input className="inp" style={{width:'100%',boxSizing:'border-box',textAlign:'right'}} type="text" inputMode="numeric" placeholder="0"
                  value={editing.overallTarget} onChange={e=>setEditing({...editing,overallTarget:e.target.value})} />
              </div>
            </div>

            {editing.dates.map((dt)=>(
              <div key={dt} style={{background:'#f9fafb',borderRadius:10,padding:12,marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <DateWheel className="inp" value={dt} onChange={e=>{
                    const newDates=editing.dates.map(d=>d===dt?e.target.value:d);
                    const newDm={...editing.dateMembers};
                    newDm[e.target.value]=newDm[dt]||[];
                    delete newDm[dt];
                    setEditing({...editing,dates:newDates,dateMembers:newDm});
                  }} style={{flex:1,padding:'6px 10px',fontSize:'.84rem'}} />
                  <span style={{fontSize:'.8rem',color:'var(--sub)'}}>{dowLabel(dt)}</span>
                </div>
                {(editing.dateMembers[dt]||[]).map((m,mi)=>(
                  <div key={mi} style={{marginBottom:8}}>
                    <div style={{display:'flex',gap:4,alignItems:'center',marginBottom:4}}>
                      {m.member==='他社'?(
                        <div style={{flex:2,background:'#f1f5f9',border:'1.5px solid var(--border)',borderRadius:8,padding:'8px 10px',fontSize:'.84rem',color:'var(--sub)',fontWeight:600}}>他社</div>
                      ):m._custom?(
                        <input className="inp" style={{flex:2}} placeholder="名前を入力" value={m.member} onChange={e=>updateMember(dt,mi,{member:e.target.value})} />
                      ):(
                        <select className="inp" style={{flex:2}} value={m.member} onChange={e=>{
                          if(e.target.value==='__new__'){updateMember(dt,mi,{member:'',_custom:true});}
                          else{updateMember(dt,mi,{member:e.target.value,_custom:false});}
                        }}>
                          <option value="">メンバーを選択</option>
                          {[...registeredNames].sort().map(n=><option key={n} value={n}>{n}</option>)}
                          <option value="__new__">＋ 新規入力...</option>
                        </select>
                      )}
                      <select className="inp" style={{flex:1}} value={m.role} onChange={e=>updateMember(dt,mi,{role:e.target.value})}>
                        <option value="クローザー">クローザー</option>
                        <option value="ディレクター">ディレクター</option>
                        <option value="キャッチャー">キャッチャー</option>
                      </select>
                      {m.role==='キャッチャー'?(
                        <input className="inp" style={{flex:'0 0 56px'}} type="text" inputMode="numeric" placeholder="0" value={m.catcherCount} onChange={e=>updateMember(dt,mi,{catcherCount:e.target.value})} />
                      ):(
                        <input className="inp" style={{flex:'0 0 56px'}} type="text" inputMode="numeric" placeholder="0" value={m.target} onChange={e=>updateMember(dt,mi,{target:e.target.value})} />
                      )}
                      {mi>0&&<button onClick={()=>removeMember(dt,mi)} style={{background:'#fee2e2',border:'none',borderRadius:6,padding:'6px 8px',color:'#dc2626',cursor:'pointer'}}>×</button>}
                    </div>
                    {m._custom&&m.member!=='他社'&&(
                      <button onClick={()=>updateMember(dt,mi,{member:'',_custom:false})} style={{background:'none',border:'none',color:'var(--sub)',fontSize:'.7rem',cursor:'pointer',padding:0}}>← リストから選ぶ</button>
                    )}
                  </div>
                ))}
                <div style={{display:'flex',gap:8,marginTop:6}}>
                  <button className="btn btn-gray" style={{flex:1,padding:'8px 10px',fontSize:'.82rem'}} onClick={()=>addMember(dt)}>＋ メンバーを追加</button>
                  <button style={{flexShrink:0,background:'#f1f5f9',color:'var(--sub)',border:'1.5px solid var(--border)',borderRadius:8,padding:'8px 14px',fontSize:'.82rem',fontWeight:700,cursor:'pointer'}}
                    onClick={()=>{setEditing(prev=>{const dm={...prev.dateMembers};dm[dt]=[...(dm[dt]||[]),{member:'他社',role:'クローザー',target:'',catcherCount:'',_custom:false}];return {...prev,dateMembers:dm};});}}>
                    他社
                  </button>
                </div>
              </div>
            ))}
            <button className="btn btn-gray" style={{marginBottom:10}} onClick={addDate}>＋ 日程を追加</button>
            <div style={{background:'#f9fafb',borderRadius:8,padding:'8px 12px',fontSize:'.78rem',marginBottom:10,display:'flex',justifyContent:'space-between'}}>
              <span>メンバー目標の合計：<strong>{memberSum}件</strong></span>
              <span style={{color:memberSum===+(editing.overallTarget||0)?'var(--green)':'var(--red)'}}>
                現場全体の目標：{editing.overallTarget||0}件（{memberSum===+(editing.overallTarget||0)?'一致':'不一致'}）
              </span>
            </div>
            <button className="btn btn-p" onClick={handleSave}>保存</button>
            {editing.id&&<button className="btn" style={{background:'#fee2e2',color:'#dc2626'}} onClick={()=>handleDelete(editing.id)}>削除</button>}
            <button className="btn btn-gray" onClick={()=>setEditing(null)}>キャンセル</button>
          </div>
        </div>
      )}
    </Layout>
  );
}
