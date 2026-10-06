import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Timer,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
  Share2,
  Sparkles,
  HelpCircle,
  X,
} from 'lucide-react';
import { Quiz, Question, UserProfile } from '../types';
import { sound } from '../utils/audio';

interface Props {
  quiz: Quiz;
  user: UserProfile;
  onFinishGame: (pointsEarned: number, questionsCorrect: number, totalQuestions: number) => void;
  onExit: () => void;
}

export const SoloGameView: React.FC<Props> = ({
  quiz,
  user,
  onFinishGame,
  onExit,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quiz.questions[0]?.timeLimitSeconds || 15);
  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [pointsDelta, setPointsDelta] = useState<number | null>(null);
  const [submittedScore, setSubmittedScore] = useState(false);

  const currentQ: Question = quiz.questions[currentIdx];
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Timer loop
  useEffect(() => {
    if (isGameOver || isAnswered) return;

    setTimeLeft(currentQ.timeLimitSeconds || 15);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeOut();
          return 0;
        }
        if (prev <= 4) {
          sound.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIdx, isGameOver]);

  const handleTimeOut = () => {
    if (isAnswered) return;
    sound.playWrong();
    setIsAnswered(true);
    setSelectedOption(null);
    setStreak(0);
  };

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswered(true);
    setSelectedOption(index);

    const isCorrect = index === currentQ.correctOptionIndex;
    if (isCorrect) {
      sound.playCorrect();
      const elapsedMs = Date.now() - startTimeRef.current;
      const totalMs = (currentQ.timeLimitSeconds || 15) * 1000;
      const speedFraction = Math.max(0, 1 - elapsedMs / totalMs);

      const basePoints = 500;
      const speedBonus = Math.round(speedFraction * 500);
      const newStreak = streak + 1;
      const streakBonus = Math.min(newStreak * 50, 300);

      const gained = basePoints + speedBonus + streakBonus;
      setScore((s) => s + gained);
      setPointsDelta(gained);
      setCorrectAnswersCount((c) => c + 1);
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
    } else {
      sound.playWrong();
      setStreak(0);
      setPointsDelta(0);
    }
  };

  const handleNextQuestion = () => {
    sound.playClick();
    setIsAnswered(false);
    setSelectedOption(null);
    setPointsDelta(null);

    if (currentIdx + 1 < quiz.questions.length) {
      setCurrentIdx((c) => c + 1);
    } else {
      endGame();
    }
  };

  const endGame = () => {
    setIsGameOver(true);
    sound.playVictory();
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Confetti fallback
    }

    // Submit score to server
    fetch('/api/leaderboard/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        pointsEarned: score,
        won: correctAnswersCount >= Math.ceil(quiz.questions.length * 0.7),
      }),
    })
      .then(() => setSubmittedScore(true))
      .catch((err) => console.warn('Aviso enviando puntuación:', err));

    onFinishGame(score, correctAnswersCount, quiz.questions.length);
  };

  // Keyboard navigation for options (1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;
      if (!isAnswered) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < currentQ.options.length) {
            handleSelectOption(idx);
          }
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        handleNextQuestion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver, isAnswered, currentIdx]);

  if (isGameOver) {
    const accuracy = Math.round((correctAnswersCount / quiz.questions.length) * 100);

    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl text-center space-y-6"
        >
          {/* Trophy Header */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>

          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              Quiz Completado
            </span>
            <h2 className="text-3xl font-extrabold font-display text-zinc-900 dark:text-zinc-100 mt-1">
              ¡Gran Partida, {user.username}!
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{quiz.title}</p>
          </div>

          {/* Big Score Box */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 dark:border-indigo-900/50">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Puntuación Total Obtenida
            </div>
            <div className="text-5xl font-black font-display text-zinc-900 dark:text-zinc-100 mt-1">
              {score.toLocaleString()} <span className="text-xl font-bold text-indigo-500">pts</span>
            </div>
            {submittedScore && (
              <span className="inline-block mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                ✓ Puntuación registrada en el récord global
              </span>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
              <div className="text-xs text-zinc-400 font-medium">Aciertos</div>
              <div className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-0.5">
                {correctAnswersCount} / {quiz.questions.length}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
              <div className="text-xs text-zinc-400 font-medium">Precisión</div>
              <div className="text-xl font-bold font-display text-indigo-600 dark:text-indigo-400 mt-0.5">
                {accuracy}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
              <div className="text-xs text-zinc-400 font-medium">Racha Máxima</div>
              <div className="text-xl font-bold font-display text-amber-500 mt-0.5">
                🔥 {maxStreak}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => {
                sound.playClick();
                setCurrentIdx(0);
                setScore(0);
                setCorrectAnswersCount(0);
                setStreak(0);
                setMaxStreak(0);
                setIsGameOver(false);
                setIsAnswered(false);
                setSelectedOption(null);
                setSubmittedScore(false);
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Jugar de Nuevo
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onExit();
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Volver a la Biblioteca
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const duration = currentQ.timeLimitSeconds || 15;
  const timerPercentage = (timeLeft / duration) * 100;

  return (
    <div className="max-w-3xl mx-auto py-4 px-4 space-y-5">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => {
            sound.playClick();
            onExit();
          }}
          className="p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Salir del quiz"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Question Counter Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300">
          <span>Pregunta {currentIdx + 1} de {quiz.questions.length}</span>
        </div>

        {/* Live Score & Streak */}
        <div className="flex items-center gap-3">
          {streak > 1 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs animate-pulse">
              <Zap className="w-3.5 h-3.5 fill-amber-500" />
              x{streak}
            </div>
          )}
          <div className="text-right">
            <span className="text-sm font-black font-display text-indigo-600 dark:text-indigo-400">
              {score.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-400 ml-1">pts</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-indigo-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIdx + 1) / quiz.questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Timer Bar */}
      <div className="relative">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-1">
          <span className="flex items-center gap-1">
            <Timer className="w-3.5 h-3.5" />
            Tiempo restante
          </span>
          <span className={`font-mono text-sm ${timeLeft <= 4 ? 'text-rose-500 font-black animate-pulse' : ''}`}>
            {timeLeft}s
          </span>
        </div>
        <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-all duration-1000 linear ${
              timeLeft > 7
                ? 'bg-emerald-500'
                : timeLeft > 3
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        key={currentQ.id}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
            {currentQ.category}
          </span>
          {pointsDelta !== null && (
            <motion.div
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                pointsDelta > 0
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
              }`}
            >
              {pointsDelta > 0 ? `+${pointsDelta} pts` : '¡Fallaste!'}
            </motion.div>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-bold font-display text-zinc-900 dark:text-zinc-100 leading-snug">
          {currentQ.text}
        </h2>

        {/* 4 Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQ.correctOptionIndex;

            let cardStyle =
              'border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-800/30 text-zinc-800 dark:text-zinc-200';

            if (isAnswered) {
              if (isCorrect) {
                cardStyle =
                  'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20';
              } else if (isSelected) {
                cardStyle =
                  'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 ring-2 ring-rose-500/20';
              } else {
                cardStyle =
                  'opacity-40 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500';
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                className={`group relative p-4 rounded-2xl border-2 text-left font-semibold text-sm transition-all duration-200 flex items-start justify-between gap-3 ${cardStyle} ${
                  !isAnswered ? 'active:scale-[0.98]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-zinc-200/80 dark:bg-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-snug pt-0.5">{option}</span>
                </div>

                {isAnswered && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation and Next Question Control */}
        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4"
            >
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    ¿Sabías que...?
                  </div>
                  <p className="text-xs text-indigo-950/80 dark:text-indigo-300/90 mt-1 leading-relaxed">
                    {currentQ.explanation}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 hover:scale-[1.02]"
                >
                  {currentIdx + 1 < quiz.questions.length ? 'Siguiente Pregunta' : 'Ver Resultados Finales'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
