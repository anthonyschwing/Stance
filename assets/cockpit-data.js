/* Stance Cockpit — data layer.
   Fetches the aggregate-only /api/cockpit/* endpoints. Deliberately isolated
   from dashboard-data.js / dashboard-realdata.js (Sentinelle's per-employee
   fetch layer) — Cockpit never touches individual employee records. */

window.StanceCockpit = (function () {
  async function getJSON(url) {
    const res = await fetch(url);
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error((body && body.error) || `HTTP ${res.status}`);
    return body;
  }

  return {
    getSummary: () => getJSON('/api/cockpit/summary'),
    getTrend: () => getJSON('/api/cockpit/trend'),
    getFinancial: () => getJSON('/api/cockpit/financial'),
    getBriefing: () => getJSON('/api/cockpit/briefing')
  };
})();
