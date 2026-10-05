import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './manual/manual.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// デプロイ直後、ブラウザに残った古いページが消えたデザインファイルを読みに行って
// 見た目が崩れることがある。デザインが読み込めていなければ、最新のページを1回だけ取り直す
window.addEventListener('load', () => {
  const ok = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
  if (ok) { sessionStorage.removeItem('css-retry'); return; }
  if (sessionStorage.getItem('css-retry')) return;
  sessionStorage.setItem('css-retry', '1');
  location.replace(location.pathname + '?v=' + Date.now());
});
