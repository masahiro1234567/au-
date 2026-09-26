import { useEffect, useState } from 'react';
import { ref, onValue, push, set, remove, update, get } from 'firebase/database';
import { db } from './firebase.js';

// terms / test_results / user_profiles を購読し、{id: data} 形式で返す
export function useDbCollection(path) {
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const r = ref(db, path);
    const unsub = onValue(r, (snap) => {
      const obj = {};
      snap.forEach((c) => {
        obj[c.key] = c.val();
      });
      setData(obj);
      setLoaded(true);
    });
    return () => unsub();
  }, [path]);

  return [data, loaded];
}

export async function dbPush(path, value) {
  const newRef = push(ref(db, path));
  await set(newRef, value);
  return newRef;
}
export async function dbSet(path, value) {
  return set(ref(db, path), value);
}
export async function dbRemove(path) {
  return remove(ref(db, path));
}

// 用語の関連付け（相互）を保存する。この用語自身のrelatedと、相手側のrelatedを1回のupdateで同期する。
export async function saveTermRelations(termId, oldIds = [], newIds = []) {
  const oldSet = new Set(oldIds);
  const newSet = new Set(newIds);
  const updates = {};
  const ownRelated = {};
  newIds.forEach((id) => { ownRelated[id] = true; });
  updates[`terms/${termId}/related`] = Object.keys(ownRelated).length ? ownRelated : null;
  // 相手側への書き込みは、相手の用語が実在するときだけ（削除済みの用語に書くと名前の無い「抜け殻」ができてしまうため）
  const added = newIds.filter((id) => !oldSet.has(id));
  const exists = await Promise.all(added.map((id) => get(ref(db, `terms/${id}/name`)).then((s) => s.exists())));
  added.forEach((id, i) => { if (exists[i]) updates[`terms/${id}/related/${termId}`] = true; });
  oldIds.filter((id) => !newSet.has(id)).forEach((id) => { updates[`terms/${id}/related/${termId}`] = null; });
  if (Object.keys(updates).length) await update(ref(db), updates);
}

// 用語を削除する際、他の用語側からの関連付けも消す
export async function removeTermWithRelations(termId, relatedIds = []) {
  const updates = { [`terms/${termId}`]: null };
  // 片方向だけ残っている関連付けも含めて、この用語を参照している全用語から外す
  const all = (await get(ref(db, 'terms'))).val() || {};
  const ids = new Set(relatedIds);
  Object.entries(all).forEach(([id, t]) => { if (t && t.related && t.related[termId]) ids.add(id); });
  ids.delete(termId);
  ids.forEach((id) => { if (all[id]) updates[`terms/${id}/related/${termId}`] = null; });
  await update(ref(db), updates);
}

// 複数パスをまとめて1回で更新する（一括カテゴリ分けなどで使用）。値にnullを入れるとその項目は削除される
export async function dbUpdateMany(updates) {
  if (Object.keys(updates).length) await update(ref(db), updates);
}

// 1回だけ値を読み取る
export async function dbGet(path) {
  const snap = await get(ref(db, path));
  return snap.val();
}
