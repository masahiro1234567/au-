import React, { useEffect, useState } from 'react';
import { useDbCollection } from './useFirebase.js';
import Glossary from './components/Glossary.jsx';
import Login from './components/Login.jsx';
import TestHome from './components/TestHome.jsx';
import Quiz from './components/Quiz.jsx';
import Result from './components/Result.jsx';
import AdminLogin from './components/AdminLogin.jsx';
import Admin from './components/Admin.jsx';

export default function App() {
  const [terms, termsLoaded] = useDbCollection('terms');
  const [results] = useDbCollection('test_results');
  const [profiles] = useDbCollection('user_profiles');

  const [page, setPage] = useState('glossary');
  const [isAdmin, setIsAdmin] = useState(sessionStorage.getItem('isAdmin') === '1');

  const [testUser, setTestUser] = useState(() => {
    const s = localStorage.getItem('autest_user');
    return s ? JSON.parse(s) : null;
  });

  const [quizConfig, setQuizConfig] = useState(null); // {mode, qtype, selRank}
  const [quizAnswers, setQuizAnswers] = useState(null);

  const goTest = () => setPage(testUser ? 'test-home' : 'login');

  const handleLogin = (user) => { setTestUser(user); setPage('test-home'); };

  const startQuiz = (config) => { setQuizConfig(config); setPage('quiz'); };

  const handleQuizFinish = (answers) => { setQuizAnswers(answers); setPage('result'); };

  const retrySameQuiz = () => setPage('quiz');

  const handleAdminLogout = () => {
    sessionStorage.removeItem('isAdmin');
    setIsAdmin(false);
    setPage('glossary');
  };

  if (!termsLoaded) {
    return (
      <div id="loading">
        <div className="loading-logo">au事業部 用語集</div>
        <div className="spinner" />
      </div>
    );
  }

  let content;
  switch (page) {
    case 'login':
      content = <Login onBack={() => setPage('glossary')} onLogin={handleLogin} />;
      break;
    case 'test-home':
      content = (
        <TestHome
          user={testUser}
          terms={terms}
          results={results}
          onBack={() => setPage('glossary')}
          onStartQuiz={startQuiz}
        />
      );
      break;
    case 'quiz':
      content = (
        <Quiz
          terms={terms}
          mode={quizConfig.mode}
          qtype={quizConfig.qtype}
          selRank={quizConfig.selRank}
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
          onBack={() => setPage('glossary')}
          onSuccess={() => { setIsAdmin(true); setPage('admin'); }}
        />
      );
      break;
    case 'admin':
      content = (
        <Admin
          terms={terms}
          results={results}
          profiles={profiles}
          onBack={() => setPage('glossary')}
          onLogout={handleAdminLogout}
        />
      );
      break;
    default:
      content = (
        <Glossary
          terms={terms}
          isAdmin={isAdmin}
          onGoTest={goTest}
          onAdminLogin={() => setPage('admin-login')}
        />
      );
  }

  return (
    <>
      {content}
      <div id="toast" />
    </>
  );
}
