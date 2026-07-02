/* HUMIND — Workforce Stability bucketing (pure logic, no DOM/React deps)
   Exposed as window.StanceStability in the browser, module.exports under Node. */
;(function (global) {
  'use strict';

  var DAY_MS = 86400000;

  function bucketStability(history, rangeDays, bucketCount) {
    bucketCount = bucketCount || 12;
    if (!history || !history.length) return null;

    var sorted = history.slice().sort(function (a, b) {
      return new Date(a.date) - new Date(b.date);
    });
    var now = new Date();
    var oldest = new Date(sorted[0].date);
    var spanDays = (now - oldest) / DAY_MS;
    if (spanDays < rangeDays) return null;

    var windowStart = new Date(now.getTime() - rangeDays * DAY_MS);
    var inWindow = sorted.filter(function (h) { return new Date(h.date) >= windowStart; });
    if (!inWindow.length) return null;

    var bucketMs = (rangeDays * DAY_MS) / bucketCount;
    var sums = new Array(bucketCount).fill(0);
    var counts = new Array(bucketCount).fill(0);

    inWindow.forEach(function (h) {
      var age = now - new Date(h.date);
      var idx = bucketCount - 1 - Math.floor(age / bucketMs);
      idx = Math.max(0, Math.min(bucketCount - 1, idx));
      sums[idx] += h.retentionRate;
      counts[idx] += 1;
    });

    var values = sums.map(function (s, i) { return counts[i] ? s / counts[i] : null; });
    var last = inWindow[0].retentionRate;
    for (var i = 0; i < values.length; i++) {
      if (values[i] == null) values[i] = last;
      else last = values[i];
    }
    values[bucketCount - 1] = inWindow[inWindow.length - 1].retentionRate;
    return values;
  }

  function bucketAxisLabels(rangeDays, tickCount) {
    tickCount = tickCount || 7;
    var now = new Date();
    var labels = [];
    for (var i = 0; i < tickCount; i++) {
      if (i === tickCount - 1) { labels.push('Now'); continue; }
      var daysAgo = Math.round(rangeDays * (1 - i / (tickCount - 1)));
      var d = new Date(now.getTime() - daysAgo * DAY_MS);
      labels.push(d.getDate() + '/' + (d.getMonth() + 1));
    }
    return labels;
  }

  var api = { bucketStability: bucketStability, bucketAxisLabels: bucketAxisLabels };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.StanceStability = api;
  }
}(typeof window !== 'undefined' ? window : this));
