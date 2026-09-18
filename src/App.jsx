import React, { useEffect, useState } from 'react';
import { useDbCollection } from './useFirebase.js';
import { resolveKnowledgeTypes } from './utils.js';
import Home from './components/Home.jsx';
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
  const [knowledgeTypesDb] = useDbCollection('knowledge_types');
  const knowledgeTypes = resolveKnowledgeTypes(knowledgeTypesDb);

  const [testUser, setTestUser] = useState(() => {
    const s = localStorage.getItem('autest_user');
    return s ? JSON.parse(s) : null;
  });

  const [page, setPage] = useState(testUser ? 'home' : 'login');
  const [glossaryCat, setGlossaryCat] = useState('all');
  const [glossarySection, setGlossarySection] = useState('all');
  const [glossaryKnowledgeType, setGlossaryKnowledgeType] = useState('all');
  const [glossaryKnowledgeSubType, setGlossaryKnowledgeSubType] = useState('all');
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
        <div className="loading-logo">au事業部 用語集</div>
        <div className="spinner" />
      </div>
    );
  }

  let content;
  switch (page) {
    case 'home':
      content = (
        <Home
          terms={terms}
          knowledgeTypes={knowledgeTypes}
          onOpenFiltered={({ knowledgeType, knowledgeSubType, category, section }) => {
            setGlossaryKnowledgeType(knowledgeType || 'all');
            setGlossaryKnowledgeSubType(knowledgeSubType || 'all');
            setGlossaryCat(category || 'all');
            setGlossarySection(section || 'all');
            setPage('glossary');
          }}
          onViewAll={() => {
            setGlossaryCat('all'); setGlossarySection('all');
            setGlossaryKnowledgeType('all'); setGlossaryKnowledgeSubType('all');
            setPage('glossary');
          }}
          onGoTest={goTest}
          onAdminLogin={() => setPage('admin-login')}
        />
      );
      break;
    case 'glossary':
      content = (
        <Glossary
          terms={terms}
          knowledgeTypes={knowledgeTypes}
          isAdmin={isAdmin}
          initialCat={glossaryCat}
          initialSection={glossarySection}
          initialKnowledgeType={glossaryKnowledgeType}
          initialKnowledgeSubType={glossaryKnowledgeSubType}
          onBackHome={() => setPage('home')}
          onGoTest={goTest}
          onAdminLogin={() => setPage('admin-login')}
        />
      );
      break;
    case 'login':
      content = <Login onLogin={handleLogin} profiles={profiles} />;
      break;
    case 'test-home':
      content = (
        <TestHome
          user={testUser}
          terms={terms}
          results={results}
          onBack={() => setPage('home')}
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
          onBack={() => setPage('home')}
          onSuccess={() => { setIsAdmin(true); setPage('admin'); }}
        />
      );
      break;
    case 'admin':
      content = (
        <Admin
          terms={terms}
          knowledgeTypes={knowledgeTypes}
          results={results}
          profiles={profiles}
          onBack={() => setPage('home')}
          onLogout={handleAdminLogout}
        />
      );
      break;
    default:
      content = (
        <Home
          terms={terms}
          knowledgeTypes={knowledgeTypes}
          onOpenFiltered={({ knowledgeType, knowledgeSubType, category, section }) => {
            setGlossaryKnowledgeType(knowledgeType || 'all');
            setGlossaryKnowledgeSubType(knowledgeSubType || 'all');
            setGlossaryCat(category || 'all');
            setGlossarySection(section || 'all');
            setPage('glossary');
          }}
          onViewAll={() => {
            setGlossaryCat('all'); setGlossarySection('all');
            setGlossaryKnowledgeType('all'); setGlossaryKnowledgeSubType('all');
            setPage('glossary');
          }}
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
