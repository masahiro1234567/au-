import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import './styles.css';
import './manual/manual.css';
import './bravepost/bp.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>
);

// 新しいバージョンを出した直後に、古いページが消えた部品を読みに行って失敗したら、最新のページを1回だけ取り直す
window.addEventListener('vite:preloadError', (e) => {
  if (sessionStorage.getItem('chunk-retry')) return;
  e.preventDefault();
  sessionStorage.setItem('chunk-retry', '1');
  location.replace(location.pathname + '?v=' + Date.now());
});
window.addEventListener('load', () => { setTimeout(() => sessionStorage.removeItem('chunk-retry'), 5000); });

// デプロイ直後、ブラウザに残った古いページが消えたデザインファイルを読みに行って
// 見た目が崩れることがある。デザインが読み込めていなければ、最新のページを1回だけ取り直す
window.addEventListener('load', () => {
  const ok = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
  if (ok) { sessionStorage.removeItem('css-retry'); return; }
  if (sessionStorage.getItem('css-retry')) return;
  sessionStorage.setItem('css-retry', '1');
  location.replace(location.pathname + '?v=' + Date.now());
});
