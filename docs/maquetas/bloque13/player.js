// Reproductor: secuencias de escenas, pie de Fray Abundio, mapa y modo fijo.
const M = DATA.map, stageEl = document.getElementById("stage"), over = document.getElementById("over");
const mapLayer = document.getElementById("maplayer"), mw = document.getElementById("mw");
const veil = document.getElementById("veil"), vg = veil.getContext("2d");
veil.width = M.w; veil.height = M.h; mw.style.width = M.w + "px"; mw.style.height = M.h + "px";
function paintMap(id, pix, pal) {
  const c = document.getElementById(id); c.width = M.w; c.height = M.h; const x = c.getContext("2d"), d = x.createImageData(M.w, M.h);
  for (let y = 0; y < M.h; y++) { const r = pix[y]; for (let i = 0; i < M.w; i++) { const v = rgba(pal[r[i]] || "#000000"); d.data.set(v, (y * M.w + i) * 4); d.data[(y * M.w + i) * 4 + 3] = 255; } }
  x.putImageData(d, 0, 0);
}
paintMap("mapN", M.pN, M.palN); paintMap("mapC", M.pC, M.palC);
const ME = 3; const castles = M.cells.filter((c) => c.t === "castillo");
function mapView(o) {
  const W = stageEl.clientWidth, H = stageEl.clientHeight, s = S[cur], t = o.t;
  let sc, fx, fy;
  const cover = Math.max(W / M.w, H / M.h);
  const place = (fx, fy, sc) => { const tx = Math.min(0, Math.max(W - M.w * sc, W / 2 - fx * sc)), ty = Math.min(0, Math.max(H - M.h * sc, H / 2 - fy * sc)); return [tx, ty]; };
  let tx, ty, colA = 0, sep = 0;
  vg.clearRect(0, 0, M.w, M.h);
  if (o.mode === "neutral") { const v = t / s.dur; sc = cover * lerp(o.z0[2], o.z1[2], v); fx = lerp(o.z0[0], o.z1[0], v) * M.w; fy = lerp(o.z0[1], o.z1[1], v) * M.h; [tx, ty] = place(fx, fy, sc); sep = 1; }
  else if (o.mode === "reveal") {
    const me = castles.find((c) => c.o === ME + 1); const z = ease(clamp((t - 4.8) / 2));
    sc = lerp(cover, cover * 2.2, z); fx = lerp(M.w / 2, me.c[0], z); fy = lerp(M.h / 2, me.c[1], z); [tx, ty] = place(fx, fy, sc);
    colA = clamp((t - 1.6) / 1.4); sep = 1 - colA;
    castles.forEach((c, i) => { const st = 2.6 + i * 0.28; if (t < st) return; const p = clamp((t - st) / 0.6); const col = DATA.houses[c.o - 1].color;
      vg.save(); vg.globalAlpha = p; vg.strokeStyle = col; vg.lineWidth = 4; vg.shadowColor = col; vg.shadowBlur = 14; vg.beginPath(); vg.arc(c.c[0], c.c[1], 18 + (1 - p) * 30, 0, 7); vg.stroke(); vg.restore();
      if (c.o === ME + 1 && t > 6.8) { vg.save(); vg.strokeStyle = "#f1cf7d"; vg.lineWidth = 3; vg.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5); vg.beginPath(); vg.arc(c.c[0], c.c[1], 30, 0, 7); vg.stroke(); vg.restore(); } });
    const y = over.querySelector(".yours"); if (y) { y.style.left = tx + me.c[0] * sc + "px"; y.style.top = ty + me.c[1] * sc + "px"; }
  } else if (o.mode === "weeks") {
    sc = Math.min(W / M.w, H / M.h) * 1.0; tx = (W - M.w * sc) / 2; ty = (H - M.h * sc) / 2 + 14;
    const w = Math.min(6, Math.floor(t / 1.25)), prev = M.weeks[Math.max(0, w - 1)], cur2 = M.weeks[w];
    M.cells.forEach((c, i) => { const own = cur2[i]; if (!own) return; const col = DATA.houses[own - 1].color; const fresh = w > 0 && prev[i] !== own;
      vg.beginPath(); c.poly.forEach(([x, y], k) => (k ? vg.lineTo(x, y) : vg.moveTo(x, y))); vg.closePath();
      vg.globalAlpha = 0.5; vg.fillStyle = col; vg.fill(); vg.globalAlpha = 1; vg.lineWidth = 3; vg.strokeStyle = col; vg.stroke();
      if (fresh) { const p = (t / 1.25) % 1; vg.globalAlpha = Math.max(0, 0.7 - p); vg.fillStyle = "#fff8d0"; vg.fill(); vg.globalAlpha = 1; } });
    const wk = over.querySelector(".wk"); if (wk) wk.textContent = w === 0 ? "Al empezar" : "Semana " + w; const bar = over.querySelector(".wbar i"); if (bar) bar.style.width = (w / 6) * 100 + "%";
  }
  mw.style.transform = `translate(${tx}px,${ty}px) scale(${sc})`;
  document.getElementById("mapC").style.opacity = o.mode === "weeks" ? 0 : colA;
  document.getElementById("mapN").style.filter = sep ? `sepia(${0.75 * sep}) brightness(${1 - 0.4 * sep})` : "none";
}

// --------------------------------------------------------- Secuencias
let seqKey = "prologo", idx = 0, cur = "titulo", t0 = performance.now(), still = null;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const frayC = {}; for (const m of Object.keys(DATA.fray)) frayC[m] = fromGrid(DATA.fray[m].grid, DATA.fray[m].palette).canvas();
function fillCanvases(root) {
  root.querySelectorAll("canvas[data-shield]").forEach((c) => { const s = R.shieldC[+c.dataset.shield]; c.width = s.width; c.height = s.height; c.getContext("2d").drawImage(s, 0, 0); });
  root.querySelectorAll("canvas[data-sprite]").forEach((c) => { const s = R[c.dataset.sprite]; c.width = s.width; c.height = s.height; c.getContext("2d").drawImage(s, 0, 0); });
}
function renderTabs() {
  const tabs = document.getElementById("tabs"); tabs.innerHTML = "";
  for (const [k, v] of Object.entries(SEQ)) { const b = document.createElement("button"); b.type = "button"; b.textContent = v.name; b.className = k === seqKey ? "on" : ""; b.setAttribute("aria-pressed", k === seqKey); b.onclick = () => go(k, 0); tabs.appendChild(b); }
}
function go(k, i, stillT = null) {
  seqKey = k; idx = i; cur = SEQ[k].scenes[i]; const s = S[cur];
  still = stillT != null ? stillT : reduced ? s.dur : null; t0 = performance.now();
  over.innerHTML = typeof s.html === "function" ? s.html() : s.html || ""; fillCanvases(over);
  over.classList.remove("play"); void over.offsetWidth; over.classList.add("play");
  cv.hidden = !!s.map; mapLayer.hidden = !s.map; cv.style.transform = "";
  document.getElementById("txt").textContent = s.text; const f = document.getElementById("foot"); f.textContent = s.foot || ""; f.hidden = !s.foot;
  const fc = document.getElementById("fray"); const src = frayC[s.fray]; fc.width = src.width; fc.height = src.height; const fx = fc.getContext("2d"); fx.clearRect(0, 0, fc.width, fc.height); fx.drawImage(src, 0, 0);
  const dots = document.getElementById("dots"); dots.innerHTML = ""; SEQ[k].scenes.forEach((_, j) => { const d = document.createElement("i"); if (j === i) d.className = "on"; dots.appendChild(d); });
  document.getElementById("count").textContent = `${i + 1} de ${SEQ[k].scenes.length}`;
  renderTabs();
  if (still != null) requestAnimationFrame(() => over.getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = still * 1000; }));
  const cta = over.querySelector(".cta"); if (cta) cta.onclick = (e) => { e.stopPropagation(); go("prologo", 0); };
}
function frame(now) {
  const s = S[cur]; const t = still != null ? still : (now - t0) / 1000;
  s.draw(Math.min(t, s.dur));
  over.querySelectorAll(".num").forEach((n, k) => { n.textContent = Math.round(+n.dataset.to * ease(clamp((t - 1.2 - k * 0.15) / 1.6))); });
  document.getElementById("prog").style.width = clamp(t / s.dur) * 100 + "%";
  if (still == null && t > s.dur + 0.4 && idx < SEQ[seqKey].scenes.length - 1) go(seqKey, idx + 1);
  requestAnimationFrame(frame);
}
stageEl.addEventListener("click", (e) => { if (e.target.closest("button")) return; if (idx < SEQ[seqKey].scenes.length - 1) go(seqKey, idx + 1); else go(seqKey, idx, S[cur].dur); });
document.getElementById("next").onclick = () => go(seqKey, Math.min(idx + 1, SEQ[seqKey].scenes.length - 1));
document.getElementById("prev").onclick = () => go(seqKey, Math.max(idx - 1, 0));
document.getElementById("skip").onclick = () => { const n = SEQ[seqKey].scenes.length - 1; go(seqKey, n, S[SEQ[seqKey].scenes[n]].dur); };
prep();
const m = /^#([a-z]+)(?:-(\d))?(?:-t(\d+)|-(fin))?$/.exec(location.hash);
if (m && SEQ[m[1]]) go(m[1], +(m[2] || 0), m[3] ? +m[3] / 10 : m[4] ? 999 : null); else go("prologo", 0);
requestAnimationFrame(frame);
