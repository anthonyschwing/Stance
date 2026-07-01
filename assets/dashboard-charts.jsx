/* HUMIND dashboard — chart components (render final-state SVG; throttle-safe) */
const { useState, useEffect, useRef } = React;

/* smooth cubic path from y-values (0..1 normalized handled by caller) */
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

function AreaChart({ values, w = 540, h = 170, color = 'var(--cyan-3)', fillId = 'ac', dashed = false, min, max, pad = 10 }) {
  const lo = min !== undefined ? min : Math.min(...values);
  const hi = max !== undefined ? max : Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    pad + (1 - (v - lo) / span) * (h - pad * 2)
  ]);
  const line = smoothPath(pts);
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(g => <line key={g} x1="0" y1={h * g} x2={w} y2={h * g} stroke="rgba(255,255,255,.05)" />)}
      {!dashed && <path d={area} fill={`url(#${fillId})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={dashed ? 1.6 : 2.4}
        strokeLinecap="round" strokeDasharray={dashed ? '4 5' : undefined} />
      {!dashed && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill={color} />}
    </svg>
  );
}

function Sparkline({ values, color = 'var(--cyan-3)', w = 62, h = 24 }) {
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${2 + (1 - (v - lo) / span) * (h - 4)}`).join(' ');
  return <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none">
    <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function Gauge({ value, max = 100, label = 'Risk Index', size = 132, colorFrom = 'var(--amber)', colorTo = 'var(--cyan-3)' }) {
  const r = (size - 22) / 2, c = 2 * Math.PI * r;
  const id = 'gg' + Math.round(value * 97);
  const animOn = document.documentElement.classList.contains('anim') &&
    !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const gkey = label + '|' + value;
  window.__gaugeDone = window.__gaugeDone || {};
  const [disp, setDisp] = useState(animOn && !window.__gaugeDone[gkey] ? 0 : value);
  useEffect(() => {
    if (!animOn || window.__gaugeDone[gkey]) { setDisp(value); return; }
    window.__gaugeDone[gkey] = true;
    let raf, t0; const dur = 950;
    const step = (now) => {
      if (!t0) t0 = now;
      const p = Math.min(1, (now - t0) / dur);
      setDisp(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step); else setDisp(value);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  const pct = disp / max;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="11" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={colorFrom} /><stop offset="100%" stopColor={colorTo} /></linearGradient></defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center' }}>
        <b className="metric-val" style={{ fontFamily: 'var(--f-display)', fontSize: size * 0.27, fontWeight: 700, lineHeight: 1 }}>{Math.round(disp)}</b>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '.2em', color: 'var(--text-3)', textTransform: 'uppercase' }}>{label}</span>
      </div>
    </div>
  );
}

function Donut({ data, size = 92 }) {
  const total = data.reduce((s, d) => s + d.v, 0);
  let acc = 0;
  const R = 15.9155, sw = 6;
  return (
    <svg width={size} height={size} viewBox="0 0 42 42">
      <circle cx="21" cy="21" r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={sw} />
      {data.map((d, i) => {
        const frac = (d.v / total) * 100;
        const off = 25 - acc; acc += frac;
        return <circle key={i} cx="21" cy="21" r={R} fill="none" stroke={d.c} strokeWidth={sw}
          strokeDasharray={`${frac} ${100 - frac}`} strokeDashoffset={off} pathLength="100" />;
      })}
    </svg>
  );
}

function Heatmap({ rows, cols, values, w = '100%' }) {
  function col(v) {
    if (v >= 0.65) return `rgba(255,122,138,${0.32 + v * 0.55})`;
    if (v >= 0.45) return `rgba(246,196,90,${0.24 + v * 0.5})`;
    return `rgba(124,58,237,${0.12 + v * 0.45})`;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `auto repeat(${cols.length},1fr)`, gap: 5, width: w }}>
      <div></div>
      {cols.map(c => <div key={c} style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--text-4)', textAlign: 'center', letterSpacing: '.04em' }}>{c}</div>)}
      {rows.map((r, ri) => [
        <div key={'l' + ri} style={{ fontFamily: 'var(--f-mono)', fontSize: 9.5, color: 'var(--text-4)', display: 'flex', alignItems: 'center' }}>{r}</div>,
        ...values[ri].map((v, ci) => (
          <div key={ri + '-' + ci} title={`${r} · ${cols[ci]}: ${Math.round(v * 100)}`}
            style={{ aspectRatio: '1.6/1', borderRadius: 6, display: 'grid', placeItems: 'center', background: col(v), fontFamily: 'var(--f-mono)', fontSize: 10, color: 'rgba(255,255,255,.82)' }}>
            {Math.round(v * 100)}
          </div>
        ))
      ])}
    </div>
  );
}

function BarList({ items, max }) {
  const m = max || Math.max(...items.map(i => i.v));
  return (
    <div>
      {items.map((it, i) => (
        <div className="barrow" key={i}>
          <span className="bl">{it.label}</span>
          <span className="bt"><i style={{ width: (it.v / m * 100) + '%', background: it.color || undefined }}></i></span>
          <span className="bv">{it.display !== undefined ? it.display : it.v}</span>
        </div>
      ))}
    </div>
  );
}

function Radar({ axes, values, max = 100, size = 300, color = 'var(--cyan-3)', deltas, lockedIdx = -1, onLock }) {
  const n = axes.length;
  const wrapRef = useRef(null);
  const [dim, setDim] = useState(size);

  useEffect(() => {
    if (!wrapRef.current) return;
    const measure = () => {
      const w = wrapRef.current.offsetWidth;
      if (w > 0) setDim(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const cx = dim / 2, cy = dim / 2;
  const R = dim * 0.34;
  const Rlabel = dim * 0.475;
  const uid = 'rad' + n + 'x' + Math.round(dim);
  const ang = i => (-Math.PI / 2) + (i * 2 * Math.PI / n);
  const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  const ring = f => axes.map((_, i) => pt(i, R * f).join(',')).join(' ');
  function tier(v) {
    if (v >= 80) return 'var(--green)';
    if (v >= 70) return 'var(--cyan-3)';
    if (v >= 55) return 'var(--violet)';
    if (v >= 40) return 'var(--amber)';
    return 'var(--red)';
  }

  const [disp, setDisp] = useState(() => values.slice());
  const dispRef = useRef(values.slice());
  const rafRef = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    const to = values.slice();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!mounted.current) { mounted.current = true; dispRef.current = to; setDisp(to); return; }
    if (reduce) { dispRef.current = to; setDisp(to); return; }
    const from = dispRef.current.slice();
    const dur = 820, t0 = (performance.now ? performance.now() : Date.now());
    const ease = t => 1 - Math.pow(1 - t, 3);
    cancelAnimationFrame(rafRef.current);
    const finish = () => { dispRef.current = to; setDisp(to); };
    const step = (now) => {
      const p = Math.min(1, ((now || Date.now()) - t0) / dur);
      const e = ease(p);
      const cur = to.map((v, i) => from[i] + (v - from[i]) * e);
      dispRef.current = cur; setDisp(cur);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else finish();
    };
    rafRef.current = requestAnimationFrame(step);
    const guard = setTimeout(finish, dur + 160);
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(guard); };
  }, [values.join('|')]);

  const [hover, setHover] = useState(-1);
  const [pulseIdx, setPulseIdx] = useState(-1);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (lockedIdx >= 0) {
      setPulseIdx(lockedIdx);
      setPulseKey(k => k + 1);
    } else {
      setPulseIdx(-1);
    }
  }, [lockedIdx]);

  const active = lockedIdx >= 0 ? lockedIdx : hover;

  const handleClick = (i) => {
    if (onLock) onLock(lockedIdx === i ? -1 : i);
  };

  const leave = (i) => {
    if (lockedIdx >= 0) return;
    setHover(h => (h === i ? -1 : h));
  };

  const valPts = disp.map((v, i) => pt(i, R * Math.max(0.02, v / max)));
  const valPoly = valPts.map(p => p.join(',')).join(' ');

  return (
    <div ref={wrapRef} className={'radar-wrap' + (active >= 0 ? ' is-hover' : '') + (lockedIdx >= 0 ? ' is-locked' : '')} style={{ width: '100%', height: dim, position: 'relative' }}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id={uid} cx="50%" cy="50%" r="62%">
            <stop offset="0%" stopColor="rgba(167,139,250,.40)" />
            <stop offset="66%" stopColor="rgba(124,58,237,.22)" />
            <stop offset="100%" stopColor="rgba(124,58,237,.09)" />
          </radialGradient>
          <filter id={uid + 'glow'} x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="6.5" />
          </filter>
          <filter id={uid + 'vtxglow'} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((f, i) => (
          <polygon key={i} points={ring(f)} fill={i === 3 ? 'rgba(255,255,255,.012)' : 'none'}
            stroke="rgba(255,255,255,.085)" strokeWidth="1" />
        ))}
        {axes.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className={'radar-spoke' + (active === i ? ' on' : '') + (lockedIdx === i ? ' locked' : '')} />; })}

        <g className="radar-live">
          <polygon className="radar-glow" points={valPoly} fill="rgba(124,58,237,.5)" filter={`url(#${uid}glow)`} />
          <polygon className="radar-area" points={valPoly} fill={`url(#${uid})`} stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
          {lockedIdx >= 0 && valPts[lockedIdx] && (
            <circle cx={valPts[lockedIdx][0]} cy={valPts[lockedIdx][1]} r="10"
              fill={tier(values[lockedIdx])} opacity="0.18" filter={`url(#${uid}vtxglow)`} />
          )}
          {valPts.map((p, i) => (
            <circle key={i} className={'radar-vtx' + (active === i ? ' on' : '') + (lockedIdx === i ? ' locked' : '')}
              cx={p[0]} cy={p[1]} r={lockedIdx === i ? 6.5 : active === i ? 5.6 : 4}
              fill="var(--ink-900)" stroke={tier(values[i])} strokeWidth={lockedIdx === i ? 2.8 : 2.2} />
          ))}
          {lockedIdx >= 0 && valPts[lockedIdx] && (
            <circle className="radar-vtx-beacon"
              cx={valPts[lockedIdx][0]} cy={valPts[lockedIdx][1]} r="7"
              fill="none" stroke={tier(values[lockedIdx])} strokeWidth="1.5"
              style={{ transformOrigin: `${valPts[lockedIdx][0]}px ${valPts[lockedIdx][1]}px` }} />
          )}
        </g>

        {valPts.map((p, i) => (
          <circle key={'h' + i} cx={p[0]} cy={p[1]} r="19" fill="transparent" style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => leave(i)}
            onClick={() => handleClick(i)} />
        ))}
      </svg>

      {/* Ripple pulse on click */}
      {pulseIdx >= 0 && valPts[pulseIdx] && (
        <div key={pulseKey} className="radar-click-pulse"
          style={{ left: valPts[pulseIdx][0], top: valPts[pulseIdx][1], borderColor: tier(values[pulseIdx]), boxShadow: `0 0 12px ${tier(values[pulseIdx])}` }} />
      )}
      {pulseIdx >= 0 && valPts[pulseIdx] && (
        <div key={pulseKey + 'b'} className="radar-click-pulse radar-click-pulse-2"
          style={{ left: valPts[pulseIdx][0], top: valPts[pulseIdx][1], borderColor: tier(values[pulseIdx]) }} />
      )}

      {axes.map((a, i) => {
        const [x, y] = pt(i, Rlabel);
        const d = deltas ? deltas[i] : null;
        const dCls = d == null ? 'flat' : d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
        const dTxt = d == null ? '' : (d > 0 ? '▲ +' + d : d < 0 ? '▼ ' + d : '— 0');
        return (
          <div className={'radar-lab' + (active === i ? ' on' : '') + (lockedIdx === i ? ' locked' : '')} key={i}
            style={{ left: x, top: y, cursor: 'pointer' }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => leave(i)}
            onClick={() => handleClick(i)}>
            <span className="rl-n">{a}</span>
            <b className="rl-v" style={{ color: tier(values[i]) }}>{Math.round(disp[i])}</b>
            {d != null && <span className={'rl-d ' + dCls}>{dTxt}<i>vs last review</i></span>}
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { AreaChart, Sparkline, Gauge, Donut, Heatmap, BarList, Radar, smoothPath });
