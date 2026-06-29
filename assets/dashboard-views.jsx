/* HUMIND dashboard — views */
const H = window.HUMIND;

/* Force re-render on language change — used by every view */
function useLang() {
  const [, forceRender] = React.useState(0);
  React.useEffect(() => {
    const h = () => forceRender(n => n + 1);
    window.addEventListener('stance:lang', h);
    return () => window.removeEventListener('stance:lang', h);
  }, []);
}

function Panel({ title, sub, right, children, className = '', style }) {
  return (
    <div className={'panel ' + className} style={style}>
      {(title || right) && (
        <div className="panel-h">
          <div>{sub && <div className="pl">{sub}</div>}{title && <div className="panel-title" style={{ fontSize: 16 }}>{title}</div>}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function KPI({ label, value, unit, delta, deltaType = 'up', spark, sparkColor, accent, big }) {
  return (
    <div className={'kpi dkpi' + (big ? ' lg' : '')}>
      <div className="klabel">{label}</div>
      <div className="kval-row">
        <div className="kval" style={accent ? { color: accent } : null}>
          {value}{unit && <span style={{ fontSize: 15, color: 'var(--text-3)' }}>{unit}</span>}
        </div>
        {spark && <Sparkline values={spark} color={sparkColor || 'var(--cyan)'} />}
      </div>
      {delta && <div className={'kdelta ' + deltaType}>{delta}</div>}
    </div>
  );
}

function feedIcon(sev) {
  const paths = {
    red: <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />,
    amber: <><path d="M12 2a7 7 0 0 1 7 7c0 3-2 4-2 7H7c0-3-2-4-2-7a7 7 0 0 1 7-7z" /><path d="M9 21h6" /></>,
    cyan: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></>,
    green: <path d="M20 6 9 17l-5-5" />
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{paths[sev]}</svg>;
}

function Feed({ it, onOpen }) {
  return (
    <div className="feed" onClick={onOpen}>
      <div className={'fi ' + it.sev}>{feedIcon(it.sev)}</div>
      <div style={{ minWidth: 0 }}>
        <div className="ft">{it.title}<span className={'chip ' + it.sev}>{it.tag}</span></div>
        <div className="fs">{it.body}</div>
        <div className="fm">{it.meta.map((m, i) => <span key={i}>{m}</span>)}</div>
      </div>
    </div>
  );
}

const riskDonut = [
  { v: 42, c: 'var(--cyan)' }, { v: 28, c: 'var(--violet)' },
  { v: 18, c: 'var(--amber)' }, { v: 12, c: 'var(--green)' }
];

/* ---------------- ATTRITION ---------------- */
function AttritionView() {
  useLang();
  return (
    <div className="viewfade">
      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <KPI label={T('attr.kpi.exits', 'Predicted exits (12M)')} value="1,043" delta={T('attr.kpi.exits.d', '▼ 132 vs no-action')} accent="var(--amber)" />
        <KPI label={T('attr.kpi.highrisk', 'High-risk employees')} value="847" delta={T('attr.kpi.highrisk.d', '▲ 32 flagged')} deltaType="down" />
        <KPI label={T('attr.kpi.regret', 'Regretted attrition')} value="6.4%" delta={T('attr.kpi.regret.d', '▼ 0.8 vs LY')} />
        <KPI label={T('attr.kpi.cost', 'Cost-to-replace at risk')} value="€1.4M" delta={T('attr.kpi.cost.d', 'addressable now')} deltaType="warn" />
      </div>
      <div className="dash-main">
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 'inherit' }}>
          <Panel sub={T('attr.p1.sub', 'High-risk employees')} title={T('attr.p1.title', 'Ranked by model risk score')} right={<span className="chip">{T('attr.p1.chip', 'Showing top 8 of 847')}</span>}>
            <div style={{ marginTop: 10, overflowX: 'auto' }}>
              <table className="tbl">
                <thead><tr><th>{T('attr.th.emp', 'Employee')}</th><th>{T('attr.th.dept', 'Department')}</th><th>{T('attr.th.tenure', 'Tenure')}</th><th>{T('attr.th.driver', 'Top driver')}</th><th>{T('attr.th.risk', 'Risk')}</th></tr></thead>
                <tbody>
                  {H.highRisk.map((e, i) => (
                    <tr key={i}>
                      <td><div className="emp"><span className="av-sm">{e.name.split(' ').map(p=>p[0]).join('')}</span>{e.name}</div></td>
                      <td>{e.dept}</td><td>{e.tenure}</td><td><span className="chip">{T('val.driver.' + e.driver, e.driver)}</span></td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="riskbar"><i style={{ width: e.risk + '%', background: e.risk > 85 ? 'var(--red)' : 'var(--amber)' }}></i></div>
                        <span className={'risk-badge ' + (e.risk > 85 ? 'crit' : 'high')}>{e.risk}</span>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel sub={T('attr.p2.sub', 'Risk by department')} title={T('attr.p2.title', 'Where the risk lives')}>
            <div style={{ marginTop: 8 }}>
              <BarList items={H.departments.map(d => ({ label: d.name, v: Math.round(d.risk * 100), display: Math.round(d.risk*100), color: d.risk > 0.6 ? 'linear-gradient(90deg,#b54a55,var(--red))' : undefined }))} max={100} />
            </div>
          </Panel>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 'inherit' }}>
          <Panel sub={T('attr.p3.sub', 'Cohort analysis')} title={T('attr.p3.title', 'Risk by tenure band')}>
            <div style={{ marginTop: 8 }}>
              <BarList items={[{label:T('attr.band.1','<1 year'),v:74},{label:T('attr.band.2','1–2 years'),v:88,color:'linear-gradient(90deg,#b54a55,var(--red))'},{label:T('attr.band.3','2–4 years'),v:52},{label:T('attr.band.4','4–8 years'),v:31},{label:T('attr.band.5','8+ years'),v:19}]} max={100} />
            </div>
          </Panel>
          <Panel sub={T('attr.p4.sub', 'Recommendations')} title={T('attr.p4.title', 'Prioritized actions')}>
            {H.recommendationsL().map(r => (
              <div key={r.id} className="exec-line" style={{ borderTop: r.id==='R1'?'none':undefined, paddingTop: r.id==='R1'?0:undefined }}>
                <span className="en">{r.id}</span>
                <div><div className="et" style={{ fontSize: 13.5 }}>{r.title}</div><div className="es" style={{ fontSize: 12 }}>{r.impact} · {T('attr.effort','effort')}: {T('val.effort.' + r.effort, r.effort)}</div></div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ENGAGEMENT ---------------- */
function EngagementView() {
  useLang();
  return (
    <div className="viewfade">
      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <KPI label={T('eng.kpi.enps', 'eNPS')} value="+34" delta={T('eng.kpi.enps.d', '▲ 6 vs Q3')} accent="var(--green)" />
        <KPI label={T('eng.kpi.pulse', 'Pulse score')} value="74" unit="/100" delta={T('eng.kpi.pulse.d', '▲ 3 pts')} spark={H.engagementTrend} sparkColor="var(--green)" />
        <KPI label={T('eng.kpi.part', 'Participation')} value="89%" delta={T('eng.kpi.part.d', '▲ 4 pts')} />
        <KPI label={T('eng.kpi.atrisk', 'At-risk teams')} value="3" delta={T('eng.kpi.atrisk.d', 'Ops · APAC')} deltaType="warn" />
      </div>
      <div className="dash-main">
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 'inherit' }}>
          <Panel sub={T('eng.p1.sub', 'Pulse trend · 12 months')} title={T('eng.p1.title', 'Engagement is recovering')}>
            <div style={{ marginTop: 8 }}><AreaChart values={H.engagementTrend} h={180} color="var(--green)" fillId="eng1" min={60} max={85} /></div>
            <div className="axis-x"><span>JAN</span><span>APR</span><span>JUL</span><span>OCT</span><span>DEC</span></div>
          </Panel>
          <Panel sub={T('eng.p2.sub', 'By department')} title={T('eng.p2.title', 'Engagement score')}>
            <div style={{ marginTop: 8 }}>
              <BarList items={H.departments.map(d => ({ label: d.name, v: d.eng, display: d.eng, color: d.eng < 65 ? 'linear-gradient(90deg,#a8902f,var(--amber))' : undefined }))} max={100} />
            </div>
          </Panel>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 'inherit' }}>
          <Panel sub={T('eng.p3.sub', 'Drivers')} title={T('eng.p3.title', 'What moves engagement')}>
            <div style={{ display:'flex', gap:14, alignItems:'center', marginTop:10 }}>
              <Donut data={[{v:34,c:'var(--green)'},{v:26,c:'var(--cyan)'},{v:22,c:'var(--violet)'},{v:18,c:'var(--amber)'}]} size={96} />
              <div className="legend">
                <div className="lr"><span className="sw" style={{background:'var(--green)'}}></span>{T('eng.lg.recognition','Recognition')} <b>34%</b></div>
                <div className="lr"><span className="sw" style={{background:'var(--cyan)'}}></span>{T('eng.lg.manager','Manager')} <b>26%</b></div>
                <div className="lr"><span className="sw" style={{background:'var(--violet)'}}></span>{T('eng.lg.growth','Growth')} <b>22%</b></div>
                <div className="lr"><span className="sw" style={{background:'var(--amber)'}}></span>{T('eng.lg.workload','Workload')} <b>18%</b></div>
              </div>
            </div>
          </Panel>
          <Panel sub={T('eng.p4.sub', 'Weak signal')} title={T('eng.p4.title', 'Engagement drift · Ops APAC')}>
            <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6, marginTop: 4 }}>{T('eng.p4.body', 'Pulse −6 pts since Q3, 1:1 cadence −22%, correlated with two manager transitions.')}</p>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:12 }}>
              <span className="chip amber">{T('eng.chip.pulse','Pulse −6')}</span><span className="chip">{T('eng.chip.cadence','1:1s −22%')}</span><span className="chip">{T('eng.chip.pto','PTO unused ↑')}</span>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ---------------- RETENTION ---------------- */
function RetentionView() {
  useLang();
  return (
    <div className="viewfade">
      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <KPI label={T('ret.kpi.proj', 'Retention 12M (proj.)')} value="91.4%" delta={T('ret.kpi.proj.d', '▲ vs 89.8 trailing')} accent="var(--cyan)" />
        <KPI label={T('ret.kpi.interv', 'With interventions')} value="93.1%" delta={T('ret.kpi.interv.d', '▲ +1.7 pts')} accent="var(--green)" />
        <KPI label={T('ret.kpi.ci', 'Confidence interval')} value="±1.6%" delta={T('ret.kpi.ci.d', 'model 94%')} />
        <KPI label={T('ret.kpi.stab', 'Workforce stability')} value={T('ret.kpi.stab.v', 'High')} delta={T('ret.kpi.stab.d', '2 units at risk')} deltaType="warn" />
      </div>
      <Panel sub={T('ret.p1.sub', 'Forecast · 12 months')} title={T('ret.p1.title', 'Projected headcount stability')}
        right={<div className="seg"><button>6M</button><button className="on">12M</button><button>24M</button></div>}>
        <div style={{ marginTop: 8, position: 'relative' }}>
          <AreaChart values={H.retention} h={240} color="var(--cyan)" fillId="ret1" min={86} max={100} />
        </div>
        <div className="axis-x"><span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>NOV</span></div>
        <div style={{ display:'flex', gap:18, marginTop:14, fontFamily:'var(--f-mono)', fontSize:11, color:'var(--text-3)' }}>
          <span style={{display:'flex',alignItems:'center',gap:7}}><i style={{width:14,height:2,background:'var(--cyan)',display:'inline-block'}}></i>{T('ret.lg.projected','Projected')}</span>
          <span style={{display:'flex',alignItems:'center',gap:7}}><i style={{width:14,height:0,borderTop:'2px dashed var(--text-3)',display:'inline-block'}}></i>{T('ret.lg.baseline','Baseline (no action)')}</span>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- HEATMAPS ---------------- */
function HeatmapsView() {
  useLang();
  return (
    <div className="viewfade">
      <div className="grid g-2">
        <Panel sub={T('hm.p1.sub', 'Attrition risk')} title={T('hm.p1.title', 'Risk × region')}>
          <div style={{ marginTop: 12 }}><Heatmap rows={['EMEA','AMER','APAC']} cols={['Sales','Eng','Ops','Prod','CS','G&A']}
            values={[[0.82,0.6,0.35,0.28,0.46,0.2],[0.55,0.71,0.42,0.34,0.33,0.22],[0.38,0.48,0.6,0.5,0.26,0.24]]} /></div>
        </Panel>
        <Panel sub={T('hm.p2.sub', 'Overtime load')} title={T('hm.p2.title', 'Hours × region')}>
          <div style={{ marginTop: 12 }}><Heatmap rows={['EMEA','AMER','APAC']} cols={['Sales','Eng','Ops','Prod','CS','G&A']}
            values={[[0.34,0.5,0.3,0.22,0.18,0.1],[0.4,0.78,0.44,0.36,0.2,0.12],[0.28,0.42,0.62,0.3,0.24,0.14]]} /></div>
        </Panel>
        <Panel sub={T('hm.p3.sub', 'Engagement')} title={T('hm.p3.title', 'Pulse × region (inverse)')}>
          <div style={{ marginTop: 12 }}><Heatmap rows={['EMEA','AMER','APAC']} cols={['Sales','Eng','Ops','Prod','CS','G&A']}
            values={[[0.42,0.36,0.4,0.2,0.28,0.17],[0.3,0.36,0.39,0.22,0.26,0.16],[0.38,0.34,0.55,0.3,0.3,0.2]]} /></div>
        </Panel>
        <Panel sub={T('hm.p4.sub', 'Compensation gap')} title={T('hm.p4.title', 'Below-band % × region')}>
          <div style={{ marginTop: 12 }}><Heatmap rows={['EMEA','AMER','APAC']} cols={['Sales','Eng','Ops','Prod','CS','G&A']}
            values={[[0.66,0.4,0.3,0.24,0.34,0.18],[0.44,0.5,0.32,0.28,0.26,0.16],[0.3,0.38,0.46,0.34,0.28,0.2]]} /></div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- AI INSIGHTS ---------------- */
function InsightsView({ openInsight }) {
  useLang();
  return (
    <div className="viewfade">
      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <KPI label={T('ins.kpi.active', 'Active signals')} value="7" delta={T('ins.kpi.active.d', '3 high severity')} deltaType="warn" accent="var(--cyan)" />
        <KPI label={T('ins.kpi.week', 'Detected this week')} value="12" delta={T('ins.kpi.week.d', '▲ 4 vs last wk')} />
        <KPI label={T('ins.kpi.conf', 'Avg confidence')} value="88%" delta={T('ins.kpi.conf.d', 'model health: good')} accent="var(--green)" />
        <KPI label={T('ins.kpi.actions', 'Actions generated')} value="24" delta={T('ins.kpi.actions.d', '9 prioritized')} />
      </div>
      <div className="grid g-2">
        <div>
          {H.insightsL().map((it, i) => <Feed key={i} it={it} onOpen={() => openInsight(it)} />)}
        </div>
        <Panel sub={T('ins.rec.sub', 'Generated recommendations')} title={T('ins.rec.title', 'What to do next')}>
          {H.recommendationsL().map(r => (
            <div key={r.id} className="feed" style={{ marginBottom: 11 }}>
              <div className="fi cyan"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg></div>
              <div><div className="ft" style={{ fontSize: 14 }}>{r.title}</div><div className="fm"><span>{T('ins.impact','Impact')}: {r.impact}</span><span>{T('ins.effort','Effort')}: {T('val.effort.' + r.effort, r.effort)}</span></div></div>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- REPORTS ---------------- */
function ReportsView({ openSummary, onGenerate }) {
  useLang();
  return (
    <div className="viewfade">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <p style={{ color:'var(--text-3)', fontSize:14, maxWidth:'52ch' }}>{T('rep.intro', 'Board-ready executive summaries, generated from your live workforce data. Every number is explainable and sourced.')}</p>
        <button className="btn btn-primary" onClick={onGenerate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>
          {T('rep.generate', 'Generate summary')}
        </button>
      </div>
      <div className="grid g-3">
        {H.summariesL().map((s, i) => (
          <div key={i} className="exec-doc" style={{ cursor:'pointer' }} onClick={() => openSummary(s)}>
            <div className="ed-top">
              <div style={{ display:'flex', alignItems:'center', gap:9 }}><span className="brand"><span className="mark" style={{ width:22, height:22, borderRadius:7 }}></span></span><b style={{ fontFamily:'var(--f-display)', fontSize:14 }}>{s.title}</b></div>
              <span className={'chip ' + (s.status==='Ready'?'green':'amber')}>{T('val.status.' + s.status, s.status)}</span>
            </div>
            <div className="ed-body">
              <h4 style={{ fontSize:16 }}>{s.head}</h4>
              <div className="ed-sub">{s.for.toUpperCase()} · {s.date.toUpperCase()}</div>
              {s.lines.length > 0 && s.lines.slice(0,2).map((l,li)=>(
                <div className="exec-line" key={li} style={{ borderTop: li===0?'none':undefined, paddingTop: li===0?0:undefined }}>
                  <span className="en">{l[0]}</span><div><div className="et" style={{ fontSize:13 }}>{l[1]}</div></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Panel, KPI, Feed, AttritionView, EngagementView, RetentionView, HeatmapsView, InsightsView, ReportsView });
