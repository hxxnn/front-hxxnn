# 대시보드 위젯 구성 가이드 (CONFIG)

`assets/dashboard-template.html`의 안쪽 구성을 **사용자의 데이터에 맞게** 정하는 방법이다. 틀(레일과 물방울, 상단 바, 큰 유리 패널, 색상 설정 패널, 처음 열 때의 순차 등장)은 고정이고, 패널 안의 **위젯의 종류·개수·너비**는 데이터가 정한다. 위젯은 카드일 필요가 없다. 지표 줄이나 표처럼 카드 없이 패널 위에 바로 놓아도 된다.

## 1. 순서: 데이터 먼저, 위젯은 나중

1. 사용자의 데이터를 **무엇을 알려 주는가**로 나눈다. 대표 숫자 하나, 보조 지표 몇 개, 시간에 따른 변화, 목표 대비 진행, 항목 목록, 구성 비율, 한마디 요약.
2. 아래 표로 위젯 종류를 고른다. **데이터에 없는 위젯은 만들지 않는다.** (목표가 없으면 진행률 위젯을 넣지 않는다.)
3. 너비(`span`)를 정하고, 한 줄이 12칸을 채우도록 맞춘다.
4. 레일 메뉴(`nav`)는 사용자가 이동하고 싶은 구역에만 붙인다(3~6개).
5. 예시 데이터는 화면에 "예시"라고 표시한다.

## 2. 데이터 → 위젯

| 알려 주려는 것 | 위젯 | 메모 |
| --- | --- | --- |
| 가장 중요한 숫자 하나 | `hero` | 화면에 하나만. 48px 이상. 보조 지표 1~3개, 버튼 0~2개 |
| 같은 성격의 지표 여러 개 | `stats` | 지표 개수에 맞춰 한 줄에 균형 있게 놓인다. 미니 추이선(`spark`) 가능 |
| 시간에 따른 변화 | `chart` | `kind: 'bar'`(막대, 구간 비교) / `'line'`(선, 흐름). 시리즈 1~3개 |
| 목표 대비 진행 | `progress` | 막대 1개 이상. 입력 가능(`editable`). 상단 알약에 연결(`pill`) |
| 항목이 많은 기록 | `table` | 열을 설정으로 정한다. 검색·필터는 선택 |
| 순위, 구성 | `list` | 가장 큰 항목만 강조색, 나머지는 옅은 색 |
| 해석·안내 한 문장 | `callout` | 굵게 `**...**` 가능 |

## 3. 너비(`span`, 12칸 기준)와 배치

| 조합 | 예 |
| --- | --- |
| 4 + 8 | 핵심 수치 + 추이 차트 |
| 5 + 7, 6 + 6 | 두 위젯이 비슷한 비중 |
| 4 + 4 + 4 | 지표 위젯 세 개 |
| 12 | 표, 안내 문장, 지표 줄처럼 가로로 긴 것 |

- 위젯은 위에서부터 차례로 빈칸 없이 채워지고, 같은 줄의 위젯은 높이가 맞춰진다. **높이가 크게 다른 위젯을 한 줄에 놓지 않는다**(한쪽에 빈 공간이 생긴다). 카드 없는 지표 줄(`card: false`)은 옆 위젯과 세로 가운데로 정렬된다.
- 1000px 미만에서는 span 7 이상은 한 줄 전체, 6 이하는 반 줄로 바뀌고, 640px 미만에서는 모두 한 줄로 쌓인다.
- **개수는 정해져 있지 않다.** 다만 화면 하나에 3~8개를 권장하고, 더 늘리고 싶으면 기존 위젯에 합칠 수 있는지 먼저 본다(예: 지표 두 개 → `stats` 하나).

## 4. CONFIG 스키마

```js
var CONFIG = {
  meta: { title, paletteKey, defaultPalette },   // 탭 제목, 색 저장 키, 주제의 기본 색
  greetingSub: '...',                            // 인사말 아래 한 줄 (greeting 으로 인사말 자체도 바꿀 수 있다)
  topbar: { left: 'date' | '문구', pill: { text, href, tone: 'alert' } },   // pill 은 없어도 된다
  primaryAction: { label, icon, href },          // 레일의 채워진 원형 버튼
  nav: [...],                                    // 생략하면 nav 가 있는 위젯에서 자동으로 만든다
  widgets: [ { id, type, span, card, nav: {label, icon}, ...종류별 속성 } ]
};
```

`defaultPalette`는 `{ name: '오렌지', dark: {bg, accent}, light: {bg, accent} }` 형식이고, 색상 패널의 추천 조합 맨 앞에도 들어간다. 값은 `scripts/derive-palette.js`로 먼저 대비를 검사한다.

| 위젯 | 속성 |
| --- | --- |
| `hero` | `label, value, unit, chip, stats:[{label,value,unit,tone:'accent'}], actions:[{label,href,style:'dark'\|'light'}]` |
| `stats` | `title, items:[{label,value,unit,sub,icon,tone:'accent',spark:[숫자...]}]` |
| `chart` | `title, subtitle, kind, series:[{name,values}], labels, axis:{unit,compact:'ko'\|'none'\|{size,label},max,tickUnit}, nowIndex, sampleCount, note` |
| `progress` | `title, items:[{label,current,target,unit,editable,editLabel,storageKey,remaining,over,pill:{text,over}}]` |
| `table` | `title, columns:[{key,label,type:'primary'\|'text'\|'number'\|'badge',align,unit,sign,iconKey,icons,labels}], rows, search:{keys,placeholder}, filter:{key,options}, maxHeight, empty, noMatch` |
| `list` | `title, subtitle, items:[{label,value,unit,sub,icon}], max` |
| `callout` | `title, text` |

- 값(`value`)은 숫자 또는 미리 만든 문자열(`"99.94"`, `"12:30"`)이다. **단위는 지표마다 따로 준다**(`unit`).
- 차트 눈금은 데이터 크기에 맞춰 자동 계산된다(1·2·2.5·5 단위). 원화 같은 큰 수는 `axis.compact: 'ko'`(만·억), 그 밖은 `'none'`.
- 표의 부호(`+`/`−`)는 `sign: true`인 숫자 열에서만 붙고, **값이 음수면 `−`, 양수면 `+`**이다. 부호가 의미 없는 주제는 `sign`을 쓰지 않는다. 행의 `tone: 'accent'`는 그 행의 아이콘·숫자·점을 강조색으로 바꾼다.
- 열 정렬은 기본적으로 글자는 왼쪽, 숫자·배지는 오른쪽이다. 마지막 날짜 열처럼 바꾸고 싶으면 `align`을 준다.
- 아이콘은 템플릿 스프라이트(`<symbol id="i-...">`)에 있는 것만 쓴다. 기본 제공: home, bars, gauge, list, plus, search, down, up, cal, palette, food, transit, shop, fun, etc, wallet, gift, receipt, avg, run, dumbbell, bike, swim, clock, heart, flame, server, cpu, alert, check. 없는 아이콘은 같은 형식으로 스프라이트에 추가한다.

## 5. 색

- 색은 **강조색 1 + 강한 중립 1 + 중립**이다. 차트 시리즈는 강조색 → 강한 중립 → 옅은 중립(`--rest`) 순서로 정해지고, 시리즈는 최대 3개다. 4개 이상이 필요하면 `table`이나 `list`로 바꾸거나 항목을 묶는다.
- 의미 구분은 색보다 아이콘·글자·모양으로 먼저 한다(상태는 점 + 글자).

## 6. 예시

- `examples/dashboard-workout/`: 운동 기록. 위젯 7개, 카드 없는 지표 줄, 선 차트, 순위 목록, 진행률 3개, 안내 문장.
- `examples/dashboard-server/`: 서버 상태. 위젯 5개, 시리즈 3개 막대, 진행률 없음, 부호 없는 표.
- 둘 다 템플릿의 `CONFIG`만 바꿔 만들었다.

## 7. 체크리스트

- 데이터에 없는 위젯을 만들지 않았는가. 위젯 3~8개, 한 줄이 12칸을 채우는가.
- 같은 줄 위젯의 높이가 비슷한가(빈 공간이 크지 않은가).
- 단위가 지표마다 맞는가, 차트 눈금이 데이터 크기에 맞는가.
- 표의 `+`/`−`가 의미 있는 주제에서만 쓰였는가.
- 시리즈가 3개 이하인가, 샘플 값에 "예시" 표시가 있는가.
- `meta.title`, `meta.paletteKey`, `defaultPalette`를 주제에 맞게 바꿨는가.
