# 티니핑 음성 자산 연결 설계

## 목적

- 퀴즈 화면의 `사운드 듣기` 버튼에 실제 캐릭터 음성 클립을 연결한다.
- 정적 HTML 배포 구조를 유지하면서도 로컬 음성 파일 재생이 가능하도록 설계한다.
- 출처 추적, 수동 검수, 교체 가능성을 고려한 메타데이터 구조를 만든다.

## 현재 판단

- 가장 현실적인 경로는 `공식 공개 영상 기반 반자동 수집 + 수동 검수`다.
- 완전 자동 추출은 음질과 정확도 문제가 크다.
- 게임에 넣는 클립은 `1~2초 내외의 짧은 대표 발화`가 적합하다.

## 권장 운영 원칙

- 원본 영상 전체를 게임 자산으로 다루지 않는다.
- 캐릭터별 짧은 음성 클립만 저장한다.
- 모든 클립은 `원본 URL`, `원본 제목`, `추출 시점`, `검수 상태`를 남긴다.
- 음성 자산은 `ready` 상태만 게임에서 활성화한다.

## 대상 자산 단위

캐릭터 1명당 기본 1클립을 권장한다.

- 길이: `0.8 ~ 2.0초`
- 채널: `mono` 또는 `stereo`
- 포맷: `mp3` 또는 `ogg`
- 목표 용도:
  - 이름 맞추기 퀴즈의 `사운드 듣기`
  - 너무 긴 대사는 피하고 캐릭터 인상이 드러나는 짧은 발화 우선

## 폴더 구조

```text
web/
  assets/
    audio/
      voices/
        s1-royal-001.mp3
        s1-royal-002.mp3
        ...

data/
  manual/
    voice-sources.template.json
    voice-review-checklist.md
  processed/
    characters.json
```

## 메타데이터 스키마

`characters.json`의 `voice` 필드를 아래처럼 확장한다.

```json
{
  "voice": {
    "status": "ready",
    "clipPath": "./assets/audio/voices/s1-royal-001.mp3",
    "durationSec": 1.4,
    "sourceType": "youtube-official",
    "sourceTitle": "티니핑TV 시즌 소개 영상",
    "sourceUrl": "https://www.youtube.com/...",
    "speakerText": "내 사랑을 듬뿍듬뿍 줄게~",
    "capturedAt": "2026-05-03",
    "reviewed": true,
    "notes": "배경음 적음, 시작 직후 바로 발화"
  }
}
```

`status` 값

- `ready`
- `missing`
- `needs-review`
- `external-only`
- `blocked`

## 수집 파이프라인

### 1. 원본 후보 수집

- 공식 유튜브 `티니핑TV`
- 공식 캠페인 영상
- 시즌 예고편 / 캐릭터 소개 영상

원본 후보는 `voice-sources.template.json`에 기록한다.

기록 필드:

- 캐릭터 id
- 캐릭터명
- 원본 URL
- 원본 제목
- 후보 시작 시각
- 후보 종료 시각
- 후보 발화 텍스트
- 검수 메모

### 2. 수동 검수

검수 기준:

- 캐릭터 발화가 단독으로 들리는지
- 배경음이 과하지 않은지
- 이름 스포일러가 과도하지 않은지
- 퀴즈용으로 너무 긴 대사가 아닌지

### 3. 클립 추출

권장 규칙:

- 앞뒤 무음 0.05~0.12초
- 클립 길이 최대 2초 전후
- 음량 정규화
- 파일명은 캐릭터 id와 동일하게 유지

예:

- `web/assets/audio/voices/s1-royal-001.mp3`
- `web/assets/audio/voices/s5-legend-001.mp3`

### 4. 게임 연결

- `characters.json`에 `clipPath` 연결
- `voice.status === "ready"`일 때만 재생 버튼 활성화
- 그 외 상태는 `준비 중` 또는 `검수 중` 안내

## UI 동작 규칙

### ready

- 버튼 활성화
- 클릭 시 로컬 파일 재생

### needs-review

- 버튼 비활성화 또는 안내 토스트
- 메시지 예: `이 캐릭터의 음성은 검수 중이에요.`

### missing

- 버튼 비활성화
- 메시지 예: `이 캐릭터의 음성 클립은 아직 없어요.`

### external-only

- 로컬 재생은 하지 않음
- 필요하면 출처 링크만 별도 관리

## 구현 순서

### 1단계

- 설계 문서 확정
- 음성 메타데이터 템플릿 생성
- `voice.status`별 UI 정책 확정

### 2단계

- 샘플 5~10개 캐릭터에 대해 수동 음성 자산 확보
- 로컬 파일 저장
- `characters.json`에 `clipPath` 연결

### 3단계

- `playVoice()`를 `clipPath` 우선 재생 방식으로 정리
- `ready / missing / needs-review` 상태별 토스트 분기 정리

### 4단계

- 원본 후보 목록 관리 스크립트 또는 템플릿 자동화
- 검수 완료분을 점진적으로 확대

## 권장 1차 샘플 대상

우선순위는 인지도 높고 구분이 쉬운 캐릭터다.

- 하츄핑
- 바로핑
- 라라핑
- 다이아 하츄핑
- 플로라 하츄핑
- 베리 하츄핑
- 스타 하츄핑
- 빛나핑
- 초롱핑
- 프린세스 하츄핑

## 위험 요소

- 공개 원본이라도 재배포 범위 판단은 별도 검토가 필요하다.
- 배경음, 효과음, 복수 화자 섞임으로 인해 완전 자동 추출 품질이 낮다.
- 일부 캐릭터는 공개 영상 안에 단독 발화가 거의 없을 수 있다.

## 다음 구현 제안

1. 샘플 10개 캐릭터용 `voice` 메타데이터 틀 추가
2. `web/assets/audio/voices/` 폴더 기준 로컬 재생 연결
3. 버튼 상태를 `ready / missing / needs-review`에 맞게 시각적으로 분리
