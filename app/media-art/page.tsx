"use client";

import { useEffect, useRef, useState } from "react";
import { chooseQuestionIndex } from "@/lib/surprise-quiz";
import Scene, { type Theme } from "./scene";
import "./style.css";

type Question = { question: string; options: string[]; answer: number; explanation: string };
const themes: { id: Theme; label: string }[] = [
  { id: "retro", label: "8090 추억길" },
  { id: "cherry", label: "진해 벚꽃길" },
  { id: "sea", label: "통영 바다길" },
];
const questions: Record<Theme, Question[]> = {
  retro: [
    { question: "안녕하세요! 옛날 거리에 어떤 가게가 있었는지 기억하세요?", options: ["전파사", "VR 게임방", "무인 키오스크 카페"], answer: 0, explanation: "전파사는 라디오와 TV 등을 고치던 가게였죠." },
    { question: "시장에 가려고요. 2,000원에 500원을 더하면 얼마일까요?", options: ["2,000원", "2,500원", "3,500원"], answer: 1, explanation: "2,000원 + 500원은 2,500원이에요." },
  ],
  cherry: [
    { question: "안녕하세요! 봄에 진해에서 만나는 이 꽃은 뭘까요?", options: ["해바라기", "벚꽃", "코스모스"], answer: 1, explanation: "진해는 봄의 벚꽃으로 유명하죠." },
    { question: "꽃잎 7장에 5장이 더 날아왔어요. 모두 몇 장일까요?", options: ["11장", "12장", "13장"], answer: 1, explanation: "7 + 5는 12장이에요." },
  ],
  sea: [
    { question: "안녕하세요! 통영에 있는 벽화 마을 이름을 아세요?", options: ["동피랑", "전주 한옥마을", "안동 하회마을"], answer: 0, explanation: "동피랑은 통영의 아름다운 벽화 마을이에요." },
    { question: "6,000원짜리 김밥 두 개를 사면 얼마가 될까요?", options: ["10,000원", "12,000원", "14,000원"], answer: 1, explanation: "6,000원 × 2는 12,000원이에요." },
  ],
};

export default function MediaArtPage() {
  const [theme, setTheme] = useState<Theme>("retro");
  const [walking, setWalking] = useState(false);
  const [direction, setDirection] = useState(0);
  const [distance, setDistance] = useState(0);
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [friendVisible, setFriendVisible] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const question = questionIndex === null ? null : questions[theme][questionIndex];

  useEffect(() => {
    if (!walking) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min((now - last) / 1000, 0.5);
      last = now;
      setDistance((current) => current + elapsed * 2);
    }, 250);
    return () => window.clearInterval(timer);
  }, [walking]);

  useEffect(() => {
    if (!walking || quizOpen || friendVisible) return;
    const timer = window.setTimeout(() => setFriendVisible(true), 12_000 + Math.random() * 13_000);
    return () => window.clearTimeout(timer);
  }, [walking, quizOpen, friendVisible, theme]);

  useEffect(() => {
    if (!walking || !friendVisible || quizOpen) return;
    const timer = window.setTimeout(() => {
      setQuestionIndex((previous) => chooseQuestionIndex(questions[theme].length, previous));
      setAnswer(null);
      setDirection(0);
      setWalking(false);
      setQuizOpen(true);
    }, 2_500);
    return () => window.clearTimeout(timer);
  }, [walking, quizOpen, friendVisible, theme]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (quizOpen && !dialog.open) dialog.showModal();
    else if (!quizOpen && dialog.open) dialog.close();
  }, [quizOpen]);

  useEffect(() => {
    if (quizOpen && answer !== null) continueRef.current?.focus();
  }, [quizOpen, answer]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (quizOpen) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setDirection(event.key === "ArrowLeft" ? -1 : 1);
      } else if (event.code === "Space" && event.target === document.body && !event.repeat) {
        event.preventDefault();
        setWalking((value) => !value);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") setDirection(0);
    };
    const reset = () => setDirection(0);
    const onVisibilityChange = () => {
      if (document.hidden) {
        setWalking(false);
        reset();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [quizOpen]);

  const selectTheme = (next: Theme) => {
    setTheme(next);
    setQuestionIndex(null);
    setAnswer(null);
  };
  const chooseAnswer = (index: number) => {
    if (answer !== null || !question) return;
    setAnswer(index);
    setAnswered((value) => value + 1);
    if (index === question.answer) setCorrect((value) => value + 1);
  };
  const continueWalk = () => {
    setQuizOpen(false);
    setFriendVisible(false);
    setWalking(true);
  };

  return (
    <main className="art-app">
      <Scene theme={theme} walking={walking} direction={direction} friendVisible={friendVisible} />
      {walking && <button type="button" className="art-stop" onClick={() => setWalking(false)}>화면 정지</button>}
      <div className="art-content">
        <header className="art-header art-box">
          <div>
            <a href="/" className="art-back">← 기존 산책으로</a>
            <h1>추억 산책 미디어아트</h1>
            <p>경남의 풍경을 떠올리는 1인칭 가상 산책</p>
          </div>
          <div className="art-theme-list" role="group" aria-label="산책 테마">
            {themes.map((item) => <button key={item.id} type="button" aria-pressed={theme === item.id} onClick={() => selectTheme(item.id)}>{item.label}</button>)}
          </div>
        </header>

        <div className="art-view-gap" aria-hidden="true" />
        <aside className="art-summary art-box">
          <h2>시연 기록</h2>
          <p>가상 이동 {Math.floor(distance)} m</p>
          <p>정답 {correct} / 응답 {answered}회</p>
          <p>거리와 시점 이동은 버튼으로 조작하는 가상 값입니다.</p>
          <strong>센서 미연결 · 건강 진단 및 낙상 감지 기능 없음</strong>
        </aside>

        {friendVisible && !quizOpen && <p className="art-encounter art-box" role="status">산책길에서 친구가 다가와요!</p>}

        <footer className="art-controls art-box">
          <dialog
            ref={dialogRef}
            className="art-question art-box"
            aria-labelledby="art-question-title"
            onCancel={(event) => { event.preventDefault(); setQuizOpen(false); setFriendVisible(false); }}
            onClose={() => setQuizOpen(false)}
          >
            {question && <>
              <div className="art-meta"><span aria-hidden="true">👋</span> 산책길 친구가 말을 걸었어요</div>
              <h2 id="art-question-title">{question.question}</h2>
              <p>산책 화면이 잠시 멈췄어요. 편안하게 답해 주세요.</p>
              <div className="art-options">
                {question.options.map((option, index) => (
                  <button type="button" key={option} disabled={answer !== null} onClick={() => chooseAnswer(index)}>{option}</button>
                ))}
              </div>
              {answer !== null && <p className="art-feedback" role="status">친구: {answer === question.answer ? "함께 이야기해서 즐거워요!" : "괜찮아요, 함께 알아봐요!"} {question.explanation}</p>}
              <button ref={continueRef} type="button" className="art-next" onClick={continueWalk}>
                {answer === null ? "건너뛰고 산책 계속하기" : "산책 계속하기"}
              </button>
            </>}
          </dialog>
          <div className="art-buttons">
            <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDirection(-1); }} onPointerUp={() => setDirection(0)} onPointerCancel={() => setDirection(0)} onLostPointerCapture={() => setDirection(0)} onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") setDirection(-1); }} onKeyUp={() => setDirection(0)} onBlur={() => setDirection(0)}>← 왼쪽 보기</button>
            <button type="button" className="art-walk" onClick={() => setWalking(!walking)}>{walking ? "일시 정지" : "산책 시작"}</button>
            <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDirection(1); }} onPointerUp={() => setDirection(0)} onPointerCancel={() => setDirection(0)} onLostPointerCapture={() => setDirection(0)} onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") setDirection(1); }} onKeyUp={() => setDirection(0)} onBlur={() => setDirection(0)}>오른쪽 보기 →</button>
          </div>
          <p>방향키로 시점을 이동할 수 있어요. 불편하거나 어지러우면 즉시 멈추세요.</p>
        </footer>
      </div>
    </main>
  );
}
