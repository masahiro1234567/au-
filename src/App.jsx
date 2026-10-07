import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useDbCollection } from './useFirebase.js';
import { ref as npRef, onValue as npOnValue } from 'firebase/database';
import { db as npDb, ensureAnonAuth } from './nippou/lib/firebase.js';
import { loadDraft, draftPath, draftLabel } from './nippou/lib/draft.js';
import { useSeen, isUnread, markSeen as markTermSeen, termTs } from './termNotify.js';
import { useNotices, NoticeBanner } from './notices.jsx';
import { recordOpen, loginStreak } from './testStats.js';
import { runAppBack, installTrackpadSwipe } from './backStack.js';
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

  // ---- ブラウザの「戻る」（PCのタッチパッドの2本指スワイプ・スマホの戻る）でサイトの外に出ないようにする ----
  // 画面を切り替えるたびにブラウザの履歴にも残し、「戻る」が来たら、右上の「← 戻る」と同じようにアプリの中で1つ前に戻る。
  // 画面の中で先に戻る処理がある（日報の中の画面・Brave X の投稿・開いているマニュアルなど）ときは、その画面が onAppBack で受け取って処理する
  const fromPop = useRef(false);
  const pageRef = useRef(page);
  pageRef.current = page;
  const histIdx = useRef(0); // 今いる履歴の位置（戻る／進むの区別に使う）
  useEffect(() => {
    try {
      window.history.replaceState({ aunavi: 'guard', i: 0 }, '');
      window.history.pushState({ aunavi: pageRef.current, i: 1 }, '');
      histIdx.current = 1;
    } catch (e) { /* 履歴が使えないブラウザでは何もしない */ }
    const push = (p) => { try { const i = histIdx.current + 1; window.history.pushState({ aunavi: p, i }, ''); histIdx.current = i; } catch (e) { /* 無視 */ } };
    // タッチパッドの横スワイプ：「右から左」→ 戻る、「左から右」→ さっきの画面に進む
    // ブラウザ自体のスワイプ（Safari など）と重なったときは、こちらの向きを優先する
    let swipeAt = 0, expect = '';
    const offSwipe = installTrackpadSwipe(
      () => { swipeAt = Date.now(); expect = 'back'; window.history.back(); },
      () => { swipeAt = Date.now(); expect = 'fwd'; window.history.forward(); },
      () => { swipeAt = Date.now(); expect = 'none'; }, // 画面の中で使ったスワイプ（サイドバー・タブ切り替え）
    );
    const onPop = (e) => {
      const st = e.state || {};
      const i = typeof st.i === 'number' ? st.i : 0;
      const dir = i > histIdx.current ? 'fwd' : 'back';
      if (Date.now() - swipeAt < 900 && expect && expect !== dir) {
        // スワイプと逆向きにブラウザが動いた：元の位置に戻して無視する
        const d = histIdx.current - i; if (d) { try { window.history.go(d); } catch (er) { /* 無視 */ } }
        return;
      }
      if (Date.now() - swipeAt < 900) expect = ''; // 1回のスワイプで動くのは1回だけ
      // 進む：さっき開いていた画面をもう一度開く
      if (dir === 'fwd') {
        histIdx.current = i;
        if (st.aunavi && st.aunavi !== 'guard' && st.aunavi !== pageRef.current) { fromPop.current = true; setPage(st.aunavi); }
        return;
      }
      histIdx.current = i;
      // 1) 画面の中で戻れるなら、そちらで戻る（ブラウザの履歴は今の画面のまま足し直す）
      if (runAppBack()) { push(pageRef.current); return; }
      // 2) これ以上戻れない（最初の入口まで来た）：サイトから出ずに、ホームに戻る（ホームならそのまま）
      if (!st.aunavi || st.aunavi === 'guard') {
        const to = pageRef.current === 'login' ? 'login' : 'home';
        if (to !== pageRef.current) { fromPop.current = true; setPage(to); }
        push(to);
        return;
      }
      // 3) 1つ前の画面へ
      if (st.aunavi !== pageRef.current) { fromPop.current = true; setPage(st.aunavi); }
    };
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
  useEffect(() => {
    if (fromPop.current) { fromPop.current = false; return; }
    try {
      if (!window.history.state || window.history.state.aunavi !== page) {
        const i = histIdx.current + 1; window.history.pushState({ aunavi: page, i }, ''); histIdx.current = i;
      }
    } catch (e) { /* 無視 */ }
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

  return (
    <>
      {content}
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
