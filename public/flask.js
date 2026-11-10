/* yumm lab · 3D particle flask mascot (raw WebGL, no library).
 * A chubby Erlenmeyer flask sampled into a point cloud, with a face made of dots.
 * - shaded by a fixed light, back faces dimmer, perspective-sized dots
 * - turns toward the cursor, eyes follow it, blinks every few seconds
 * - near the cursor dots snap to a pixel grid and get pushed aside
 * - the right edge keeps flaking away and reforming; bubbles rise through the liquid
 * - click it: it squishes and bounces
 * - assembles from a scatter on cue; pauses off screen; one static frame for reduced motion
 */
(() => {
  "use strict";

  // kinds: 0 glass · 1 liquid · 2 liquid surface · 3 bubble · 4 dust · 5 eye · 6 cheek · 7 smile · 8 eye sparkle
  const LEVEL = -0.1;
  const EYE_Y = -0.3;
  const EYE_X = 0.16;
  const SMILE_Y = -0.43;

  const VERT = `
attribute vec3 aPos;
attribute vec3 aNormal;
attribute float aSeed;
attribute float aKind;
uniform float uTime, uAssemble, uYaw, uPitch, uRoll, uMouseOn, uScale, uDpr, uGrid, uAspect, uDot, uBlink, uSquish, uLevel, uEyeY, uBurst;
uniform vec2 uMouse, uRes, uCenter, uLook;
uniform vec3 uInk, uLime, uOlive, uDeep, uBlush, uPaper;
varying float vAlpha;
varying vec3 vColor;

float hash(float n) { return fract(sin(n) * 43758.5453123); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }

void main() {
  vec3 p = aPos;
  bool glass = aKind < 0.5;
  bool liquid = aKind > 0.5 && aKind < 1.5;
  bool surface = aKind > 1.5 && aKind < 2.5;
  bool bubble = aKind > 2.5 && aKind < 3.5;
  bool dust = aKind > 3.5 && aKind < 4.5;
  bool eye = aKind > 4.5 && aKind < 5.5;
  bool cheek = aKind > 5.5 && aKind < 6.5;
  bool smile = aKind > 6.5 && aKind < 7.5;
  bool spark = aKind > 7.5;

  if (surface || liquid) {
    float wave = sin(p.x * 7.0 + uTime * 1.7) * 0.016 + cos(p.z * 6.0 + uTime * 1.3) * 0.012;
    p.y += surface ? wave : wave * smoothstep(uLevel - 0.35, uLevel, p.y);
  }
  if (bubble) {
    float speed = 0.05 + hash(aSeed * 3.1) * 0.07 + uBurst * 0.25;
    float h = fract(uTime * speed + aSeed);
    p.y = mix(-0.78, 0.95, h);
    float r = p.y > 0.42 ? 0.12 : mix(0.5, 0.2, clamp((p.y + 0.78) / 1.2, 0.0, 1.0));
    p.x = cos(aSeed * 40.0) * r * hash(aSeed * 7.7) + sin(uTime * 2.0 + aSeed * 30.0) * 0.015;
    p.z = sin(aSeed * 40.0) * r * hash(aSeed * 5.3);
  }
  if (eye || spark) {
    p.y = uEyeY + (p.y - uEyeY) * uBlink;   // blink squashes the eyes flat
    p.xy += uLook;                           // eyes glance toward the cursor
  }

  // squish and bounce on click (volume roughly kept)
  float sq = uSquish;
  p.y = (p.y + 0.86) * (1.0 - 0.16 * sq) - 0.86;
  p.xz *= 1.0 + 0.1 * sq;

  mat3 R = rotZ(uRoll) * rotX(uPitch) * rotY(uYaw);
  vec3 w = R * p;
  vec3 n = normalize(R * aNormal);

  // the right edge flakes away and drifts off, then reforms
  float side = smoothstep(0.08, 0.66, w.x + (hash(aSeed * 91.0) - 0.5) * 0.35);
  float flake = (glass || dust) ? side * step(0.55, hash(aSeed * 13.0)) : 0.0;
  if (dust) flake = 1.0;
  float ph = fract(uTime * (0.035 + hash(aSeed * 7.0) * 0.06) + aSeed);
  w += flake * ph * vec3(0.7 + hash(aSeed * 3.0) * 1.1, (hash(aSeed * 5.0) - 0.35) * 0.8, (hash(aSeed * 11.0) - 0.5) * 0.6);

  // assemble from a scatter (the face arrives last)
  vec3 scatter = (vec3(hash(aSeed * 17.0), hash(aSeed * 23.0), hash(aSeed * 29.0)) - 0.5) * vec3(7.0, 4.5, 3.0);
  float late = (eye || cheek || smile || spark) ? 0.35 : 0.0;
  float t = clamp(uAssemble * 1.7 - hash(aSeed * 41.0) * 0.7 - late, 0.0, 1.0);
  t = 1.0 - pow(1.0 - t, 3.0);
  w = mix(scatter, w, t);

  float cam = 3.4;
  float persp = cam / (cam - w.z);
  vec2 ndc = vec2(w.x * uScale * persp / uAspect, w.y * uScale * persp) + uCenter;

  // cursor: pixel-grid snap + push (the face holds its shape)
  vec2 px = (ndc * 0.5 + 0.5) * uRes;
  float radius = 150.0 * uDpr;
  float d = distance(px, uMouse);
  float faceHold = (eye || cheek || smile || spark) ? 0.15 : 1.0;
  float f = smoothstep(radius, 0.0, d) * uMouseOn * t * faceHold;
  vec2 snapped = floor(px / uGrid + 0.5) * uGrid;
  px = mix(px, snapped, f);
  px += normalize(px - uMouse + 0.0001) * f * f * 26.0 * uDpr;
  ndc = px / uRes * 2.0 - 1.0;
  gl_Position = vec4(ndc, 0.0, 1.0);

  // shading: dark dots on light paper, so shadow = denser/darker
  vec3 L = normalize(vec3(-0.55, 0.55, 0.65));
  float lit = max(dot(n, L), 0.0);
  float front = smoothstep(-0.5, 0.45, n.z);
  float a;
  vec3 col;
  float size;
  if (glass) {
    a = mix(0.5, 1.0, 1.0 - lit) * mix(0.42, 1.0, front);
    col = uInk;
    size = 1.55;
  } else if (liquid) {
    float h = hash(aSeed * 61.0);
    col = h < 0.55 ? uOlive : (h < 0.8 ? uDeep : uInk);
    a = mix(0.55, 1.0, 1.0 - lit * 0.6) * mix(0.6, 1.0, front);
    size = 1.75;
  } else if (surface) {
    col = hash(aSeed * 61.0) < 0.7 ? uDeep : uLime;
    a = 0.9;
    size = 1.7;
  } else if (bubble) {
    col = uDeep;
    a = 0.85 * sin(3.14159 * fract(uTime * (0.05 + hash(aSeed * 3.1) * 0.07 + uBurst * 0.25) + aSeed));
    size = 2.6 + hash(aSeed * 9.0) * 2.4;
  } else if (dust) {
    col = hash(aSeed * 61.0) < 0.2 ? uDeep : uInk;
    a = 0.55;
    size = 1.2 + hash(aSeed * 9.0);
  } else if (cheek) {
    col = uBlush;
    a = 0.75 * front;
    size = 2.2;
  } else if (spark) {
    col = uPaper;
    a = front * step(0.35, uBlink);
    size = 2.6;
  } else {
    col = uInk;
    a = front;
    size = 2.3;
  }
  a *= 1.0 - ph * flake;
  a *= mix(0.15, 1.0, t);
  a = max(a, f * 0.9);
  vAlpha = a;
  vColor = mix(col, uInk, f * 0.5);
  gl_PointSize = size * uDot * uDpr * persp * (1.0 + f * 1.6);
}`;

  const FRAG = `
precision mediump float;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vColor, vAlpha * smoothstep(0.5, 0.25, d));
}`;

  // Chubby Erlenmeyer profile (radius, y), from the inner rim over the lip, down the neck,
  // over the shoulder, down the body, round the bottom, to the bottom centre.
  const PROFILE = [
    [0.16, 0.8], [0.235, 0.8], [0.262, 0.775], [0.262, 0.725], [0.235, 0.7], [0.185, 0.7],
    [0.185, 0.46], [0.2, 0.39], [0.26, 0.31], [0.64, -0.5], [0.705, -0.6], [0.725, -0.7],
    [0.7, -0.79], [0.63, -0.85], [0.52, -0.87], [0.0, -0.87],
  ];

  // outer radius of body/neck at height y (lip ignored)
  function radiusAt(y) {
    if (y > 0.46) return 0.185;
    if (y > 0.31) return 0.185 + ((0.46 - y) / 0.15) * 0.075;
    if (y > -0.5) return 0.26 + ((0.31 - y) / 0.81) * 0.38;
    if (y > -0.7) return 0.64 + ((-0.5 - y) / 0.2) * 0.085;
    return 0.725 - ((-0.7 - y) / 0.17) * 0.2;
  }

  function buildCloud(total) {
    const pos = [], nrm = [], seed = [], kind = [];
    const push = (x, y, z, nx, ny, nz, k) => { pos.push(x, y, z); nrm.push(nx, ny, nz); seed.push(Math.random()); kind.push(k); };

    // glass: area-weighted samples along the profile, revolved
    const segs = [];
    let area = 0;
    for (let i = 0; i < PROFILE.length - 1; i++) {
      const [r0, y0] = PROFILE[i], [r1, y1] = PROFILE[i + 1];
      const w = Math.hypot(r1 - r0, y1 - y0) * Math.max(0.02, (r0 + r1) / 2);
      segs.push({ r0, y0, r1, y1, w });
      area += w;
    }
    const glassN = Math.round(total * 0.44);
    for (let i = 0; i < glassN; i++) {
      let pick = Math.random() * area, s = segs[0];
      for (const seg of segs) { pick -= seg.w; if (pick <= 0) { s = seg; break; } }
      const u = Math.random();
      const r = s.r0 + (s.r1 - s.r0) * u + (Math.random() - 0.5) * 0.006;
      const y = s.y0 + (s.y1 - s.y0) * u + (Math.random() - 0.5) * 0.006;
      let nr = s.y0 - s.y1, ny = s.r1 - s.r0;
      const nl = Math.hypot(nr, ny) || 1; nr /= nl; ny /= nl;
      const th = Math.random() * Math.PI * 2;
      push(r * Math.sin(th), y, r * Math.cos(th), nr * Math.sin(th), ny, nr * Math.cos(th), 0);
    }

    // liquid volume
    const liquidN = Math.round(total * 0.36);
    let made = 0, guard = 0;
    while (made < liquidN && guard++ < liquidN * 8) {
      const y = -0.86 + Math.random() * (LEVEL + 0.86);
      const rr = Math.sqrt(Math.random()) * 0.72;
      if (rr > radiusAt(y) - 0.03) continue;
      const th = Math.random() * Math.PI * 2;
      push(rr * Math.sin(th), y, rr * Math.cos(th), Math.sin(th), 0.15, Math.cos(th), 1);
      made++;
    }
    // liquid surface
    const surfN = Math.round(total * 0.08);
    const rl = radiusAt(LEVEL) - 0.03;
    for (let i = 0; i < surfN; i++) {
      const rr = Math.sqrt(Math.random()) * rl, th = Math.random() * Math.PI * 2;
      push(rr * Math.sin(th), LEVEL, rr * Math.cos(th), 0, 1, 0, 2);
    }
    // bubbles (positions computed in the shader)
    for (let i = 0; i < 80; i++) push(0, 0, 0, 0, 0, 1, 3);
    // loose dust around the right side
    const dustN = Math.round(total * 0.04);
    for (let i = 0; i < dustN; i++) push(0.15 + Math.random() * 0.6, -0.8 + Math.random() * 1.6, (Math.random() - 0.5) * 0.8, 0, 0, 1, 4);

    // face, drawn last so it sits on top: points placed on the front surface (+z)
    const onSurface = (s, y, k, lift = 0.006) => {
      const R = radiusAt(y) + lift;
      const th = s / R;
      push(R * Math.sin(th), y, R * Math.cos(th), Math.sin(th), 0.2, Math.cos(th), k);
    };
    const blob = (cs, cy, rx, ry, n, k) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
        onSurface(cs + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, k);
      }
    };
    const faceN = Math.max(0.85, total / 80000); // keep the face crisp on small screens
    blob(-0.2, -0.47, 0.06, 0.042, Math.round(1100 * faceN), 6); // cheeks
    blob(0.2, -0.47, 0.06, 0.042, Math.round(1100 * faceN), 6);
    blob(-EYE_X, EYE_Y, 0.052, 0.07, Math.round(2600 * faceN), 5); // eyes
    blob(EYE_X, EYE_Y, 0.052, 0.07, Math.round(2600 * faceN), 5);
    for (let i = 0; i < Math.round(1500 * faceN); i++) { // smile: a small U
      const u = Math.random() * 2 - 1;
      const s = u * 0.075;
      const y = SMILE_Y - 0.045 * (1 - u * u) + (Math.random() - 0.5) * 0.02;
      onSurface(s + (Math.random() - 0.5) * 0.012, y, 7, 0.008);
    }
    blob(-EYE_X + 0.018, EYE_Y + 0.026, 0.016, 0.018, Math.round(260 * faceN), 8); // sparkles
    blob(EYE_X + 0.018, EYE_Y + 0.026, 0.016, 0.018, Math.round(260 * faceN), 8);

    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), seed: new Float32Array(seed), kind: new Float32Array(kind), count: seed.length };
  }

  function toRGB(css, fallback) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const x = c.getContext("2d");
    x.fillStyle = fallback;
    x.fillStyle = css;
    x.fillRect(0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  }

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader compile failed");
    return s;
  }

  function create(canvas, { reduce = false, layout } = {}) {
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL unavailable");

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link failed");
    gl.useProgram(prog);

    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    const cloud = buildCloud(small ? 30000 : 80000);
    const attr = (name, data, size) => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attr("aPos", cloud.pos, 3);
    attr("aNormal", cloud.nrm, 3);
    attr("aSeed", cloud.seed, 1);
    attr("aKind", cloud.kind, 1);

    const U = {};
    ["uTime", "uAssemble", "uYaw", "uPitch", "uRoll", "uMouseOn", "uScale", "uDpr", "uGrid", "uAspect", "uDot", "uBlink", "uSquish",
      "uLevel", "uEyeY", "uBurst", "uMouse", "uRes", "uCenter", "uLook", "uInk", "uLime", "uOlive", "uDeep", "uBlush", "uPaper"]
      .forEach((k) => { U[k] = gl.getUniformLocation(prog, k); });

    const css = getComputedStyle(document.documentElement);
    const colour = (name, fb) => toRGB(css.getPropertyValue(name).trim(), fb);
    gl.uniform3fv(U.uInk, colour("--color-ink", "#1b1d21"));
    gl.uniform3fv(U.uLime, colour("--color-accent", "#dcf23a"));
    gl.uniform3fv(U.uDeep, colour("--color-accent-deep", "#bcd400"));
    gl.uniform3fv(U.uOlive, colour("--color-olive", "#5f6b12"));
    gl.uniform3fv(U.uBlush, colour("--color-blush", "#f08a8a"));
    gl.uniform3fv(U.uPaper, colour("--color-surface", "#ffffff"));
    gl.uniform1f(U.uLevel, LEVEL);
    gl.uniform1f(U.uEyeY, EYE_Y);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    let dpr = 1, W = 1, H = 1, layoutNow = { cx: 0.35, cy: 0, scale: 0.9 };
    const state = {
      assemble: reduce ? 1 : 0, target: reduce ? 1 : 0, yaw: 0, pitch: 0.16, roll: 0,
      mx: -1e5, my: -1e5, on: 0, onTarget: 0, nx: 0, ny: 0, lx: 0, ly: 0,
      blink: 1, nextBlink: 2.5, squish: 0, squishV: 0, burst: 0,
    };
    let raf = 0, visible = true, last = performance.now(), time = 0;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width * dpr));
      H = Math.max(1, Math.round(r.height * dpr));
      canvas.width = W; canvas.height = H;
      gl.viewport(0, 0, W, H);
      layoutNow = layout ? layout(r.width, r.height) : layoutNow;
      gl.uniform2f(U.uRes, W, H);
      gl.uniform2f(U.uCenter, layoutNow.cx, layoutNow.cy);
      gl.uniform1f(U.uScale, layoutNow.scale);
      gl.uniform1f(U.uAspect, W / H);
      gl.uniform1f(U.uDpr, dpr);
      gl.uniform1f(U.uGrid, 7 * dpr);
      gl.uniform1f(U.uDot, layoutNow.dot || 1);
      if (reduce) draw();
    }

    function draw() {
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uAssemble, state.assemble);
      gl.uniform1f(U.uYaw, state.yaw);
      gl.uniform1f(U.uPitch, state.pitch);
      gl.uniform1f(U.uRoll, state.roll);
      gl.uniform1f(U.uMouseOn, state.on);
      gl.uniform1f(U.uBlink, state.blink);
      gl.uniform1f(U.uSquish, state.squish);
      gl.uniform1f(U.uBurst, state.burst);
      gl.uniform2f(U.uMouse, state.mx, state.my);
      gl.uniform2f(U.uLook, state.lx, state.ly);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, cloud.count);
    }

    function frame(now) {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      const k = (rate) => Math.min(1, dt * rate);
      state.assemble += (state.target - state.assemble) * k(0.9);
      if (state.target === 1 && state.assemble > 0.999) state.assemble = 1;
      state.on += (state.onTarget - state.on) * k(6);

      // turn toward the cursor, tilt a little, idle sway
      state.yaw += (state.nx * 0.42 + Math.sin(time * 0.5) * 0.05 - state.yaw) * k(3);
      state.pitch += (0.16 + state.ny * 0.22 + Math.sin(time * 0.7) * 0.025 - state.pitch) * k(3);
      state.roll += (-state.nx * 0.1 + Math.sin(time * 0.45) * 0.03 - state.roll) * k(3);
      // eyes glance toward the cursor
      state.lx += (state.nx * 0.03 - state.lx) * k(8);
      state.ly += (-state.ny * 0.02 - state.ly) * k(8);

      // blink: quick close/open every 2.5–5.5 s, sometimes twice
      state.nextBlink -= dt;
      if (state.nextBlink <= 0) {
        state.blinkT = 0;
        state.nextBlink = Math.random() < 0.2 ? 0.28 : 2.5 + Math.random() * 3;
      }
      if (state.blinkT !== undefined) {
        state.blinkT += dt;
        const b = state.blinkT / 0.16;
        state.blink = b < 1 ? 1 - Math.sin(b * Math.PI) * 0.92 : 1;
        if (b >= 1) state.blinkT = undefined;
      }

      // squish spring
      state.squishV += (-state.squish * 140 - state.squishV * 9) * dt;
      state.squish += state.squishV * dt;
      state.burst += (0 - state.burst) * k(1.2);

      draw();
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    const start = () => { if (!raf && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } };

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      state.mx = x * dpr;
      state.my = (r.height - y) * dpr;
      // direction from the flask centre to the cursor, normalised to the canvas
      const fx = r.left + ((layoutNow.cx + 1) / 2) * r.width;
      const fy = r.top + ((1 - layoutNow.cy) / 2) * r.height;
      state.nx = Math.max(-1, Math.min(1, (e.clientX - fx) / (window.innerWidth * 0.5)));
      state.ny = Math.max(-1, Math.min(1, (e.clientY - fy) / (window.innerHeight * 0.5)));
      state.onTarget = x >= 0 && y >= 0 && x <= r.width && y <= r.height ? 1 : 0;
    };
    const onLeave = () => { state.onTarget = 0; };
    let timer = 0;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(resize, 120); };

    if (!reduce) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    window.addEventListener("resize", onResize);
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); });
    io.observe(canvas);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) start(); });

    resize();
    start();

    // CPU copy of the vertex transform for the glass outline (no flakes, no cursor push).
    // Used to keep the layout honest: the flask must fit its safe box.
    function bounds() {
      const r = canvas.getBoundingClientRect();
      const { yaw, pitch, roll } = state;
      const cy_ = Math.cos(yaw), sy_ = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
      let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
      for (let i = 0; i < cloud.count; i += 7) {
        if (cloud.kind[i] !== 0) continue;
        let x = cloud.pos[i * 3], y = cloud.pos[i * 3 + 1], z = cloud.pos[i * 3 + 2];
        let x1 = cy_ * x + sy_ * z, z1 = -sy_ * x + cy_ * z;            // rotY
        let y2 = cp * y - sp * z1, z2 = sp * y + cp * z1;                // rotX
        let x3 = cr * x1 - sr * y2, y3 = sr * x1 + cr * y2;              // rotZ
        const persp = 3.4 / (3.4 - z2);
        const nx = (x3 * layoutNow.scale * persp) / (r.width / r.height) + layoutNow.cx;
        const ny = y3 * layoutNow.scale * persp + layoutNow.cy;
        const px = ((nx + 1) / 2) * r.width, py = ((1 - ny) / 2) * r.height;
        top = Math.min(top, py); bottom = Math.max(bottom, py); left = Math.min(left, px); right = Math.max(right, px);
      }
      return { top, bottom, left, right };
    }

    return {
      count: cloud.count,
      relayout: resize,
      bounds,
      assemble() { state.target = 1; start(); },
      // true when (clientX, clientY) lands on the flask body
      hits(clientX, clientY) {
        const r = canvas.getBoundingClientRect();
        const fx = r.left + ((layoutNow.cx + 1) / 2) * r.width;
        const fy = r.top + ((1 - layoutNow.cy) / 2) * r.height;
        const half = (layoutNow.scale * r.height) / 2;
        return Math.abs(clientX - fx) < half * 0.8 && Math.abs(clientY - fy) < half * 0.95;
      },
      poke() {
        if (reduce) return;
        state.squishV += 9;
        state.burst = 1;
        state.blinkT = 0;
        start();
      },
      destroy() {
        cancelAnimationFrame(raf);
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("resize", onResize);
      },
    };
  }

  window.YummFlask = { create };
})();
