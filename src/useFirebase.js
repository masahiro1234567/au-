import { useEffect, useState } from 'react';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
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
  newIds.filter((id) => !oldSet.has(id)).forEach((id) => { updates[`terms/${id}/related/${termId}`] = true; });
  oldIds.filter((id) => !newSet.has(id)).forEach((id) => { updates[`terms/${id}/related/${termId}`] = null; });
  if (Object.keys(updates).length) await update(ref(db), updates);
}

// 用語を削除する際、他の用語側からの関連付けも消す
export async function removeTermWithRelations(termId, relatedIds = []) {
  const updates = { [`terms/${termId}`]: null };
  relatedIds.forEach((id) => { updates[`terms/${id}/related/${termId}`] = null; });
  await update(ref(db), updates);
}
