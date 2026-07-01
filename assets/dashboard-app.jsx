/* HUMIND dashboard — app shell */
const { useState: uState, useEffect: uEffect, useRef: uRef } = React;

/* **bold** + newline renderer */
function md(text) {
  return text.split('\n').flatMap((line, li, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const spans = parts.map((p, i) => p.startsWith('**') && p.endsWith('**') ?
      <b key={`${li}.${i}`}>{p.slice(2, -2)}</b> : <span key={`${li}.${i}`}>{p}</span>);
    return li < arr.length - 1 ? [...spans, <br key={`br${li}`} />] : spans;
  });
}

/* Format structured Claude response from Make */
function formatStanceResponse(data) {
  const { summary, risk_level, recommendations, confidence_score } = data;
  const parts = [];
  if (summary) parts.push(summary);
  const meta = [];
  if (risk_level) meta.push(`**Risk:** ${risk_level}`);
  if (confidence_score != null) meta.push(`**Confidence:** ${confidence_score}%`);
  if (meta.length) parts.push(meta.join(' · '));
  if (recommendations && recommendations.length) {
    parts.push('**Recommendations**\n' + recommendations.map(r => `· ${r}`).join('\n'));
  }
  return parts.join('\n\n');
}

const NAV = [
{ id: 'overview',  label: 'Executive Briefing',   group: 'Analytics' },
{ id: 'attrition', label: 'Analytics Hub',         group: 'Analytics' },
{ id: 'engagement',label: 'Workforce Pulse',       group: 'Analytics', badge: '10' },
{ id: 'retention', label: 'Risk Intelligence',     group: 'Analytics' },
{ id: 'employee',  label: 'Employee Intelligence', group: 'People' },
{ id: 'heatmaps',  label: 'Pipelines',             group: 'Workspace' },
{ id: 'insights',  label: 'Saved Reports',         group: 'Workspace' },
{ id: 'reports',   label: 'Config',                group: 'Workspace', badge: '3' }];

const TITLES = {
  overview: 'Executive Briefing', attrition: 'Analytics Hub', engagement: 'Workforce Pulse',
  retention: 'Risk Intelligence', employee: 'Employee Intelligence', heatmaps: 'Pipelines', insights: 'Saved Reports', reports: 'Config'
};
function navIcon(id) {
  const m = {
    overview: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
    attrition: <><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></>,
    engagement: <><path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
    retention: <><path d="M3 12a9 9 0 1 0 9-9" /><path d="M12 7v5l3 2" /></>,
    employee: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" /></>,
    heatmaps: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" /></>,
    insights: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></>,
    reports: <><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h6M9 16h6" /></>
  };
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{m[id]}</svg>;
}

/* ---------------- Language switcher ---------------- */
function LangSwitch() {
  const normalize = (v) => (String(v?.lang || v || 'EN')).toUpperCase();
  const [lang, setLangState] = uState(normalize(window.StanceI18N ? window.StanceI18N.getLang() : 'EN'));
  uEffect(() => {
    const h = (e) => setLangState(normalize(e.detail));
    window.addEventListener('stance:lang', h);
    return () => window.removeEventListener('stance:lang', h);
  }, []);
  const pick = (l) => { if (window.StanceI18N) window.StanceI18N.setLang(l); else setLangState(l.toUpperCase()); };
  return (
    <div className="lang-switch" role="group" aria-label="Language / Langue">
      <button type="button" data-lang="en" className={'lang-opt' + (lang === 'EN' ? ' on' : '')} aria-pressed={lang === 'EN'} onClick={() => pick('EN')}>EN</button>
      <span className="lang-div" aria-hidden="true">|</span>
      <button type="button" data-lang="fr" className={'lang-opt' + (lang === 'FR' ? ' on' : '')} aria-pressed={lang === 'FR'} onClick={() => pick('FR')}>FR</button>
    </div>
  );
}

/* ---------------- Theme toggle ---------------- */
function ThemeToggle() {
  const [theme, setTheme] = uState(() => document.body.dataset.theme || 'dark');
  function applyTheme(t) {
    document.body.dataset.theme = t;
    const l = document.getElementById('themeLight');
    if (l) l.media = t === 'light' ? 'all' : 'not all';
    localStorage.setItem('stance-theme', t);
    setTheme(t);
  }
  return (
    <button type="button" className="theme-toggle"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}>
      <svg className="theme-icon theme-icon--sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      <svg className="theme-icon theme-icon--moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </button>
  );
}

/* ---------------- Upload modal ---------------- */
const UPLOAD_STEPS = [['d.up.s0', 'Parsing 12,480 rows'], ['d.up.s1', 'Mapping fields & cleaning'], ['d.up.s2', 'Clustering cohorts'], ['d.up.s3', 'Scoring attrition risk'], ['d.up.s4', 'Generating insights']];
function UploadModal({ onClose, onDone }) {
  const [phase, setPhase] = uState('drop');
  const [step, setStep] = uState(-1);
  const [drag, setDrag] = uState(false);
  const fileRef = uRef(null);

  async function start(file) {
    setPhase('run'); setStep(0);
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csv_data: e.target.result, filename: file.name })
          });
        } catch (_) {}
      };
      reader.readAsText(file);
    }
  }

  uEffect(() => {
    if (phase !== 'run') return;
    if (step >= UPLOAD_STEPS.length) {setPhase('done');setTimeout(onDone, 700);return;}
    const t = setTimeout(() => setStep((s) => s + 1), 720);
    return () => clearTimeout(t);
  }, [phase, step]);

  const pct = phase === 'done' ? 100 : Math.max(0, Math.round(step / UPLOAD_STEPS.length * 100));
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h3>{phase === 'done' ? window.T('d.up.done', 'Analysis complete') : window.T('d.up.title', 'Import workforce data')}</h3>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {phase === 'drop' &&
          <>
              <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}}
                onChange={(e) => { const f = e.target.files[0]; if (f) start(f); }} />
              <div className={'drop' + (drag ? ' drag' : '')} onClick={() => fileRef.current && fileRef.current.click()}
            onDragOver={(e) => {e.preventDefault();setDrag(true);}}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)start(f);}}>
                <div className="di"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg></div>
                <h4>{window.T('d.up.drop', 'Drop your HR CSV here')}</h4>
                <p>{window.T('d.up.browse', 'or click to browse — Stance maps & analyzes automatically')}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span className="chip">employees.csv</span><span className="chip">Workday export</span><span className="chip">BambooHR</span><span className="chip">SAP SuccessFactors</span>
              </div>
            </>
          }
          {phase !== 'drop' &&
          <>
              <div className="prog"><i style={{ width: pct + '%' }}></i></div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)', textAlign: 'right', marginBottom: 8 }}>{pct}%</div>
              <div className="steps-run">
                {UPLOAD_STEPS.map((s, i) => {
                const state = phase === 'done' || i < step ? 'done' : i === step ? 'active' : '';
                return (
                  <div className={'srow ' + state} key={i}>
                      <span className="si">{state === 'done' ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg> : state === 'active' ? <span className="spin"></span> : ''}</span>
                      {window.T(s[0], s[1])}
                    </div>);

              })}
              </div>
            </>
          }
        </div>
      </div>
    </div>);

}

/* ---------------- Summary modal ---------------- */
function SummaryModal({ s, onClose }) {
  const lines = s.lines && s.lines.length ? s.lines : [
  ['01', 'Risk concentrated in two units', 'EMEA Sales & Platform Engineering.'],
  ['02', 'Drivers are explainable', 'Compensation 42% · workload 18%.'],
  ['03', 'Recommended action protects ~€1.4M', 'Over the next two quarters.']];

  function exportPDF() {
    const w = window.open('', '_blank');
    const base = window.location.origin;
    const linesHTML = lines.map(l =>
      `<div class="line"><span class="num">${l[0]}</span><div><div class="title">${l[1]}</div><div class="sub">${l[2]}</div></div></div>`
    ).join('');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${s.title || 'Stance Executive Briefing'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Manrope:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Manrope',sans-serif;background:#fff;color:#0B0F19;padding:56px 64px;max-width:820px;margin:0 auto;}
  .logo{display:flex;align-items:center;gap:10px;margin-bottom:48px;}
  .logo img{width:32px;height:32px;object-fit:contain;}
  .logo-name{font-family:'Sora',sans-serif;font-weight:800;font-size:18px;letter-spacing:-.02em;color:#0B0F19;}
  .badge{display:inline-flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;color:#7C3AED;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:99px;padding:4px 12px;margin-bottom:20px;}
  h1{font-family:'Sora',sans-serif;font-weight:800;font-size:28px;letter-spacing:-.03em;line-height:1.1;margin-bottom:8px;}
  .meta{font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B7280;letter-spacing:.08em;text-transform:uppercase;margin-bottom:40px;}
  .line{display:flex;gap:20px;align-items:flex-start;padding:20px 0;border-bottom:1px solid #F3F4F6;}
  .line:last-child{border-bottom:none;}
  .num{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#7C3AED;min-width:28px;padding-top:2px;}
  .title{font-family:'Sora',sans-serif;font-size:15px;font-weight:700;color:#0B0F19;margin-bottom:4px;}
  .sub{font-size:13px;color:#6B7280;line-height:1.5;}
  .footer{margin-top:48px;padding-top:20px;border-top:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center;}
  .footer-brand{font-family:'JetBrains Mono',monospace;font-size:10px;color:#9CA3AF;letter-spacing:.06em;}
  @media print{body{padding:40px 48px;}@page{margin:0;size:A4;}}
</style></head><body>
<div class="logo"><img src="${base}/assets/stance-symbol.svg" alt="Stance"><span class="logo-name">Stance</span></div>
<div class="badge">AI-generated · ${s.date || new Date().toLocaleDateString('en-GB', {month:'short',year:'numeric'})}</div>
<h1>${s.head || s.title || 'Executive Workforce Briefing'}</h1>
<div class="meta">PREPARED FOR ${(s.for || 'Executive Leadership').toUpperCase()} · ${window.T('d.sum.emp','12,480 EMPLOYEES')}</div>
<div class="lines">${linesHTML}</div>
<div class="footer">
  <span class="footer-brand">STANCE · EXECUTIVE WORKFORCE INTELLIGENCE</span>
  <span class="footer-brand">stance.app</span>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
    w.document.close();
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(620px,94vw)' }}>
        <div className="modal-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="mark" style={{ width: 24, height: 24, borderRadius: 7, display: 'inline-block' }}></span><h3>{s.title}</h3></div>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <span className="chip cyan">{window.T('d.sum.ai', 'AI-generated')} · {s.date}</span>
          <h4 style={{ fontFamily: 'var(--f-display)', fontSize: 22, margin: '14px 0 6px' }}>{s.head}</h4>
          <div className="ed-sub" style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>{window.T('d.sum.for', 'PREPARED FOR')} {s.for.toUpperCase()} · {window.T('d.sum.emp', '12,480 EMPLOYEES')}</div>
          {lines.map((l, i) =>
          <div className="exec-line" key={i}><span className="en">{l[0]}</span><div><div className="et">{l[1]}</div><div className="es">{l[2]}</div></div></div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn btn-primary btn-sm" onClick={exportPDF}>{window.T('d.sum.export', 'Export PDF')}</button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>{window.T('d.sum.close', 'Close')}</button>
          </div>
        </div>
      </div>
    </div>);

}

/* ---------------- Copilot dock ---------------- */
/* ⚠️ ASK STANCE — CRITICAL LOGIC, LIVE MAKE WEBHOOK
   This is a React component, not static HTML — there is no #ask-input/
   #ask-button/#ask-response in the DOM, and no standalone askStance()
   function. The equivalents a future restyle must not rename/remove are:
     - className "cop-bar-input"  → the question <input> (assets/dashboard.css)
     - className "cop-bar-form"   → <form> whose onSubmit fires send()
     - className "cop-bar-msgs"   → scrollable message-history container
     - the send() function below  → POSTs { question } to /api/ask and
       pushes { role:'a'|'u', text } into msgs[]
   A pure CSS/visual pass may restyle these classes (colors, spacing,
   animation) freely, but must NOT rename them, remove them from the
   JSX below, or wrap them in a way that breaks the onSubmit/onChange
   wiring — doing so silently kills the whole Ask Stance feature.

   🔒 2026-07-01 INCIDENT: the code above was never the problem. After a
   production deploy to Vercel (stanceai/stance-svft), Ask Stance replied
   with a generic fallback (window.HUMIND.answer()) instead of a real
   Claude/Airtable answer. Root cause: `vercel env ls` showed ZERO
   environment variables configured on Vercel — MAKE_WEBHOOK_URL /
   AIRTABLE_API_KEY / AIRTABLE_BASE_ID exist only in the local .env
   (gitignored, never uploaded by `vercel deploy`). server.js's own
   guard (`if (!MAKE_WEBHOOK_URL) return res.status(503)`) fired before
   Make was ever called, and the frontend's error fallback masked it as
   a "working but generic" reply instead of an obvious failure.
   Pipeline: input.cop-bar-input -> form.cop-bar-form onSubmit -> send()
   -> POST /api/ask -> server.js -> Make webhook -> Airtable -> Claude
   -> { summary, risk_level, recommendations, confidence_score } ->
   pushed into msgs[] -> rendered in .cop-bar-msgs.
   BEFORE calling this "broken" again: run `vercel env ls` on the
   target project and confirm AIRTABLE_API_KEY / AIRTABLE_BASE_ID /
   AIRTABLE_*_TABLE / MAKE_WEBHOOK_URL / MAKE_CSV_WEBHOOK_URL are all
   present for BOTH Production and Preview before touching any code. */
const SUGGEST = [['d.cop.s1', 'Why is attrition rising?'], ['d.cop.s2', 'Where is burnout risk highest?'], ['d.cop.s3', 'Forecast retention next quarter']];
function CopilotBar({ askRef }) {
  const [val, setVal] = uState('');
  const [msgs, setMsgs] = uState([{ role: 'a', text: window.T('d.cop.greeting', "Hi — I'm your Stance Copilot. Ask me anything about your workforce data and I'll answer with sources.") }]);
  const [typing, setTyping] = uState(false);
  const msgsRef = uRef(null);

  uEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, [msgs, typing]);

  /* ⚠️ send() — the Ask Stance webhook call. POST /api/ask -> server.js
     proxies to MAKE_WEBHOOK_URL -> Airtable lookup -> Claude -> structured
     JSON { summary, risk_level, recommendations, confidence_score }.
     On non-2xx / network error / abort, falls back to window.HUMIND.answer()
     so the user always sees a message instead of a silent failure. */
  async function send(q) {
    const text = (q || val).trim();
    if (!text) return;
    setMsgs(m => [...m, { role: 'u', text }]);
    setVal(''); setTyping(true);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: text }), signal: ctrl.signal });
      clearTimeout(t);
      const data = await res.json();
      setTyping(false);
      const reply = (!res.ok || data.error) ? window.HUMIND.answer(text) : (data.summary ? formatStanceResponse(data) : window.HUMIND.answer(text));
      setMsgs(m => [...m, { role: 'a', text: reply }]);
    } catch (_) {
      setTyping(false);
      setMsgs(m => [...m, { role: 'a', text: window.HUMIND.answer(text) }]);
    }
  }

  uEffect(() => { if (askRef) askRef.current = send; }, []);

  return (
    <div className="cop-bar">
      <div className="cop-bar-msgs" ref={msgsRef}>
        {msgs.map((m, i) => (
          <div className={'cop-bar-ans' + (m.role === 'u' ? ' u' : '')} key={i}>
            {m.role === 'a' && <span className="cop-bar-ans-ic"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg></span>}
            {m.role === 'a' ? md(m.text) : m.text}
          </div>
        ))}
        {typing && <div className="cop-bar-ans"><span className="typing"><i/><i/><i/></span></div>}
        {msgs.length > 1 && (
          <button className="cop-bar-clear" onClick={() => setMsgs([{ role: 'a', text: window.T('d.cop.greeting', "Hi — I'm your Stance Copilot. Ask me anything about your workforce data and I'll answer with sources.") }])}>
            {T('d.cop.clear', 'Clear conversation')}
          </button>
        )}
      </div>
      <form className="cop-bar-form" onSubmit={e => { e.preventDefault(); send(); }}>
        <span className="cop-bar-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg></span>
        {SUGGEST.map((s, i) => <button key={i} type="button" className="cop-bar-chip" onClick={() => send(T(s[0], s[1]))}>{T(s[0], s[1])}</button>)}
        <input className="cop-bar-input" value={val} onChange={e => setVal(e.target.value)} placeholder={T('d.cop.ph', 'Ask about attrition, engagement, retention…')} />
        <button type="submit" className="btn btn-primary btn-sm">{T('d.cop.ask', 'Ask')}</button>
      </form>
    </div>
  );
}

/* ---------------- SearchBar ---------------- */
function SearchBar({ onNav }) {
  const [q, setQ] = uState('');
  const [open, setOpen] = uState(false);
  const [, tick] = uState(0);
  const ref = uRef(null);
  const inputRef = uRef(null);

  uEffect(() => {
    const h = () => tick(n => n + 1);
    window.addEventListener('stance:data', h);
    return () => window.removeEventListener('stance:data', h);
  }, []);

  uEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  uEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current && inputRef.current.focus(); setOpen(true); }
      if (e.key === 'Escape') { setOpen(false); inputRef.current && inputRef.current.blur(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const query = q.toLowerCase().trim();
  const H = window.HUMIND || {};
  const allEmps  = H._searchEmps || H.employees || [];
  const depts    = H.departments || [];
  const RC = { Critical: 'crit', High: 'high', Moderate: 'mod', Low: 'low' };

  const empResults  = query.length >= 2 ? allEmps.filter(e =>
    e.name.toLowerCase().includes(query) ||
    (e.role || '').toLowerCase().includes(query) ||
    (e.dept || '').toLowerCase().includes(query)
  ).slice(0, 6) : [];

  const deptResults = query.length >= 2 ? depts.filter(d =>
    d.name.toLowerCase().includes(query)
  ).slice(0, 3) : [];

  const hasResults = empResults.length > 0 || deptResults.length > 0;

  function handleEmpClick(emp) {
    const top10 = H.employees || [];
    const idx   = top10.findIndex(e => e.id === emp.id || e.name === emp.name);
    onNav('employee', idx >= 0 ? emp.id : top10[0]?.id || null);
    setQ(''); setOpen(false);
  }

  return (
    <div className="tb-search" style={{ position: 'relative' }} ref={ref}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
      <input
        ref={inputRef}
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => q && setOpen(true)}
        placeholder={T('d.search', 'Search people, teams, signals…')}
      />
      {q
        ? <button style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-4)',padding:0,fontSize:18,lineHeight:1 }} onClick={() => { setQ(''); setOpen(false); }}>×</button>
        : <span className="k">⌘K</span>
      }
      {open && query.length >= 2 && (
        <div className="search-drop">
          {!hasResults && <div className="sr-empty">No results for "{q}"</div>}
          {empResults.length > 0 && <>
            <div className="sr-group">Employees</div>
            {empResults.map(emp => (
              <button key={emp.id || emp.name} className="sr-item" onClick={() => handleEmpClick(emp)}>
                <span className="av-sm">{(emp.name||'').split(' ').map(w=>w[0]||'').join('').slice(0,2)}</span>
                <div className="sr-info">
                  <span className="sr-name">{emp.name}</span>
                  <span className="sr-sub">{emp.role} · {emp.dept}</span>
                </div>
                <span className={'risk-badge ' + (RC[emp.riskLevel] || 'mod')}>{emp.riskScore}</span>
              </button>
            ))}
          </>}
          {deptResults.length > 0 && <>
            <div className="sr-group">Departments</div>
            {deptResults.map(d => (
              <button key={d.name} className="sr-item" onClick={() => { onNav('attrition', null); setQ(''); setOpen(false); }}>
                <span className="av-sm" style={{ fontSize: 8, letterSpacing: 0 }}>DEPT</span>
                <div className="sr-info">
                  <span className="sr-name">{d.name}</span>
                  <span className="sr-sub">{d.head} employees · risk {Math.round(d.risk * 100)}%</span>
                </div>
              </button>
            ))}
          </>}
        </div>
      )}
    </div>
  );
}

/* ---------------- App ---------------- */
const DASH_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "calm",
  "accent": "purple"
} /*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(DASH_DEFAULTS);
  const [view, setView] = uState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash && TITLES[hash] ? hash : 'overview';
  });
  const [selectedEmpId, setSelectedEmpId] = uState(null);
  const [upload, setUpload] = uState(false);
  const [summary, setSummary] = uState(null);
  const [toast, setToast] = uState(null);
  const [sideOpen, setSideOpen] = uState(false);
  const copilotAsk = uRef(null);
  const [, setLang] = uState(0);
  uEffect(() => {
    const h = () => setLang(n => n + 1);
    window.addEventListener('stance:lang', h);
    return () => window.removeEventListener('stance:lang', h);
  }, []);
  const T = (k, f) => (window.StanceI18N ? window.StanceI18N.t(k, f) : f);

  uEffect(() => {
    document.body.setAttribute('data-density', t.density);
    const map = { purple: ['#7C3AED', '#A78BFA'], sky: ['#38BDF8', '#7DD3FC'], violet: ['#A78BFA', '#C4B5FD'], emerald: ['#2BD9A0', '#6EE7C4'] };
    const a = map[t.accent] || map.purple;
    document.body.style.setProperty('--accent', a[0]);
    document.body.style.setProperty('--accent-2', a[1]);
    document.body.style.setProperty('--cyan', a[0]);
    document.body.style.setProperty('--cyan-3', a[1]);
  }, [t.density, t.accent]);

  function showToast(msg) {setToast(msg);setTimeout(() => setToast(null), 3200);}
  function openInsight(it) {
    const q = T('d.cop.insightQ', 'Tell me more about') + ': ' + it.title;
    if (copilotAsk.current) copilotAsk.current(q);
  }

  const views = {
    overview: <OverviewView openInsight={openInsight} openSummary={setSummary} onNav={setView} />,
    attrition: <AttritionView />,
    engagement: <EngagementView />,
    retention: <RetentionView />,
    employee: <EmployeeIntelligenceView onNav={setView} selectedEmpId={selectedEmpId} />,
    heatmaps: <HeatmapsView />,
    insights: <InsightsView openInsight={openInsight} />,
    reports: <ReportsView openSummary={setSummary} onGenerate={() => setSummary(window.HUMIND.summariesL()[0])} />
  };
  const groups = [...new Set(NAV.map((n) => n.group))];

  return (
    <div className="app">
      <aside className={'side' + (sideOpen ? ' open' : '')}>
        <div className="side-top">
          <a className="brand" href="/"><span className="mark"></span><span>Stance</span></a>
        </div>
        <nav className="side-nav">
          {groups.map((g) =>
          <React.Fragment key={g}>
              <div className="side-sec">{T('d.group.' + g, g)}</div>
              {NAV.filter((n) => n.group === g).map((n) =>
            <button key={n.id} className={'snav' + (view === n.id ? ' on' : '')} onClick={() => {setView(n.id);setSideOpen(false);}}>
                  {navIcon(n.id)}<span>{T('d.nav.' + n.id, n.label)}</span>{n.badge && <span className="badge">{n.badge}</span>}
                </button>
            )}
            </React.Fragment>
          )}
        </nav>
        <div className="side-foot">
          <a className="userchip" href="/sign-in" style={{ textDecoration: 'none' }}>
            <span className="av">CL</span>
            <div style={{ flex: 1 }}><div className="un">Claire Lefèvre</div><div className="ur">{T('d.userrole', 'Chief People Officer')}</div></div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
          </a>
        </div>
      </aside>
      {sideOpen && <button className="side-scrim" aria-label="Close menu" onClick={() => setSideOpen(false)}></button>}

      <div className="main">
        <header className="topbar">
          <button className="modal-x" style={{ display: 'none' }} id="burger" onClick={() => setSideOpen((o) => !o)}>☰</button>
          <div>
            <div className="crumb">Stance / {t.density === 'cockpit' ? T('d.crumb.cockpit', 'Cockpit') : T('d.crumb.workspace', 'Workspace')}<span className="crumb-live"><span className="cl-dot"></span>{T('d.live', 'Live')} · {T('d.synced', 'Synced 2m ago')}</span></div>
            <h1>{T('d.title.' + view, TITLES[view])}</h1>
          </div>
          <SearchBar onNav={(v, id) => { setSelectedEmpId(id); setView(v); }} />
          <LangSwitch />
          <ThemeToggle />
          <div className="density-toggle">
            <button className={t.density === 'calm' ? 'on' : ''} onClick={() => setTweak('density', 'calm')}>{T('d.density.calm', 'Calm')}</button>
            <button className={t.density === 'cockpit' ? 'on' : ''} onClick={() => setTweak('density', 'cockpit')}>{T('d.density.cockpit', 'Cockpit')}</button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setUpload(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>{T('d.upload', 'Upload CSV')}
          </button>
        </header>

        <div className="content">{views[view]}</div>
      </div>

      <CopilotBar askRef={copilotAsk} />

      {upload && <UploadModal onClose={() => setUpload(false)} onDone={() => {setUpload(false);showToast(T('d.up.toast', 'Analysis complete · 7 new signals detected'));setView('overview');}} />}
      {summary && <SummaryModal s={summary} onClose={() => setSummary(null)} />}
      {toast && <div className="toast"><span className="ti2"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg></span>{toast}</div>}

      {/* Design tweaks (density/accent) dev panel — intentionally NOT rendered here.
          It used to float bottom-right (z-index 9000) right above the Ask Stance bar,
          visually similar (purple, circular) enough that real users clicked it
          expecting Ask Stance to respond — nothing happened since it just toggles a
          hidden dev panel. Density is already user-facing via the Calm/Cockpit
          buttons in the topbar; re-enable <TweaksPanel> only behind a local/dev flag
          if this is needed again, never unconditionally in production. */}
    </div>);

}

(function mount() {
  const el = document.getElementById('root');
  if (!el || !window.ReactDOM || !window.useTweaks || !window.OverviewView) {setTimeout(mount, 60);return;}
  if (document.visibilityState !== 'hidden') document.documentElement.classList.add('anim');
  ReactDOM.createRoot(el).render(<App />);
})();
