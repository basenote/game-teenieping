# 수동 이미지 확정 워크플로우

## 목적

- 자동 다운로드가 불안정할 때 대표 티니핑 이미지를 수동으로 먼저 확정한다.
- 게임은 로컬 이미지가 있으면 그것을 우선 사용하고, 없으면 플레이스홀더 SVG를 사용한다.

## 현재 연결 구조

- 게임 데이터 생성 스크립트는 `web/assets/images/characters/` 폴더를 먼저 확인한다.
- 파일명이 `캐릭터 id`로 시작하면 자동으로 해당 이미지를 연결한다.

예시

- `web/assets/images/characters/s1-hachu.png`
- `web/assets/images/characters/s5-bitna.webp`

## 작업 순서

1. [data/manual/manual-image-checklist.json](/Users/basenote/MYWORKS/2026/0.%20INBOX/20260503-%E1%84%90%E1%85%B5%E1%84%82%E1%85%B5%E1%84%91%E1%85%B5%E1%86%BC%20%E1%84%8F%E1%85%B1%E1%84%8C%E1%85%B3%20%E1%84%89%E1%85%A5%E1%84%87%E1%85%B5%E1%84%89%E1%85%B3%20%E1%84%80%E1%85%A2%E1%84%87%E1%85%A1%E1%86%AF/data/manual/manual-image-checklist.json)에서 캐릭터와 목표 파일명을 확인한다.
2. 원본 후보 이미지를 확인한다.
3. 브라우저에서 이미지를 내려받은 뒤 파일명을 캐릭터 이름 그대로 둔다.
4. 그 파일을 프로젝트 루트 또는 `data/manual/imports/`에 둔다.
5. `node scripts/import_manual_images.mjs`를 실행한다.
6. `node scripts/build_dataset.mjs`를 다시 실행한다.
7. 브라우저 새로고침으로 반영 여부를 확인한다.

## 현재 추천 수동 확정 대상

- 하츄핑
- 바로핑
- 라라핑
- 빛나핑
- 초롱핑
- 프린세스 하츄핑

## 확인 포인트

- 배경이 너무 복잡하지 않은지
- 캐릭터가 중앙에 충분히 크게 보이는지
- 문제 화면에서 이름이 이미지에 직접 적혀 있지 않은지
- 저해상도 확대 깨짐이 심하지 않은지

## 파일명 규칙

- `하츄핑.webp`
- `바로핑.png`
- `빛나핑.jpg`

이렇게 캐릭터 한글 이름으로 저장해 두면 import 스크립트가 자동으로 `캐릭터 id` 기반 자산명으로 복사한다.
