import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useDbCollection } from './useFirebase.js';
import { ref as npRef, onValue as npOnValue } from 'firebase/database';
import { db as npDb, ensureAnonAuth } from './nippou/lib/firebase.js';
import { loadDraft, draftPath, draftLabel } from './nippou/lib/draft.js';
import { useSeen, isUnread, markSeen as markTermSeen, termTs } from './termNotify.js';
import { useNotices, NoticeBanner } from './notices.jsx';
import { recordOpen, loginStreak } from './testStats.js';
import { runAppBack, installTrackpadSwipe } from './backStack.js';
import SwipeIndicator from './SwipeIndicator.jsx';
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
import MyPage from './components/MyPage.jsx';
import Quiz from './components/Quiz.jsx';
import Result from './components/Result.jsx';
import AdminLogin from './components/AdminLogin.jsx';
import Admin from './components/Admin.jsx';
import BravePost from './bravepost/BravePost.jsx';
import RivalPage from './rival/RivalPage.jsx';
import CasesPage from './cases/CasesPage.jsx';

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
  const unreadTerms = Object.entries(publicTerms).filter(([id, t]) => isUnread(id, t, seen, baseline));
  const unreadCount = unreadTerms.length;
  // ===== お知らせ：ホームの赤丸と、タブを開いたときの通知 =====
  const glossaryCards = unreadTerms.length ? [{
    key: 'glossary-terms', tab: 'glossary', title: `用語の更新が${unreadTerms.length}件あります`,
    body: unreadTerms.slice(0, 3).map(([, t]) => `「${t.name || t.term || ''}」`).join('　') + (unreadTerms.length > 3 ? ` ほか${unreadTerms.length - 3}件` : ''),
    at: Math.max(...unreadTerms.map(([, t]) => termTs(t))), ids: unreadTerms.map(([id]) => 'term:' + id),
    onSeen: () => unreadTerms.forEach(([id]) => markTermSeen(testUser, id)),
  }] : [];
  const nt = useNotices(testUser, { glossary: glossaryCards });
  const [ntHidden, setNtHidden] = useState({}); // 「あとで見る」で閉じたタブ（その画面を出るまで出さない）
  const [ntPending, setNtPending] = useState(null); // オレタブは開く前にホームで出す
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
        setMyPos(u.position || '');
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
  // 名簿の役職（獲得例蓄積は SAM 以上と管理者だけ）
  const [myPos, setMyPos] = useState('');

  // ---- 戻る・進む（PCのタッチパッドの2本指スワイプ・スマホやブラウザの戻る）----
  // ・アプリの中で開いた画面の順番を自分で覚える（navStack）。戻ったら fwdStack に積んで、進むで戻せる
  // ・ブラウザの履歴は「サイトから出ないための1件」だけ使う（戻るが来たら、アプリの中で1つ戻ってまた1件足す）
  // ・画面の中で先に戻る処理がある（日報の中・Brave X の投稿・マニュアルなど）ときは、そちらが onAppBack で受け取る
  const pageRef = useRef(page);
  pageRef.current = page;
  const navStack = useRef([page]);
  const fwdStack = useRef([]);
  const fromNav = useRef(false);
  const [navAnim, setNavAnim] = useState(null); // { dir: 'L'|'R', n }：切り替わるときに画面が滑り込む
  const NO_FWD = ['login', 'quiz', 'result', 'admin-login', 'oretab'];
  const animate = (dir) => setNavAnim((a) => ({ dir, n: ((a && a.n) || 0) + 1 }));
  const doBack = () => {
    if (runAppBack()) { animate('L'); return; }
    const st = navStack.current;
    const cur = pageRef.current;
    if (cur === 'login') return;
    let to = '';
    if (st.length > 1) { st.pop(); to = st[st.length - 1]; } else if (cur !== 'home') { to = 'home'; navStack.current = ['home']; }
    if (!to || to === cur) return;
    if (!NO_FWD.includes(cur)) fwdStack.current.unshift(cur);
    fromNav.current = true; setPage(to); animate('L');
  };
  const doForward = () => {
    const to = fwdStack.current.shift();
    if (!to) return;
    navStack.current.push(to);
    fromNav.current = true; setPage(to); animate('R');
  };
  const doBackRef = useRef(doBack); doBackRef.current = doBack;
  const doFwdRef = useRef(doForward); doFwdRef.current = doForward;
  useEffect(() => {
    try {
      window.history.replaceState({ aunavi: 'guard' }, '');
      window.history.pushState({ aunavi: 'app' }, '');
    } catch (e) { /* 履歴が使えないブラウザでは何もしない */ }
    // ブラウザ・スマホの「戻る」：アプリの中で1つ戻って、サイトから出ないように1件足し直す
    const onPop = () => {
      doBackRef.current();
      try { window.history.pushState({ aunavi: 'app' }, ''); } catch (e) { /* 無視 */ }
    };
    const offSwipe = installTrackpadSwipe({
      onBack: () => doBackRef.current(),
      onForward: () => doFwdRef.current(),
      canBack: () => pageRef.current !== 'login' && (pageRef.current !== 'home' || navStack.current.length > 1),
      canForward: () => fwdStack.current.length > 0,
    });
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('popstate', onPop); offSwipe(); };
  }, []);
  // 画面が変わったら「あとで見る」をリセット（次にそのタブを開いたら、また出す）
  useEffect(() => { setNtHidden({}); }, [page]);
  // オレタブ以外の画面に移ったら、全画面表示と横向き固定を必ず解除する（×・← 戻る・スワイプ、どの戻り方でも）
  useEffect(() => {
    if (page === 'oretab') return;
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch { /* 非対応 */ }
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch { /* 非対応 */ }
  }, [page]);
  // ふつうに画面を開いたとき：開いた順番に足す（進むの記録は消す）
  useEffect(() => {
    if (fromNav.current) { fromNav.current = false; return; }
    const st = navStack.current;
    if (page === 'home' || page === 'login') navStack.current = [page];
    else if (st[st.length - 1] !== page) st.push(page);
    fwdStack.current = [];
  }, [page]);
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

  const canCases = isAdmin || ['責任者', 'MQ', 'SAM'].includes(myPos);
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
      onGoOreTab={() => {
        const go = () => { tryLandscape(); setPage('oretab'); };
        if ((nt.cards.oretab || []).length) setNtPending(() => go); else go();
      }}
      badges={{ 用語一覧: nt.count('glossary'), 機種比較: nt.count('devices'), オレタブ: nt.count('oretab'), KPI: nt.count('kpi'), 日報: nt.count('nippou'), 'Brave X': nt.count('bx'), テスト: nt.count('test'), 評価一覧: nt.count('eval'), マイページ: nt.count('mypage') }}
      onGoNippou={() => { setNpStart('/'); setPage('nippou'); }}
      unreadCount={unreadCount}
      streak={testUser ? loginStreak(userActivity, testUser.name) : null}
      draft={loadDraft(testUser?.name)}
      draftText={(() => { const d = loadDraft(testUser?.name); return d ? draftLabel(d) : ''; })()}
      onResumeDraft={(d) => { setNpStart(draftPath(d)); setPage('nippou'); }}
      onGoKpi={() => { setNpStart('/kpi'); setPage('nippou'); }}
      onGoEval={() => setPage('eval')}
      onGoMyPage={() => setPage('mypage')}
      onGoBravePost={() => setPage('bravepost')}
      onGoRival={() => setPage('rival')}
      onGoCases={canCases ? () => setPage('cases') : null}
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
    case 'bravepost':
      content = <BravePost user={testUser} onBack={() => setPage('home')} ntIsNew={nt.isNew} ntMarkSeen={nt.markSeen} />;
      break;
    case 'rival':
      content = <RivalPage user={testUser} isAdmin={isAdmin} onBack={() => setPage('home')} />;
      break;
    case 'cases':
      content = canCases ? <CasesPage user={testUser} isAdmin={isAdmin} onBack={() => setPage('home')} /> : homeEl;
      break;
    case 'mypage':
      content = <MyPage user={testUser} onBack={() => setPage('home')} onGoKpi={() => { setNpStart('/kpi'); setPage('nippou'); }} />;
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

  // 今の画面がどのタブか（お知らせの出し先）
  const ntTab = !testUser ? '' : ntPending ? 'oretab' : ({ glossary: 'glossary', devices: 'devices', bravepost: 'bx', 'test-home': 'test', eval: 'eval', mypage: 'mypage' }[page] || (page === 'nippou' ? (npStart === '/kpi' ? 'kpi' : 'nippou') : ''));
  const ntCards = ntTab ? (nt.cards[ntTab] || []) : [];
  const ntShow = ntTab && ntCards.length > 0 && !ntHidden[ntTab];
  const ntDone = () => { if (ntPending) { const go = ntPending; setNtPending(null); go(); } };

  const navCls = navAnim ? `nav-in-${navAnim.dir}${navAnim.n % 2 ? 'a' : 'b'}` : '';
  return (
    <>
      <div className={`nav-wrap ${navCls}`} onAnimationEnd={(e) => { if (e.target === e.currentTarget) { setNavAnim(null); if (window.scrollX) window.scrollTo(0, window.scrollY); } }}>
        {content}
      </div>
      <SwipeIndicator />
      {ntShow && (
        <NoticeBanner tab={ntTab} cards={ntCards}
          onConfirm={async (c) => { await nt.confirm(c); if (ntCards.length <= 1) ntDone(); }}
          onConfirmAll={async () => { await nt.confirm(ntCards); ntDone(); }}
          onLater={() => { setNtHidden((h) => ({ ...h, [ntTab]: true })); ntDone(); }} />
      )}
      <div id="toast" />
    </>
  );
}
