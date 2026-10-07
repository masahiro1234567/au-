import { useState } from 'react';

// 月の切り替え（‹ 2026年9月 ›）。month は 'YYYY-MM'
export function useMonth() {
  const t = new Date();
  return useState(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`);
}
export const inMonth = (date, month) => String(date || '').slice(0, 7) === month;
export default function MonthNav({ month, onChange }) {
  const [y, m] = month.split('-').map(Number);
  const move = (d) => { const dt = new Date(y, m - 1 + d, 1); onChange(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`); };
  return (
    <div className="np-month">
      <button className="fchip" onClick={() => move(-1)} aria-label="前の月">‹</button>
      <b>{y}年{m}月</b>
      <button className="fchip" onClick={() => move(1)} aria-label="次の月">›</button>
    </div>
  );
}
