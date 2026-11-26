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
    { question: "옛 거리에서 볼 수 있었던 가게는 무엇일까요?", options: ["전파사", "VR 게임방", "무인 키오스크 카페"], answer: 0, explanation: "전파사는 라디오와 TV 등을 고치던 가게입니다." },
    { question: "2,000원과 500원을 더하면 얼마일까요?", options: ["2,000원", "2,500원", "3,500원"], answer: 1, explanation: "2,000원 + 500원 = 2,500원입니다." },
  ],
  cherry: [
    { question: "봄에 진해에서 볼 수 있는 꽃은 무엇일까요?", options: ["해바라기", "벚꽃", "코스모스"], answer: 1, explanation: "진해는 봄의 벚꽃으로 유명합니다." },
    { question: "꽃잎 7장에 5장을 더하면 몇 장일까요?", options: ["11장", "12장", "13장"], answer: 1, explanation: "7 + 5 = 12장입니다." },
  ],
  sea: [
    { question: "통영의 벽화 마을 이름은 무엇일까요?", options: ["동피랑", "전주 한옥마을", "안동 하회마을"], answer: 0, explanation: "동피랑은 통영의 벽화 마을입니다." },
    { question: "6,000원짜리 두 개를 사면 얼마일까요?", options: ["10,000원", "12,000원", "14,000원"], answer: 1, explanation: "6,000원 × 2 = 12,000원입니다." },
  ],
};

export default function MediaArtPage() {
  const [theme, setTheme] = useState<Theme>("retro");
  const [walking, setWalking] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [direction, setDirection] = useState(0);
  const [distance, setDistance] = useState(0);
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
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
      setDistance((current) => current + elapsed * speed);
    }, 250);
    return () => window.clearInterval(timer);
  }, [walking, speed]);

  useEffect(() => {
    if (!walking || quizOpen) return;
    const timer = window.setTimeout(() => {
      setQuestionIndex((previous) => chooseQuestionIndex(questions[theme].length, previous));
      setAnswer(null);
      setDirection(0);
      setWalking(false);
      setQuizOpen(true);
    }, 12_000 + Math.random() * 13_000);
    return () => window.clearTimeout(timer);
  }, [walking, quizOpen, theme]);

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
    setWalking(true);
  };

  return (
    <main className="art-app">
      <Scene theme={theme} walking={walking} speed={speed} direction={direction} />
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

        <aside className="art-summary art-box">
          <h2>시연 기록</h2>
          <p>가상 이동 {Math.floor(distance)} m</p>
          <p>정답 {correct} / 응답 {answered}회</p>
          <p>거리와 시점 이동은 버튼으로 조작하는 가상 값입니다.</p>
          <strong>센서 미연결 · 건강 진단 및 낙상 감지 기능 없음</strong>
        </aside>

        <footer className="art-controls art-box">
          <div className="art-speed">
            <span>화면 이동 속도</span>
            {[{ value: 1, label: "느림" }, { value: 2, label: "보통" }, { value: 3, label: "빠름" }].map((item) => (
              <button type="button" key={item.value} aria-pressed={speed === item.value} onClick={() => setSpeed(item.value)}>{item.label}</button>
            ))}
          </div>
          <dialog
            ref={dialogRef}
            className="art-question art-box"
            aria-labelledby="art-question-title"
            onCancel={(event) => { event.preventDefault(); setQuizOpen(false); }}
            onClose={() => setQuizOpen(false)}
          >
            {question && <>
              <div className="art-meta">깜짝 퀴즈</div>
              <h2 id="art-question-title">{question.question}</h2>
              <p>산책 화면이 잠시 멈췄어요. 편안하게 답해 주세요.</p>
              <div className="art-options">
                {question.options.map((option, index) => (
                  <button type="button" key={option} disabled={answer !== null} onClick={() => chooseAnswer(index)}>{option}</button>
                ))}
              </div>
              {answer !== null && <p className="art-feedback" role="status">{answer === question.answer ? "정답이에요!" : "괜찮아요!"} {question.explanation}</p>}
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
