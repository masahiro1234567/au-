# au事業部 用語集（React版）

元のHTML1枚構成を、ページ・機能ごとにファイル分割したReact（Vite）版です。
Firebaseの接続先（au-data-base）はそのまま使っているので、データはこれまでの用語・テスト結果・プロフィールが引き続き使えます。

## ファイル構成

```
src/
  firebase.js          Firebase初期化
  useFirebase.js        Realtime Databaseの読み書きをまとめたhook
  utils.js               共通定数・ユーティリティ（ランク色・管理者パスワードなど）
  App.jsx                 画面切り替え（ルーティング）
  styles.css              全体スタイル
  components/
    Sidebar.jsx           用語集のフィルターサイドバー
    TermModals.jsx        用語の追加/編集/詳細モーダル
    Glossary.jsx          用語集トップページ
    Login.jsx             テスト用ログイン
    TestHome.jsx          テストホーム（モード選択・進捗・ランキング）
    Quiz.jsx              クイズ本体
    Result.jsx             テスト結果
    AdminLogin.jsx          管理者ログイン
    Admin.jsx                管理者ダッシュボード（サマリー/ログ/プロフィール）
    AdminTermsTab.jsx        管理者の用語管理タブ（一括登録・PC複数列・デフォルト全収束）
```

## 動作確認（ローカル）

```bash
npm install
npm run dev
```

## デプロイ（Vercel・既存のIN評価ダッシュボードと同じ流れ）

1. このフォルダをGitHubの新しいリポジトリにpush
2. Vercelで「Import Project」→ そのリポジトリを選択
3. Build Command: `npm run build` / Output Directory: `dist`（Viteプロジェクトとして自動検出されます）
4. デプロイ後のURLをau事業部用語集として共有

## 今後の修正がしやすくなった点

- 用語管理タブの並びを変えたい → `AdminTermsTab.jsx`だけ見ればOK
- クイズの出題ロジックを変えたい → `Quiz.jsx`の`buildQuiz()`だけ見ればOK
- デザイン（色・余白）を変えたい → `styles.css`の該当クラスだけ見ればOK
- 元のHTML版のように1ファイルに全部混ざることがなくなったので、影響範囲を確認しながら直せます

## 管理者パスワード

`src/utils.js`の`ADMIN_PW`に平文で入っています（元のHTML版と同じ仕様です）。
