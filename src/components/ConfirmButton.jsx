import React, { useState } from 'react';

// window.confirm() はスタンドアロン(ホーム画面追加)表示のブラウザでは動かないことがあるため、
// それに依存しない、画面内で完結する確認UIを提供する。
// 使い方：クリックすると「本当に削除しますか？」の確認行に切り替わり、はい/キャンセルで確定する。
export function ConfirmButton({ label, message, onConfirm, className, style, confirmStyle, cancelStyle, wrapStyle }) {
  const [armed, setArmed] = useState(false);

  if (armed) {
    return (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', ...wrapStyle }}>
        <span style={{ fontSize: '.72rem', color: '#dc2626', fontWeight: 700 }}>{message || '本当に削除しますか？'}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setArmed(false); onConfirm(); }}
          style={confirmStyle || { background: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          はい、削除する
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setArmed(false); }}
          style={cancelStyle || { background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', color: 'var(--sub)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          キャンセル
        </button>
      </span>
    );
  }

  return (
    <button type="button" className={className} onClick={(e) => { e.stopPropagation(); setArmed(true); }} style={style}>
      {label}
    </button>
  );
}
