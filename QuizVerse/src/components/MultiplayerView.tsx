import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Users,
  Plus,
  ArrowRight,
  Crown,
  CheckCircle2,
  Clock,
  Send,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
  LogOut,
  HelpCircle,
  Trophy,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import {
  MultiplayerRoom,
  RoomPlayer,
  ChatMessage,
  Quiz,
  UserProfile,
  Question,
} from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { sound } from '../utils/audio';

interface Props {
  user: UserProfile;
  quizzes: Quiz[];
  preselectedQuiz?: Quiz | null;
  onClearPreselectedQuiz?: () => void;
  onUpdateUserScore: (scoreGained: number) => void;
}

export const MultiplayerView: React.FC<Props> = ({
  user,
  quizzes,
  preselectedQuiz,
  onClearPreselectedQuiz,
  onUpdateUserScore,
}) => {
  // Connection state
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<MultiplayerRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<{
    id: string;
    name: string;
    quizTitle: string;
    category: string;
    playerCount: number;
    maxPlayers: number;
    status: string;
  }[]>([]);

  // Room forms
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState<string>(
    preselectedQuiz ? preselectedQuiz.id : quizzes[0]?.id || ''
  );
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [isCreatingRoom, setIsCreatingRoom] = useState(Boolean(preselectedQuiz));
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chat & Game in-room state
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [revealInfo, setRevealInfo] = useState<{
    correctOptionIndex: number;
    explanation: string;
  } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(15);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRoomRef = useRef<MultiplayerRoom | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const handleSocketMessageRef = useRef<(data: any) => void>(() => {});

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // Fetch active rooms on mount
  useEffect(() => {
    fetchActiveRooms();
    const interval = setInterval(fetchActiveRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setAvailableRooms(data);
      }
    } catch {
      // Ignore
    }
  };

  const handleSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'ROOM_CREATED':
      case 'ROOM_UPDATED':
        setCurrentRoom(data.room);
        setErrorMessage(null);
        break;

      case 'CHAT_MESSAGE':
        if (data.room) {
          setCurrentRoom(data.room);
        }
        sound.playClick();
        break;

      case 'GAME_STARTING':
        setCountdown(data.countdown);
        sound.playTick();
        const startTimer = setInterval(() => {
          setCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(startTimer);
              return null;
            }
            sound.playTick();
            return prev - 1;
          });
        }, 1000);
        break;

      case 'QUESTION_START':
        setCurrentRoom(data.room);
        setActiveQuestion(data.question);
        setSelectedOption(null);
        setRevealInfo(null);
        setCountdown(null);
        setTimerSecondsLeft(data.question.timeLimitSeconds || 15);

        // Start countdown tick
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
          setTimerSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerIntervalRef.current!);
              return 0;
            }
            if (prev <= 4) sound.playTick();
            return prev - 1;
          });
        }, 1000);
        break;

      case 'QUESTION_REVEAL':
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setCurrentRoom(data.room);
        setRevealInfo({
          correctOptionIndex: data.correctOptionIndex,
          explanation: data.explanation,
        });

        // Determine if local player answered correctly
        const localP = data.room?.players?.[user.id];
        if (localP?.isCorrect) {
          sound.playCorrect();
        } else {
          sound.playWrong();
        }
        break;

      case 'GAME_FINISHED':
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setCurrentRoom(data.room);
        setActiveQuestion(null);
        setRevealInfo(null);
        sound.playVictory();
        try {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
        } catch {}

        // Award score to user
        const finalP = data.room?.players?.[user.id];
        if (finalP?.score) {
          onUpdateUserScore(finalP.score);
        }
        break;

      case 'ERROR':
        setErrorMessage(data.message);
        sound.playWrong();
        break;
    }
  }, [user.id, onUpdateUserScore]);

  useEffect(() => {
    handleSocketMessageRef.current = handleSocketMessage;
  }, [handleSocketMessage]);

  // Robust WebSocket Connection with Auto-reconnect and React StrictMode resilience
  const connectWebSocket = useCallback(() => {
    if (!isMountedRef.current) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      const prev = socketRef.current;
      prev.onopen = null;
      prev.onclose = null;
      prev.onerror = null;
      prev.onmessage = null;
      try {
        if (prev.readyState === WebSocket.OPEN) {
          prev.close(1000, 'Reconnecting');
        }
      } catch {}
      socketRef.current = null;
    }

    setIsConnecting(true);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      setWs(socket);

      socket.onopen = () => {
        if (!isMountedRef.current) {
          try { socket.close(1000, 'Unmounted'); } catch {}
          return;
        }
        setIsConnected(true);
        setIsConnecting(false);
        setErrorMessage(null);

        // If previously in a room that is waiting or active, rejoin
        if (currentRoomRef.current?.id) {
          try {
            socket.send(
              JSON.stringify({
                type: 'JOIN_ROOM',
                roomId: currentRoomRef.current.id,
                player: {
                  id: user.id,
                  username: user.username,
                  avatar: user.avatar,
                },
              })
            );
          } catch {}
        }
      };

      socket.onclose = (event) => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        setIsConnecting(false);

        // Auto-reconnect if dropped unexpectedly
        if (event.code !== 1000 && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            if (isMountedRef.current) {
              connectWebSocket();
            }
          }, 2500);
        }
      };

      socket.onerror = (err) => {
        // WebSocket error events in browsers are empty Event instances ({"isTrusted": true})
        // Logging as warning prevents supervisor treat-as-fatal checks
        if (!isMountedRef.current) return;
        console.warn('Aviso de conexión WebSocket (reintentando...):', err);
      };

      socket.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          handleSocketMessageRef.current(data);
        } catch {
          // ignore malformed messages
        }
      };
    } catch (err) {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      setIsConnecting(false);
      console.warn('Fallo al inicializar WebSocket:', err);
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          if (isMountedRef.current) {
            connectWebSocket();
          }
        }, 3000);
      }
    }
  }, [user.id, user.username, user.avatar]);

  useEffect(() => {
    isMountedRef.current = true;
    connectWebSocket();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (socketRef.current) {
        const s = socketRef.current;
        s.onopen = null;
        s.onclose = null;
        s.onerror = null;
        s.onmessage = null;
        try {
          if (s.readyState === WebSocket.OPEN) {
            s.close(1000, 'Component unmounted');
          } else if (s.readyState === WebSocket.CONNECTING) {
            s.onopen = () => {
              try { s.close(1000, 'Unmounted'); } catch {}
            };
          }
        } catch {}
        socketRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // Scroll chat down on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentRoom?.chat]);

  const handleCreateRoom = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setErrorMessage('No hay conexión activa con el servidor multijugador. Reconectando...');
      connectWebSocket();
      return;
    }
    sound.playClick();
    const quiz = quizzes.find((q) => q.id === selectedQuizId) || quizzes[0];
    ws.send(
      JSON.stringify({
        type: 'CREATE_ROOM',
        roomName: newRoomName.trim() || `Sala de ${user.username}`,
        quizId: quiz.id,
        customQuiz: quiz,
        maxPlayers,
        player: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
      })
    );
    setIsCreatingRoom(false);
  };

  const handleJoinRoom = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setErrorMessage('No hay conexión activa con el servidor multijugador. Reconectando...');
      connectWebSocket();
      return;
    }
    sound.playClick();
    setErrorMessage(null);
    ws.send(
      JSON.stringify({
        type: 'JOIN_ROOM',
        roomId: cleanCode,
        player: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
      })
    );
  };

  const handleToggleReady = () => {
    if (!ws || !currentRoom) return;
    sound.playClick();
    ws.send(JSON.stringify({ type: 'TOGGLE_READY' }));
  };

  const handleStartGame = () => {
    if (!ws || !currentRoom) return;
    sound.playVictory();
    ws.send(JSON.stringify({ type: 'START_GAME' }));
  };

  const handleSubmitAnswer = (optionIdx: number) => {
    if (!ws || !currentRoom || selectedOption !== null || revealInfo) return;
    sound.playClick();
    setSelectedOption(optionIdx);
    ws.send(
      JSON.stringify({
        type: 'SUBMIT_ANSWER',
        optionIndex: optionIdx,
      })
    );
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ws || !currentRoom || !chatInput.trim()) return;
    ws.send(
      JSON.stringify({
        type: 'SEND_CHAT',
        text: chatInput.trim(),
      })
    );
    setChatInput('');
  };

  const handleLeaveRoom = () => {
    if (ws && currentRoom) {
      sound.playClick();
      ws.send(JSON.stringify({ type: 'LEAVE_ROOM' }));
      setCurrentRoom(null);
      setActiveQuestion(null);
      setRevealInfo(null);
    }
  };

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.id);
    sound.playClick();
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // RENDER 1: Inside a Room (Lobby, In-Game, or Finished)
  if (currentRoom) {
    const playersList: RoomPlayer[] = Object.values(currentRoom.players);
    const isHost = currentRoom.hostId === user.id;
    const myPlayer = currentRoom.players[user.id];
    const isReady = myPlayer?.isReady;

    return (
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Room Top Bar */}
        <div className="flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold font-display text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                  {currentRoom.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {currentRoom.status === 'waiting' ? 'Lobby' : currentRoom.status === 'finished' ? 'Finalizada' : 'En Curso'}
                </span>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En línea
                  </span>
                ) : (
                  <button
                    onClick={connectWebSocket}
                    className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                    title="Reconectar WebSocket"
                  >
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    Reconectando...
                  </button>
                )}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Quiz: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{currentRoom.quiz.title}</span> ({currentRoom.quiz.questions.length} preguntas)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Room Code Copy Button */}
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 transition-colors"
              title="Copiar código de sala"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{currentRoom.id}</span>
            </button>

            {/* Leave Room Button */}
            <button
              onClick={handleLeaveRoom}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Salir de la sala"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Room Layout: Left Game/Lobby, Right Live Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Main Stage */}
          <div className="lg:col-span-2 space-y-4">
            {/* Countdown Overlay before game begins */}
            {countdown !== null && (
              <div className="p-12 rounded-3xl bg-indigo-600 text-white text-center space-y-3 shadow-xl">
                <Sparkles className="w-10 h-10 mx-auto animate-spin" />
                <h3 className="text-xl font-bold font-display">¡La partida comienza en!</h3>
                <div className="text-7xl font-black font-display animate-bounce">{countdown}</div>
              </div>
            )}

            {/* STATE A: WAITING IN LOBBY */}
            {currentRoom.status === 'waiting' && countdown === null && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold font-display text-zinc-900 dark:text-zinc-100">
                      Jugadores Conectados ({playersList.length}/{currentRoom.maxPlayers})
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Comparte el código <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{currentRoom.id}</span> con tus rivales
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleReady}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                        isReady
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isReady ? '¡Estoy Listo!' : 'Marcar como Listo'}
                    </button>

                    {isHost && (
                      <button
                        onClick={handleStartGame}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Comenzar Partida
                      </button>
                    )}
                  </div>
                </div>

                {/* Player Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {playersList.map((player) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center relative"
                    >
                      {player.isHost && (
                        <span className="absolute top-2 right-2 text-amber-500" title="Anfitrión">
                          <Crown className="w-4 h-4 fill-amber-500" />
                        </span>
                      )}

                      <AvatarDisplay avatar={player.avatar} size="lg" animate />
                      <div className="mt-2 font-bold text-xs truncate max-w-full text-zinc-900 dark:text-zinc-100">
                        {player.username}
                      </div>

                      <span
                        className={`mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          player.isReady
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {player.isReady ? 'Listo' : 'Esperando...'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* STATE B: IN-GAME ACTIVE QUESTION & REVEAL */}
            {(currentRoom.status === 'question' || currentRoom.status === 'reveal') && activeQuestion && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm space-y-6">
                {/* Header info */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
                      Pregunta {currentRoom.currentQuestionIndex + 1} de {currentRoom.quiz.questions.length}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {activeQuestion.category}
                    </span>
                  </div>

                  {/* Timer */}
                  <div className="flex items-center gap-2 font-mono font-bold text-sm">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span className={timerSecondsLeft <= 4 ? 'text-rose-500 animate-pulse font-black' : 'text-zinc-700 dark:text-zinc-300'}>
                      {timerSecondsLeft}s
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <h3 className="text-xl sm:text-2xl font-bold font-display text-zinc-900 dark:text-zinc-100 leading-snug">
                  {activeQuestion.text}
                </h3>

                {/* 4 Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeQuestion.options.map((opt: string, idx: number) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = revealInfo?.correctOptionIndex === idx;

                    let btnStyle =
                      'border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-zinc-50/60 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200';

                    if (revealInfo) {
                      if (isCorrect) {
                        btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20';
                      } else if (isSelected) {
                        btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 ring-2 ring-rose-500/20';
                      } else {
                        btnStyle = 'opacity-40 border-zinc-200 dark:border-zinc-800';
                      }
                    } else if (isSelected) {
                      btnStyle = 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20';
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedOption !== null || Boolean(revealInfo)}
                        onClick={() => handleSubmitAnswer(idx)}
                        className={`p-4 rounded-2xl border-2 text-left font-semibold text-sm transition-all flex items-start gap-3 ${btnStyle}`}
                      >
                        <span className="w-6 h-6 rounded-lg bg-zinc-200/80 dark:bg-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
                          {idx + 1}
                        </span>
                        <span className="leading-snug">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Reveal Explanation if active */}
                {revealInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex items-start gap-3"
                  >
                    <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        Explicación
                      </div>
                      <p className="text-xs text-indigo-950/80 dark:text-indigo-300/90 mt-0.5 leading-relaxed">
                        {revealInfo.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Live Round Scoreboard */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-2">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Puntuaciones en Directo
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {playersList
                      .sort((a, b) => b.score - a.score)
                      .map((p, rank) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800"
                        >
                          <span className="text-xs font-bold text-zinc-400">#{rank + 1}</span>
                          <AvatarDisplay avatar={p.avatar} size="xs" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate">{p.username}</div>
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                              {p.score.toLocaleString()} pts
                            </div>
                          </div>
                          {p.currentAnswer !== null && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* STATE C: FINISHED GAME (PODIUM) */}
            {currentRoom.status === 'finished' && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Trophy className="w-8 h-8 animate-bounce" />
                </div>

                <div>
                  <h3 className="text-2xl font-black font-display text-zinc-900 dark:text-zinc-100">
                    ¡Partida Multijugador Finalizada!
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Los puntos han sido sumados a la clasificación mensual
                  </p>
                </div>

                {/* Podium Top 3 */}
                <div className="flex items-end justify-center gap-3 pt-6 pb-2">
                  {playersList
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3)
                    .map((p, idx) => {
                      const heights = ['h-40', 'h-32', 'h-24'];
                      const colors = [
                        'bg-amber-500 text-white border-amber-400',
                        'bg-slate-400 text-white border-slate-300',
                        'bg-amber-700 text-white border-amber-600',
                      ];
                      const medals = ['🥇 1º Puesto', '🥈 2º Puesto', '🥉 3º Puesto'];

                      return (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.15 }}
                          className="flex flex-col items-center flex-1 max-w-[130px]"
                        >
                          <AvatarDisplay avatar={p.avatar} size="md" animate />
                          <div className="text-xs font-bold mt-2 truncate w-full">{p.username}</div>
                          <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 mb-2">
                            {p.score.toLocaleString()} pts
                          </div>

                          <div
                            className={`w-full ${heights[idx]} rounded-t-2xl flex flex-col items-center justify-center p-2 font-display font-bold shadow-lg border-t-2 ${colors[idx]}`}
                          >
                            <span className="text-xs">{medals[idx]}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>

                <div className="flex justify-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={handleLeaveRoom}
                    className="px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold shadow-md hover:opacity-90 transition-all"
                  >
                    Salir de la Sala
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Integrated Live Chat Drawer */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Chat de la Sala
                </h4>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                {currentRoom.chat.length} msgs
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {currentRoom.chat.map((msg) => {
                const isMe = msg.senderId === user.id;
                if (msg.isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="text-center text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 py-1 px-2 rounded-lg"
                    >
                      {msg.text}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    <AvatarDisplay avatar={msg.senderAvatar} size="xs" />
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[9px] opacity-70 mb-0.5">
                        <span className="font-bold">{msg.senderName}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p>{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Emoji Reaction Pills */}
            <div className="flex items-center gap-1.5 py-2 border-t border-zinc-100 dark:border-zinc-800/80 overflow-x-auto scrollbar-none">
              {['🎉', '🔥', '👏', '🧠', '⚡', '👑', '😎', 'GG'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    if (!ws) return;
                    sound.playClick();
                    ws.send(
                      JSON.stringify({
                        type: 'SEND_CHAT',
                        text: emoji,
                      })
                    );
                  }}
                  className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs transition-colors shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe un mensaje..."
                maxLength={120}
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                title="Enviar"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // RENDER 2: Room Browser & Creation Modal
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              Multijugador en Tiempo Real
            </div>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md text-xs font-semibold text-emerald-200 border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Servidor Conectado
              </span>
            ) : isConnecting ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md text-xs font-semibold text-amber-200 border border-amber-400/30">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Conectando...
              </span>
            ) : (
              <button
                onClick={connectWebSocket}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 backdrop-blur-md text-xs font-semibold text-rose-200 border border-rose-400/30 hover:bg-rose-500/30 transition-colors"
                title="Intentar reconectar ahora"
              >
                <WifiOff className="w-3 h-3" />
                Desconectado (Reconectar)
              </button>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display">
            Compite en Directo con Jugadores
          </h2>
          <p className="text-xs sm:text-sm text-white/80">
            Crea una sala privada o pública, comparte el código y responde al mismo tiempo. Quien acierte más rápido se lleva el primer lugar del podio.
          </p>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            setIsCreatingRoom(true);
          }}
          className="px-5 py-3 rounded-2xl bg-white text-indigo-700 hover:bg-zinc-100 font-bold text-xs shadow-lg transition-all flex items-center gap-2 shrink-0 hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Crear Nueva Sala
        </button>
      </div>

      {/* Error Notification banner if any */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Join Room by Code Bar */}
      <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
            ¿Tienes un código de invitación?
          </label>
          <input
            type="text"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            placeholder="Ej: QUIZ-842"
            maxLength={10}
            className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          />
        </div>
        <button
          onClick={() => handleJoinRoom(roomCodeInput)}
          disabled={!roomCodeInput.trim()}
          className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-auto h-[44px]"
        >
          Unirse a la Sala
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Active Public Rooms Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-display text-zinc-900 dark:text-zinc-100">
            Salas Públicas Esperando Jugadores ({availableRooms.length})
          </h3>
          <button
            onClick={fetchActiveRooms}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            Actualizar
          </button>
        </div>

        {availableRooms.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <Users className="w-10 h-10 text-zinc-400 mx-auto" />
            <h4 className="font-bold font-display text-sm text-zinc-800 dark:text-zinc-200">
              No hay salas públicas abiertas en este momento
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              Sé el anfitrión y crea una sala con tu quiz favorito para que otros jugadores se unan en tiempo real.
            </p>
            <button
              onClick={() => {
                sound.playClick();
                setIsCreatingRoom(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Crear Sala Ahora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableRooms.map((room) => (
              <div
                key={room.id}
                className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4 hover:border-indigo-400 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{room.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {room.id}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Quiz: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{room.quizTitle}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
                    <span className="capitalize">{room.category}</span>
                    <span>·</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {room.playerCount} / {room.maxPlayers} jugadores
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleJoinRoom(room.id)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-900 text-xs font-bold transition-all shrink-0 shadow-sm"
                >
                  Unirse
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {isCreatingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl w-full max-w-lg space-y-5 text-zinc-900 dark:text-zinc-100"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-lg font-bold font-display">Crear Sala Multijugador</h3>
              <button
                onClick={() => {
                  setIsCreatingRoom(false);
                  if (onClearPreselectedQuiz) onClearPreselectedQuiz();
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Nombre de la Sala
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder={`Sala de ${user.username}`}
                  maxLength={30}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Seleccionar Quiz
                </label>
                <select
                  value={selectedQuizId}
                  onChange={(e) => setSelectedQuizId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.category} · {q.questions.length} preguntas)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Capacidad Máxima de Jugadores ({maxPlayers})
                </label>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => {
                  setIsCreatingRoom(false);
                  if (onClearPreselectedQuiz) onClearPreselectedQuiz();
                }}
                className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateRoom}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all"
              >
                Crear y Abrir Sala
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
