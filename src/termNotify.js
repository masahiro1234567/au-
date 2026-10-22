// ===== 用語の通知 =====
// 赤い〇：誰かが「変更が必要」と報告した用語（term_flags/{termId}）。管理者が解除するまで全員に出る
// 緑の〇：内容が更新された用語。その人が開くと、その人の画面からだけ消える
//   見た記録：user_profiles/{ユーザー}/seenTerms/{termId} = 見た時刻
//   基準時刻：user_profiles/{ユーザー}/seenBaseline（この機能を初めて使った時刻。それ以前の更新は〇を付けない）
import { useEffect } from 'react';
import { dbSet, dbPush, dbRemove, useDbCollection } from './useFirebase.js';

export const termTs = (t) => (t && (t.updatedAt || t.createdAt)) || 0;
export function isUnread(id, term, seen, baseline) {
  const ts = termTs(term);
  return !!baseline && ts > baseline && ts > ((seen && seen[id]) || 0);
}
export const isFlagged = (flags, id) => !!(flags && flags[id] && flags[id].active);

// ログイン中の人の「見た記録」。基準時刻が無ければ今で作る
export function useSeen(user, profiles) {
  const uid = user?.id;
  const [seen] = useDbCollection(uid ? `user_profiles/${uid}/seenTerms` : 'user_profiles/__none__/seenTerms');
  const baseline = uid && profiles && profiles[uid] ? profiles[uid].seenBaseline : null;
  useEffect(() => {
    if (uid && profiles && profiles[uid] && !profiles[uid].seenBaseline) dbSet(`user_profiles/${uid}/seenBaseline`, Date.now());
  }, [uid, profiles && profiles[uid] && profiles[uid].seenBaseline]);
  return { seen, baseline };
}
export function markSeen(user, termId) {
  if (user?.id && termId) dbSet(`user_profiles/${user.id}/seenTerms/${termId}`, Date.now());
}

// 変更が必要と報告（理由は任意）
export async function flagTerm(termId, userName, text) {
  await dbSet(`term_flags/${termId}/active`, true);
  await dbSet(`term_flags/${termId}/at`, Date.now());
  await dbPush(`term_flags/${termId}/reports`, { by: userName || '', text: (text || '').trim(), at: Date.now() });
}
// 警告の継続（直したが、まだ赤のままにする）＝ 最後の対応時刻だけ記録
export const keepFlag = (termId) => dbSet(`term_flags/${termId}/checkedAt`, Date.now());
// 解除（赤を消す。報告の履歴も消す）
export const clearFlag = (termId) => dbRemove(`term_flags/${termId}`);
