/* Kleines abhängigkeitsfreies SVG-Liniendiagramm (offlinefähig). */
const Chart = (function () {
  const W = 360, H = 190, PL = 38, PR = 10, PT = 14, PB = 24;

  function niceScale(min, max) {
    if (!isFinite(min) || !isFinite(max)) return { lo: 0, hi: 1, step: 1 };
    if (min === max) { const p = Math.abs(min) * 0.1 || 1; min -= p; max += p; }
    const raw = (max - min) / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    const step = mult * mag;
    return { lo: Math.floor(min / step) * step, hi: Math.ceil(max / step) * step, step };
  }

  const fmtNum = (v) => (Math.abs(v) >= 100 || Number.isInteger(v)
    ? Math.round(v).toString()
    : v.toFixed(1).replace('.', ','));

  const fmtDay = (ts) => new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

  /* points: [{t: Zeitstempel(ms), y: Zahl}] */
  function line(points, opts) {
    opts = opts || {};
    if (!points.length) return '<div class="empty">Noch keine Daten für diese Übung.</div>';

    if (points.length === 1) {
      const p = points[0];
      return '<div class="empty">Erst ein Eintrag (' + fmtNum(p.y) + ' ' + (opts.unit || '') +
        ').<br>Ab dem zweiten Training siehst du hier die Kurve.</div>';
    }

    const ys = points.map((p) => p.y);
    const sc = niceScale(Math.min(...ys), Math.max(...ys));
    const t0 = points[0].t, t1 = points[points.length - 1].t;

    /* X-Position nach Trainingsindex, nicht nach Kalenderdatum: sonst verzerrt ein
       ausgelassenes oder zusätzlich eingeschobenes Training den Kurvenverlauf (großer
       zeitlicher Abstand ≠ großer Fortschritt). Die Datumsbeschriftung unten zeigt
       weiterhin den echten ersten/letzten Tag. */
    const X = (i) => PL + (points.length > 1 ? (i / (points.length - 1)) * (W - PL - PR) : 0);
    const Y = (v) => PT + (1 - (v - sc.lo) / (sc.hi - sc.lo)) * (H - PT - PB);

    let grid = '';
    for (let v = sc.lo; v <= sc.hi + sc.step / 2; v += sc.step) {
      const y = Y(v).toFixed(1);
      grid += '<line x1="' + PL + '" y1="' + y + '" x2="' + (W - PR) + '" y2="' + y +
        '" stroke="#2b3140" stroke-width="1"/>' +
        '<text x="' + (PL - 6) + '" y="' + (+y + 4) + '" text-anchor="end" font-size="10" fill="#8e98ab">' +
        fmtNum(v) + '</text>';
    }

    const coords = points.map((p, i) => [X(i), Y(p.y)]);
    const path = coords.map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1)).join(' ');
    const area = path + ' L' + coords[coords.length - 1][0].toFixed(1) + ' ' + (H - PB) +
      ' L' + coords[0][0].toFixed(1) + ' ' + (H - PB) + ' Z';

    const color = opts.color || '#4ade80';

    const xl = '<text x="' + PL + '" y="' + (H - 6) + '" font-size="10" fill="#8e98ab">' + fmtDay(t0) + '</text>' +
      '<text x="' + (W - PR) + '" y="' + (H - 6) + '" text-anchor="end" font-size="10" fill="#8e98ab">' + fmtDay(t1) + '</text>';

    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity=".28"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      grid +
      '<path d="' + area + '" fill="url(#g1)"/>' +
      '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2.2" ' +
      'stroke-linejoin="round" stroke-linecap="round"/>' +
      xl + '</svg>';
  }

  return { line, fmtNum };
})();
