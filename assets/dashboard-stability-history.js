/* HUMIND — Workforce Stability history loader
   Fetches /api/stability-history once, patches window.HUMIND._stabilityHistory,
   then dispatches 'stance:data' so StabilityChart can react to real history. */
(async function () {
  const H = window.HUMIND;
  try {
    const res = await fetch('/api/stability-history');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const history = await res.json();
    H._stabilityHistory = Array.isArray(history) ? history : [];
  } catch (err) {
    H._stabilityHistory = [];
    console.warn('[Stance] Could not load stability history:', err.message);
  }
  window.dispatchEvent(new CustomEvent('stance:data', { detail: { stabilityHistory: H._stabilityHistory } }));
})();
