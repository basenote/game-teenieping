# 1차 음성 후보 정리

기준일: 2026-05-04

## 공통 기준

- 공식 채널 우선
- 캐릭터 단독 발화 가능성 우선
- 1~2초 내외 대표 대사 추출 목표

## 공식 채널 확인

- `티니핑TV` 공식 유튜브 핸들: `@teeniepingtv`
- 확인 근거: [유튜브 결과 예시](https://www.youtube.com/watch?v=kgbcWkUJe1E)
  - 해당 영상 설명에 `티니핑TV(KR) / @teeniepingtv` 표기 확인

## 샘플 10개 후보

### 시즌1 로열

- 하츄핑
  - 1차 후보: [포밍플레이] 티니핑 친구들의 노래자랑
  - URL: [https://www.youtube.com/watch?v=H6BdQrh72xo](https://www.youtube.com/watch?v=H6BdQrh72xo)
  - 이유: 설명에 `하츄핑, 바로핑, 라라핑`이 함께 등장한다고 명시

- 바로핑
  - 1차 후보: [포밍플레이] 티니핑 친구들의 노래자랑
  - URL: [https://www.youtube.com/watch?v=H6BdQrh72xo](https://www.youtube.com/watch?v=H6BdQrh72xo)
  - 이유: 설명에 등장 캐릭터 명시

- 라라핑
  - 1차 후보: [포밍플레이] 티니핑 친구들의 노래자랑
  - URL: [https://www.youtube.com/watch?v=H6BdQrh72xo](https://www.youtube.com/watch?v=H6BdQrh72xo)
  - 이유: 설명에 등장 캐릭터 명시

### 시즌2~5 변형 하츄핑 계열

- 다이아 하츄핑
  - 1차 후보: 티니핑TV 공식 채널 시즌2 본편/티니핑쇼
  - 채널: [https://www.youtube.com/@teeniepingtv](https://www.youtube.com/@teeniepingtv)
  - 메모: 시즌2 공개분에서 단독 대사 구간 탐색 필요

- 플로라 하츄핑
  - 1차 후보: 티니핑TV 공식 채널 시즌3 본편/티니핑쇼
  - 채널: [https://www.youtube.com/@teeniepingtv](https://www.youtube.com/@teeniepingtv)
  - 메모: 시즌3 공개분에서 단독 대사 구간 탐색 필요

- 베리 하츄핑
  - 1차 후보: 시즌4 음악/티니핑쇼/본편 공개분
  - 채널: [https://www.youtube.com/@teeniepingtv](https://www.youtube.com/@teeniepingtv)
  - 보조 단서: [새콤달콤 캐치! 티니핑 검색 결과](https://music.youtube.com/search?q=%23%EC%83%88%EC%BD%A4%EB%8B%AC%EC%BD%A4%EC%BA%90%EC%B9%98%ED%8B%B0%EB%8B%88%ED%95%91)

- 스타 하츄핑
  - 1차 후보: 시즌5 본편/티니핑쇼 공개분
  - 채널: [https://www.youtube.com/@teeniepingtv](https://www.youtube.com/@teeniepingtv)
  - 메모: 시즌5 첫 공개분 및 캐릭터 하이라이트 탐색 필요

### 시즌5 로열

- 빛나핑
  - 1차 후보: 가스안전송
  - 근거 기사: [파이낸셜뉴스 2025-06-09](https://www.fnnews.com/news/202506091037124205)
  - 기사상 출연 캐릭터: `하츄핑, 빛나핑, 초롱핑, 반짝핑`
  - 채널: [https://www.youtube.com/@teeniepingtv](https://www.youtube.com/@teeniepingtv)

- 초롱핑
  - 1차 후보: 가스안전송
  - 근거 기사: [파이낸셜뉴스 2025-06-09](https://www.fnnews.com/news/202506091037124205)
  - 채널: [https://www.youtube.com/@teeniepingtv](https://www.youtube.com/@teeniepingtv)

### 시즌6 로열

- 프린세스 하츄핑
  - 1차 후보: `프린세스 캐치! 티니핑` 티니핑쇼 첫 공개분
  - 근거 기사: [아시아경제 2025-10-27](https://cm.asiae.co.kr/article/2025102708460429005)
  - 기사 기준 공개일: `2025-10-30`
  - 채널: [https://www.youtube.com/@teeniepingtv](https://www.youtube.com/@teeniepingtv)

## 다음 실무 단계

1. 위 후보 링크를 열어 캐릭터별 발화 구간 타임코드 기록
2. `data/manual/voice-sources.json`의 `segmentStart`, `segmentEnd`, `speakerText` 채우기
3. mp3 추출 후 `web/assets/audio/voices/<character-id>.mp3`로 저장
4. 브라우저에서 실제 재생 검증
