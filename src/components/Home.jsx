import React, { useMemo, useState } from 'react';
import { CATEGORIES_BASE, CATEGORIES_SECTIONS } from '../utils.js';

function PillRow({ label, options, value, onSelect, counts }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 6, fontWeight: 700 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: '.82rem', fontWeight: 700, cursor: 'pointer',
                border: active ? 'none' : '1.5px solid var(--border)',
                background: active ? 'var(--primary)' : '#fff',
                color: active ? '#fff' : 'var(--text)',
              }}
            >
              {opt}{counts && counts[opt] != null ? `（${counts[opt]}）` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Home({ terms, knowledgeTypes, onOpenFiltered, onViewAll, onGoTest, onAdminLogin }) {
  const entries = useMemo(() => Object.values(terms), [terms]);
  const typeNames = useMemo(() => (knowledgeTypes || []).map((t) => t.name), [knowledgeTypes]);

  const [knowledgeType, setKnowledgeType] = useState('');
  const [knowledgeSubType, setKnowledgeSubType] = useState('');
  const [category, setCategory] = useState('');
  const [section, setSection] = useState('');

  const currentTypeChildren = (knowledgeTypes || []).find((t) => t.name === knowledgeType)?.children || [];
  const subtypeNames = currentTypeChildren.map((c) => c.name);
  const needsSub = subtypeNames.length > 0;
  const readyForCategory = knowledgeType && (!needsSub || knowledgeSubType);
  const readyForResult = readyForCategory && category;

  const selectType = (v) => { setKnowledgeType(v); setKnowledgeSubType(''); setCategory(''); setSection(''); };
  const selectSub = (v) => { setKnowledgeSubType(v); setCategory(''); setSection(''); };
  const selectCategory = (v) => { setCategory(v); setSection(''); };

  const pathLabel = [knowledgeType, knowledgeSubType, category, section].filter(Boolean).join(' / ');

  return (
    <div className="page">
      <header className="hdr">
        <div className="logo">
          <div className="logo-mark">au</div>
          <h1>au事業部 用語集</h1>
        </div>
      </header>
      <div className="t-body">
        <div className="home-hero">
          <div className="home-hero-title">今日も学んでいこう 🔥</div>
          <div className="home-hero-sub">全{entries.length}件の用語を収録</div>
        </div>

        <PillRow label="知識の種類" options={typeNames} value={knowledgeType} onSelect={selectType} />

        {needsSub && (
          <PillRow label="区分" options={subtypeNames} value={knowledgeSubType} onSelect={selectSub} />
        )}

        {readyForCategory && (
          <PillRow label="カテゴリ" options={CATEGORIES_BASE} value={category} onSelect={selectCategory} />
        )}

        {category && (
          <PillRow label="部分知識（任意）" options={CATEGORIES_SECTIONS} value={section} onSelect={(v) => setSection(v === section ? '' : v)} />
        )}

        {readyForResult && (
          <button
            className="home-viewall"
            style={{ marginTop: 4 }}
            onClick={() => onOpenFiltered({ knowledgeType, knowledgeSubType, category, section })}
          >
            この条件で見る（{pathLabel}）
          </button>
        )}

        <button className="home-viewall" onClick={onViewAll}>📚 すべての用語を見る</button>

        <div className="home-actions">
          <button className="tbtn tbtn-outline" onClick={onGoTest}>📝 テストを受ける</button>
          <button className="tbtn tbtn-outline" onClick={onAdminLogin}>🔐 管理者ログイン</button>
        </div>
      </div>
    </div>
  );
}
