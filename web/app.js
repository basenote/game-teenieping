const app = document.getElementById("app");
const characters = window.CHARACTERS_DATA ?? window.SAMPLE_CHARACTERS ?? [];

const categoryLabels = {
  royal: "로열 티니핑",
  legend: "레전드 티니핑",
  general: "일반 티니핑",
  villain: "빌런 티니핑"
};

const state = {
  screen: "setup",
  setup: {
    scope: "all",
    count: 10,
    difficulty: "medium"
  },
  questions: [],
  currentIndex: 0,
  selectedAnswerId: null,
  score: 0,
  results: [],
  feedback: null,
  toast: ""
};

function shuffle(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function clampQuestionCount(pool, requested) {
  return Math.max(1, Math.min(requested, pool.length));
}

function resolvePool() {
  const scope = state.setup.scope;

  if (scope === "all") {
    return [...characters];
  }

  if (scope === "royal-only") {
    return characters.filter((character) => character.category === "royal");
  }

  if (scope === "general-only") {
    return characters.filter((character) => character.category === "general");
  }

  const season = Number(scope.replace("season-", ""));
  return characters.filter((character) => character.season === season);
}

function difficultyRank(value) {
  if (value === "easy") return 1;
  if (value === "medium") return 2;
  return 3;
}

function nameProfile(name) {
  return {
    length: name.length,
    hasHachu: name.includes("하츄핑"),
    prefix: name.slice(0, 1),
    suffix: name.slice(-2)
  };
}

function buildChoices(answer, pool) {
  const difficulty = state.setup.difficulty;
  const answerProfile = nameProfile(answer.nameKo);

  const distractors = pool
    .filter((character) => character.id !== answer.id)
    .map((character) => {
      const profile = nameProfile(character.nameKo);
      let score = 0;

      // Basic similarity
      if (character.season === answer.season) score += 2;
      if (character.category === answer.category) score += 2;
      if (character.silhouette && character.silhouette === answer.silhouette) score += 3;

      // Name similarity
      if (profile.prefix === answerProfile.prefix) score += 2;
      if (profile.suffix === answerProfile.suffix) score += 2;
      if (profile.hasHachu === answerProfile.hasHachu) score += 4;
      score += Math.max(0, 3 - Math.abs(profile.length - answerProfile.length));
      score += Math.max(0, 2 - Math.abs(difficultyRank(character.difficultyBase) - difficultyRank(answer.difficultyBase)));

      if (difficulty === "easy") {
        if (character.season === answer.season) score -= 6;
        if (character.category === answer.category) score -= 5;
        if (character.silhouette === answer.silhouette) score -= 4;
        if (profile.hasHachu === answerProfile.hasHachu) score -= 6;
      }

      if (difficulty === "medium") {
        if (character.season === answer.season) score += 2;
        if (character.category === answer.category) score += 2;
        if (character.silhouette === answer.silhouette) score += 2;
      }

      if (difficulty === "hard") {
        if (character.season === answer.season) score += 5;
        if (character.category === answer.category) score += 5;
        if (character.silhouette === answer.silhouette) score += 5;
        if (profile.prefix === answerProfile.prefix) score += 3;
        if (profile.suffix === answerProfile.suffix) score += 3;
        if (profile.hasHachu && answerProfile.hasHachu) score += 8;
      }

      return { character, score };
    })
    .sort((a, b) => (difficulty === "easy" ? a.score - b.score : b.score - a.score))
    .slice(0, difficulty === "easy" ? 12 : 8);

  const selected = shuffle(distractors).slice(0, 3).map((entry) => entry.character);
  return shuffle([answer, ...selected]);
}

function buildQuestions() {
  const pool = resolvePool();
  const count = clampQuestionCount(pool, Number(state.setup.count));
  const answers = shuffle(pool).slice(0, count);

  state.questions = answers.map((answer) => ({
    answer,
    choices: buildChoices(answer, pool),
    hintRevealed: false,
    voiceUsed: false
  }));
}

function startGame() {
  buildQuestions();
  state.currentIndex = 0;
  state.score = 0;
  state.results = [];
  state.selectedAnswerId = null;
  state.feedback = null;
  state.toast = "";
  state.screen = "quiz";
  render();
}

function currentQuestion() {
  return state.questions[state.currentIndex];
}

function questionProgress() {
  return {
    current: state.currentIndex + 1,
    total: state.questions.length
  };
}

function seasonLabel(season) {
  return `${season}기`;
}

function renderSpeakerIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 14h3l4 4V6L8 10H5z" fill="currentColor"></path>
      <path d="M15 9.5a4 4 0 0 1 0 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M17.5 7a7.5 7.5 0 0 1 0 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
    </svg>`;
}

function resolveVoiceState(character) {
  const voice = character.voice ?? { status: "missing" };
  const status = voice.status ?? "missing";
  const hasClip = Boolean(voice.clipPath);
  return { ...voice, status, hasClip };
}

function voiceStatusMessage(voice) {
  if (voice.status === "ready") return "음성 준비됨";
  if (voice.status === "needs-review") return "음성 검수 중";
  if (voice.status === "external-only") return "원본 링크 확인";
  if (voice.status === "blocked") return "사용 보류";
  return "음성 준비 중";
}

function renderMoodIcon(isCorrect) {
  const mouth = isCorrect
    ? `<path d="M76 92c7 12 18 18 32 18s25-6 32-18" stroke="#65465f" stroke-width="6" stroke-linecap="round" fill="none"></path>`
    : `<path d="M76 108c7-12 18-18 32-18s25 6 32 18" stroke="#65465f" stroke-width="6" stroke-linecap="round" fill="none"></path>`;
  const blush = isCorrect
    ? `<circle cx="62" cy="88" r="7" fill="#ffb4c7"></circle><circle cx="126" cy="88" r="7" fill="#ffb4c7"></circle>`
    : `<circle cx="62" cy="96" r="7" fill="#ffd0d8"></circle><circle cx="126" cy="96" r="7" fill="#ffd0d8"></circle>`;

  return `
    <svg class="mood-icon" viewBox="0 0 188 188" aria-hidden="true">
      <circle cx="94" cy="94" r="80" fill="${isCorrect ? "#ffe37d" : "#d8e8ff"}"></circle>
      <circle cx="74" cy="78" r="8" fill="#65465f"></circle>
      <circle cx="114" cy="78" r="8" fill="#65465f"></circle>
      ${blush}
      ${mouth}
    </svg>`;
}

function createCharacterSvg(character) {
  const iconMap = {
    heart: "M160 265c-6 0-12-2-18-7-73-59-122-104-122-162 0-43 32-76 74-76 28 0 50 12 66 34 16-22 38-34 66-34 42 0 74 33 74 76 0 58-49 103-122 162-6 5-12 7-18 7z",
    star: "M160 22l31 65 71 10-51 49 12 69-63-34-63 34 12-69-51-49 71-10z",
    note: "M212 40v152c0 35-29 63-64 63s-64-28-64-63c0-32 24-57 56-62l36-6V40z",
    diamond: "M160 20l106 104-106 176L54 124z",
    flower: "M160 91c18-54 74-61 93-19 8 18 5 40-9 57 21 2 39 15 47 35 16 42-21 83-66 73-16-4-30-14-39-28-9 14-23 24-39 28-45 10-82-31-66-73 8-20 26-33 47-35-14-17-17-39-9-57 19-42 75-35 93 19z",
    cloud: "M101 253c-40 0-73-29-73-65 0-28 21-53 51-62 8-48 48-82 96-82 48 0 87 32 96 78 34 5 61 31 61 66 0 38-34 65-77 65z",
    strawberry: "M160 88c59 0 101 41 101 100 0 64-48 112-101 112S59 252 59 188c0-59 42-100 101-100zm0-49 25 27 34-14-12 33 31 19-36 1-11 34-18-30-40 1 25-24-11-32 33 14z",
    ribbon: "M160 55c39 0 71 26 71 60 0 25-17 46-42 55l58 97-66-26-21 58-21-58-66 26 58-97c-25-9-42-30-42-55 0-34 32-60 71-60z",
    "shooting-star": "M144 43l19 42 45 6-33 30 8 43-39-22-39 22 8-43-33-30 45-6zm70 118 94-37-59 59 59 22-136 18z",
    sun: "M160 89c39 0 71 32 71 71s-32 71-71 71-71-32-71-71 32-71 71-71zm0-61 14 34h37l-28 23 11 35-34-20-34 20 11-35-28-23h37z",
    lantern: "M160 41c36 0 65 30 65 67 0 29-18 53-42 62v98h19v28h-84v-28h19v-98c-24-9-42-33-42-62 0-37 29-67 65-67z",
    crown: "M54 234 76 96l62 52 22-63 22 63 62-52 22 138z"
  };

  const shape = iconMap[character.silhouette] ?? iconMap.star;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${character.nameKo}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${character.themeColor}" />
          <stop offset="100%" stop-color="${character.accentColor}" />
        </linearGradient>
      </defs>
      <rect x="18" y="18" width="284" height="284" rx="92" fill="url(#bg)" />
      <circle cx="160" cy="98" r="36" fill="rgba(255,255,255,0.32)" />
      <path d="${shape}" fill="#ffffff" opacity="0.92" />
      <text x="160" y="278" text-anchor="middle" font-size="24" font-family="Arial Rounded MT Bold, Apple SD Gothic Neo, sans-serif" fill="#ffffff">
        Mystery Ping
      </text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function resolveCharacterImageSource(character) {
  return character.image || createCharacterSvg(character);
}

function playTone(type) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const sequence = type === "success" ? [523.25, 659.25, 783.99] : [392.0, 329.63, 261.63];

  sequence.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.12;
    const duration = 0.18;

    oscillator.type = type === "success" ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.15, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  });
}

function playVoice() {
  const question = currentQuestion();
  if (!question) return;

  const voice = resolveVoiceState(question.answer);

  if (voice.status === "missing") {
    state.toast = "이 캐릭터의 목소리 클립은 아직 준비 중이에요.";
    render();
    return;
  }

  if (voice.status === "needs-review") {
    state.toast = "이 캐릭터의 음성은 후보 구간만 확보됐고 아직 검수 중이에요.";
    render();
    return;
  }

  if (voice.status === "external-only") {
    state.toast = "이 캐릭터의 음성은 현재 원본 출처에서만 확인할 수 있어요.";
    render();
    return;
  }

  if (voice.status === "blocked") {
    state.toast = "이 캐릭터의 음성은 현재 게임 자산으로 사용할 수 없어요.";
    render();
    return;
  }

  if (voice.clipPath) {
    question.voiceUsed = true;
    const audio = new Audio(voice.clipPath);
    audio.play().catch(() => {
      state.toast = "브라우저에서 음성 재생을 시작하지 못했어요.";
      render();
    });
    return;
  }

  if (voice.previewText && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(voice.previewText);
    utterance.lang = "ko-KR";
    utterance.rate = 1.05;
    utterance.pitch = 1.35;
    window.speechSynthesis.speak(utterance);
    state.toast = "프로토타입에서는 샘플 음성 안내를 재생해요.";
    render();
    return;
  }

  state.toast = "이 환경에서는 음성 재생을 지원하지 않아요.";
  render();
}

function revealHint() {
  const question = currentQuestion();
  if (!question || question.hintRevealed) {
    return;
  }

  question.hintRevealed = true;
  render();
}

function submitAnswer() {
  const question = currentQuestion();
  if (!question || !state.selectedAnswerId) {
    state.toast = "먼저 답을 하나 선택해 주세요.";
    render();
    return;
  }

  const isCorrect = state.selectedAnswerId === question.answer.id;
  if (isCorrect) {
    state.score += 1;
    playTone("success");
  } else {
    playTone("wrong");
  }

  state.results.push({
    questionId: question.answer.id,
    selectedAnswerId: state.selectedAnswerId,
    isCorrect,
    hintsUsed: question.hintRevealed ? 1 : 0,
    voiceUsed: question.voiceUsed
  });

  state.feedback = {
    isCorrect,
    answer: question.answer,
    selectedAnswerId: state.selectedAnswerId
  };
  state.screen = "feedback";
  state.toast = "";
  render();
}

function nextStep() {
  state.selectedAnswerId = null;
  state.feedback = null;
  state.toast = "";

  if (state.currentIndex >= state.questions.length - 1) {
    state.screen = "summary";
  } else {
    state.currentIndex += 1;
    state.screen = "quiz";
  }

  render();
}

function restartGame() {
  state.screen = "setup";
  state.selectedAnswerId = null;
  state.questions = [];
  state.results = [];
  state.currentIndex = 0;
  state.score = 0;
  state.feedback = null;
  state.toast = "";
  render();
}

function scoreMessage(rate) {
  if (rate === 100) return "완벽해요. 티니핑 마스터예요.";
  if (rate >= 80) return "정말 잘했어요. 거의 전문가 수준이에요.";
  if (rate >= 60) return "좋아요. 몇 문제만 더 익히면 훨씬 강해져요.";
  if (rate >= 40) return "기초가 잡혔어요. 힌트를 보며 다시 도전해 보세요.";
  return "첫 도전으로 좋아요. 시즌별로 나눠서 풀면 훨씬 쉬워져요.";
}

function renderSetup() {
  app.innerHTML = `
    <section class="screen setup-grid">
      <article class="intro-card">
        <h2 class="card-title">퀴즈 안내</h2>
        <p class="subtle">
          기수, 문항 수, 난이도를 고른 뒤 티니핑 이미지를 보고 이름을 맞히는 퀴즈예요.
          힌트 버튼으로 설명 한 줄을 보고, 사운드 버튼으로 음성도 확인할 수 있어요.
        </p>
        <div class="fact-list">
          <div class="fact"><strong>${characters.length}명</strong>수집 캐릭터</div>
          <div class="fact"><strong>1개</strong>설명 힌트</div>
          <div class="fact"><strong>난이도 3단계</strong>선택형 퀴즈</div>
        </div>
      </article>
      <article class="settings-card">
        <div class="field">
          <label for="scope">퀴즈 범위</label>
          <select id="scope" name="scope">
            <option value="all">전체</option>
            <option value="season-1">1기</option>
            <option value="season-2">2기</option>
            <option value="season-3">3기</option>
            <option value="season-4">4기</option>
            <option value="season-5">5기</option>
            <option value="season-6">6기</option>
            <option value="royal-only">로열 티니핑만</option>
            <option value="general-only">일반 티니핑만</option>
          </select>
        </div>
        <div class="field">
          <label for="count">문항 수</label>
          <select id="count" name="count">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        <div class="field">
          <label for="difficulty">난이도</label>
          <select id="difficulty" name="difficulty">
            <option value="easy">하</option>
            <option value="medium" selected>중</option>
            <option value="hard">상</option>
          </select>
        </div>
        <div class="pill-row">
          <div class="pill">설명 힌트 1개</div>
          <div class="pill">사운드 버튼 포함</div>
        </div>
        <div class="submit-wrap">
          <button id="start-button" class="primary-btn" type="button">퀴즈 시작</button>
        </div>
      </article>
    </section>
  `;

  document.getElementById("scope").value = state.setup.scope;
  document.getElementById("count").value = String(state.setup.count);
  document.getElementById("difficulty").value = state.setup.difficulty;

  document.getElementById("scope").addEventListener("change", (event) => {
    state.setup.scope = event.target.value;
  });

  document.getElementById("count").addEventListener("change", (event) => {
    state.setup.count = Number(event.target.value);
  });

  document.getElementById("difficulty").addEventListener("change", (event) => {
    state.setup.difficulty = event.target.value;
  });

  document.getElementById("start-button").addEventListener("click", startGame);
}

function renderQuiz() {
  const question = currentQuestion();
  const progress = questionProgress();
  const progressRatio = (progress.current / progress.total) * 100;
  const voice = resolveVoiceState(question.answer);
  const hintText = question.hintRevealed
    ? question.answer.hints[0]
    : "힌트 버튼을 누르면 캐릭터 설명 힌트가 이 영역에 표시돼요.";

  app.innerHTML = `
    <section class="screen quiz-card">
      <div class="progress-head">
        <div>
          <h2 class="card-title">문제 ${progress.current} / ${progress.total}</h2>
          <div class="progress-meta">현재 점수 ${state.score}점</div>
        </div>
        <div class="progress-meta">${question.answer.seriesTitle}</div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${progressRatio}%"></div></div>

      <div class="quiz-layout">
        <article class="image-card">
          <span class="image-badge">${seasonLabel(question.answer.season)} · ${categoryLabels[question.answer.category] ?? question.answer.category}</span>
          <img src="${resolveCharacterImageSource(question.answer)}" alt="문제 캐릭터 이미지" />
        </article>

        <section class="quiz-panel">
          <div>
            <h3 class="question-title">이 티니핑의 이름은 무엇일까요?</h3>
            <p class="subtle">이미지, 힌트, 목소리를 듣고 가장 알맞은 이름을 골라보세요.</p>
          </div>

          <div class="hint-box"><p class="hint-line">${question.hintRevealed ? `힌트. ${hintText}` : hintText}</p></div>

          <div class="action-row">
            <button class="secondary-btn" type="button" id="hint-button" ${question.hintRevealed ? "disabled" : ""}>힌트 보기</button>
            <button
              id="voice-button"
              class="icon-btn voice-${voice.status}"
              type="button"
              aria-label="사운드 듣기"
              title="${voiceStatusMessage(voice)}"
              ${voice.status === "missing" ? "disabled" : ""}
            >${renderSpeakerIcon()}</button>
          </div>
          <div class="voice-caption">${voiceStatusMessage(voice)}</div>

          <div class="option-grid">
            ${question.choices.map((choice) => `
              <button
                class="option-btn ${state.selectedAnswerId === choice.id ? "selected" : ""}"
                type="button"
                data-answer-id="${choice.id}"
              >
                ${choice.nameKo}
              </button>
            `).join("")}
          </div>

          <div class="submit-wrap">
            <button id="submit-button" class="primary-btn" type="button">제출하기</button>
          </div>
          ${state.toast ? `<div class="notice">${state.toast}</div>` : ""}
        </section>
      </div>
    </section>
  `;

  app.querySelectorAll("[data-answer-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedAnswerId = button.dataset.answerId;
      state.toast = "";
      render();
    });
  });

  document.getElementById("hint-button").addEventListener("click", revealHint);
  document.getElementById("voice-button").addEventListener("click", playVoice);
  document.getElementById("submit-button").addEventListener("click", submitAnswer);
}

function renderFeedback() {
  const { isCorrect, answer, selectedAnswerId } = state.feedback;
  const selectedName = currentQuestion().choices.find((choice) => choice.id === selectedAnswerId)?.nameKo;

  app.innerHTML = `
    <section class="screen result-card ${isCorrect ? "" : "shake"}">
      <div class="feedback-banner ${isCorrect ? "correct" : "wrong"}">
        ${isCorrect ? "정답이에요" : "아쉬워요"}
      </div>
      <div class="result-character">
        <div class="result-character-card">
          <img src="${resolveCharacterImageSource(answer)}" alt="${answer.nameKo} 결과 이미지" />
        </div>
        <div>
          <h2 class="answer-name">${answer.nameKo}</h2>
          <div class="mood-wrap">
            ${renderMoodIcon(isCorrect)}
            <div class="mood-note">
              ${isCorrect
                ? "정답을 맞혔어요. 캐릭터와 이름을 정확히 연결했어요."
                : `선택한 답은 ${selectedName ?? "알 수 없음"}이었어요. 정답 캐릭터를 보고 다음 문제에서 다시 도전해 보세요.`}
            </div>
          </div>
        </div>
      </div>
      <p class="result-copy">${answer.summary}</p>
      <div class="result-actions">
        <button id="next-button" class="primary-btn" type="button">${state.currentIndex === state.questions.length - 1 ? "전체 결과 보기" : "다음 문제"}</button>
      </div>
    </section>
  `;

  document.getElementById("next-button").addEventListener("click", nextStep);
}

function renderSummary() {
  const total = state.questions.length;
  const rate = Math.round((state.score / total) * 100);
  const totalHints = state.results.reduce((sum, result) => sum + result.hintsUsed, 0);
  const totalVoice = state.results.filter((result) => result.voiceUsed).length;

  app.innerHTML = `
    <section class="screen summary-card">
      <div class="result-grade">최종 정답률 ${rate}%</div>
      <div>
        <h2 class="card-title">총 ${total}문제 중 ${state.score}문제를 맞혔어요</h2>
        <p class="subtle">${scoreMessage(rate)}</p>
      </div>
      <div class="summary-stats">
        <div class="stat"><strong>${state.score}</strong>맞힌 문제</div>
        <div class="stat"><strong>${totalHints}</strong>사용한 힌트</div>
        <div class="stat"><strong>${totalVoice}</strong>목소리 재생</div>
      </div>
      <div class="notice">
        기수와 난이도를 바꿔 다시 풀어 보면 비슷한 이름끼리 구분하는 감각을 더 빠르게 익힐 수 있어요.
      </div>
      <div class="result-actions">
        <button id="restart-button" class="primary-btn" type="button">다시 시작</button>
      </div>
    </section>
  `;

  document.getElementById("restart-button").addEventListener("click", restartGame);
}

function render() {
  if (state.screen === "setup") {
    renderSetup();
    return;
  }

  if (state.screen === "quiz") {
    renderQuiz();
    return;
  }

  if (state.screen === "feedback") {
    renderFeedback();
    return;
  }

  renderSummary();
}

render();
