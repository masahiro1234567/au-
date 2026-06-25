import { useEffect, useState } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
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
  return set(push(ref(db, path)), value);
}
export async function dbSet(path, value) {
  return set(ref(db, path), value);
}
export async function dbRemove(path) {
  return remove(ref(db, path));
}
