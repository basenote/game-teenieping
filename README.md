# 티니핑 이름 맞추기 퀴즈 (game-teenieping)

나무위키 데이터를 기반으로 한 캐치! 티니핑 이름 맞추기 퀴즈 게임입니다. 별도의 서버 없이 정적 파일(HTML/CSS/JS)만으로 구동됩니다.

## 주요 기능
- **시즌별/분류별 퀴즈**: 전체, 1~6기, 로열/일반 티니핑 등 범위 선택 가능
- **난이도 시스템**: 하, 중, 상 난이도에 따른 오답 구성 차별화
- **힌트 및 데이터**: 나무위키 정보창 데이터를 기반으로 한 상세한 힌트 제공
- **반응형 UI**: 모바일과 데스크톱 모두 최적화된 pastel 톤의 UI

## 시작하기 (로컬 실행)
1. 리포지토리를 클론합니다.
2. `web/index.html` 파일을 브라우저로 엽니다.
   - 혹은 `python3 -m http.server 4173 -d web` 명령어로 로컬 서버를 실행할 수 있습니다.

## 데이터 빌드 및 업데이트
데이터를 새로 수집하거나 가공하려면 다음 명령어를 사용하세요.
```bash
npm install
npm run build:full-dataset  # 전체 데이터 빌드
```

## 배포
이 프로젝트는 Cloudflare Pages, Vercel, GitHub Pages 등을 통한 정적 호스팅에 최적화되어 있습니다.
- **Build command**: (없음 - 정적 호스팅)
- **Build output directory**: `web`
