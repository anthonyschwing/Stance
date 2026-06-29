/* Stance landing — Tweaks island (React) wired to the vanilla page via
   window.__applyStanceTweaks. Every control maps to a CSS var or body[data-*]
   attribute; presets fan out to many keys at once. No art-direction change. */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "preset": "custom",
  "theme": "dark",
  "accent": "purple",
  "hero": "split",
  "herosize": "default",
  "balance": "default",
  "titleSize": 46,
  "stageSize": 100,
  "dash": "compact",
  "kpi": "solid",
  "maxw": 1160,
  "density": "compact",
  "sectionY": 48,
  "radius": "default",
  "shadow": "soft",
  "btn": "pill"
}/*EDITMODE-END*/;

/* ---- presets fan out to many keys at once ---- */
const PRESETS = {
  'hero-compact':       { herosize:'compact', hero:'split', balance:'even',      stageSize:96,  titleSize:50 },
  'hero-large':         { herosize:'large',   hero:'split', balance:'text',      stageSize:96,  titleSize:72 },
  'dashboard-dominant': { hero:'split', balance:'dashboard', herosize:'default', stageSize:110, dash:'comfortable' },
  'text-dominant':      { hero:'split', balance:'text',      herosize:'default', stageSize:90,  titleSize:64 },
  'dark-premium':       { theme:'dark',  accent:'purple',   shadow:'elevated', radius:'rounded', btn:'pill', kpi:'solid',   density:'spacious', dash:'comfortable' },
  'light-premium':      { theme:'light', accent:'sky',      shadow:'soft',     radius:'default', btn:'soft', kpi:'outline', density:'calm',     dash:'comfortable' },
  'executive':          { theme:'light', hero:'centered', balance:'default', accent:'sky', titleSize:62, density:'spacious', kpi:'minimal', dash:'comfortable', btn:'soft', radius:'default', shadow:'soft', sectionY:126, stageSize:100 },
  'data-product':       { theme:'dark',  hero:'split', balance:'dashboard', accent:'purple', density:'compact', dash:'compact', kpi:'solid', radius:'sharp', btn:'square', shadow:'soft', stageSize:108, sectionY:92, titleSize:50 }
};

const ACCENT_HEX = { purple:'#7C3AED', sky:'#38BDF8', lilac:'#A78BFA', emerald:'#2BD9A0', amber:'#F6B43A' };
const HEX_ACCENT = Object.fromEntries(Object.entries(ACCENT_HEX).map(([k, v]) => [v, k]));

function StanceTweaks() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    let tries = 0;
    (function apply() {
      if (window.__applyStanceTweaks) window.__applyStanceTweaks(t);
      else if (tries++ < 40) setTimeout(apply, 60);
    })();
  }, [t]);

  const applyPreset = (name) => {
    const p = PRESETS[name];
    if (p) setTweak({ preset: name, ...p });
    else setTweak('preset', name);
  };

  return (
    <TweaksPanel title="Stance">

      <TweakSection label="Preset" />
      <TweakSelect
        label="Variant"
        value={t.preset}
        options={[
          { value:'custom',             label:'Custom' },
          { value:'hero-compact',       label:'Hero · Compact' },
          { value:'hero-large',         label:'Hero · Large' },
          { value:'dashboard-dominant', label:'Dashboard dominant' },
          { value:'text-dominant',      label:'Text dominant' },
          { value:'dark-premium',       label:'Dark premium' },
          { value:'light-premium',      label:'Light premium' },
          { value:'executive',          label:'Executive mode' },
          { value:'data-product',       label:'Data product mode' }
        ]}
        onChange={applyPreset}
      />

      <TweakSection label="Theme & color" />
      <TweakRadio label="Theme" value={t.theme} options={['light', 'dark']}
        onChange={(v) => setTweak('theme', v)} />
      <TweakColor label="Accent"
        value={ACCENT_HEX[t.accent] || ACCENT_HEX.purple}
        options={['#7C3AED', '#38BDF8', '#A78BFA', '#2BD9A0', '#F6B43A']}
        onChange={(hex) => setTweak('accent', HEX_ACCENT[hex] || 'purple')} />

      <TweakSection label="Hero" />
      <TweakRadio label="Layout" value={t.hero} options={['split', 'centered']}
        onChange={(v) => setTweak('hero', v)} />
      <TweakRadio label="Size" value={t.herosize} options={['compact', 'default', 'large']}
        onChange={(v) => setTweak('herosize', v)} />
      <TweakSelect label="Balance" value={t.balance}
        options={[
          { value:'default',   label:'Auto' },
          { value:'text',      label:'Text dominant' },
          { value:'even',      label:'Even' },
          { value:'dashboard', label:'Dashboard dominant' }
        ]}
        onChange={(v) => setTweak('balance', v)} />
      <TweakSlider label="Title size" value={t.titleSize} min={36} max={84} unit="px"
        onChange={(v) => setTweak('titleSize', v)} />

      <TweakSection label="Dashboard mockup" />
      <TweakSlider label="Size" value={t.stageSize} min={82} max={116} unit="%"
        onChange={(v) => setTweak('stageSize', v)} />
      <TweakRadio label="Density" value={t.dash} options={['comfortable', 'compact']}
        onChange={(v) => setTweak('dash', v)} />
      <TweakRadio label="KPI cards" value={t.kpi} options={['solid', 'outline', 'minimal']}
        onChange={(v) => setTweak('kpi', v)} />

      <TweakSection label="Layout & spacing" />
      <TweakSlider label="Container width" value={t.maxw} min={1100} max={1200} step={10} unit="px"
        onChange={(v) => setTweak('maxw', v)} />
      <TweakRadio label="Density" value={t.density} options={['compact', 'calm', 'spacious']}
        onChange={(v) => setTweak('density', v)} />
      <TweakSlider label="Section spacing" value={t.sectionY} min={40} max={160} step={2} unit="px"
        onChange={(v) => setTweak('sectionY', v)} />

      <TweakSection label="Surface & style" />
      <TweakRadio label="Card radius" value={t.radius} options={['sharp', 'default', 'rounded']}
        onChange={(v) => setTweak('radius', v)} />
      <TweakRadio label="Shadow" value={t.shadow} options={['flat', 'soft', 'elevated']}
        onChange={(v) => setTweak('shadow', v)} />
      <TweakRadio label="Buttons" value={t.btn} options={['pill', 'soft', 'square']}
        onChange={(v) => setTweak('btn', v)} />

    </TweaksPanel>
  );
}

(function mount() {
  const el = document.getElementById('tweaks-root');
  if (!el || !window.ReactDOM) { setTimeout(mount, 60); return; }
  ReactDOM.createRoot(el).render(<StanceTweaks />);
})();
