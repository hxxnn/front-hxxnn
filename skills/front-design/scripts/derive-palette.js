#!/usr/bin/env node
/*
 * 팔레트 도출 + 대비 검사.
 * 배경색과 강조색(포인트 색) 두 가지만 주면 카드, 글자, 보조 글자, 면 색을 계산해서
 * CSS 변수로 출력하고, 대비 기준을 통과하는지 검사한다. 의존성 없음.
 *
 * 사용법
 *   node derive-palette.js --bg "#0B161B" --accent "#34D1B2"            # 배경 밝기로 다크/라이트 자동 판단
 *   node derive-palette.js --bg "#EFF5F4" --accent "#0A7D69" --mode light
 *   node derive-palette.js --bg "#0B161B" --accent "#34D1B2" --json     # JSON으로 출력
 * 다크와 라이트를 모두 쓰면 모드마다 한 번씩 실행한다(강조색은 같아도 되고 다르게 줘도 된다).
 * 종료 코드: 0 = 모두 통과, 1 = 실패 항목 있음.
 */
'use strict';

function arg(name, fallback) {
  var i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : fallback;
}
function flag(name) { return process.argv.indexOf('--' + name) > -1; }

function hex2rgb(h) {
  h = String(h).replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error('색 값이 올바르지 않아요: ' + h);
  var n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb2hex(c) {
  return '#' + c.map(function (v) { return Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'); }).join('').toUpperCase();
}
function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
function contrast(a, b) {
  var la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function mix(a, b, t) { return [0, 1, 2].map(function (i) { return a[i] * (1 - t) + b[i] * t; }); }
function blend(fg, alpha, bg) { return mix(bg, fg, alpha); }
function rgba(c, a) { return 'rgba(' + c.map(Math.round).join(', ') + ', ' + (Math.round(a * 100) / 100) + ')'; }
function r2(x) { return Math.round(x * 100) / 100; }

var WHITE = [255, 255, 255], BLACK = [0, 0, 0];
var bg = hex2rgb(arg('bg', ''));
var accent = hex2rgb(arg('accent', ''));
var mode = arg('mode', lum(bg) < 0.25 ? 'dark' : 'light');
if (mode !== 'dark' && mode !== 'light') throw new Error('--mode 는 dark 또는 light 여야 해요.');
var dark = mode === 'dark';

/* 글자색: 배경에서 흰색(다크) 또는 검정(라이트) 쪽으로, 대비 12:1 이상이 되는 가장 약한 지점 */
var toward = dark ? WHITE : BLACK;
var ink = mix(bg, toward, 0.9);
for (var t = 0.9; t <= 1.0001; t += 0.01) { ink = mix(bg, toward, t); if (contrast(ink, bg) >= 12) break; }

/* 카드(평평한 반투명 면): 배경보다 "약간" 대비. 다크는 흰색을 얹고, 라이트는 흰색을 얹는다 */
var cardAlpha = dark ? 0.07 : 0.66;
var cardEff = blend(WHITE, cardAlpha, bg);
var minRatio = dark ? 1.10 : 1.04;
while (contrast(cardEff, bg) < minRatio && cardAlpha < (dark ? 0.16 : 0.9)) {
  cardAlpha += 0.01;
  cardEff = blend(WHITE, cardAlpha, bg);
}

/* 보조 글자: 카드 위에서 4.5:1 이상이 되는 가장 약한 투명도 */
function minAlpha(start, target, onColor) {
  var a = start, c = blend(ink, a, onColor);
  while (contrast(c, onColor) < target && a < 1) { a += 0.02; c = blend(ink, a, onColor); }
  return Math.round(a * 100) / 100;
}
var ink2 = minAlpha(0.74, 4.5, cardEff);
var ink3 = minAlpha(0.56, 4.5, cardEff);

/* 면 색 */
var well = dark ? rgba(WHITE, 0.07) : rgba(ink, 0.05);
var well2 = dark ? rgba(WHITE, 0.12) : rgba(ink, 0.09);
var grid = dark ? rgba(WHITE, 0.10) : rgba(ink, 0.10);
var edge = dark ? rgba(WHITE, 0.14) : rgba(ink, 0.09);

/* 강조색: 채운 면 위의 글자색, 글자로 쓸 때의 색, 막대·아이콘 대비 */
var darkOn = mix(bg, BLACK, 0.55);
var onAccent = contrast(WHITE, accent) >= contrast(darkOn, accent) ? WHITE : darkOn;
var accentText = accent.slice();
for (var s = 0; s <= 1.0001 && contrast(accentText, cardEff) < 4.5; s += 0.04) accentText = mix(accent, toward, s);

/* 배경 그라데이션(도형 없이 단일 그라데이션) */
var gradTop = dark ? mix(bg, WHITE, 0.06) : mix(bg, BLACK, 0.03);
var gradBottom = dark ? mix(bg, BLACK, 0.12) : mix(bg, WHITE, 0.35);

var checks = [
  ['글자 / 배경', contrast(ink, bg), 7],
  ['글자 / 카드', contrast(ink, cardEff), 7],
  ['보조 글자(ink-2) / 카드', contrast(blend(ink, ink2, cardEff), cardEff), 4.5],
  ['보조 글자(ink-3) / 카드', contrast(blend(ink, ink3, cardEff), cardEff), 4.5],
  ['카드 / 배경 (면의 구분)', contrast(cardEff, bg), minRatio],
  ['강조색 채움 위 글자', contrast(onAccent, accent), 4.5],
  ['강조색 글자 / 카드', contrast(accentText, cardEff), 4.5],
  ['강조색 막대·아이콘 / 카드', contrast(accent, cardEff), 3]
].map(function (c) { return { name: c[0], ratio: r2(c[1]), need: c[2], pass: c[1] + 0.005 >= c[2] }; });

var tokens = {
  '--bg-grad': 'linear-gradient(165deg, ' + rgb2hex(gradTop) + ' 0%, ' + rgb2hex(bg) + ' 55%, ' + rgb2hex(gradBottom) + ' 100%)',
  '--ink': rgb2hex(ink),
  '--ink-2': rgba(ink, ink2),
  '--ink-3': rgba(ink, ink3),
  '--accent': rgb2hex(accent),
  '--accent-text': rgb2hex(accentText),
  '--on-accent': rgb2hex(onAccent),
  '--strong': rgb2hex(ink),
  '--on-strong': rgb2hex(bg),
  '--card': rgba(WHITE, cardAlpha),
  '--well': well,
  '--well-2': well2,
  '--grid': grid,
  '--edge': edge,
  '--solid': rgb2hex(blend(WHITE, dark ? 0.09 : 0.85, bg))
};

if (flag('json')) {
  console.log(JSON.stringify({ mode: mode, tokens: tokens, checks: checks }, null, 2));
} else {
  console.log('/* ' + mode + ' 모드 (bg ' + rgb2hex(bg) + ', accent ' + rgb2hex(accent) + ') */');
  console.log(dark ? ':root {' : ':root[data-theme="light"] {');
  Object.keys(tokens).forEach(function (k) { console.log('  ' + k + ': ' + tokens[k] + ';'); });
  console.log('}\n');
  console.log('대비 검사');
  checks.forEach(function (c) {
    console.log('  ' + (c.pass ? 'PASS' : 'FAIL') + '  ' + c.name + ': ' + c.ratio + ':1 (기준 ' + c.need + ':1)');
  });
}
process.exit(checks.every(function (c) { return c.pass; }) ? 0 : 1);
