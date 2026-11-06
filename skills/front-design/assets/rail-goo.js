// 레일 선택 표시: 메뉴 사이를 옮겨 갈 때 액체처럼 늘어났다가 맺히는 물방울 (WebGL, 외부 라이브러리 없음)
// ============================================================
// 새 자리로 먼저 가는 '머리'와 늘어나며 따라오는 '꼬리' 두 방울을 용수철로 움직이고, 둘 사이를 가는 목으로 잇는다.
// 한 장의 거리장(SDF)에 부드러운 합집합(smin)으로 그려서 갈라지고 합쳐지는 모양이 자연스럽다.
// 마우스가 레일 가까이 오면 그쪽으로 부풀고, 이동을 시작하면 작은 방울이 튀고, 도착하면 가시가 돋았다 가라앉는다.
//
// 사용법 (references/rail-goo.md 참고)
//   RailGoo.move(navEl, activeBtn, animate)  → 그릴 수 있으면 true. false 면 호출한 쪽이 CSS 로 선택 표시를 대신한다.
//   RailGoo.hide()                           → 물방울을 지운다 (좁은 화면으로 바뀔 때)
//   RailGoo.onFail = fn                      → WebGL 이 없거나 컨텍스트를 잃었을 때 호출된다
// 요구 사항
//   - navEl 은 position: relative 이고, 버튼은 navEl 의 직접 자식이며 가로 가운데에 놓인 원형(폭 = 높이)이다.
//   - 물방울 색은 navEl 에서 계산되는 CSS 변수 --goo-color (var() · color-mix() 도 가능).
//   - 캔버스(.rail-goo)는 이 파일이 만들어 navEl 맨 앞에 넣고 위치·크기도 정한다. 보이고 숨기는 것은 CSS 가 맡는다.
//   - 줄여 보기(prefers-reduced-motion)이면 움직임 없이 바로 자리를 옮긴다.

(function () {
  'use strict';

  var MSPK = 4, MDROP = 4;   // 셰이더가 한 번에 그리는 가시·방울 수

  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uDpr;',
    'uniform vec3 uH; uniform vec3 uT; uniform vec2 uBr;',
    'uniform vec4 uBump; uniform vec2 uBumpR;',
    'uniform vec4 uSpk[' + MSPK + ']; uniform vec4 uSpkR[' + MSPK + '];',
    'uniform vec4 uDrop[' + MDROP + '];',
    'uniform vec3 uBase; uniform vec3 uShine;',
    'vec2 smin(vec2 a, vec2 b, float k){',
    '  float h = clamp(0.5 + 0.5 * (b.x - a.x) / k, 0.0, 1.0);',
    '  return vec2(mix(b.x, a.x, h) - k * h * (1.0 - h), mix(b.y, a.y, h));',
    '}',
    // 끝으로 갈수록 가늘어지는 캡슐 (혹·가시용)
    'float cone(vec2 p, vec2 a, vec2 b, float ra, float rb, out float r){',
    '  vec2 pb = b - a; p -= a;',
    '  float h = dot(pb, pb);',
    '  float t = clamp(dot(p, pb) / (h + 1e-4), 0.0, 1.0);',
    '  r = mix(ra, rb, t);',
    '  float bb = ra - rb;',
    '  if (h <= bb * bb + 1e-3) { return ra > rb ? length(p) - ra : length(p - pb) - rb; }',
    '  vec2 q = vec2(dot(p, vec2(pb.y, -pb.x)), dot(p, pb)) / h;',
    '  q.x = abs(q.x);',
    '  vec2 c = vec2(sqrt(h - bb * bb), bb);',
    '  float k = c.x * q.y - c.y * q.x;',
    '  float m = dot(c, q); float n = dot(q, q);',
    '  if (k < 0.0) return sqrt(h * n) - ra;',
    '  if (k > c.x) return sqrt(h * (n + 1.0 - 2.0 * q.y)) - rb;',
    '  return m - ra;',
    '}',
    'vec2 field(vec2 p){',
    '  vec2 hd = vec2(length(p - uH.xy) - uH.z, uH.z);',
    '  vec2 td = vec2(length(p - uT.xy) - uT.z, uT.z);',
    '  vec2 pa = p - uT.xy; vec2 ba = uH.xy - uT.xy;',
    '  float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);',
    '  float rb = mix(uBr.x, uBr.y, t);',
    '  vec2 br = vec2(length(pa - ba * t) - rb, rb);',
    '  vec2 res = smin(smin(hd, td, 14.0), br, 12.0);',
    '  float r;',
    '  if (uBumpR.x > 0.01) {',
    '    float db = cone(p, uBump.xy, uBump.zw, uBumpR.x, uBumpR.y, r);',
    '    res = smin(res, vec2(db, r), 11.0);',
    '  }',
    '  for (int k = 0; k < ' + MSPK + '; k++) {',
    '    if (uSpkR[k].y < 0.5) continue;',
    '    float d = cone(p, uSpk[k].xy, uSpk[k].zw, uSpkR[k].x, 0.35, r);',
    '    res = smin(res, vec2(d, r + 1.0), 3.5);',
    '  }',
    '  for (int k = 0; k < ' + MDROP + '; k++) {',
    '    if (uDrop[k].w < 0.5) continue;',
    '    res = smin(res, vec2(length(p - uDrop[k].xy) - uDrop[k].z, uDrop[k].z), 5.0);',
    '  }',
    '  return res;',
    '}',
    'float dist(vec2 p){ return field(p).x; }',
    'float env(vec3 R){',
    '  float up = -R.y; float e = 0.02;',
    '  e += smoothstep(0.3, 0.5, up) * smoothstep(0.75, 0.55, up) * smoothstep(0.8, 0.5, abs(R.x)) * 2.6;',
    '  e += smoothstep(0.8, 0.95, up) * 0.6;',
    '  e += smoothstep(-0.5, -0.7, R.x) * smoothstep(0.5, 0.25, abs(R.y)) * 1.1;',
    '  e += smoothstep(0.6, 0.85, R.x) * smoothstep(0.6, 0.2, abs(R.y)) * 0.5;',
    '  e += smoothstep(0.25, 0.7, R.y) * 1.25;',
    '  return e;',
    '}',
    'void main(){',
    '  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;',
    '  vec2 f = field(p); float d = f.x;',
    '  float aa = clamp(0.5 - d * uDpr, 0.0, 1.0);',
    '  if (aa <= 0.0) { gl_FragColor = vec4(0.0); return; }',
    '  float B = max(f.y, 0.8);',
    '  float s = clamp(-d, 0.0, B);',
    '  float z = sqrt(max(1e-3, s * (2.0 * B - s)));',
    '  float slope = min((B - s) / z, 6.0);',
    '  float e = 0.5;',
    '  vec2 g = vec2(dist(p + vec2(e, 0.0)) - d, dist(p + vec2(0.0, e)) - d);',
    '  g = length(g) > 1e-6 ? normalize(g) : vec2(0.0);',
    '  vec3 n = normalize(vec3(g * slope, 1.0));',
    '  vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);',
    '  float fres = 0.05 + 0.95 * pow(1.0 - max(n.z, 0.0), 3.0);',
    '  vec3 col = uBase + min(env(R) * fres, 1.0) * uShine;',
    '  col += pow(max(dot(R, normalize(vec3(-0.35, -0.75, 0.56))), 0.0), 70.0) * 1.2;',
    '  col += pow(max(dot(R, normalize(vec3(0.55, -0.35, 0.76))), 0.0), 140.0) * 0.55;',
    '  gl_FragColor = vec4(col * aa, aa);',
    '}'
  ].join('\n');

  var R0 = 22;               // 버튼 반지름 (44px 원형 버튼)
  var STRETCH = 0.55;        // 늘어남 정도 0~1 (꼬리가 늦게 따라올수록 길게 늘어난다)
  var OX = 26, OY = 8;       // 캔버스를 레일 묶음보다 넓게 깔아 혹·가시·방울이 바깥으로 나갈 수 있게 한다
  var cv = null, gl = null, prog = null, U = {};
  var nav = null, probe = null;
  var head = { y: 0, v: 0 }, tail = { y: 0, v: 0 };
  var target = 0, cx = 0, w = 0, h = 0, dpr = 1, shown = false, wasMoving = false;
  var base = [0.01, 0.01, 0.012], shine = [0.93, 0.94, 0.97];
  var raf = 0, last = 0, dirty = true;
  // 커서 쪽으로 부풀기: 방향(dx, dy)과 길이(len)를 용수철로 따라간다
  var ptr = { x: -999, y: -999, near: false };
  var reach = { len: 0, v: 0, dx: 1, dy: 0 };
  var spikes = [], drops = [];
  var spk = new Float32Array(MSPK * 4), spkR = new Float32Array(MSPK * 4), drp = new Float32Array(MDROP * 4);
  var api = { ok: true, onFail: null };

  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  function fail() {
    api.ok = false;
    cancelAnimationFrame(raf); raf = 0;
    if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
    cv = null;
    if (typeof api.onFail === 'function') api.onFail();
  }

  function setup(navEl) {
    nav = navEl;
    cv = document.createElement('canvas');
    cv.className = 'rail-goo';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.left = -OX + 'px'; cv.style.top = -OY + 'px';
    nav.insertBefore(cv, nav.firstChild);
    gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) return fail();
    function sh(t, src) { var o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return o; }
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return fail();
    gl.useProgram(prog);
    ['uRes', 'uDpr', 'uH', 'uT', 'uBr', 'uBump', 'uBumpR', 'uSpk', 'uSpkR', 'uDrop', 'uBase', 'uShine']
      .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var a = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fail(); });
    probe = document.createElement('span');
    probe.style.display = 'none';
    nav.appendChild(probe);
    // 선택색이 바뀌는 순간(팔레트·테마)에 다시 칠한다
    if (window.MutationObserver) {
      new MutationObserver(function () { readColors(); dirty = true; kick(); })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme', 'data-glass', 'data-bgstyle'] });
    }
    // 마우스가 선택된 물방울 근처에 오면 그쪽으로 부푼다 (레일 오른쪽 150px · 위아래 60px 안)
    document.addEventListener('pointermove', function (e) {
      if (!cv || e.pointerType === 'touch') return;
      var r = nav.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
      var near = e.clientX > r.left - 30 && e.clientX < r.right + 150 && e.clientY > r.top - 60 && e.clientY < r.bottom + 60;
      if (near || ptr.near) { ptr.near = near; kick(); }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { ptr.near = false; kick(); });
  }

  // --goo-color 를 실제 색(rgb)으로 읽는다. var() 나 color-mix() 여도 브라우저가 계산한 값을 쓴다
  function readColors() {
    if (!probe) return;
    var raw = getComputedStyle(nav).getPropertyValue('--goo-color').trim();
    if (!raw) return;
    probe.style.color = raw;
    var m = /rgba?\(([^)]*)\)/.exec(getComputedStyle(probe).color);
    if (!m) return;
    var p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    if (p.length < 3) return;
    base = [p[0] / 255, p[1] / 255, p[2] / 255];
    // 어두운 색이면 흰 빛이 많이 비치고, 밝은 색이면 빛이 덜 더해진다 (넘치지 않게)
    var lum = 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2];
    var k = lum < 0.5 ? 1 : 0.45;
    shine = [0.93 * k, 0.94 * k, 0.97 * k];
  }

  function fit() {
    if (!cv) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = nav.clientWidth; h = nav.clientHeight;
    cv.style.width = (w + OX * 2) + 'px'; cv.style.height = (h + OY * 2) + 'px';
    cv.width = Math.max(1, Math.round((w + OX * 2) * dpr));
    cv.height = Math.max(1, Math.round((h + OY * 2) * dpr));
    gl.viewport(0, 0, cv.width, cv.height);
    dirty = true;
  }

  // 출발할 때 꼬리 쪽에서 방울이 옆으로 튄다
  function spawnDrops(fromY, toY) {
    var dir = toY > fromY ? 1 : -1;
    var n = Math.min(MDROP, 2 + Math.round(Math.abs(toY - fromY) / 120));
    for (var k = 0; k < n; k++) {
      var side = k % 2 ? 1 : -1;
      drops.push({
        x: cx + side * 12, y: fromY - dir * (4 + k * 10),
        vx: side * (46 + Math.random() * 46), vy: dir * (30 + Math.random() * 60) * 0.5,
        r: 2.2 + Math.random() * 1.8, age: 0
      });
    }
    while (drops.length > MDROP) drops.shift();
  }
  // 도착하면 몸에서 가시가 돋았다 가라앉는다
  function spawnSpikes() {
    spikes = [];
    for (var k = 0; k < 3; k++) {
      var side = k === 1 ? 1 : (k === 0 ? -1 : (Math.random() < 0.5 ? -1 : 1));
      spikes.push({
        ang: (side > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.1 + (k - 1) * 0.25,
        len: 15 + Math.random() * 9, age: 0, life: 0.55 + Math.random() * 0.25
      });
    }
  }

  function step(dt) {
    // 머리는 빠르고 살짝 튕기고, 꼬리는 느리고 더 크게 튕긴다
    var kH = 320, cH = 2 * 0.66 * Math.sqrt(kH);
    var kT = 230 - 190 * STRETCH, cT = 2 * 0.52 * Math.sqrt(kT);
    head.v += (kH * (target - head.y) - cH * head.v) * dt;
    head.y += head.v * dt;
    tail.v += (kT * (target - tail.y) - cT * tail.v) * dt;
    tail.y += tail.v * dt;

    // 도착 순간에 가시를 한 번 돋운다
    var moving = Math.abs(head.y - target) > 3 || Math.abs(tail.y - target) > 3;
    if (wasMoving && !moving) spawnSpikes();
    wasMoving = moving;

    // 커서 쪽 부풀기 (이동 중에는 접는다)
    var dx = ptr.x - cx, dy = ptr.y - head.y, d = Math.hypot(dx, dy), want = 0;
    if (ptr.near && !moving) {
      want = Math.max(0, Math.min(1, (130 - d) / 100)) * 15;   // 가까울수록 길게 (최대 15px)
      if (d > 1) { var k = 1 - Math.exp(-dt * 14); reach.dx += (dx / d - reach.dx) * k; reach.dy += (dy / d - reach.dy) * k; }
    }
    reach.v += (170 * (want - reach.len) - 13 * reach.v) * dt;   // 살짝 튕기는 용수철
    reach.len += reach.v * dt;
    if (reach.len < 0) { reach.len = 0; reach.v = 0; }

    for (var i = spikes.length - 1; i >= 0; i--) { spikes[i].age += dt; if (spikes[i].age > spikes[i].life) spikes.splice(i, 1); }
    for (var j = drops.length - 1; j >= 0; j--) {
      var q = drops[j]; q.age += dt;
      q.vx *= Math.exp(-dt * 2.4); q.vy *= Math.exp(-dt * 2.4);
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.r *= Math.exp(-dt * 1.7);
      if (q.age > 0.75 || q.r < 0.5) drops.splice(j, 1);
    }
  }

  function atRest() {
    return Math.abs(head.y - target) < 0.02 && Math.abs(tail.y - target) < 0.02 &&
           Math.abs(head.v) < 0.05 && Math.abs(tail.v) < 0.05 &&
           reach.len < 0.05 && Math.abs(reach.v) < 0.05 && !spikes.length && !drops.length && !ptr.near;
  }

  function render() {
    var dist = Math.abs(head.y - tail.y);
    var s = Math.min(1, dist / (R0 * 5));
    var rh = R0 * (1 + 0.07 * s);
    var rt = R0 * (1 - 0.34 * s * (0.4 + STRETCH));
    var neck = 0.88 - (0.30 + 0.55 * STRETCH) * s;       // 늘어날수록 가운데가 홀쭉해진다
    var X = cx + OX, hy = head.y + OY, ty = tail.y + OY;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, cv.width, cv.height);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform3f(U.uH, X, hy, rh);
    gl.uniform3f(U.uT, X, ty, rt);
    gl.uniform2f(U.uBr, Math.max(2.2, rt * neck), Math.max(2.2, rh * neck));

    var L = reach.len;
    if (L > 0.3) {
      var tipD = rh - 5 + L;
      gl.uniform4f(U.uBump, X, hy, X + reach.dx * tipD, hy + reach.dy * tipD);
      gl.uniform2f(U.uBumpR, rh * 0.62, 5.5 + L * 0.12);
    } else { gl.uniform4f(U.uBump, 0, 0, 0, 0); gl.uniform2f(U.uBumpR, 0, 0); }

    spk.fill(0); spkR.fill(0);
    spikes.forEach(function (sp, k) {
      if (k >= MSPK) return;
      var p = sp.age / sp.life;
      // 빠르게 솟았다가 천천히 가라앉는다
      var up = p < 0.2 ? 1 - Math.pow(1 - p / 0.2, 3) : Math.max(0, 1 - (p - 0.2) / 0.8);
      var len = sp.len * (p < 0.2 ? up : up * up * (3 - 2 * up));
      var bx = X + Math.cos(sp.ang) * (rh - 6), by = hy + Math.sin(sp.ang) * (rh - 6);
      var a = sp.ang + Math.sin(sp.age * 16) * Math.exp(-sp.age * 3) * 0.25;
      spk[k * 4] = bx; spk[k * 4 + 1] = by;
      spk[k * 4 + 2] = bx + Math.cos(a) * len; spk[k * 4 + 3] = by + Math.sin(a) * len;
      spkR[k * 4] = 2.7 * Math.min(1, up + 0.25); spkR[k * 4 + 1] = len > 0.6 ? 1 : 0;
    });
    drp.fill(0);
    drops.forEach(function (d, k) {
      if (k >= MDROP) return;
      drp[k * 4] = d.x + OX; drp[k * 4 + 1] = d.y + OY; drp[k * 4 + 2] = d.r; drp[k * 4 + 3] = 1;
    });
    gl.uniform4fv(U.uSpk, spk); gl.uniform4fv(U.uSpkR, spkR); gl.uniform4fv(U.uDrop, drp);
    gl.uniform3fv(U.uBase, base);
    gl.uniform3fv(U.uShine, shine);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame(now) {
    raf = 0;
    if (!cv) return;
    var dt = last ? Math.min(0.033, (now - last) / 1000) : 0;
    last = now;
    if (reducedMotion()) {
      head.y = tail.y = target; head.v = tail.v = 0; spikes = []; drops = []; reach.len = 0; reach.v = 0; dirty = true;
    } else if (!atRest()) {
      for (var i = 0; i < 4; i++) step(dt / 4);
      dirty = true;
    }
    if (dirty) { render(); dirty = false; }
    // 가만히 있을 때는 돌지 않는다 (움직임이나 커서 반응이 남아 있을 때만 이어서 그린다)
    if (!atRest() && !reducedMotion()) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  function kick() { if (cv && !raf) raf = requestAnimationFrame(frame); }

  /**
   * 선택된 버튼 자리로 물방울을 옮긴다.
   * @param {HTMLElement} navEl #railNav
   * @param {HTMLElement} btn   선택된 .tab-btn
   * @param {boolean} animate   false 이거나 줄여 보기 설정이면 바로 이동
   * @returns {boolean} 그릴 수 있으면 true (false 면 호출한 쪽이 CSS 알약을 쓴다)
   */
  api.move = function (navEl, btn, animate) {
    if (!api.ok) return false;
    if (!cv) setup(navEl);
    if (!api.ok) return false;
    if (w !== nav.clientWidth || h !== nav.clientHeight || !shown) fit();
    readColors();
    var prevTarget = target;
    cx = btn.offsetLeft + btn.offsetWidth / 2;
    target = btn.offsetTop + btn.offsetHeight / 2;
    R0 = btn.offsetWidth / 2;
    if (!animate || !shown || reducedMotion()) {
      head.y = tail.y = target; head.v = tail.v = 0; spikes = []; drops = []; wasMoving = false;
    } else if (target !== prevTarget) {
      spawnDrops(head.y, target);
    }
    shown = true;
    dirty = true;
    kick();
    return true;
  };

  api.hide = function () {
    shown = false;
    spikes = []; drops = []; reach.len = 0; reach.v = 0;
    if (cv) { cancelAnimationFrame(raf); raf = 0; gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
  };

  window.RailGoo = api;
})();
