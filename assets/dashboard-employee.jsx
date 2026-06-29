/* HUMIND dashboard — Employee Intelligence (player-scouting report) */
const { useState: useEmpState } = React;
const H = window.HUMIND;

/* local **bold** renderer (script scopes are isolated post-Babel) */
function md(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <b key={i}>{p.slice(2, -2)}</b>
      : <span key={i}>{p}</span>
  );
}

const RISK_TIER = {
  Critical: { cls: 'crit', c: 'var(--red)' },
  High: { cls: 'high', c: 'var(--amber)' },
  Moderate: { cls: 'mod', c: 'var(--violet)' },
  Low: { cls: 'low', c: 'var(--green)' }
};

function statTier(v) {
  if (v >= 80) return 'var(--green)';
  if (v >= 70) return 'var(--cyan-3)';
  if (v >= 55) return 'var(--violet)';
  if (v >= 40) return 'var(--amber)';
  return 'var(--red)';
}

function trendIcon(t) {
  if (t === 'up') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M7 14l5-5 5 5" /></svg>;
  if (t === 'down') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M7 10l5 5 5-5" /></svg>;
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M6 12h12" /></svg>;
}

/* tall PES-style player card */
function PlayerCard({ e }) {
  const rt = RISK_TIER[e.riskLevel];
  const overall = Math.round(e.stats.reduce((a, b) => a + b, 0) / e.stats.length);
  return (
    <div className={'player-card pc-' + rt.cls}>
      <div className="pc-top">
        <div className="pc-ovr">
          <b style={{ color: rt.c }}>{e.riskScore}</b>
          <span>{T('emp.riskScore', 'Risk Score')}</span>
        </div>
        <div className={'pc-level ' + rt.cls}><span className="pcl-dot"></span>{T('val.risk.' + e.riskLevel, e.riskLevel)}</div>
      </div>
      <div className="pc-pos">{e.pos}</div>
      <div className="pc-portrait"><span>{e.initials}</span></div>
      <div className="pc-name">{e.name}</div>
      <div className="pc-role">{e.role}</div>
      <div className="pc-meta">
        <div><span>{T('emp.dept', 'Dept')}</span><b>{e.dept}</b></div>
        <div><span>{T('emp.base', 'Base')}</span><b>{e.region}</b></div>
        <div><span>{T('emp.tenure', 'Tenure')}</span><b>{e.tenure}</b></div>
        <div><span>{T('emp.profile', 'Profile')}</span><b>{overall}/100</b></div>
      </div>
    </div>
  );
}

function EmployeeIntelligenceView({ onNav, selectedEmpId }) {
  const roster = H.employees.map(r => H.locEmp(r));
  const initIdx = selectedEmpId ? Math.max(0, roster.findIndex(r => r.id === selectedEmpId)) : 0;
  const [sel, setSel] = useEmpState(initIdx);
  const [locked, setLocked] = useEmpState(-1);

  /* Jump to selectedEmpId whenever it changes from outside */
  const { useEffect: useEmpE } = React;
  useEmpE(() => {
    if (!selectedEmpId) return;
    const idx = roster.findIndex(r => r.id === selectedEmpId);
    if (idx >= 0) { setSel(idx); setLocked(-1); }
  }, [selectedEmpId]);

  const [, forceRender] = useEmpState(0);
  useEmpE(() => {
    const h = () => forceRender(n => n + 1);
    window.addEventListener('stance:lang', h);
    return () => window.removeEventListener('stance:lang', h);
  }, []);

  const e = roster[sel];
  const axes = H.axesL();
  const rt = RISK_TIER[e.riskLevel];

  return (
    <div className="viewfade emp-intel">
      {/* back to dashboard */}
      <button
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 'var(--gap)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        onClick={() => onNav && onNav('overview')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        {T('emp.back', 'Back to Dashboard')}
      </button>

      {/* scouting shortlist */}
      <div className="scout-strip">
        <span className="scout-lab">{T('emp.shortlist', 'Shortlist')}</span>
        <div className="scout-roster">
          {roster.map((r, i) => {
            const t = RISK_TIER[r.riskLevel];
            return (
              <button key={r.id} className={'scout-chip' + (i === sel ? ' on' : '')} onClick={() => { setSel(i); setLocked(-1); }}>
                <span className="sc-av">{r.initials}</span>
                <span className="sc-meta"><b>{r.name}</b><span>{r.archetype}</span></span>
                <span className="sc-score" style={{ color: t.c }}>{r.riskScore}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN GRID — identity left | radar right */}
      <div className="emp-main-grid">

        {/* LEFT: condensed identity */}
        <Panel sub={T('emp.dna', 'Employee DNA · AI archetype')} title={e.archetype}>
          <p className="dna-line" style={{ marginBottom: 18 }}>{e.archetypeLine}</p>
          <div className="emp-id-row">
            <PlayerCard e={e} />
            <div className="emp-vitals emp-vitals-2col">
              <div className="vital"><span>{T('emp.dept', 'Department')}</span><b>{e.dept}</b></div>
              <div className="vital"><span>{T('emp.role', 'Role')}</span><b>{e.role}</b></div>
              <div className="vital"><span>{T('emp.riskScore', 'Risk score')}</span><b style={{ color: rt.c }}>{e.riskScore}<i>/100</i></b></div>
              <div className="vital"><span>{T('emp.risklevel', 'Risk level')}</span><b><span className={'risk-badge ' + rt.cls}>{T('val.risk.' + e.riskLevel, e.riskLevel)}</span></b></div>
              <div className="vital"><span>{T('emp.tenure', 'Tenure')}</span><b>{e.tenure}</b></div>
              <div className="vital"><span>{T('emp.base', 'Location')}</span><b>{e.region}</b></div>
            </div>
          </div>
        </Panel>

        {/* RIGHT: radar + metrics */}
        <Panel sub={T('emp.radar.sub', 'Workforce Profile')} title={T('emp.radar.title', 'Performance & retention radar')} className="radar-panel"
          right={<span className="chip cyan">{T('emp.radar.chip', '8-dimension model')}</span>}>
          <div className="radar-layout">
            <div className="radar-stage">
              <Radar axes={axes} values={e.stats} deltas={e.deltas} lockedIdx={locked} onLock={setLocked} />
            </div>
            <div className={'radar-stats' + (locked >= 0 ? ' has-lock' : '')}>
              {axes.map((a, i) => (
                <div className={'stat-row' + (locked === i ? ' stat-active' : locked >= 0 ? ' stat-dim' : '')} key={a}
                  onClick={() => setLocked(locked === i ? -1 : i)} style={{ cursor: 'pointer' }}>
                  <span className="sr-lab">{a}</span>
                  <span className="sr-track"><i style={{ width: e.stats[i] + '%', background: statTier(e.stats[i]) }}></i></span>
                  <b className="sr-val" style={{ color: statTier(e.stats[i]) }}>{e.stats[i]}</b>
                </div>
              ))}
            </div>
          </div>
        </Panel>

      </div>

      {/* AI SUMMARY + RECOMMENDED ACTIONS */}
      <div className="emp-grid2">
        <Panel sub={T('emp.summary.sub', 'AI summary')} title={T('emp.summary.title', 'Scouting read')} className="exec-hero ai-summary"
          right={<span className="chip cyan">{T('emp.summary.conf', 'Confidence 92%')}</span>}>
          <p className="summary-body">{md(e.summary)}</p>
          <div className="summary-foot">
            <span>{T('emp.summary.model', 'Model · Stance People-Intelligence v4')}</span>
            <span>{T('emp.summary.updated', 'Updated 2h ago')}</span>
          </div>
        </Panel>

        <Panel sub={T('emp.actions.sub', 'Recommended actions')} title={T('emp.actions.title', 'The retention play')}
          right={<span className="chip">{e.actions.length} {T('emp.actions.moves', 'moves')}</span>}>
          <div className="action-list">
            {e.actions.map((a, i) => (
              <div className="action-row" key={i}>
                <span className="ar-step">{a.p}</span>
                <div className="ar-main">
                  <div className="ar-t">{a.title}</div>
                  <div className="ar-i">{a.impact}</div>
                </div>
                <div className="ar-side">
                  <span className={'pri ' + a.pr}>{T('val.pri.' + a.pr, a.pr === 'hi' ? 'High' : 'Med')}</span>
                  <span className="ar-eff">{T('emp.effort', 'Effort')} · {T('val.effort.' + a.effort, a.effort)}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* TOP RISK FACTORS */}
      <Panel sub={T('emp.factors.sub', 'Top risk factors')} title={T('emp.factors.title', 'What is driving the score')}
        right={<span className="chip" style={{ color: rt.c, borderColor: rt.c }}>{T('val.risk.' + e.riskLevel, e.riskLevel)}</span>}>
        <div className="factor-grid">
          {e.factors.map((f, i) => (
            <div className="factor-card" key={i}>
              <div className="fc-top">
                <span className="fc-rank">{String(i + 1).padStart(2, '0')}</span>
                <span className={'fc-trend ' + f.trend}>{trendIcon(f.trend)}</span>
              </div>
              <div className="fc-w" style={{ color: statTier(100 - f.w) }}>{f.w}<i>%</i></div>
              <div className="fc-lab">{f.label}</div>
              <div className="fc-track"><i style={{ width: f.w + '%' }}></i></div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { EmployeeIntelligenceView });
