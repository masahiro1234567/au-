import React from 'react';
// テストの○×（絵文字ではなく線で描く。正解＝赤い丸、不正解＝青い×）
export const MarkOk = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="14" fill="none" stroke="#dc2626" strokeWidth="4" /></svg>
);
export const MarkNg = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true"><path d="M10 10l20 20M30 10L10 30" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" /></svg>
);
