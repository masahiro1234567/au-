import React, { useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';

// ===== サンプル（canvas）の画面をそのまま動かすための小さな仕組み =====
// テンプレート（HTML）に {{ 名前 }} の穴、<sc-for>（くり返し）、<sc-if>（出す・出さない）がある。
// ロジックは class Component extends DCLogic { renderVals() { return {...} } } の形。
// this.state と this.setState() が使える。

export class DCLogic {
  constructor() { this.state = {}; this._rerender = () => {}; }
  setState(patch) {
    const p = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = { ...this.state, ...p };
    this._rerender();
  }
}

const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
const ONLY_HOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

function look(path, scope) {
  const p = path.trim();
  if (p === 'true') return true;
  if (p === 'false') return false;
  if (p === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(p)) return Number(p);
  const parts = p.split('.');
  let v = scope[parts[0]];
  for (let i = 1; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
  return v;
}
const fill = (str, scope) => str.replace(HOLE, (_, p) => { const v = look(p, scope); return v == null ? '' : String(v); });

function styleObj(str) {
  const o = {};
  str.split(';').forEach((decl) => {
    const i = decl.indexOf(':');
    if (i < 0) return;
    const k = decl.slice(0, i).trim();
    const v = decl.slice(i + 1).trim();
    if (!k || v === '') return;
    if (k.startsWith('--')) { o[k] = v; return; }
    o[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  });
  return o;
}

const ATTR = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', colspan: 'colSpan', rowspan: 'rowSpan', maxlength: 'maxLength', viewbox: 'viewBox' };
const BOOL = new Set(['checked', 'selected', 'disabled', 'readOnly', 'hidden', 'open']);
const EVENTS = { onclick: 'onClick', onchange: 'onChange', oninput: 'onChange', onkeydown: 'onKeyDown', onblur: 'onBlur', onfocus: 'onFocus', onsubmit: 'onSubmit' };

function propsOf(el, scope, key) {
  const props = { key };
  let hasHandler = false;
  for (const { name, value } of Array.from(el.attributes)) {
    const lower = name.toLowerCase();
    if (lower.startsWith('hint-')) continue;
    if (EVENTS[lower]) {
      const m = value.match(ONLY_HOLE);
      const fn = m ? look(m[1], scope) : null;
      if (typeof fn === 'function') { props[EVENTS[lower]] = fn; hasHandler = true; }
      continue;
    }
    const m = value.match(ONLY_HOLE);
    let v = m ? look(m[1], scope) : fill(value, scope);
    let k = ATTR[lower] || name;
    if (!lower.startsWith('data-') && !lower.startsWith('aria-') && k.includes('-')) k = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (k === 'style') { props.style = styleObj(String(v ?? '')); continue; }
    if (BOOL.has(k)) { if (v === false || v === 'false' || v == null) continue; v = true; }
    props[k] = v;
  }
  const tag = el.tagName.toLowerCase();
  if ((tag === 'input' || tag === 'select' || tag === 'textarea') && 'value' in props) {
    if (props.value == null) props.value = '';
    if (!hasHandler) { props.defaultValue = props.value; delete props.value; }
  }
  if (tag === 'option' && 'selected' in props) delete props.selected;
  return props;
}

function renderNodes(nodes, scope, keyBase) {
  const out = [];
  nodes.forEach((n, i) => {
    const key = `${keyBase}.${i}`;
    if (n.nodeType === 3) {
      const t = n.nodeValue;
      if (!t.trim()) { if (t.length) out.push(' '); return; }
      out.push(fill(t, scope));
      return;
    }
    if (n.nodeType !== 1) return;
    const tag = n.tagName.toLowerCase();
    if (tag === 'sc-for') {
      const m = (n.getAttribute('list') || '').match(ONLY_HOLE);
      const list = (m && look(m[1], scope)) || [];
      const as = n.getAttribute('as') || 'item';
      (Array.isArray(list) ? list : []).forEach((item, j) => {
        out.push(<React.Fragment key={`${key}:${j}`}>{renderNodes(Array.from(n.childNodes), { ...scope, [as]: item }, `${key}:${j}`)}</React.Fragment>);
      });
      return;
    }
    if (tag === 'sc-if') {
      const m = (n.getAttribute('value') || '').match(ONLY_HOLE);
      if (m && look(m[1], scope)) out.push(<React.Fragment key={key}>{renderNodes(Array.from(n.childNodes), scope, key)}</React.Fragment>);
      return;
    }
    if (tag === 'helmet' || tag === 'script') return;
    const props = propsOf(n, scope, key);
    const kids = renderNodes(Array.from(n.childNodes), scope, key);
    const voidTag = ['input', 'br', 'img', 'hr', 'meta'].includes(tag);
    out.push(React.createElement(tag, props, voidTag || !kids.length ? undefined : kids));
  });
  return out;
}

// テンプレートを1回だけ読む（<helmet> の <style> はそのまま差し込む）
function parse(tpl) {
  const doc = new DOMParser().parseFromString(`<div>${tpl}</div>`, 'text/html');
  const wrap = doc.body.firstChild;
  const css = Array.from(wrap.querySelectorAll('helmet style')).map((s) => s.textContent).join('\n');
  wrap.querySelectorAll('helmet').forEach((h) => h.remove());
  return { css, nodes: Array.from(wrap.childNodes) };
}

export function DcView({ tpl, Logic, rootStyle }) {
  const parsed = useMemo(() => parse(tpl), [tpl]);
  const [, tick] = useReducer((x) => x + 1, 0);
  const inst = useMemo(() => new Logic(), [Logic]);
  inst._rerender = tick;
  let vals = {};
  try { vals = inst.renderVals() || {}; } catch (e) { console.error(e); }
  const nodes = renderNodes(parsed.nodes, vals, 'r');
  return (
    <>
      <style>{parsed.css}</style>
      {rootStyle ? <div style={rootStyle}>{nodes}</div> : nodes}
    </>
  );
}

// 横幅の決まった画面を、入る幅に縮めて見せる（小さすぎるときは横にスクロール）
export function FitBox({ width, min = 0.55, children }) {
  const outer = useRef(null);
  const inner = useRef(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const s = Math.max(min, Math.min(1, outer.current.clientWidth / width));
      setScale(s);
      setH(inner.current.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer.current);
    ro.observe(inner.current);
    return () => ro.disconnect();
  }, [width, min]);
  return (
    <div ref={outer} className="dcv-fit" style={{ width: '100%', overflowX: scale <= min ? 'auto' : 'hidden' }}>
      <div style={{ width: width * scale, height: h || undefined }}>
        <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
      </div>
    </div>
  );
}
