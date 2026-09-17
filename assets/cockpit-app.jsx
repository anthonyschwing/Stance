/* Stance Cockpit — executive space app shell.
   Self-contained: no dependency on dashboard-app.jsx / NAV[] / dashboard.css.
   Only reuses AreaChart from dashboard-charts.jsx (generic chart primitive,
   not Sentinelle-specific). Renders aggregates only — never an employee row. */
const { useState: cState, useEffect: cEffect } = React;

function signOut() {
  try { localStorage.removeItem('stance-role'); } catch (_) {}
  document.cookie = 'stance_role=; path=/; max-age=0';
  window.location.href = '/sign-in';
}

function fmtMoney(n) {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString('en-US');
}

function fmtPct(n) {
  return n == null ? '—' : n + '%';
}

function ThemeToggle() {
  const [theme, setTheme] = cState(() => document.body.dataset.theme || 'dark');
  function applyTheme(t) {
    document.body.dataset.theme = t;
    const l = document.getElementById('themeLight');
    if (l) l.media = t === 'light' ? 'all' : 'not all';
    try { localStorage.setItem('stance-theme', t); } catch (_) {}
    setTheme(t);
  }
  return (
    <button type="button" className="theme-toggle"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}>
      <svg className="theme-icon theme-icon--sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
      <svg className="theme-icon theme-icon--moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}

function SynthesisBanner({ briefing, loading, error }) {
  if (loading) {
    return <div className="ck-brief"><div className="ck-brief-body"><div className="pl">Generating synthesis…</div></div></div>;
  }
  if (error || !briefing) {
    return (
      <div className="ck-brief">
        <div className="ck-brief-body">
          <div className="pl">HR HEALTH SYNTHESIS</div>
          <div className="ck-brief-text">Synthesis unavailable right now — the KPIs below still reflect live data.</div>
        </div>
      </div>
    );
  }
  const signal = briefing.overallSignal || 'Moderate';
  const dotColor = { Critical: 'var(--red)', High: 'var(--amber)', Moderate: 'var(--cyan-3)', Low: 'var(--green)' }[signal] || 'var(--cyan-3)';
  return (
    <div className="ck-brief">
      <div className="ck-brief-dot" style={{ background: dotColor, boxShadow: `0 0 10px ${dotColor}` }} />
      <div className="ck-brief-body">
        <div className="pl">HR HEALTH SYNTHESIS <span className={'ck-signal ' + signal} style={{ marginLeft: 10 }}>{signal}</span></div>
        <div className="ck-brief-text">{briefing.synthesis}</div>
      </div>
    </div>
  );
}

function KPIRow({ summary, financial }) {
  return (
    <div className="ck-kpis">
      <div className="ck-kpi warn">
        <div className="pl">AT-RISK WORKFORCE</div>
        <div className="ck-kpi-val">{fmtPct(summary.atRiskPct)}</div>
        <div className="ck-kpi-sub">{summary.atRisk} of {summary.headcount} employees</div>
      </div>
      <div className="ck-kpi danger">
        <div className="pl">CRITICAL RISK</div>
        <div className="ck-kpi-val">{summary.critical}</div>
        <div className="ck-kpi-sub">requires immediate attention</div>
      </div>
      <div className="ck-kpi">
        <div className="pl">HIGH RISK</div>
        <div className="ck-kpi-val">{summary.high}</div>
        <div className="ck-kpi-sub">to monitor closely</div>
      </div>
      <div className="ck-kpi money">
        <div className="pl">EST. TURNOVER COST EXPOSURE</div>
        <div className="ck-kpi-val">{financial ? fmtMoney(financial.estimatedCost) : '—'}</div>
        <div className="ck-kpi-sub">{financial ? `${Math.round(financial.ratio * 100)}% of annual salary × ${financial.atRiskCount} at-risk profiles` : ''}</div>
      </div>
    </div>
  );
}

function BarRows({ items }) {
  const max = Math.max(1, ...items.map(i => i.v));
  return items.map((it, i) => (
    <div className="ck-barrow" key={i}>
      <span className="ck-bl">{it.label}</span>
      <span className="ck-bt"><i style={{ width: (it.v / max * 100) + '%' }}></i></span>
      <span className="ck-bv">{it.display}</span>
    </div>
  ));
}

function TrendPanel({ trend }) {
  const withRisk = (trend || []).filter(t => t.criticalCount != null && t.highCount != null);
  if (withRisk.length < 2) {
    return (
      <div className="ck-panel">
        <div className="panel-h"><div className="pl">AT-RISK TREND</div></div>
        <div className="ck-foot-note">Trend builds up day by day from the daily snapshot — check back once a few weeks of history have accumulated.</div>
      </div>
    );
  }
  const values = withRisk.map(t => t.criticalCount + t.highCount);
  return (
    <div className="ck-panel">
      <div className="panel-h"><div className="pl">AT-RISK HEADCOUNT — TREND</div></div>
      <AreaChart values={values} h={140} color="var(--amber)" />
      <div className="ck-trend-axis"><span>{withRisk[0].date}</span><span>{withRisk[withRisk.length - 1].date}</span></div>
    </div>
  );
}

function App() {
  const [summary, setSummary] = cState(null);
  const [trend, setTrend] = cState([]);
  const [financial, setFinancial] = cState(null);
  const [briefing, setBriefing] = cState(null);
  const [briefingLoading, setBriefingLoading] = cState(true);
  const [error, setError] = cState(null);

  cEffect(() => {
    const C = window.StanceCockpit;
    C.getSummary().then(setSummary).catch(e => setError(e.message));
    C.getTrend().then(setTrend).catch(() => setTrend([]));
    C.getFinancial().then(setFinancial).catch(() => setFinancial(null));
    C.getBriefing().then(setBriefing).catch(() => {}).finally(() => setBriefingLoading(false));
  }, []);

  if (error) return <div className="ck-error">Could not load Cockpit data: {error}</div>;
  if (!summary) return <div className="ck-loading">Loading executive briefing…</div>;

  const deptItems = summary.byDepartment.map(d => ({ label: d.department, v: d.atRiskPct, display: d.atRiskPct + '%' }));
  const tenureItems = summary.byTenure.map(t => ({ label: t.bucket, v: t.atRiskPct, display: t.atRiskPct + '%' }));

  return (
    <div className="ck-app">
      <header className="ck-topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <a className="brand" href="/"><span className="mark"></span><span>Stance</span></a>
          <span className="ck-eyebrow">Cockpit · Direction</span>
        </div>
        <div className="ck-topbar-right">
          <a className="ck-exit" href="/dashboard">Sentinelle (RH view) →</a>
          <a className="ck-exit" href="#" onClick={(e) => { e.preventDefault(); signOut(); }}>Sign out</a>
          <ThemeToggle />
        </div>
      </header>

      <div className="ck-body">
        <SynthesisBanner briefing={briefing} loading={briefingLoading} />
        <KPIRow summary={summary} financial={financial} />

        <div className="ck-grid">
          <TrendPanel trend={trend} />
          <div className="ck-panel">
            <div className="panel-h"><div className="pl">AT-RISK % BY DEPARTMENT</div></div>
            <BarRows items={deptItems} />
          </div>
        </div>

        <div className="ck-grid">
          <div className="ck-panel">
            <div className="panel-h"><div className="pl">AT-RISK % BY TENURE</div></div>
            <BarRows items={tenureItems} />
          </div>
          <div className="ck-panel">
            <div className="panel-h"><div className="pl">COST ASSUMPTION</div></div>
            <div className="ck-foot-note">
              Estimated at {financial ? Math.round(financial.ratio * 100) : 50}% of annual salary per at-risk departure
              (critical + high risk profiles). Adjustable without a deployment via the
              Turnover_Cost_Assumptions table in Airtable.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
