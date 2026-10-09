import React from 'react';

// 画面のどこかでエラーが起きても真っ白にしない。原因の文字と、読み込み直す・保存データを消すボタンを出す
export default class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('au navi エラー:', err, info); }
  render() {
    const { err } = this.state;
    if (!err) return this.props.children;
    const reload = () => location.replace(location.pathname + '?v=' + Date.now());
    const clearAndReload = () => {
      if (!window.confirm('この端末に保存されている、ログイン情報と書きかけの日報を消して読み込み直します。よろしいですか？')) return;
      try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* 無視 */ }
      reload();
    };
    return (
      <div style={{ fontFamily: "'Noto Sans JP',sans-serif", maxWidth: 560, margin: '60px auto', padding: 20, color: '#1a0f08' }}>
        <h2 style={{ color: '#cc4f00' }}>画面を表示できませんでした</h2>
        <p style={{ lineHeight: 1.7 }}>「もう一度読み込む」を押してください。直らないときは、この画面のスクショを管理者に送ってください。</p>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#fff3eb', padding: 10, borderRadius: 8, fontSize: 12 }}>{String(err && (err.stack || err.message || err)).slice(0, 1200)}</pre>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={reload} style={{ height: 44, padding: '0 18px', border: 'none', borderRadius: 10, background: '#ff6600', color: '#fff', fontWeight: 700 }}>もう一度読み込む</button>
          <button onClick={clearAndReload} style={{ height: 44, padding: '0 18px', border: '1.5px solid #ffd9c0', borderRadius: 10, background: '#fff', color: '#cc4f00', fontWeight: 700 }}>保存データを消して読み込む</button>
        </div>
      </div>
    );
  }
}
