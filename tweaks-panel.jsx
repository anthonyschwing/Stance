/* =========================================================================
   HUMIND — Tweaks Panel shell  (loaded via @babel/standalone)
   Exports to window: useTweaks, TweaksPanel, TweakSection, TweakRow,
     TweakSlider, TweakToggle, TweakRadio, TweakSelect, TweakText,
     TweakNumber, TweakColor, TweakButton
   ========================================================================= */

/* ---- useTweaks hook ---- */
function useTweaks(defaults) {
  const [state, setState] = React.useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('_humindTweaks') || 'null');
      return stored ? { ...defaults, ...stored } : { ...defaults };
    } catch { return { ...defaults }; }
  });

  const setTweak = React.useCallback((keyOrObj, value) => {
    setState(prev => {
      const next = typeof keyOrObj === 'object'
        ? { ...prev, ...keyOrObj }
        : { ...prev, [keyOrObj]: value };
      try { localStorage.setItem('_humindTweaks', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return [state, setTweak];
}

/* ---- Panel shell ---- */
function TweaksPanel({ title, children }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ x: null, y: null });
  const dragging = React.useRef(null);
  const panelRef = React.useRef(null);

  const startDrag = (e) => {
    if (e.target.closest('input,select,button,label')) return;
    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    dragging.current = { ox: e.clientX - rect.left, oy: e.clientY - rect.top };
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);
  };
  const onDrag = (e) => {
    if (!dragging.current) return;
    setPos({ x: e.clientX - dragging.current.ox, y: e.clientY - dragging.current.oy });
  };
  const endDrag = () => { dragging.current = null; window.removeEventListener('mousemove', onDrag); window.removeEventListener('mouseup', endDrag); };

  const style = {};
  if (pos.x !== null) { style.left = pos.x; style.top = pos.y; style.right = 'auto'; style.bottom = 'auto'; }

  return (
    <>
      {/* fab */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:'fixed', bottom:22, right:22, zIndex:9000,
          width:44, height:44, borderRadius:'50%', border:'1px solid rgba(255,255,255,.18)',
          background:'linear-gradient(180deg,#8B5CF6,#6D28D9)',
          boxShadow:'0 0 0 1px rgba(124,58,237,.55),0 10px 30px -10px rgba(124,58,237,.8)',
          color:'#fff', cursor:'pointer', fontSize:20, display:'flex', alignItems:'center', justifyContent:'center',
          transition:'transform .2s', transform: open ? 'rotate(45deg)' : 'none'
        }}
        title="Design tweaks"
      >✦</button>

      {/* panel */}
      {open && (
        <div ref={panelRef} onMouseDown={startDrag} style={{
          position:'fixed', right: pos.x !== null ? 'auto' : 16, bottom: pos.y !== null ? 'auto' : 72,
          left: pos.x !== null ? pos.x : 'auto', top: pos.y !== null ? pos.y : 'auto',
          zIndex:8999, width:292, maxHeight:'85vh', overflowY:'auto',
          borderRadius:18, border:'1px solid rgba(255,255,255,.13)',
          background:'rgba(13,18,30,.92)', backdropFilter:'blur(22px) saturate(150%)',
          boxShadow:'0 0 0 1px rgba(124,58,237,.12),0 30px 70px -24px rgba(0,0,0,.95)',
          color:'#E2E8F0', fontFamily:"'Manrope',system-ui,sans-serif", fontSize:13,
          cursor:'default', userSelect:'none',
          ...style
        }}>
          {/* header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,.07)',
            background:'linear-gradient(180deg,rgba(255,255,255,.04),transparent)',
            cursor:'grab', borderRadius:'18px 18px 0 0' }}>
            <span style={{ fontFamily:"'Sora',system-ui,sans-serif", fontWeight:700, fontSize:14, letterSpacing:'-.01em' }}>
              ✦ {title || 'Tweaks'}
            </span>
            <button onClick={() => setOpen(false)} style={{
              background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)',
              color:'#A8B2C6', borderRadius:8, width:26, height:26, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:12
            }}>✕</button>
          </div>
          <div style={{ padding:'8px 0 14px' }}>{children}</div>
        </div>
      )}
    </>
  );
}

/* ---- Section label ---- */
function TweakSection({ label }) {
  return (
    <div style={{ padding:'10px 16px 4px', fontFamily:"'JetBrains Mono',monospace",
      fontSize:9, letterSpacing:'.22em', textTransform:'uppercase', color:'#566179' }}>
      {label}
    </div>
  );
}

/* ---- Row wrapper ---- */
function TweakRow({ label, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 16px', minHeight:32 }}>
      <span style={{ color:'#7C8AA6', fontSize:12, flex:'0 0 96px', lineHeight:1.3 }}>{label}</span>
      <div style={{ flex:1, display:'flex', alignItems:'center', gap:6 }}>{children}</div>
    </div>
  );
}

/* ---- Slider ---- */
function TweakSlider({ label, value, min, max, step, unit, onChange }) {
  return (
    <TweakRow label={label}>
      <input type="range" min={min} max={max} step={step || 1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex:1, accentColor:'#7C3AED', cursor:'pointer', height:4 }} />
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:'#A8B2C6',
        minWidth:38, textAlign:'right' }}>{value}{unit || ''}</span>
    </TweakRow>
  );
}

/* ---- Toggle ---- */
function TweakToggle({ label, value, onChange }) {
  return (
    <TweakRow label={label}>
      <button onClick={() => onChange(!value)} style={{
        width:36, height:20, borderRadius:999, border:'none', cursor:'pointer',
        background: value ? '#7C3AED' : 'rgba(255,255,255,.12)',
        position:'relative', transition:'background .2s'
      }}>
        <span style={{
          position:'absolute', top:3, left: value ? 18 : 3,
          width:14, height:14, borderRadius:'50%', background:'#fff',
          transition:'left .2s', display:'block'
        }} />
      </button>
    </TweakRow>
  );
}

/* ---- Radio ---- */
function TweakRadio({ label, value, options, onChange }) {
  return (
    <TweakRow label={label}>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
        {options.map(opt => {
          const v = typeof opt === 'object' ? opt.value : opt;
          const l = typeof opt === 'object' ? opt.label : opt;
          const on = value === v;
          return (
            <button key={v} onClick={() => onChange(v)} style={{
              padding:'3px 9px', borderRadius:999, border:'1px solid',
              borderColor: on ? 'rgba(124,58,237,.7)' : 'rgba(255,255,255,.1)',
              background: on ? 'rgba(124,58,237,.22)' : 'transparent',
              color: on ? '#A78BFA' : '#7C8AA6',
              fontSize:11, cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s'
            }}>{l}</button>
          );
        })}
      </div>
    </TweakRow>
  );
}

/* ---- Select ---- */
function TweakSelect({ label, value, options, onChange }) {
  return (
    <TweakRow label={label}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        flex:1, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)',
        borderRadius:8, color:'#E2E8F0', fontSize:12, padding:'5px 8px', cursor:'pointer',
        outline:'none', fontFamily:"'Manrope',system-ui,sans-serif"
      }}>
        {options.map(o => (
          <option key={typeof o === 'object' ? o.value : o}
            value={typeof o === 'object' ? o.value : o}
            style={{ background:'#0D121E' }}>
            {typeof o === 'object' ? o.label : o}
          </option>
        ))}
      </select>
    </TweakRow>
  );
}

/* ---- Text ---- */
function TweakText({ label, value, onChange, placeholder }) {
  return (
    <TweakRow label={label}>
      <input type="text" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} style={{
          flex:1, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)',
          borderRadius:8, color:'#E2E8F0', fontSize:12, padding:'5px 9px', outline:'none',
          fontFamily:"'Manrope',system-ui,sans-serif"
        }} />
    </TweakRow>
  );
}

/* ---- Number ---- */
function TweakNumber({ label, value, min, max, step, unit, onChange }) {
  return (
    <TweakRow label={label}>
      <input type="number" value={value} min={min} max={max} step={step || 1}
        onChange={e => onChange(Number(e.target.value))} style={{
          width:70, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)',
          borderRadius:8, color:'#E2E8F0', fontSize:12, padding:'5px 9px', outline:'none',
          fontFamily:"'JetBrains Mono',monospace"
        }} />
      {unit && <span style={{ fontSize:11, color:'#566179' }}>{unit}</span>}
    </TweakRow>
  );
}

/* ---- Color swatches ---- */
function TweakColor({ label, value, options, onChange }) {
  return (
    <TweakRow label={label}>
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
        {(options || []).map(hex => (
          <button key={hex} onClick={() => onChange(hex)} title={hex} style={{
            width:20, height:20, borderRadius:'50%', border: value === hex
              ? '2px solid #fff' : '2px solid transparent',
            background:hex, cursor:'pointer', transition:'transform .15s',
            transform: value === hex ? 'scale(1.25)' : 'scale(1)'
          }} />
        ))}
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          title="Custom" style={{
            width:20, height:20, borderRadius:'50%', border:'none',
            background:'none', cursor:'pointer', padding:0
          }} />
      </div>
    </TweakRow>
  );
}

/* ---- Generic button ---- */
function TweakButton({ label, onClick, children }) {
  return (
    <div style={{ padding:'4px 16px' }}>
      <button onClick={onClick} style={{
        width:'100%', padding:'7px 12px', borderRadius:10,
        border:'1px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.07)',
        color:'#A8B2C6', fontSize:12, cursor:'pointer', textAlign:'left',
        fontFamily:"'Manrope',system-ui,sans-serif", transition:'background .15s,color .15s'
      }}>{label || children}</button>
    </div>
  );
}

/* ---- Export to window ---- */
Object.assign(window, {
  useTweaks, TweaksPanel, TweakSection, TweakRow,
  TweakSlider, TweakToggle, TweakRadio, TweakSelect,
  TweakText, TweakNumber, TweakColor, TweakButton
});
