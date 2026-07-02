/* HUMIND dashboard — Executive Briefing view
   Matches: Dashboard Stance.png screenshot
   Deps (global): React, T, Gauge, AreaChart, Heatmap, BarList, KPI, Panel, Feed, H
*/
const { useState: useB, useEffect: useE } = React;
const H = window.HUMIND;

function ConfMeter({ label, value }) {
  return (
    <div className="conf-row">
      <span className="conf-lab">{label}</span>
      <div className="conf-bar"><i style={{ width: value + '%' }}></i></div>
      <span className="conf-val">{value}%</span>
    </div>
  );
}

function BriefAIRead({ children }) {
  return (
    <div className="ai-read">
      <span className="air-dot"></span>
      <p>{children}</p>
    </div>
  );
}

function BentoCard({ className = '', glass, beam, title, sub, right, children }) {
  return (
    <div className={'bento-card ' + className + (glass ? ' bento-card--glass' : '') + (beam ? ' bento-card--beam' : '')}>
      {(title || right) && (
        <div className="panel-h">
          <div>{sub && <div className="pl">{sub}</div>}{title && <div className="panel-title" style={{ fontSize: 16 }}>{title}</div>}</div>
          {right}
        </div>
      )}
      <div className="bento-card-body">{children}</div>
    </div>
  );
}

function KPIInner({ label, value, unit, delta, deltaType = 'up', accent }) {
  return (
    <>
      <div className="klabel">{label}</div>
      <div className="kval-row">
        <div className="kval metric-val" style={accent ? { color: accent } : null}>
          {value}{unit && <span style={{ fontSize: 15, color: 'var(--text-3)' }}>{unit}</span>}
        </div>
      </div>
      {delta && <div className={'kdelta ' + deltaType}>{delta}</div>}
    </>
  );
}

/* DONNÉES DE DÉMONSTRATION — À CONNECTER À AIRTABLE
   pour les vues 1A et 3A une fois l'historique
   de données suffisant disponible */
const STAB_RANGE_ORDER = ['3M', '6M', '1A', '3A'];
const STAB_RANGE_META = {
  '3M': {
    subKey: 'bf.stabSub', subFb: 'Last 12 weeks',
    axis: ['W1', 'W2', 'W4', 'W6', 'W8', 'W10', 'Now'],
    values: [58, 62, 66, 68, 65, 70, 74, 72, 76, 78, 79, 81]
  },
  '6M': {
    subKey: 'bf.stabSub.6m', subFb: 'Last 6 months',
    axis: ['S1', 'S3', 'S5', 'S7', 'S9', 'S11', 'Now'],
    values: [52, 55, 59, 57, 62, 65, 63, 68, 71, 70, 75, 79]
  },
  '1A': {
    subKey: 'bf.stabSub.1a', subFb: 'Last 12 months',
    axis: ['Jan', 'Mar', 'Mai', 'Jul', 'Sep', 'Nov', 'Now'],
    values: [48, 52, 55, 53, 58, 61, 64, 67, 70, 73, 77, 81]
  },
  '3A': {
    subKey: 'bf.stabSub.3a', subFb: 'Last 3 years',
    axis: ['T1 24', 'T3 24', 'T1 25', 'T3 25', 'T1 26', 'Now'],
    values: [40, 45, 49, 52, 56, 59, 62, 65, 69, 73, 77, 81]
  }
};

function StabilityChart() {
  const [range, setRange] = useB('3M');
  const meta = STAB_RANGE_META[range];
  const [dispValues, setDispValues] = useB(() => meta.values.slice());
  const dispRef = React.useRef(meta.values.slice());
  const rafRef = React.useRef(0);
  const mounted = React.useRef(false);

  useE(() => {
    const to = STAB_RANGE_META[range].values;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!mounted.current) { mounted.current = true; dispRef.current = to.slice(); setDispValues(to.slice()); return; }
    if (reduce) { dispRef.current = to.slice(); setDispValues(to.slice()); return; }
    const from = dispRef.current.slice();
    const dur = 400;
    const t0 = performance.now ? performance.now() : Date.now();
    const ease = t => 1 - Math.pow(1 - t, 3); // ease-out
    cancelAnimationFrame(rafRef.current);
    const finish = () => { dispRef.current = to.slice(); setDispValues(to.slice()); };
    const step = (now) => {
      const p = Math.min(1, ((now || Date.now()) - t0) / dur);
      const e = ease(p);
      const cur = to.map((v, i) => from[i] + (v - from[i]) * e);
      dispRef.current = cur; setDispValues(cur);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else finish();
    };
    rafRef.current = requestAnimationFrame(step);
    const guard = setTimeout(finish, dur + 160);
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(guard); };
  }, [range]);

  return (
    <BentoCard
      className="bc-primary" glass beam
      sub={T(meta.subKey, meta.subFb)}
      title={T('bf.stabTitle', 'Workforce Stability is Improving')}
      right={
        <div className="time-filter-group">
          {STAB_RANGE_ORDER.map(r => (
            <button
              key={r}
              className={'time-filter' + (range === r ? ' active' : '')}
              onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
      }>
      <AreaChart
        values={dispValues}
        h={160} color="var(--green)" fillId="bfStab" min={35} max={90} />
      <div className="axis-x">
        {meta.axis.map((a, i) => <span key={i}>{a}</span>)}
      </div>
      <BriefAIRead>{T('bf.stab.note', 'AI Insight: Removing the top 3 exit drivers is modeled to sustain this improving trend into Q2.')}</BriefAIRead>
    </BentoCard>
  );
}

function EmployeeSpotlight({ onNav }) {
  const e = H.employees[0];
  const loc = H.locEmp(e);
  const riskColor = { Critical: 'var(--red)', High: 'var(--amber)', Moderate: 'var(--violet)', Low: 'var(--green)' };
  return (
    <div className="spotlight-wrap">
      <div className="spot-pers">
        <span className="av-lg">{e.initials}</span>
        <div style={{ flex: 1 }}>
          <b className="spot-name">{e.name}</b>
          <span className="spot-role">{loc.archetype}</span>
        </div>
        <b className="spot-score" style={{ color: riskColor[e.riskLevel] }}>
          {e.riskScore}<i>/100</i>
        </b>
      </div>
      <p className="spot-line">{T('bf.spotLine', 'Top-quartile closer. External profile activity up sharply. Act within 6–8 weeks.')}</p>
      <button
        className="btn btn-ghost"
        style={{ marginTop: 10, width: '100%', fontSize: 12, display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center' }}
        onClick={() => onNav && onNav('employee')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" />
        </svg>
        {T('emp.dna', 'View Employee Intelligence')}
      </button>
    </div>
  );
}

function OverviewView({ openInsight, openSummary, onNav }) {
  const [, forceRender] = useB(0);
  useE(() => {
    const h = () => forceRender(n => n + 1);
    window.addEventListener('stance:lang', h);
    window.addEventListener('stance:data', h);
    return () => { window.removeEventListener('stance:lang', h); window.removeEventListener('stance:data', h); };
  }, []);

  const insights = H.insightsL().slice(0, 3);
  const recs     = H.recommendationsL().slice(0, 3);

  const kd = H._kpis || {};
  const kpis = [
    { label: T('kpi.headcount', 'Headcount'),     value: kd.total ? kd.total.toLocaleString() : '—', delta: kd.total ? `${kd.total} employees` : '', deltaType: 'up' },
    { label: T('kpi.attrition', 'Attrition 12M'), value: kd.attritionRate || '—', unit: kd.attritionRate ? '%' : '', delta: kd.attritionRate ? 'Actual' : 'No data', deltaType: 'good', accent: 'var(--amber)' },
    { label: T('kpi.risk',      'Risk Index'),     value: kd.avgRisk || '—', unit: '/100', delta: 'Avg risk score', deltaType: 'good' },
    { label: T('kpi.retention', 'Retention 12M'), value: kd.retentionRate || '—', unit: kd.retentionRate ? '%' : '', delta: kd.retentionRate ? 'Actual' : 'No data', deltaType: 'good', accent: 'var(--green)' },
    { label: T('kpi.engagement','Engagement'),    value: '74',     unit: '/100', delta: '▲ 3 pts',     deltaType: 'up' },
    { label: T('kpi.enps',      'eNPS'),          value: '+34',                  delta: '▲ 6 vs Q3',   deltaType: 'good', accent: 'var(--green)' }
  ];

  const wcItems = [
    { key: 'bf.wc.attrition',  fb: 'Attrition risk',    v: '18.6%', delta: '▼ 1.4', t: 'good' },
    { key: 'bf.wc.engagement', fb: 'Engagement',         v: '74/100', delta: '▲ 3',  t: 'good' },
    { key: 'bf.wc.promo',      fb: 'Promotion velocity', v: '2.4%',  delta: '→',     t: 'flat' },
    { key: 'bf.wc.overtime',   fb: 'Overtime load',      v: '22%',   delta: '▲ 4',   t: 'warn' }
  ];

  const riskColors = { Critical: '#FF7A8A', High: '#F6B43A', Moderate: '#A78BFA', Low: '#3FD9A6' };
  const e0 = H.employees[0];

  return (
    <div className="viewfade">

      {/* ── BENTO GRID ───────────────────────────────────────────
          Dynamic mosaic: two glass focal cards (Health Score,
          Attrition trend) anchor the grid; every other widget from
          the previous two-column layout is preserved, just
          reorganized into the mosaic. Mobile stack order follows
          DOM order: Health → Attrition → Critical → KPIs → Heatmap
          → Executive Summary → (secondary panels).
          ──────────────────────────────────────────────────────── */}
      <div className="bento-grid">

        {/* Workforce Health Score */}
        <BentoCard className="bc-health" glass>
          <div className="bc-health-inner">
            <span className="brief-eyebrow">{T('bf.metaline', 'Executive briefing')} · {kd.total ? `${kd.total.toLocaleString()} employees` : 'loading…'}</span>
            <div className="brief-gauge-label">{T('bf.gauge', 'Workforce Health Score')}</div>
            <Gauge value={78} max={100} label="" size={132} colorFrom="var(--cyan)" colorTo="var(--green)" />
            <div className="brief-status">
              <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 8px var(--green)', display:'inline-block', marginRight:7 }}></span>
              {T('bf.healthStatus', 'Healthy · improving')}
            </div>
          </div>
        </BentoCard>

        {/* Attrition Risk / Workforce Stability trend — primary focal card */}
        <StabilityChart />

        {/* Needs Attention — critical signals */}
        <BentoCard
          className="bc-critical"
          sub={T('bf.critSub', 'Critical signals')}
          title={T('bf.needsTitle', 'Needs Attention')}
          right={
            <span className="chip red" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--red)', boxShadow:'0 0 6px var(--red)', display:'inline-block', animation:'pulse 1.8s infinite' }}></span>
              LIVE
            </span>
          }>
          {insights.map((it, i) => (
            <Feed key={i} it={it} onOpen={() => openInsight && openInsight(it)} />
          ))}
        </BentoCard>

        {/* Secondary KPIs — compact bento cards */}
        {kpis.map((k, i) => (
          <BentoCard className="bc-kpi-small" key={'kpi' + i}>
            <KPIInner label={k.label} value={k.value} unit={k.unit} delta={k.delta} deltaType={k.deltaType} accent={k.accent} />
          </BentoCard>
        ))}
        <BentoCard className="bc-kpi-small">
          <KPIInner
            label={T('bf.wc.overtime', 'Overtime load')} value="22" unit="%"
            delta="▲ 4" deltaType="warn" accent="var(--amber)" />
        </BentoCard>

        {/* Attrition by region heatmap */}
        <BentoCard
          className="bc-heatmap"
          sub={T('bf.heatSub', 'Attrition risk · region × department')}
          title={T('bf.heatTitle', 'Attrition by region')}>
          <div style={{ marginTop: 12 }}>
            <Heatmap
              rows={['EMEA', 'AMER', 'APAC']}
              cols={['Sales', 'Eng', 'Ops', 'Prod', 'CS', 'G&A']}
              values={[
                [0.82, 0.60, 0.35, 0.28, 0.46, 0.20],
                [0.55, 0.71, 0.42, 0.34, 0.33, 0.22],
                [0.38, 0.48, 0.60, 0.50, 0.26, 0.24]
              ]} />
          </div>
        </BentoCard>

        {/* Executive Summary — AI narrative + briefing confidence */}
        <BentoCard className="bc-execsum" sub={T('bf.metaline', 'Executive briefing')} title={T('bf.execTitle', 'Executive Summary')}>
          <BriefAIRead>{T('bf.narr', 'Risk is concentrated, not systemic — 2 of 14 units drive 64% of projected exits. Acting now protects ~€1.4M in cost-to-replace.')}</BriefAIRead>
          <div className="brief-conf-block" style={{ marginTop: 14 }}>
            <div className="pl" style={{ marginBottom: 4 }}>{T('bf.confSub', 'Briefing reliability')}</div>
            <div className="panel-title" style={{ fontSize: 14.5, marginBottom: 10 }}>{T('bf.confTitle', 'AI Confidence')}</div>
            <ConfMeter label={T('bf.conf1', 'Analysis confidence')} value={97} />
            <ConfMeter label={T('bf.conf2', 'Forecast reliability')} value={91} />
          </div>
        </BentoCard>

        {/* Retention projection */}
        <BentoCard className="bc-retproj" sub={T('bf.retSub', 'Forecast · 12 months')} title={T('bf.retTitle', 'Retention projection')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
            <Gauge value={91} max={100} label="" size={86} colorFrom="var(--cyan)" colorTo="var(--green)" />
            <div>
              <div className="metric-val" style={{ fontFamily: 'var(--f-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1 }}>91.4%</div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9.5, color: 'var(--text-4)', marginTop: 4, letterSpacing: '.12em' }}>12M FORECAST</div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--green)', marginTop: 6 }}>▲ vs 89.8% trailing</div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <span className="chip green" style={{ fontSize: 10 }}>{T('bf.ret.with', 'With actions: 93.1%')}</span>
          </div>
        </BentoCard>

        {/* Top risk categories */}
        <BentoCard className="bc-topcat" sub={T('bf.topRiskSub', 'Exit driver breakdown')} title={T('bf.topRiskTitle', 'Top risk categories')}>
          <BarList
            items={[
              { label: T('risk.comp',     'Compensation'), v: 42, display: '42%' },
              { label: T('risk.career',   'Career path'),  v: 24, display: '24%' },
              { label: T('risk.workload', 'Workload'),     v: 18, display: '18%' },
              { label: T('risk.manager',  'Manager'),      v: 10, display: '10%' },
              { label: T('risk.other',    'Other'),        v:  6, display: '6%' }
            ]}
            max={50} />
        </BentoCard>

        {/* Highest Flight Risk */}
        <BentoCard className="bc-spotlight" sub={T('bf.spotSub', 'Employee spotlight')} title={T('bf.spotTitle', 'Highest Flight Risk')}>
          <EmployeeSpotlight onNav={onNav} />
        </BentoCard>

        {/* Strategic Recommendations */}
        <BentoCard className="bc-strategic" sub={T('bf.recSub', 'AI-generated · High confidence')} title={T('bf.recTitle', 'Strategic Recommendations')}>
          {recs.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 11, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line)', alignItems: 'flex-start' }}>
              <div style={{
                width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                background: 'rgba(124,58,237,.14)', border: '1px solid rgba(124,58,237,.28)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--f-display)', fontSize: 11, fontWeight: 800, color: 'var(--cyan-3)'
              }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{r.title}</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>{r.impact}</div>
              </div>
            </div>
          ))}
        </BentoCard>

        {/* What changed */}
        <BentoCard className="bc-whatchanged" sub={T('bf.wcSub', 'Since last month')} title={T('bf.wcTitle', 'What changed')}>
          <div className="wc-grid">
            {wcItems.map((w, i) => (
              <div key={i} className="wc-card">
                <span className="wc-lab">{T(w.key, w.fb)}</span>
                <b className="wc-val metric-val" style={{ color: w.t === 'good' ? 'var(--green)' : w.t === 'warn' ? 'var(--amber)' : undefined }}>
                  {w.v}
                </b>
                <span className={'wc-delta ' + w.t}>{w.delta}</span>
              </div>
            ))}
          </div>
        </BentoCard>

      </div>
    </div>
  );
}

window.OverviewView = OverviewView;
