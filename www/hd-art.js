/* =====================================================================
   HD ART -- hand-built vector drawings for the hero and the dragon mounts.

   Everything here is drawn with curves in a fixed design space, so it can
   be rendered at any size. The game then renders it onto a slightly coarse
   pixel grid (HD_PIXEL) and enlarges that with hard edges, which gives a
   crisp "HD pixel art" look: sharp shapes with a light pixel texture.

   Loaded before the main game script; uses no game state.
   ===================================================================== */

const HD_INK = "#1a0f1e";           // outline colour
const HD_PIXEL = 2;                 // CSS px per art pixel (2 = "medium pixel", chosen by the owner)

function hdShift(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return "#" + [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function hdGrad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function hdFill(ctx, build, fill, lw = 2, line = HD_INK) {
  ctx.beginPath(); build(ctx);
  ctx.fillStyle = fill; ctx.fill();
  if (lw) { ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.stroke(); }
}

/* Points along a cubic bezier. */
function hdBez(p0, p1, p2, p3, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

/* A tapered tube (neck, tail, limbs) around a centre line. Returns the
   outline polygon and the per-point normals for decorating (spikes). */
function hdTube(pts, w0, w1) {
  const L = [], R = [], N = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
    const nx = -dy, ny = dx;
    N.push([nx, ny, w]);
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return { poly: L.concat(R.reverse()), left: L, right: R.reverse(), normals: N };
}
function hdPoly(ctx, poly) { poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }

/* ---------------------------------------------------------------------
   Dragon, flying, facing right. Design space ~ 230 x 170 units.
   P: { body, dark, belly, wing, horn } (the mount's element palette)
   t: 0..1 wing-flap phase.
   --------------------------------------------------------------------- */
function drawHDDragon(ctx, P, t = 0) {
  const body = P.body, dark = P.dark, belly = P.belly, wing = P.wing, horn = P.horn;
  const flap = Math.sin(t * Math.PI * 2);               // -1 .. 1

  /* A wing. dir -1 = near wing sweeping up-left over the back,
     dir +1 = far wing rising up-right behind the neck. Curved finger bones,
     deep scallops between them, a thick leading edge and a thumb claw. */
  const drawWing = (dir) => {
    const far = dir > 0;
    const sx = far ? 132 : 108, sy = far ? 70 : 74;
    const k = far ? 0.82 : 1;
    const elbow = [sx + dir * 16 * k, sy - (46 + 12 * flap) * k];
    const wrist = [sx + dir * 46 * k, sy - (82 + 22 * flap) * k];
    const rel = [[-86, -4], [-92, 34], [-74, 66], [-44, 86]];          // finger tips from the wrist (near wing)
    const tips = rel.map(([x, y], i) => [wrist[0] + (far ? -x * 0.75 : x) * k, wrist[1] + (y + (i === 0 ? -10 : -4) * flap) * k]);
    const root = far ? [sx + 8, sy + 8] : [sx - 30, sy + 14];
    const col = far ? hdShift(wing, -0.28) : wing;
    const mem = hdGrad(ctx, wrist[0], wrist[1], root[0], root[1], [[0, hdShift(col, 0.2)], [0.55, col], [1, hdShift(col, -0.4)]]);
    hdFill(ctx, (c) => {
      c.moveTo(sx, sy); c.lineTo(elbow[0], elbow[1]); c.lineTo(wrist[0], wrist[1]); c.lineTo(tips[0][0], tips[0][1]);
      const edge = [...tips, root];
      for (let i = 0; i < edge.length - 1; i++) {
        const a = edge[i], b = edge[i + 1];
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        c.quadraticCurveTo(mx + (wrist[0] - mx) * 0.3, my + (wrist[1] - my) * 0.3, b[0], b[1]);   // deep scallop
      }
      c.lineTo(sx, sy + 8);
    }, mem, 2.2);
    // curved finger bones
    tips.forEach((tp, i) => {
      const mx = (wrist[0] + tp[0]) / 2 + dir * 4, my = (wrist[1] + tp[1]) / 2 - 5;
      [[HD_INK, 4 - i * 0.5], [far ? hdShift(dark, -0.25) : dark, 2.2 - i * 0.3]].forEach(([colr, w]) => {
        ctx.strokeStyle = colr; ctx.lineWidth = w; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(wrist[0], wrist[1]); ctx.quadraticCurveTo(mx, my, tp[0], tp[1]); ctx.stroke();
      });
    });
    const arm = hdTube(hdBez([sx, sy], elbow, elbow, wrist, 10), 13 * k, 7 * k);
    hdFill(ctx, (c) => hdPoly(c, arm.poly), far ? hdShift(dark, -0.2) : hdGrad(ctx, 0, wrist[1], 0, sy, [[0, hdShift(body, 0.2)], [1, dark]]), 2.2);
    hdFill(ctx, (c) => { c.moveTo(wrist[0] - 3, wrist[1] - 2); c.lineTo(wrist[0] + dir * 6, wrist[1] - 14); c.lineTo(wrist[0] + 3, wrist[1] + 1); }, horn, 1.5);
  };

  const legPart = (hip, knee, foot, w, col) => {
    // muscled thigh at the hip (drawn first, the leg grows out of it)
    const ang = Math.atan2(knee[1] - hip[1], knee[0] - hip[0]);
    hdFill(ctx, (c) => { c.ellipse(hip[0], hip[1], w * 0.95, w * 0.7, ang, 0, Math.PI * 2); }, col, 2);
    const tube = hdTube(hdBez([hip[0] + Math.cos(ang) * w * 0.4, hip[1] + Math.sin(ang) * w * 0.4], knee, knee, foot, 10), w * 0.85, w * 0.5);
    hdFill(ctx, (c) => hdPoly(c, tube.poly), col, 2);
    hdFill(ctx, (c) => { c.ellipse(hip[0], hip[1], w * 0.95 - 1.2, w * 0.7 - 1.2, ang, 0, Math.PI * 2); }, col, 0);   // hide the seam
    [-5, 0, 5].forEach((dx) => hdFill(ctx, (c) => {
      c.moveTo(foot[0] + dx - 2.5, foot[1] - 1); c.quadraticCurveTo(foot[0] + dx + 5, foot[1] + 2, foot[0] + dx + 2, foot[1] + 11);
      c.quadraticCurveTo(foot[0] + dx + 7, foot[1] + 3, foot[0] + dx + 3, foot[1] - 2);
    }, horn, 1.2));
  };

  drawWing(+1);                                          // far wing, behind everything

  // ---- tail: sweeps back then curls down, spines on top ----
  const tailPts = hdBez([80, 96], [46, 122], [22, 92], [-2, 104], 20).concat(hdBez([-2, 104], [-16, 110], [-22, 128], [-8, 134], 10).slice(1));
  const tail = hdTube(tailPts, 30, 4);
  hdFill(ctx, (c) => hdPoly(c, tail.poly), hdGrad(ctx, 0, 84, 0, 136, [[0, hdShift(body, 0.15)], [1, dark]]), 2.2);
  ctx.save(); ctx.beginPath(); hdPoly(ctx, tail.poly); ctx.clip();
  ctx.strokeStyle = belly; ctx.lineWidth = 9; ctx.globalAlpha = 0.85;
  ctx.beginPath(); tail.right.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  ctx.restore();
  for (let i = 1; i < tailPts.length - 5; i += 2) {
    const [nx, ny, w] = tail.normals[i], [x, y] = tailPts[i];
    const bx = x + nx * w, by = y + ny * w, sz = 8 * (1 - i / tailPts.length) + 2;
    hdFill(ctx, (c) => { c.moveTo(bx - ny * sz * 0.6, by + nx * sz * 0.6); c.lineTo(bx + nx * sz * 1.3 - ny * sz * 0.4, by + ny * sz * 1.3 + nx * sz * 0.4); c.lineTo(bx + ny * sz * 0.6, by - nx * sz * 0.6); }, horn, 1.3);
  }
  const tp = tailPts[tailPts.length - 1];
  hdFill(ctx, (c) => { c.moveTo(tp[0] - 3, tp[1] - 3); c.lineTo(tp[0] + 12, tp[1] - 8); c.lineTo(tp[0] + 7, tp[1] + 1); c.lineTo(tp[0] + 14, tp[1] + 9); c.lineTo(tp[0] - 3, tp[1] + 4); }, dark, 2);

  // far legs, tucked back in flight
  legPart([88, 102], [74, 114], [62, 124], 18, hdShift(dark, -0.2));
  legPart([146, 98], [156, 110], [150, 122], 13, hdShift(dark, -0.2));

  // ---- torso ----
  hdFill(ctx, (c) => { c.ellipse(114, 88, 48, 25, -0.1, 0, Math.PI * 2); },
    hdGrad(ctx, 0, 62, 0, 114, [[0, hdShift(body, 0.3)], [0.45, body], [1, dark]]), 2.4);
  ctx.save(); ctx.beginPath(); ctx.ellipse(114, 88, 48, 25, -0.1, 0, Math.PI * 2); ctx.clip();
  hdFill(ctx, (c) => { c.ellipse(120, 108, 40, 13, -0.1, 0, Math.PI * 2); }, hdGrad(ctx, 0, 96, 0, 118, [[0, hdShift(belly, 0.12)], [1, hdShift(belly, -0.18)]]), 1.6);
  ctx.strokeStyle = hdShift(belly, -0.38); ctx.lineWidth = 1.2;
  for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(120 + i * 8, 96 - i * 0.8); ctx.quadraticCurveTo(122 + i * 8, 104 - i * 0.8, 120 + i * 8, 116); ctx.stroke(); }
  ctx.strokeStyle = hdShift(body, 0.25); ctx.lineWidth = 1; ctx.globalAlpha = 0.45;
  for (let r = 0; r < 3; r++) for (let q = 0; q < 8; q++) { ctx.beginPath(); ctx.arc(80 + q * 10 + (r % 2) * 5, 74 + r * 7, 4, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
  ctx.restore();

  // ---- neck: thick S-curve, cream throat plates on the underside ----
  const neckPts = hdBez([144, 84], [166, 76], [154, 46], [180, 38], 18);
  const neck = hdTube(neckPts, 36, 20);
  hdFill(ctx, (c) => hdPoly(c, neck.poly), hdGrad(ctx, 140, 30, 176, 92, [[0, hdShift(body, 0.28)], [0.6, body], [1, dark]]), 2.4);
  ctx.save(); ctx.beginPath(); hdPoly(ctx, neck.poly); ctx.clip();
  ctx.strokeStyle = belly; ctx.lineWidth = 14; ctx.globalAlpha = 0.9;
  ctx.beginPath(); neck.right.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  ctx.strokeStyle = hdShift(belly, -0.35); ctx.lineWidth = 1; ctx.globalAlpha = 1;
  neck.right.forEach(([x, y], i) => { if (i % 2 || i < 2) return; const [nx, ny] = neck.normals[neck.normals.length - 1 - i] || [0, 0]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + nx * 7, y + ny * 7); ctx.stroke(); });
  ctx.restore();
  // spines: back ridge and along the neck
  // (no back spines between x 90 and 132 -- the saddle sits there)
  const spines = [[70, 74, 7, 0, -1], [80, 70, 8, 0, -1]];
  for (let i = 1; i < 17; i += 2) { const [nx, ny, w] = neck.normals[i], [x, y] = neckPts[i]; spines.push([x + nx * w, y + ny * w, 9 - i * 0.3, nx, ny]); }
  spines.forEach(([x, y, sz, nx, ny]) => hdFill(ctx, (c) => {
    c.moveTo(x - ny * sz * 0.5, y + nx * sz * 0.5); c.lineTo(x + nx * sz * 1.25 - sz * 0.35, y + ny * sz * 1.25); c.lineTo(x + ny * sz * 0.5, y - nx * sz * 0.5);
  }, hdGrad(ctx, 0, y - sz, 0, y, [[0, "#ffffff"], [1, horn]]), 1.3));

  // ---- head (drawn at 1.15x around its base) ----
  ctx.save(); ctx.translate(180, 38); ctx.scale(1.15, 1.15); ctx.translate(-180, -38);
  const hx = 180, hy = 38;
  hdFill(ctx, (c) => { c.moveTo(hx - 4, hy - 8); c.quadraticCurveTo(hx - 16, hy - 20, hx - 30, hy - 24); c.quadraticCurveTo(hx - 16, hy - 13, hx - 8, hy - 2); }, hdGrad(ctx, hx - 30, 0, hx, 0, [[0, "#ffffff"], [1, horn]]), 1.6);
  hdFill(ctx, (c) => { c.moveTo(hx + 2, hy - 10); c.quadraticCurveTo(hx - 6, hy - 28, hx - 18, hy - 36); c.quadraticCurveTo(hx - 6, hy - 20, hx - 2, hy - 4); }, hdGrad(ctx, hx - 18, 0, hx, 0, [[0, "#ffffff"], [1, hdShift(horn, -0.1)]]), 1.6);
  hdFill(ctx, (c) => { c.moveTo(hx - 4, hy + 6); c.quadraticCurveTo(hx + 18, hy + 22, hx + 40, hy + 22); c.lineTo(hx + 38, hy + 16); c.quadraticCurveTo(hx + 16, hy + 12, hx + 4, hy + 2); }, hdGrad(ctx, 0, hy, 0, hy + 24, [[0, body], [1, dark]]), 2);
  hdFill(ctx, (c) => { c.moveTo(hx + 4, hy + 3); c.quadraticCurveTo(hx + 20, hy + 13, hx + 38, hy + 15); c.lineTo(hx + 40, hy + 8); c.quadraticCurveTo(hx + 20, hy + 7, hx + 6, hy); }, "#5a1022", 0);
  hdFill(ctx, (c) => { c.moveTo(hx + 12, hy + 9); c.quadraticCurveTo(hx + 26, hy + 14, hx + 34, hy + 11); c.quadraticCurveTo(hx + 26, hy + 16, hx + 12, hy + 11); }, "#e8506a", 0);
  hdFill(ctx, (c) => {
    c.moveTo(hx - 12, hy + 6); c.quadraticCurveTo(hx - 12, hy - 12, hx + 6, hy - 12);
    c.quadraticCurveTo(hx + 16, hy - 12, hx + 22, hy - 6); c.quadraticCurveTo(hx + 34, hy - 4, hx + 46, hy + 2);
    c.quadraticCurveTo(hx + 50, hy + 6, hx + 44, hy + 9); c.quadraticCurveTo(hx + 20, hy + 8, hx + 6, hy + 2); c.quadraticCurveTo(hx - 4, hy + 8, hx - 12, hy + 6);
  }, hdGrad(ctx, 0, hy - 12, 0, hy + 9, [[0, hdShift(body, 0.38)], [1, body]]), 2.2);
  ctx.fillStyle = "#fffaf0";
  [[hx + 12, hy + 4], [hx + 20, hy + 6], [hx + 28, hy + 7], [hx + 36, hy + 8]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x, y + 5); ctx.lineTo(x + 2, y); ctx.fill(); });
  [[hx + 16, hy + 14], [hx + 26, hy + 15], [hx + 34, hy + 15]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x, y - 5); ctx.lineTo(x + 2, y); ctx.fill(); });
  hdFill(ctx, (c) => { c.moveTo(hx - 2, hy - 7); c.quadraticCurveTo(hx + 8, hy - 13, hx + 18, hy - 6); c.quadraticCurveTo(hx + 8, hy - 8, hx - 2, hy - 4); }, hdShift(dark, -0.2), 0);
  hdFill(ctx, (c) => { c.ellipse(hx + 8, hy - 3, 4.8, 3.6, 0.1, 0, Math.PI * 2); }, hdGrad(ctx, 0, hy - 6, 0, hy, [[0, "#fff6a0"], [1, "#f0a020"]]), 1.3);
  hdFill(ctx, (c) => { c.ellipse(hx + 9, hy - 3, 1.1, 3, 0, 0, Math.PI * 2); }, HD_INK, 0);
  hdFill(ctx, (c) => { c.arc(hx + 7, hy - 4.5, 0.9, 0, Math.PI * 2); }, "#ffffff", 0);
  hdFill(ctx, (c) => { c.ellipse(hx + 42, hy - 1, 1.6, 1.1, 0.3, 0, Math.PI * 2); }, HD_INK, 0);
  [[hx - 10, hy + 4], [hx - 13, hy - 2], [hx - 12, hy + 10]].forEach(([x, y], q) => hdFill(ctx, (c) => { c.moveTo(x, y - 3); c.lineTo(x - 11 + q * 2, y + 1); c.lineTo(x, y + 3); }, horn, 1.2));
  ctx.restore();

  // near legs, tucked back
  legPart([100, 104], [84, 118], [72, 128], 21, hdGrad(ctx, 0, 100, 0, 130, [[0, body], [1, dark]]));
  legPart([150, 100], [162, 114], [156, 126], 15, hdGrad(ctx, 0, 98, 0, 128, [[0, body], [1, dark]]));

  drawWing(-1);                                          // near wing: over the back, behind the rider
}

/* ---------------------------------------------------------------------
   Rider in the saddle (side view, facing right). Design space matches the
   dragon so the rider can be drawn straight onto its back.
   H: { hero: "boy"|"girl", skin, hair, armor, cape, leather, blade, hilt, gem }
   --------------------------------------------------------------------- */
/* Saddle on the dragon's back (dragon coordinates): blanket with gold
   trim, leather seat with a raised cantle and pommel horn, girth strap
   around the belly, and the stirrup leather. The stirrup iron itself is
   drawn after the rider so it wraps the boot. */
/* The dragon's back line (top edge of its torso ellipse), so the saddle
   hugs the body instead of floating above it. */
const HD_BACK = (() => {
  const cx = 114, cy = 88, rx = 48, ry = 25, rot = -0.1, top = {};
  for (let i = 0; i < 1440; i++) {
    const t = (i / 1440) * Math.PI * 2;
    const x = cx + rx * Math.cos(t) * Math.cos(rot) - ry * Math.sin(t) * Math.sin(rot);
    const y = cy + rx * Math.cos(t) * Math.sin(rot) + ry * Math.sin(t) * Math.cos(rot);
    const k = Math.round(x);
    if (top[k] === undefined || y < top[k]) top[k] = y;
  }
  return (x) => top[Math.round(x)] ?? 64;
})();

/* Saddle on the dragon's back (dragon coordinates): blanket draped over
   the back and down the flank, leather seat with a tall cantle behind the
   rider and a pommel horn in front, girth strap round the belly, and the
   stirrup leather down to the rider's boot. The stirrup iron is drawn
   after the rider so the boot sits IN it. */
const HD_RIDER_SCALE = 0.66;                            // rider size relative to the dragon
const HD_RIDER_Y = 65.5;                                // rider's seat height (see drawHDRider)
const HD_SADDLE_SCALE = HD_RIDER_SCALE / 1.3;           // saddle was drawn for a 1.3x rider
const HD_RIDER_FWD = 10;                                // how far forward (toward the neck) the rider sits
const HD_SOLE = { x: 108 + HD_RIDER_FWD + (125 - 108) * HD_RIDER_SCALE, y: HD_RIDER_Y + (95 - 74) * HD_RIDER_SCALE };   // ball of the boot
function drawHDSaddle(ctx, H) {
  const leather = "#6b3f22", leatherLo = "#3e2414";
  ctx.save(); ctx.translate(HD_RIDER_FWD, HD_BACK(111 + HD_RIDER_FWD) - HD_BACK(111));   // slide along the back
  const cloth = H.saddle || hdShift(H.cape, -0.15);
  const B = HD_BACK;
  // girth strap from the saddle round the belly
  hdFill(ctx, (c) => { c.moveTo(110.5, B(110)); c.lineTo(114, B(114)); c.lineTo(121, 110); c.lineTo(116, 111); }, hdGrad(ctx, 0, 62, 0, 111, [[0, leather], [1, leatherLo]]), 1.4);
  hdFill(ctx, (c) => { c.roundRect(116.5, 97, 7, 6, 1.2); }, H.hilt, 1.1);
  ctx.save();
  ctx.translate(111, B(111)); ctx.scale(HD_SADDLE_SCALE, HD_SADDLE_SCALE); ctx.translate(-111, -B(111));
  // blanket: follows the back, hangs ~19 units down the side, scalloped gold hem
  hdFill(ctx, (c) => {
    c.moveTo(92, B(92) - 1);
    for (let x = 94; x <= 136; x += 2) c.lineTo(x, B(x) - 1.5);
    c.lineTo(135, B(135) + 18);
    for (let i = 0; i < 6; i++) {
      const x0 = 135 - i * 7, x1 = x0 - 7;
      c.quadraticCurveTo((x0 + x1) / 2, B((x0 + x1) / 2) + 23, x1, B(x1) + 18);
    }
    c.closePath();
  }, hdGrad(ctx, 0, 60, 0, 86, [[0, hdShift(cloth, 0.2)], [1, hdShift(cloth, -0.25)]]), 1.6);
  ctx.strokeStyle = H.hilt; ctx.lineWidth = 1.8; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(135, B(135) + 16);
  for (let i = 0; i < 6; i++) { const x0 = 135 - i * 7, x1 = x0 - 7; ctx.quadraticCurveTo((x0 + x1) / 2, B((x0 + x1) / 2) + 21, x1, B(x1) + 16); }
  ctx.stroke();
  // leather seat: base sits on the blanket, tall cantle at the back, dip, pommel horn
  hdFill(ctx, (c) => {
    c.moveTo(93, B(93) + 2);
    c.quadraticCurveTo(89, B(93) - 9, 94, B(94) - 13);
    c.quadraticCurveTo(99, B(99) - 12, 99, B(99) - 5);
    c.quadraticCurveTo(110, B(110) - 1, 121, B(121) - 5);
    c.quadraticCurveTo(122, B(122) - 12, 126, B(126) - 12);
    c.quadraticCurveTo(129, B(129) - 11, 128, B(128) - 5);
    c.quadraticCurveTo(131, B(131) - 1, 130, B(130) + 3);
    c.quadraticCurveTo(111, B(111) + 6, 93, B(93) + 2);
  }, hdGrad(ctx, 0, 48, 0, 68, [[0, "#a86a3c"], [0.5, leather], [1, leatherLo]]), 1.8);
  ctx.strokeStyle = "#d09a68"; ctx.lineWidth = 1; ctx.setLineDash([2, 1.6]);
  ctx.beginPath(); ctx.moveTo(95, B(95) + 1); ctx.quadraticCurveTo(111, B(111) + 4.5, 128, B(128) + 1.5); ctx.stroke(); ctx.setLineDash([]);
  hdFill(ctx, (c) => { c.arc(126.5, B(126) - 12.5, 2.3, 0, Math.PI * 2); }, H.hilt, 1);
  ctx.restore();
  // stirrup leather from the seat down to the boot
  hdFill(ctx, (c) => { c.moveTo(115.5, B(115) + 1); c.lineTo(117.5, B(117) + 1); c.lineTo(HD_SOLE.x - HD_RIDER_FWD + 1, HD_SOLE.y - 2); c.lineTo(HD_SOLE.x - HD_RIDER_FWD - 1, HD_SOLE.y - 2); }, leatherLo, 1);
  ctx.restore();
}
/* Stirrup iron, drawn over the boot so the foot is IN the stirrup. */
function drawHDStirrup(ctx, H) {
  const x = HD_SOLE.x, y = HD_SOLE.y;
  ctx.save(); ctx.translate(x, y); ctx.scale(HD_SADDLE_SCALE * 1.4, HD_SADDLE_SCALE * 1.4); ctx.translate(-x, -y);
  hdFill(ctx, (c) => {
    c.moveTo(x - 6.5, y - 4); c.quadraticCurveTo(x - 7, y + 4, x, y + 4); c.quadraticCurveTo(x + 7, y + 4, x + 6.5, y - 4);
    c.lineTo(x + 4.2, y - 4); c.quadraticCurveTo(x + 4.5, y + 1.6, x, y + 1.6); c.quadraticCurveTo(x - 4.5, y + 1.6, x - 4.2, y - 4);
  }, hdGrad(ctx, 0, y - 4, 0, y + 4, [[0, "#fff0b0"], [1, H.hilt]]), 1.2);
  ctx.restore();
}

function drawHDRider(ctx, H, t = 0, ox = 0, oy = 0) {
  drawHDSaddle(ctx, H);
  // drawn around its seat (108, 74), placed on the dragon's shoulders
  ctx.save(); ctx.translate(108 + HD_RIDER_FWD + ox, HD_RIDER_Y + oy); ctx.scale(HD_RIDER_SCALE, HD_RIDER_SCALE); ctx.translate(-108, -74);   // seated in the saddle
  const girl = H.hero === "girl";
  const sway = Math.sin(t * Math.PI * 2) * 1.5;
  // Riders wear a short scarf that streams back from the neck instead of
  // a full cape -- a cape filled the space between the wings and fought
  // with them visually.
  hdFill(ctx, (c) => { c.moveTo(106, 44); c.quadraticCurveTo(96, 42 + sway, 84, 44 + sway * 2); c.lineTo(86, 48 + sway * 2); c.quadraticCurveTo(96, 47 + sway, 106, 49); }, hdGrad(ctx, 84, 42, 106, 50, [[0, hdShift(H.cape, -0.25)], [1, H.cape]]), 1.5);
  hdFill(ctx, (c) => { c.moveTo(105, 47); c.quadraticCurveTo(98, 50 + sway, 90, 54 + sway * 2); c.lineTo(92, 57 + sway * 2); c.quadraticCurveTo(99, 53 + sway, 106, 51); }, hdShift(H.cape, -0.15), 1.5);
  if (girl) hdFill(ctx, (c) => { c.moveTo(108, 26); c.quadraticCurveTo(94, 30, 88, 44 + sway); c.quadraticCurveTo(86, 52, 80, 56 + sway); c.quadraticCurveTo(92, 52, 98, 46); c.quadraticCurveTo(102, 38, 110, 34); }, hdGrad(ctx, 80, 26, 110, 56, [[0, hdShift(H.hair, -0.25)], [1, hdShift(H.hair, 0.15)]]), 1.6);
  // rounded limb helper: tapered tube with round joints
  const limb = (pts, w0, w1, fill) => {
    const t = hdTube(hdBez(pts[0], pts[1], pts[1], pts[2], 10), w0, w1);
    hdFill(ctx, (c) => hdPoly(c, t.poly), fill, 1.6);
    hdFill(ctx, (c) => { c.arc(pts[2][0], pts[2][1], w1 / 2, 0, Math.PI * 2); }, fill, 0);
  };
  // leg: thigh along the dragon's back, knee, shin down its side, boot
  limb([[103, 71], [114, 72], [122, 76]], 11, 8.5, hdGrad(ctx, 0, 66, 0, 80, [[0, hdShift(H.leather, 0.25)], [1, H.leather]]));
  limb([[122, 76], [124, 83], [123, 90]], 8, 6.5, hdGrad(ctx, 118, 0, 128, 0, [[0, H.leather], [1, hdShift(H.leather, -0.25)]]));
  hdFill(ctx, (c) => { c.moveTo(118, 88); c.quadraticCurveTo(122, 86, 126, 88); c.quadraticCurveTo(133, 90, 134, 95); c.quadraticCurveTo(126, 97, 117, 95); c.quadraticCurveTo(116, 91, 118, 88); }, hdGrad(ctx, 0, 87, 0, 96, [[0, "#5a4032"], [1, "#241a1e"]]), 1.6);
  // torso: curved back, chest leaning into the ride, tapering to the waist
  hdFill(ctx, (c) => {
    c.moveTo(106, 45); c.bezierCurveTo(100, 49, 98, 60, 102, 70);
    c.quadraticCurveTo(109, 73, 116, 70);
    c.bezierCurveTo(118, 63, 121, 52, 115, 45);
    c.quadraticCurveTo(110, 42.5, 106, 45);
  }, hdGrad(ctx, 99, 44, 120, 72, [[0, hdShift(H.leather, 0.3)], [0.55, H.leather], [1, hdShift(H.leather, -0.3)]]), 1.8);
  // chest plate
  hdFill(ctx, (c) => { c.moveTo(107.5, 47); c.quadraticCurveTo(117, 45.5, 118.5, 53.5); c.quadraticCurveTo(117, 61, 108.5, 61); c.quadraticCurveTo(104.5, 54, 107.5, 47); },
    hdGrad(ctx, 106, 45, 119, 61, [[0, hdShift(H.armor, 0.45)], [0.6, H.armor], [1, hdShift(H.armor, -0.25)]]), 1.4);
  hdFill(ctx, (c) => { c.moveTo(112, 50.5); c.lineTo(114.5, 53.5); c.lineTo(112, 56.5); c.lineTo(109.5, 53.5); }, H.cape, 0.9);
  // curved belt with buckle
  hdFill(ctx, (c) => { c.moveTo(101.5, 64); c.quadraticCurveTo(109, 66.5, 117.5, 63.5); c.lineTo(117, 67.5); c.quadraticCurveTo(109, 70.5, 102, 68); }, "#3a2418", 1.1);
  hdFill(ctx, (c) => { c.roundRect(108, 64.4, 3.6, 4, 0.8); }, H.hilt, 0);
  // neck + head (profile, looking at the enemy)
  hdFill(ctx, (c) => { c.roundRect(106, 40, 6, 7, 2); }, hdShift(H.skin, -0.12), 1.4);
  ctx.save(); ctx.translate(0, 5);                      // head sits low on a short neck
  hdFill(ctx, (c) => { c.ellipse(110, 29, 9, 10, 0, 0, Math.PI * 2); }, hdGrad(ctx, 102, 20, 118, 40, [[0, hdShift(H.skin, 0.12)], [1, hdShift(H.skin, -0.1)]]), 1.8);
  // face details
  hdFill(ctx, (c) => { c.ellipse(115, 28, 1.9, 2.4, 0, 0, Math.PI * 2); }, "#ffffff", 0.8);
  hdFill(ctx, (c) => { c.ellipse(115.8, 28.4, 1.1, 1.7, 0, 0, Math.PI * 2); }, "#2a1a14", 0);
  ctx.strokeStyle = HD_INK; ctx.lineWidth = 1; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(112.5, 24.4); ctx.lineTo(117.6, 24.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(118.6, 30); ctx.quadraticCurveTo(120, 32, 118.2, 32.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(114.6, 34.6); ctx.quadraticCurveTo(116.4, 35.6, 117.8, 34.4); ctx.stroke();
  hdFill(ctx, (c) => { c.ellipse(113, 32, 1.8, 1.1, 0, 0, Math.PI * 2); }, "rgba(255,110,110,0.35)", 0);
  // hair (windswept)
  if (girl) {
    hdFill(ctx, (c) => { c.moveTo(101, 32); c.quadraticCurveTo(99, 18, 110, 18); c.quadraticCurveTo(119, 18, 119, 24); c.quadraticCurveTo(112, 22, 110, 27); c.quadraticCurveTo(106, 25, 105, 34); }, hdGrad(ctx, 0, 18, 0, 34, [[0, hdShift(H.hair, 0.3)], [1, H.hair]]), 1.6);
    hdFill(ctx, (c) => { c.moveTo(103, 21); c.lineTo(105, 15); c.lineTo(108, 19); c.lineTo(111, 13.5); c.lineTo(114, 19); c.lineTo(117, 16); c.lineTo(118, 21); c.quadraticCurveTo(110, 18.5, 103, 21); }, hdGrad(ctx, 0, 13, 0, 21, [[0, "#fff3b0"], [1, H.hilt]]), 1.1);
    hdFill(ctx, (c) => { c.arc(111, 18.4, 1.4, 0, Math.PI * 2); }, H.gem || "#ee5a9a", 0);
  } else {
    hdFill(ctx, (c) => {
      c.moveTo(101, 33); c.lineTo(94, 28 + sway * 0.5); c.lineTo(100, 26); c.lineTo(95, 19 + sway * 0.5); c.lineTo(103, 20); c.lineTo(102, 13);
      c.lineTo(109, 17); c.lineTo(113, 11); c.lineTo(116, 17); c.lineTo(121, 17); c.quadraticCurveTo(114, 21, 111, 27); c.quadraticCurveTo(107, 25, 105, 34);
    }, hdGrad(ctx, 0, 11, 0, 34, [[0, hdShift(H.hair, 0.4)], [1, H.hair]]), 1.6);
  }
  ctx.restore();
  // arm: rounded upper arm and forearm reaching to the hilt, shoulder guard on top
  limb([[110, 50], [113, 56], [117, 59]], 7, 6, hdGrad(ctx, 0, 48, 0, 60, [[0, hdShift(H.armor, 0.2)], [1, hdShift(H.armor, -0.15)]]));
  limb([[117, 59], [122, 58], [127.5, 55.5]], 6, 5, hdGrad(ctx, 0, 54, 0, 61, [[0, hdShift(H.leather, 0.25)], [1, H.leather]]));
  hdFill(ctx, (c) => { c.ellipse(110, 48.5, 5.2, 4, -0.3, 0, Math.PI * 2); }, hdGrad(ctx, 0, 44, 0, 53, [[0, hdShift(H.armor, 0.5)], [1, hdShift(H.armor, -0.1)]]), 1.4);
  const bx = 130, by = 52;
  hdFill(ctx, (c) => { c.moveTo(bx, by); c.lineTo(bx + 24, by - 38); c.lineTo(bx + 27, by - 42); c.lineTo(bx + 26.5, by - 36); c.lineTo(bx + 4, by + 2); },
    hdGrad(ctx, bx, by, bx + 26, by - 42, [[0, hdShift(H.blade, -0.25)], [0.5, H.blade], [1, "#ffffff"]]), 1.4);
  ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(bx + 3, by - 2); ctx.lineTo(bx + 24, by - 37); ctx.stroke();
  hdFill(ctx, (c) => { c.moveTo(bx - 6, by - 3); c.lineTo(bx + 7, by + 5); c.lineTo(bx + 8, by + 2); c.lineTo(bx - 5, by - 6); }, H.hilt, 1.2);
  hdFill(ctx, (c) => { c.arc(bx - 1, by + 4, 3.2, 0, Math.PI * 2); }, hdShift(H.leather, 0.1), 1.3);
  hdFill(ctx, (c) => { c.arc(bx - 4, by + 8, 1.6, 0, Math.PI * 2); }, H.gem || H.hilt, 1);
  ctx.restore();
  drawHDStirrup(ctx, H);
}

/* Hero standing on foot (side view, facing right, sword ready). */
function drawHDHeroStanding(ctx, H, t = 0) {
  ctx.save();
  const girl = H.hero === "girl";
  const sway = Math.sin(t * Math.PI * 2);
  // cape
  // cape: dark lining on the inside edge and a gold trim, so it reads as
  // a separate piece of cloth from the tunic and skirt
  hdFill(ctx, (c) => { c.moveTo(34, 40); c.quadraticCurveTo(18, 56 + sway, 16, 84); c.lineTo(34, 82); c.quadraticCurveTo(34, 60, 42, 44); }, hdGrad(ctx, 16, 40, 40, 84, [[0, hdShift(H.cape, -0.1)], [1, hdShift(H.cape, 0.1)]]), 1.8);
  hdFill(ctx, (c) => { c.moveTo(36, 44); c.quadraticCurveTo(30, 62, 29, 82); c.lineTo(34, 82); c.quadraticCurveTo(34, 60, 42, 44); }, hdShift(H.cape, -0.45), 0);
  ctx.strokeStyle = H.hilt; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(17.5, 82.5); ctx.lineTo(33.5, 81.5); ctx.stroke();
  if (girl) hdFill(ctx, (c) => { c.moveTo(38, 20); c.quadraticCurveTo(26, 28, 26, 52 + sway); c.quadraticCurveTo(30, 58, 34, 52); c.quadraticCurveTo(34, 36, 42, 26); }, hdGrad(ctx, 26, 20, 42, 58, [[0, hdShift(H.hair, -0.25)], [1, H.hair]]), 1.6);
  // legs (sturdy) + boots
  hdFill(ctx, (c) => { c.roundRect(34, 70, 11, 22, 4); }, hdGrad(ctx, 0, 70, 0, 92, [[0, H.leather], [1, hdShift(H.leather, -0.3)]]), 1.8);
  hdFill(ctx, (c) => { c.roundRect(47, 70, 11, 22, 4); }, hdGrad(ctx, 0, 70, 0, 92, [[0, hdShift(H.leather, 0.15)], [1, hdShift(H.leather, -0.2)]]), 1.8);
  hdFill(ctx, (c) => { c.moveTo(32, 90); c.lineTo(46, 90); c.quadraticCurveTo(50, 92, 49, 97); c.lineTo(32, 97); }, "#2a1e24", 1.6);
  hdFill(ctx, (c) => { c.moveTo(46, 90); c.lineTo(59, 90); c.quadraticCurveTo(66, 92, 65, 97); c.lineTo(46, 97); }, "#33252c", 1.6);
  // torso
  hdFill(ctx, (c) => { c.moveTo(34, 40); c.quadraticCurveTo(46, 34, 58, 40); c.lineTo(60, 72); c.quadraticCurveTo(46, 76, 33, 72); c.quadraticCurveTo(31, 56, 34, 40); }, hdGrad(ctx, 33, 36, 60, 76, [[0, hdShift(H.armor, 0.35)], [0.5, H.armor], [1, hdShift(H.armor, -0.3)]]), 2);
  if (girl) {
    // skirt in deep purple with a gold hem -- clearly not the pink cape
    const skirt = H.skirt || "#4a2a78";
    hdFill(ctx, (c) => { c.moveTo(32, 66); c.lineTo(61, 66); c.quadraticCurveTo(64, 74, 65, 81); c.lineTo(28, 81); c.quadraticCurveTo(29, 74, 32, 66); }, hdGrad(ctx, 0, 66, 0, 81, [[0, hdShift(skirt, 0.2)], [1, skirt]]), 1.6);
    hdFill(ctx, (c) => { c.roundRect(28.5, 78, 36, 3, 1.2); }, H.hilt, 0);
  }
  hdFill(ctx, (c) => { c.roundRect(33, 62, 27, 5, 2); }, "#3a2418", 1.3);
  hdFill(ctx, (c) => { c.roundRect(44, 61.5, 5, 6, 1); }, H.hilt, 0);
  hdFill(ctx, (c) => { c.moveTo(40, 52); c.lineTo(44, 56); c.lineTo(40, 60); c.lineTo(36, 56); }, H.cape, 1.1);
  // head
  hdFill(ctx, (c) => { c.roundRect(43, 31, 7, 7, 2); }, hdShift(H.skin, -0.12), 1.4);
  hdFill(ctx, (c) => { c.ellipse(47, 21, 10, 11, 0, 0, Math.PI * 2); }, hdGrad(ctx, 38, 10, 56, 32, [[0, hdShift(H.skin, 0.12)], [1, hdShift(H.skin, -0.1)]]), 1.8);
  hdFill(ctx, (c) => { c.ellipse(52.5, 20, 2, 2.6, 0, 0, Math.PI * 2); }, "#ffffff", 0.8);
  hdFill(ctx, (c) => { c.ellipse(53.4, 20.4, 1.2, 1.8, 0, 0, Math.PI * 2); }, "#2a1a14", 0);
  ctx.strokeStyle = HD_INK; ctx.lineWidth = 1; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(49.6, 16); ctx.lineTo(55.2, 16.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(56.4, 22); ctx.quadraticCurveTo(58, 24.2, 56, 24.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(51.8, 27.4); ctx.quadraticCurveTo(53.8, 28.6, 55.4, 27.2); ctx.stroke();
  hdFill(ctx, (c) => { c.ellipse(50, 24.4, 2, 1.2, 0, 0, Math.PI * 2); }, "rgba(255,110,110,0.35)", 0);
  if (girl) {
    hdFill(ctx, (c) => { c.moveTo(37, 26); c.quadraticCurveTo(35, 9, 48, 9); c.quadraticCurveTo(58, 9, 58, 16); c.quadraticCurveTo(50, 13, 47, 19); c.quadraticCurveTo(42, 17, 41, 28); }, hdGrad(ctx, 0, 9, 0, 28, [[0, hdShift(H.hair, 0.3)], [1, H.hair]]), 1.6);
    hdFill(ctx, (c) => { c.moveTo(40, 12); c.lineTo(42, 6); c.lineTo(45, 10); c.lineTo(48, 4); c.lineTo(51, 10); c.lineTo(54, 7); c.lineTo(55, 12); c.quadraticCurveTo(48, 9.5, 40, 12); }, hdGrad(ctx, 0, 4, 0, 12, [[0, "#fff3b0"], [1, H.hilt]]), 1.1);
    hdFill(ctx, (c) => { c.arc(48, 9.4, 1.5, 0, Math.PI * 2); }, H.gem || "#ee5a9a", 0);
  } else {
    hdFill(ctx, (c) => {
      c.moveTo(37, 26); c.lineTo(31, 20); c.lineTo(37, 18); c.lineTo(33, 10); c.lineTo(41, 11); c.lineTo(41, 3);
      c.lineTo(47, 8); c.lineTo(52, 2); c.lineTo(54, 9); c.lineTo(60, 9); c.quadraticCurveTo(52, 13, 48, 19); c.quadraticCurveTo(44, 17, 42, 27);
    }, hdGrad(ctx, 0, 2, 0, 27, [[0, hdShift(H.hair, 0.4)], [1, H.hair]]), 1.6);
  }
  // arm and sword held up in front, joined to the body by a shoulder guard
  hdFill(ctx, (c) => { c.moveTo(48, 45); c.quadraticCurveTo(60, 45, 65, 51); c.lineTo(61, 56); c.quadraticCurveTo(56, 52, 48, 53); }, hdGrad(ctx, 0, 44, 0, 56, [[0, hdShift(H.armor, 0.25)], [1, H.armor]]), 1.6);
  hdFill(ctx, (c) => { c.ellipse(51, 42.5, 6, 4.2, -0.15, 0, Math.PI * 2); }, hdGrad(ctx, 0, 38, 0, 47, [[0, hdShift(H.armor, 0.45)], [1, hdShift(H.armor, -0.1)]]), 1.5);
  const bx = 66, by = 50;
  hdFill(ctx, (c) => { c.moveTo(bx, by); c.lineTo(bx + 12, by - 42); c.lineTo(bx + 14, by - 47); c.lineTo(bx + 15, by - 41); c.lineTo(bx + 4, by + 1); },
    hdGrad(ctx, bx, by, bx + 14, by - 46, [[0, hdShift(H.blade, -0.25)], [0.5, H.blade], [1, "#ffffff"]]), 1.4);
  hdFill(ctx, (c) => { c.moveTo(bx - 6, by - 1); c.lineTo(bx + 9, by + 3); c.lineTo(bx + 10, by); c.lineTo(bx - 5, by - 4); }, H.hilt, 1.2);
  hdFill(ctx, (c) => { c.arc(bx + 1, by + 4, 3.2, 0, Math.PI * 2); }, hdShift(H.leather, 0.1), 1.3);
  ctx.restore();
}

/* Renders a drawing into a canvas of cssW x cssH at the device pixel ratio,
   on the HD_PIXEL grid, with hard (non-blurred) pixel edges.
   draw(ctx) draws in design units; `fit` = { x, y, w, h } design bounds. */
function hdRender(draw, fit, cssW, cssH, dpr, pixel = HD_PIXEL) {
  const grid = Math.max(1, pixel * dpr);                      // device px per art pixel
  const sw = Math.max(1, Math.round(cssW * dpr / grid)), sh = Math.max(1, Math.round(cssH * dpr / grid));
  const small = document.createElement("canvas"); small.width = sw; small.height = sh;
  const sc = small.getContext("2d");
  const k = Math.min(sw / fit.w, sh / fit.h);
  sc.translate((sw - fit.w * k) / 2 - fit.x * k, (sh - fit.h * k) - fit.y * k);
  sc.scale(k, k);
  draw(sc);
  // snap edges: no half-transparent fringe, so pixels stay crisp
  const img = sc.getImageData(0, 0, sw, sh), d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0;
  sc.putImageData(img, 0, 0);
  const out = document.createElement("canvas");
  out.width = Math.round(sw * grid); out.height = Math.round(sh * grid);
  const oc = out.getContext("2d"); oc.imageSmoothingEnabled = false;
  oc.drawImage(small, 0, 0, out.width, out.height);
  out._designScale = k * grid / dpr;                          // CSS px per design unit
  out._designOffset = { x: (sw - fit.w * k) / 2 / k - fit.x, y: (sh - fit.h * k) / k - fit.y };
  return out;
}

const HD_DRAGON_FIT = { x: -26, y: -40, w: 262, h: 176 };
const HD_HERO_FIT = { x: 10, y: 0, w: 70, h: 98 };
