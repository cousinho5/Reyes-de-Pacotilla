// La última semana y el fantasma de Aldric (bloque 13, paso 8): el reloj de
// arena, que se vacía en cinco fotogramas, y el pasillo del castillo de noche
// con el retrato del difunto rey, por donde pasa el fantasma (aldric.px.js).
// Parten de la maqueta (../engine.js: hourglassLay; ../scenes.js: S.ultima, S.fantasma).
// Uso, desde la raíz del repositorio:
//   node .claude/skills/pxl-pixel-art/bin/pxl.js build docs/maquetas/bloque13/pxl/ultima.px.js --out <carpeta>
pal({ k: "#1a1410", y: "#fbe39a", Y: "#e8b83a", o: "#a97e14" })

const PW = 160, PH = 176
function h3(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const hex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")
function mix(a, b, t, bands = 0) { if (bands) t = Math.round(Math.max(0, Math.min(1, t)) * bands) / bands; const A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t) }
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

// ------------------------------------------------------------- el reloj de arena
// 40x62; `sand` = lo que queda arriba (1 lleno, 0 vacío). El chorro lo pinta el juego.
function reloj(c, sand) {
  const B = brush(c, 40, 62)
  B.rect(2, 0, 36, 5, (x, y) => (y === 0 ? "#c88a50" : y === 4 ? "#4a2c14" : "#7a4c26")); B.rect(2, 57, 36, 5, (x, y) => (y === 57 ? "#c88a50" : y === 61 ? "#4a2c14" : "#7a4c26"))
  for (const px of [4, 34]) B.rect(px, 5, 2, 52, (x) => (x === px ? "#a06a38" : "#5a3418"))
  B.ell(5, 2.5, 1.5, 1.5, "#e8b83a"); B.ell(35, 2.5, 1.5, 1.5, "#e8b83a"); B.ell(5, 59.5, 1.5, 1.5, "#e8b83a"); B.ell(35, 59.5, 1.5, 1.5, "#e8b83a")
  const top = 30 - sand * 20, bottom = 56 - (1 - sand) * 20
  for (let y = 5; y < 57; y++) {
    const d = Math.abs(y - 31), hw = Math.max(1.2, 13 * Math.pow(d / 26, 0.9))
    for (let x = Math.round(20 - hw); x < Math.round(20 + hw); x++) {
      let col = x < 20 - hw + 2 ? "#e4f0f4" : x > 20 + hw - 2 ? "#7e9aa6" : "#a8c4ce"
      const grain = (x + y) % 3 ? "#e0b860" : "#c89a40"
      if (y < 31 && y > top + Math.abs(x - 20) * 0.15) col = grain
      if (y > 31 && y > bottom + Math.abs(x - 20) * 0.5) col = grain
      B.set(x, y, col)
    }
  }
}
anim("reloj", { w: 40, h: 62, fps: 1, outline: "k" }, ...[1, 0.75, 0.5, 0.25, 0.04].map((s) => frame((c) => reloj(c, s))))

// ------------------------------------------------------------- el pasillo
// De noche, con dos ventanas de luna, antorchas apagadas, alfombra y, en medio,
// el retrato del rey Aldric con su marco dorado (el fantasma pasa por delante).
sprite("pasillo", { w: PW, h: PH }, (c) => {
  const B = brush(c, PW, PH)
  const wall = ["#3e3a46", "#38343f", "#444050", "#34303a"]
  for (let y = 0; y < 130; y++) for (let x = 0; x < PW; x++) {
    const row = Math.floor(y / 7), off = (row % 2) * 6, bx = Math.floor((x + off) / 12)
    const mortar = y % 7 === 6 || (x + off) % 12 === 11
    B.set(x, y, mortar ? "#24212a" : wall[Math.floor(h3(bx, row) * 4)])
  }
  // ventanas en arco con la luna
  for (const wx of [10, 128]) {
    B.rect(wx - 2, 28, 26, 64, (x, y) => (x === wx - 2 || y === 91 ? "#6a6474" : "#504a58"))
    for (let y = 30; y < 90; y++) for (let x = wx; x < wx + 22; x++) {
      const ay = 30 + 11 - Math.sqrt(Math.max(0, 121 - (x - wx - 10.5) ** 2))
      if (y < ay) continue
      let col = mix("#0b1430", "#1f3264", (y - 30) / 60, 4)
      if (h3(x, y, 9) > 0.975) col = "#f2ecd0"
      B.set(x, y, col)
    }
    B.rect(wx + 10, 30, 2, 60, "#24212a"); B.rect(wx, 58, 22, 2, "#24212a")
  }
  B.ell(140, 44, 4.5, 4.5, sh3(["#fffbe8", "#f2ecd0", "#c8c0a0"]))
  // el retrato: marco dorado, fondo granate y el rey de medio cuerpo
  B.rect(56, 30, 48, 58, (x, y) => (x < 59 || y < 33 ? "#fbe39a" : x > 100 || y > 84 ? "#a97e14" : "#e8b83a"))
  for (let x = 58; x < 102; x += 4) { B.set(x, 31, "#a97e14"); B.set(x, 86, "#fbe39a") }
  B.rect(61, 35, 38, 48, (x, y) => mix("#5a1a1a", "#2a0e0e", (y - 35) / 48, 3))
  B.ell(80, 84, 15, 16, (x, y, dx, dy) => (y > 82 ? null : sh3(["#8a52c0", "#6a36a0", "#3e1a5c"])(x, y, dx, dy)))
  B.rect(78, 70, 4, 13, "#e8b83a"); B.rect(61, 83, 38, 1, "#3e1a5c")
  B.ell(80, 56, 8, 9, sh3(["#f8d4b0", "#ebb48a", "#c4855a"]))
  B.ell(80, 66, 9, 7, sh3(["#ffffff", "#e2dccd", "#b8b0a0"]))
  B.rect(76, 54, 2, 2, "#1a1410"); B.rect(82, 54, 2, 2, "#1a1410"); B.rect(75, 52, 4, 1, "#ffffff"); B.rect(81, 52, 4, 1, "#ffffff")
  B.ell(80, 59, 2, 1.6, "#e0866a"); B.rect(77, 62, 6, 1, "#ffffff")
  B.rect(72, 44, 16, 4, "#e8b83a"); for (const x of [72, 78, 84]) B.rect(x, 41, 3, 3, "#fbe39a"); B.set(80, 45, "#b3291d")
  // la placa
  B.rect(70, 90, 20, 5, "#a97e14"); B.rect(71, 91, 18, 3, "#e8b83a")
  // antorchas apagadas
  for (const tx of [44, 113]) { B.rect(tx, 66, 3, 6, "#3a3a40"); B.rect(tx - 1, 64, 5, 2, "#55555e"); B.rect(tx, 60, 3, 4, "#4a2c14") }
  // zócalo, suelo y alfombra
  B.rect(0, 124, PW, 6, (x, y) => (y === 124 ? "#5a5464" : "#2a2630"))
  for (let y = 130; y < PH; y++) for (let x = 0; x < PW; x++) {
    const row = Math.floor((y - 130) / 8), off = (row % 2) * 8, m = (y - 130) % 8 === 7 || (x + off) % 16 === 15
    B.set(x, y, m ? "#16141a" : h3(Math.floor((x + off) / 16), row, 5) > 0.5 ? "#2e2a34" : "#28242e")
  }
  for (let y = 130; y < PH; y++) for (let x = 0; x < PW; x++) {
    if (y < 140 || y > 166) continue
    B.set(x, y, y === 140 || y === 166 ? "#e8b83a" : (x + y) % 9 === 0 ? "#4a1410" : "#6e1d12")
  }
})
