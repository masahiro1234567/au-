import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useDbCollection } from './useFirebase.js';
import { ref as npRef, onValue as npOnValue } from 'firebase/database';
import { db as npDb, ensureAnonAuth } from './nippou/lib/firebase.js';
import { loadDraft, draftPath, draftLabel } from './nippou/lib/draft.js';
import { useSeen, isUnread } from './termNotify.js';
import { recordOpen, loginStreak } from './testStats.js';
import { resolveKnowledgeTypes, isDescMissing } from './utils.js';
import DeviceCompare from './components/DeviceCompare.jsx';
// オレタブ：押した瞬間に全画面＋横向き固定を試す（Androidなど。iPhoneは回転表示で対応）
function tryLandscape() {
  try {
    const el = document.documentElement;
    const p = !document.fullscreenElement && el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : Promise.resolve();
    p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {});
  } catch { /* 非対応 */ }
}
// オレタブ練習は開いたときだけ読み込む（アプリ全体の読み込みを軽くするため）
const OreTab = lazy(() => import('./oretab/OreTab.jsx'));
// 日報も開いたときだけ読み込む
const NippouApp = lazy(() => import('./nippou/NippouApp.jsx'));
import Home from './components/Home.jsx';
import Glossary from './components/Glossary.jsx';
import Login from './components/Login.jsx';
import TestHome from './components/TestHome.jsx';
import EvalPage from './components/EvalPage.jsx';
import Quiz from './components/Quiz.jsx';
import Result from './components/Result.jsx';
import AdminLogin from './components/AdminLogin.jsx';
import Admin from './components/Admin.jsx';

export default function App() {
  const [terms, termsLoaded] = useDbCollection('terms');
  // 説明が未入力の用語は、ユーザー側（ホーム・用語一覧・テスト）には出さない
  // 名前の無いデータ（削除済みの用語に関連付けだけが書き込まれて残った「抜け殻」）は、どこにも表示しない
  const { validTerms, ghostIds } = useMemo(() => {
    const valid = {}; const ghosts = [];
    Object.entries(terms || {}).forEach(([id, t]) => {
      if (t && typeof t.name === 'string' && t.name.trim()) valid[id] = t; else ghosts.push(id);
    });
    return { validTerms: valid, ghostIds: ghosts };
  }, [terms]);
  const publicTerms = useMemo(
    () => Object.fromEntries(Object.entries(validTerms).filter(([, t]) => !isDescMissing(t))),
    [validTerms]
  );
  const [results] = useDbCollection('test_results');
  const [profiles] = useDbCollection('user_profiles');
  const [knowledgeTypesDb] = useDbCollection('knowledge_types');
  const [devices] = useDbCollection('devices');
  const [payConfig] = useDbCollection('oretab_pay'); // オレタブ：お支払い目安額の設定（管理画面で編集）
  const knowledgeTypes = resolveKnowledgeTypes(knowledgeTypesDb);
  const [termFlags] = useDbCollection('term_flags'); // 変更が必要と報告された用語
  const [userActivity] = useDbCollection('user_activity'); // au naviを開いた日（ランキングのログイン）

  // au navi のログイン（名簿と照合した人だけ）。以前の共通パスワード方式のログイン情報（uid無し）は、ログインし直してもらう
  const [testUser, setTestUser] = useState(() => {
    try { const u = JSON.parse(localStorage.getItem('autest_user') || 'null'); return u && u.uid ? u : null; } catch { return null; }
  });
  const [npStart, setNpStart] = useState('/');
  // 用語の更新通知：その人の「見た」記録と、未読の更新件数
  const { seen, baseline } = useSeen(testUser, profiles);
  const unreadCount = Object.entries(publicTerms).filter(([id, t]) => isUnread(id, t, seen, baseline)).length;
  const [loginNotice, setLoginNotice] = useState('');
  const handleLogout = (notice) => {
    // au navi からログアウトしたら、管理者モードも一緒に終わる
    sessionStorage.removeItem('isAdmin'); setIsAdmin(false);
    localStorage.removeItem('autest_user'); setTestUser(null); setPage('login');
    setLoginNotice(typeof notice === 'string' ? notice : '');
  };

  // au navi を開いた日を記録（ランキングの「ログイン」。1日1回）
  useEffect(() => { if (testUser?.uid) recordOpen(testUser); }, [testUser?.uid]);

  // ログイン中の人の名簿の状態を見張る。管理画面で「ログイン不可」にされた・名簿から削除された場合は、その場で自動ログアウト
  // 「閲覧のみ」などの権限の変更も、ログインし直さずに反映する
  useEffect(() => {
    if (!testUser?.uid) return undefined;
    let unsub = () => {};
    let alive = true;
    ensureAnonAuth().then(() => {
      if (!alive) return;
      unsub = npOnValue(npRef(npDb, `fp_users/${testUser.uid}`), (snap) => {
        const u = snap.val();
        if (!u) return handleLogout('名簿から登録が外されたため、ログアウトしました');
        if (u.permission === 'disabled') return handleLogout('このアカウントはログインが禁止されたため、ログアウトしました');
        if (u.permission === 'pending') return handleLogout('利用申請の承認待ちに戻されたため、ログアウトしました');
        if (u.permission && u.permission !== testUser.permission) {
          const next = { ...testUser, permission: u.permission };
          localStorage.setItem('autest_user', JSON.stringify(next));
          setTestUser(next);
        }
      }, () => { /* 通信できないときは何もしない（ログイン状態はそのまま） */ });
    });
    return () => { alive = false; unsub(); };
  }, [testUser?.uid, testUser?.permission]);

  const [page, setPage] = useState(testUser ? 'home' : 'login');
  const [glossaryCat, setGlossaryCat] = useState('all');
  const [glossaryQuery, setGlossaryQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(sessionStorage.getItem('isAdmin') === '1');

  const [quizConfig, setQuizConfig] = useState(null); // {mode, qtype, selRank}
  const [quizAnswers, setQuizAnswers] = useState(null);

  const goTest = () => setPage('test-home');

  const handleLogin = (user) => { setTestUser(user); setPage('home'); };

  const startQuiz = (config) => { setQuizConfig(config); setPage('quiz'); };

  const handleQuizFinish = (answers) => { setQuizAnswers(answers); setPage('result'); };

  const retrySameQuiz = () => setPage('quiz');

  const handleAdminLogout = () => {
    sessionStorage.removeItem('isAdmin');
    setIsAdmin(false);
    setPage('home');
  };

  if (!termsLoaded) {
    return (
      <div id="loading">
        <div className="loading-logo">au navi</div>
        <div className="spinner" />
      </div>
    );
  }

  const homeEl = (
    <Home
      terms={publicTerms}
      testUser={testUser}
      onOpenFiltered={({ category, q }) => {
        setGlossaryCat(category || 'all');
        setGlossaryQuery(q || '');
        setPage('glossary');
      }}
      onGoTest={goTest}
      onGoDevices={() => setPage('devices')}
      onGoOreTab={() => { tryLandscape(); setPage('oretab'); }}
      onGoNippou={() => { setNpStart('/'); setPage('nippou'); }}
      unreadCount={unreadCount}
      streak={testUser ? loginStreak(userActivity, testUser.name) : null}
      draft={loadDraft(testUser?.name)}
      draftText={(() => { const d = loadDraft(testUser?.name); return d ? draftLabel(d) : ''; })()}
      onResumeDraft={(d) => { setNpStart(draftPath(d)); setPage('nippou'); }}
      onGoKpi={() => { setNpStart('/kpi'); setPage('nippou'); }}
      onGoEval={() => setPage('eval')}
      onLogout={handleLogout}
      onAdminLogin={() => setPage('admin-login')}
    />
  );

  let content;
  switch (testUser ? page : 'login') {
    case 'home':
      content = homeEl;
      break;
    case 'oretab':
      content = (
        <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
          <OreTab onExit={() => setPage('home')} payConfig={payConfig} />
        </Suspense>
      );
      break;
    case 'eval':
      content = <EvalPage isAdmin={false} user={testUser} onBack={() => setPage('home')} />;
      break;
    case 'nippou':
      content = (
        <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
          <NippouApp key={npStart} user={testUser} isAdmin={isAdmin} startPath={npStart}
            onExit={() => setPage('home')} onAdmin={() => setPage(isAdmin ? 'admin' : 'admin-login')} />
        </Suspense>
      );
      break;
    case 'devices':
      content = <DeviceCompare devices={devices} onBack={() => setPage('home')} />;
      break;
    case 'glossary':
      content = (
        <Glossary
          terms={publicTerms}
          knowledgeTypes={knowledgeTypes}
          isAdmin={isAdmin}
          initialCat={glossaryCat}
          initialQuery={glossaryQuery}
          onBackHome={() => setPage('home')}
          onGoTest={goTest}
          onAdminLogin={() => setPage('admin-login')}
          user={testUser}
          flags={termFlags}
          seen={seen}
          baseline={baseline}
        />
      );
      break;
    case 'login':
      content = <Login onLogin={(u) => { setLoginNotice(''); handleLogin(u); }} profiles={profiles} notice={loginNotice} />;
      break;
    case 'test-home':
      content = (
        <TestHome
          user={testUser}
          terms={publicTerms}
          results={results}
          profiles={profiles}
          activity={userActivity}
          onBack={() => setPage('home')}
          onStartQuiz={startQuiz}
        />
      );
      break;
    case 'quiz':
      content = (
        <Quiz
          terms={publicTerms}
          mode={quizConfig.mode}
          qtype={quizConfig.qtype}
          selRank={quizConfig.selRank}
          mastered={quizConfig.mastered}
          onFinish={handleQuizFinish}
          onQuit={() => setPage('test-home')}
        />
      );
      break;
    case 'result':
      content = (
        <Result
          user={testUser}
          mode={quizConfig.mode}
          qtype={quizConfig.qtype}
          selRank={quizConfig.selRank}
          answers={quizAnswers}
          onHome={() => setPage('test-home')}
          onRetry={retrySameQuiz}
        />
      );
      break;
    case 'admin-login':
      content = (
        <AdminLogin
          onBack={() => setPage('home')}
          onSuccess={() => { setIsAdmin(true); setPage('admin'); }}
        />
      );
      break;
    case 'admin':
      content = (
        <Admin
          terms={validTerms}
          ghostIds={ghostIds}
          knowledgeTypes={knowledgeTypes}
          devices={devices}
          payConfig={payConfig}
          user={testUser}
          flags={termFlags}
          results={results}
          profiles={profiles}
          onBack={handleAdminLogout}
          onLogout={handleAdminLogout}
        />
      );
      break;
    default:
      content = homeEl;
  }

  return (
    <>
      {content}
      <div id="toast" />
    </>
  );
}
