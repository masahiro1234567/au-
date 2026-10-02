import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, ensureAnonAuth } from './firebase';

// path配下のデータをリアルタイムで {id: data} の形で取得する共通フック（匿名ログインの完了を待ってから購読）
export function useFirebaseList(path) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let unsub = () => {};
    let alive = true;
    ensureAnonAuth().then(() => {
      if (!alive) return;
      unsub = onValue(ref(db, path), (snap) => {
        const result = {};
        snap.forEach((c) => { result[c.key] = c.val(); });
        setData(result);
        setLoading(false);
      }, (err) => { console.error(`${path} 読み込みエラー:`, err); setLoading(false); });
    });
    return () => { alive = false; unsub(); };
  }, [path]);
  return { data, loading };
}
