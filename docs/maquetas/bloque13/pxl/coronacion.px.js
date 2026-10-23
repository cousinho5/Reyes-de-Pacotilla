// La coronación (bloque 13): el campanario al amanecer (160x176) y la campana,
// que el juego hace oscilar. Parte de la maqueta (../scenes.js: dawnLay y
// ../engine.js: bellLay); los degradados van en pocas bandas para la paleta.
// La bandera, los pájaros y el confeti los pinta el juego.
// Uso, desde la raíz del repositorio:
//   node .claude/skills/pxl-pixel-art/bin/pxl.js build docs/maquetas/bloque13/pxl/coronacion.px.js --out <carpeta>
pal({ k: "#1a1410", y: "#fbe39a", Y: "#e8b83a", o: "#a97e14" })

const PW = 160, PH = 176
const GOLD = ["y", "Y", "o"]
// El mismo azar fijo que la maqueta.
function h3(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const hex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")
/** Mezcla en `bands` pasos: un degradado de pocos colores. */
function mix(a, b, t, bands = 0) { if (bands) t = Math.round(Math.max(0, Math.min(1, t)) * bands) / bands; const A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t) }
const lit = (c, f) => (f > 0 ? mix(c, "#ffffff", f) : mix(c, "#000000", -f))

function brush(c, w, h) {
  const B = {
    set(x, y, k) { x = Math.round(x); y = Math.round(y); if (k && x >= 0 && y >= 0 && x < w && y < h) c.px(x, y, k) },
    rect(x0, y0, rw, rh, k) { for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) B.set(x, y, typeof k === "function" ? k(x, y) : k) },
    ell(cx, cy, rx, ry, k) {
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry
        if (dx * dx + dy * dy <= 1) B.set(x, y, typeof k === "function" ? k(x, y, dx, dy) : k)
      }
    },
  }
  return B
}
const sh3 = (cols) => (x, y, dx, dy) => { const l = dx + dy; return l < -0.75 ? cols[0] : l > 0.6 ? cols[2] : cols[1] }

// ------------------------------------------------------------- el amanecer
sprite("amanecer", { w: PW, h: PH }, (c) => {
  const B = brush(c, PW, PH)
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const band = Math.floor((y / 120) * 9) / 9
    B.set(x, y, mix(mix("#2b2350", "#c85a3a", Math.min(1, band * 1.3)), "#f6c070", Math.max(0, Math.min(1, (band - 0.6) * 2.5))))
  }
  // el sol saliendo detrás del pueblo
  B.ell(124, 122, 16, 16, (x, y) => (y < 122 ? "#ffe9a8" : null)); B.ell(124, 122, 12, 12, (x, y) => (y < 122 ? "#fff6d0" : null))
  for (let i = 0; i < 6; i++) B.ell(20 + i * 28 + h3(i, 4) * 10, 30 + h3(i, 5) * 40, 10 + h3(i, 6) * 8, 2, h3(i, 7) > 0.5 ? "#f6c4a0" : "#e8907a")
  // tejados del pueblo, con ventanas encendidas
  for (let i = 0; i < 12; i++) {
    const hx = Math.round(i * 15 - 6 + h3(i, 1) * 6), hw = 16, top = Math.round(118 + h3(i, 2) * 14)
    for (let y = top; y < PH; y++) for (let x = hx; x < hx + hw; x++) {
      const roof = y < top + 8
      if (roof && Math.abs(x + 0.5 - hx - hw / 2) > (y - top) * 1.1 + 0.5) continue
      B.set(x, y, roof ? (x < hx + hw / 2 ? "#5a2a2e" : "#3e1c22") : y === top + 8 ? "#3a262c" : "#2a1c22")
    }
    B.rect(hx + 4, top + 12, 2, 3, "#ffd060"); if (h3(i, 3) > 0.5) B.rect(hx + 10, top + 16, 2, 3, "#ffd060")
  }
  // el campanario de piedra
  for (let y = 34; y < PH; y++) for (let x = 54; x < 106; x++) {
    const row = Math.floor(y / 6), off = (row % 2) * 5, m = y % 6 === 5 || (x + off) % 10 === 9
    B.set(x, y, m ? "#4a3a3a" : x < 60 ? "#9a8478" : x > 98 ? "#5e4c48" : h3(Math.floor((x + off) / 10), row, 8) > 0.5 ? "#7a6660" : "#6e5a56")
  }
  // el hueco de las campanas, en arco
  for (let y = 42; y < 82; y++) for (let x = 58; x < 102; x++) {
    const arch = x > 68 && x < 92 ? 52 - Math.sqrt(Math.max(0, 100 - (x - 80) ** 2)) : 42
    if (y < arch && Math.abs(x - 80) < 12) continue
    B.set(x, y, y < 45 ? null : "#1c1216")
  }
  B.rect(58, 45, 44, 1, "#2e2024")
  B.rect(52, 30, 56, 5, (x, y) => (y === 30 ? "#b09a8c" : "#7a6660"))
  // tejado rojo en punta y la veleta
  for (let y = 4; y < 30; y++) { const hw = (y - 4) * 1.15; for (let x = Math.round(80 - hw); x < Math.round(80 + hw); x++) B.set(x, y, (x + y) % 4 === 0 ? "#6e1d12" : x < 80 ? "#c0392b" : "#8a2418") }
  B.rect(79, 0, 2, 5, "#3a3a40")
  B.rect(54, 82, 52, 2, "#b09a8c")
  // la puerta
  B.rect(76, 92, 8, 12, "#1c1216"); B.ell(80, 92, 4, 3, "#1c1216"); B.set(82, 98, "#c8913a")
})

sprite("campana", { w: 22, h: 22, outline: "k" }, (c) => {
  const B = brush(c, 22, 22)
  for (let y = 3; y < 19; y++) {
    const hw = 4 + (y - 3) * 0.42 + (y > 15 ? 1.5 : 0)
    for (let x = Math.round(11 - hw); x < Math.round(11 + hw); x++) B.set(x, y, x < 11 - hw / 2 ? "#e8b860" : x > 11 + hw / 2 ? "#8a5a1a" : "#c8913a")
  }
  B.rect(9, 0, 4, 3, "#6b4a20"); B.ell(11, 19.5, 2, 2, "#4a3010"); B.rect(4, 16, 14, 1, "#f1cf7d")
})
