// 日報のデータは今までどおり「nippou-data-base」に置く（用語集の au-data-base とは別のFirebase）
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDzhKiWLngKPLL85L8JyBkOQCWztLoSMwI',
  authDomain: 'nippou-data-base.firebaseapp.com',
  databaseURL: 'https://nippou-data-base-default-rtdb.firebaseio.com',
  projectId: 'nippou-data-base',
  storageBucket: 'nippou-data-base.firebasestorage.app',
  messagingSenderId: '516171183375',
  appId: '1:516171183375:web:bffa959ef109da150aba7a',
};

// 用語集側のFirebaseと区別するため、名前付きで初期化する
export const app = getApps().find((a) => a.name === 'nippou') || initializeApp(firebaseConfig, 'nippou');
export const db = getDatabase(app);
export const auth = getAuth(app);

// 日報のデータベースは「ログイン済み（匿名でも可）」でないと読み書きできないルールのため、匿名でサインインしておく
let anonPromise = null;
export function ensureAnonAuth() {
  if (!anonPromise) {
    anonPromise = signInAnonymously(auth).catch((e) => {
      console.error('匿名ログイン失敗:', e);
      anonPromise = null;
    });
  }
  return anonPromise;
}
