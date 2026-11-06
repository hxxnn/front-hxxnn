# 레일 선택 물방울 (rail-goo)

대시보드 왼쪽 레일에서 선택된 메뉴를 **액체 물방울**로 표시하는 방법이다. support-assistant(Dori)의 사이드바에서 쓰던 방식을 일반화했다. 구현은 `assets/rail-goo.js`(외부 라이브러리 없는 WebGL 한 파일), 쓰는 예는 `assets/dashboard-template.html`의 레일이다.

## 움직임

- **머리와 꼬리 두 방울**을 용수철로 움직인다. 머리는 빠르고 살짝 튕기고, 꼬리는 느리고 더 크게 튕긴다. 둘 사이를 가는 목으로 잇고, 멀리 갈수록 목이 더 홀쭉해진다.
- 한 장의 거리장(SDF)에 부드러운 합집합(smin)으로 그려서, 늘어나고 갈라지고 합쳐지는 모양이 자연스럽다.
- **출발할 때** 꼬리 쪽에서 작은 방울이 옆으로 튄다. **도착하면** 몸에서 가시가 돋았다 가라앉는다.
- **마우스가 레일 가까이**(오른쪽 150px, 위아래 60px 안) 오면 물방울이 그쪽으로 부푼다(최대 15px). 이동 중에는 접는다. 이 마우스 반응은 스킬의 "마우스 효과 금지" 원칙의 **예외**다.
- 가만히 있을 때는 프레임 루프가 멈춘다. 움직임이나 마우스 반응이 남아 있을 때만 돈다.
- `prefers-reduced-motion`이면 움직임 없이 바로 자리를 옮긴다.

## 레일 모양 (CSS)

| 요소 | 값 |
| --- | --- |
| 레일 칸 | 폭 68px, 데스크톱에서 sticky. 바깥 레일 자체에는 유리를 칠하지 않는다 |
| 유리 알약 `.rail-nav` | 모서리 36px, 안쪽 여백 10px 8px, 버튼 간격 6px, `position: relative`, `--goo-color: var(--strong)` |
| 버튼 `.nb` | 44px 원형, `z-index: 1`(물방울 위) |
| 올려 보기 | `translateY(-2px) scale(1.1)`, 눌렀을 때 `scale(.92)`, 선택되지 않은 버튼에만 그림자 |
| 이름 말풍선 | `data-tip`, 오른쪽 14px 띄움, `--strong` 바탕 |
| 주 행동 `.nb.main` | 포인트 색 채움. 선택 표시(강한 중립색)와 겹치지 않게 한다 |
| 900px 미만 | 알약을 풀고(`display: contents`) 바깥 레일이 화면 아래 유리 탭바가 된다. 물방울은 쓰지 않고 선택 버튼이 채워진다 |

## 연결하는 법

```html
<nav class="rail glass" id="rail">
  <div class="rail-nav glass" id="railNav">
    <a class="nb" href="#sec-a" aria-label="요약" data-tip="요약">…</a>
    …
  </div>
  <span class="sp"></span>
  <button class="nb" aria-label="색상 설정" data-tip="색상 설정">…</button>
</nav>
<script src="rail-goo.js"></script>
```

```css
.rail-goo { display: none; position: absolute; pointer-events: none; z-index: 0; }
@media (min-width: 900px) { .rail-goo { display: block; } }
.rail-nav.goo-on .nb.active { background: none; }              /* 물방울이 대신 칠한다 */
.nb.active, .nb.active:hover { background: var(--strong); color: var(--on-strong); }   /* 물방울이 없을 때와 물방울 위 아이콘 색 */
```

```js
function gooMove(animate) {
  var btn = navEl.querySelector('.nb.active'), G = window.RailGoo;
  if (G && btn && matchMedia('(min-width: 900px)').matches && G.move(navEl, btn, animate)) { navEl.classList.add('goo-on'); return; }
  navEl.classList.remove('goo-on');
  if (G) G.hide();
}
RailGoo.onFail = function () { gooMove(false); };   // WebGL 이 꺼지면 채움색으로 돌아간다
```

- 선택 항목을 바꿀 때마다 `gooMove(true)`, 처음 그릴 때와 창 크기가 바뀔 때는 `gooMove(false)`.
- **스크롤을 따라 구역을 표시**하려면 화면 위에서 35% 지점을 지나간 마지막 구역을 활성으로 한다. 맨 아래까지 내려가면 마지막 구역. 링크를 눌러 부드럽게 스크롤하는 동안(약 0.9초)은 스크롤 반응을 잠가, 지나가는 구역마다 물방울이 튀지 않게 한다. 템플릿의 `railSpy`가 이 구현이다.

## 요구 사항과 주의

- 버튼은 `navEl`의 **직접 자식**이고 가로 가운데에 놓인 **원형**(폭 = 높이)이어야 한다. 위치는 `offsetLeft`/`offsetTop`으로 읽는다.
- 색은 `navEl`에서 계산되는 CSS 변수 **`--goo-color`**(var(), color-mix() 가능)를 읽는다. 팔레트나 테마가 바뀌면(`<html>`의 `style`, `data-theme` 속성 변화) 다시 칠한다. 밝은 물방울이면 빛 반사를 줄이고, 어두운 물방울이면 늘린다.
- 물방울 위 아이콘은 **`--on-strong`** 같이 물방울색 위에서 4.5 : 1 이상 읽히는 색이어야 한다.
- 캔버스는 레일 알약보다 사방으로 조금 넓게(좌우 26px, 위아래 8px) 깔린다. 혹·가시·방울이 알약 밖으로 나갈 수 있게 하려는 것이고, 이 크기와 위치는 `rail-goo.js`가 직접 정한다. 알약에 `overflow: hidden`을 걸지 않는다.
- WebGL 컨텍스트를 잃거나 만들지 못하면 `RailGoo.ok`가 `false`가 되고 `onFail`이 불린다.
- `rail-goo.js`는 `assets/`에서 사용하는 쪽 폴더로 **같이 복사**한다. 템플릿만 복사하면 물방울 없이 채움색으로 동작한다.
