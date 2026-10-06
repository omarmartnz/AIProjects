import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { INITIAL_QUIZZES, INITIAL_LEADERBOARD, TODAY_DAILY_CHALLENGE } from './src/data/seedData';
import { Quiz, LeaderboardEntry, MultiplayerRoom, RoomPlayer, ChatMessage } from './src/types';

const PORT = 3000;

interface ClientSocket extends WebSocket {
  roomId?: string;
  playerId?: string;
  isAlive?: boolean;
}

// In-memory persistent state
let quizzes: Quiz[] = [...INITIAL_QUIZZES];
let leaderboard: LeaderboardEntry[] = [...INITIAL_LEADERBOARD];
const activeRooms: Map<string, MultiplayerRoom> = new Map();
const roomTimers: Map<string, NodeJS.Timeout> = new Map();

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const parsedUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;
      if (pathname === '/ws' || pathname === '/' || pathname === '') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  // Heartbeat to clean broken connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as ClientSocket;
      if (client.isAlive === false) return client.terminate();
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  // REST API Endpoints
  app.get('/api/quizzes', (req, res) => {
    const category = req.query.category as string;
    const search = req.query.search as string;

    let filtered = [...quizzes];
    if (category && category !== 'todos') {
      filtered = filtered.filter((q) => q.category === category);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (q) => q.title.toLowerCase().includes(s) || q.description.toLowerCase().includes(s)
      );
    }
    res.json(filtered);
  });

  app.get('/api/quizzes/:id', (req, res) => {
    const quiz = quizzes.find((q) => q.id === req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }
    res.json(quiz);
  });

  app.post('/api/quizzes', (req, res) => {
    const newQuiz: Quiz = {
      ...req.body,
      id: `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString().split('T')[0],
      playsCount: 0,
      rating: 5.0,
      isPublic: true,
    };

    if (!newQuiz.title || !newQuiz.questions || newQuiz.questions.length === 0) {
      return res.status(400).json({ error: 'El quiz debe tener un título y al menos una pregunta.' });
    }

    quizzes.unshift(newQuiz);
    res.status(201).json(newQuiz);
  });

  app.get('/api/leaderboard', (req, res) => {
    const month = (req.query.month as string) || '2026-09';
    const sortedAllTime = [...leaderboard].sort((a, b) => b.score - a.score);
    const sortedMonthly = [...leaderboard]
      .filter((e) => e.month === month)
      .sort((a, b) => b.monthlyScore - a.monthlyScore);

    res.json({
      currentMonth: month,
      allTime: sortedAllTime.map((entry, index) => ({ ...entry, rank: index + 1 })),
      monthly: sortedMonthly.map((entry, index) => ({ ...entry, rank: index + 1 })),
    });
  });

  app.post('/api/leaderboard/submit', (req, res) => {
    const { userId, username, avatar, pointsEarned, won } = req.body;
    if (!userId || !username || typeof pointsEarned !== 'number') {
      return res.status(400).json({ error: 'Datos de puntuación incompletos' });
    }

    const currentMonth = '2026-09';
    let userEntry = leaderboard.find((e) => e.userId === userId);

    if (userEntry) {
      userEntry.score += pointsEarned;
      userEntry.monthlyScore += pointsEarned;
      if (won) userEntry.gamesWon += 1;
      userEntry.username = username;
      if (avatar) userEntry.avatar = avatar;
    } else {
      userEntry = {
        rank: leaderboard.length + 1,
        userId,
        username,
        avatar: avatar || INITIAL_LEADERBOARD[0].avatar,
        score: pointsEarned,
        monthlyScore: pointsEarned,
        month: currentMonth,
        gamesWon: won ? 1 : 0,
        winRate: won ? 100 : 0,
      };
      leaderboard.push(userEntry);
    }

    // Re-sort
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    res.json({ success: true, updatedEntry: userEntry });
  });

  app.get('/api/daily-challenge', (req, res) => {
    res.json(TODAY_DAILY_CHALLENGE);
  });

  app.get('/api/rooms', (req, res) => {
    const list = Array.from(activeRooms.values())
      .filter((r) => r.status === 'waiting' || r.status === 'starting')
      .map((r) => ({
        id: r.id,
        name: r.name,
        quizTitle: r.quiz.title,
        category: r.quiz.category,
        playerCount: Object.keys(r.players).length,
        maxPlayers: r.maxPlayers,
        status: r.status,
      }));
    res.json(list);
  });

  // Helper to broadcast room state to all clients connected to room
  function broadcastToRoom(roomId: string, messageObj: object) {
    const data = JSON.stringify(messageObj);
    wss.clients.forEach((client) => {
      const c = client as ClientSocket;
      if (c.roomId === roomId && c.readyState === WebSocket.OPEN) {
        c.send(data);
      }
    });
  }

  function advanceQuestionCycle(roomId: string) {
    const room = activeRooms.get(roomId);
    if (!room) return;

    // Move to next question or finish
    const nextIdx = room.currentQuestionIndex + 1;
    if (nextIdx >= room.quiz.questions.length) {
      room.status = 'finished';
      broadcastToRoom(roomId, {
        type: 'GAME_FINISHED',
        room,
        podium: Object.values(room.players).sort((a, b) => b.score - a.score),
      });

      // Automatically register winner score to leaderboard
      const sorted = Object.values(room.players).sort((a, b) => b.score - a.score);
      if (sorted.length > 0) {
        const winner = sorted[0];
        const existing = leaderboard.find((e) => e.userId === winner.id);
        if (existing) {
          existing.score += winner.score;
          existing.monthlyScore += winner.score;
          existing.gamesWon += 1;
        } else {
          leaderboard.push({
            rank: leaderboard.length + 1,
            userId: winner.id,
            username: winner.username,
            avatar: winner.avatar,
            score: winner.score,
            monthlyScore: winner.score,
            month: '2026-09',
            gamesWon: 1,
            winRate: 100,
          });
        }
      }
      return;
    }

    room.currentQuestionIndex = nextIdx;
    room.status = 'question';
    const currentQ = room.quiz.questions[nextIdx];
    room.questionDurationSeconds = currentQ.timeLimitSeconds || 15;
    room.questionStartTime = Date.now();

    // Reset player answers for this question
    Object.values(room.players).forEach((p) => {
      p.currentAnswer = null;
      p.answerTimeMs = null;
      p.isCorrect = null;
    });

    broadcastToRoom(roomId, {
      type: 'QUESTION_START',
      room,
      questionIndex: nextIdx,
      question: {
        id: currentQ.id,
        text: currentQ.text,
        options: currentQ.options,
        timeLimitSeconds: room.questionDurationSeconds,
        category: currentQ.category,
      },
    });

    // Set timer for reveal
    if (roomTimers.has(roomId)) {
      clearTimeout(roomTimers.get(roomId)!);
    }

    const timer = setTimeout(() => {
      revealAnswer(roomId);
    }, room.questionDurationSeconds * 1000);

    roomTimers.set(roomId, timer);
  }

  function revealAnswer(roomId: string) {
    const room = activeRooms.get(roomId);
    if (!room || room.status !== 'question') return;

    room.status = 'reveal';
    const currentQ = room.quiz.questions[room.currentQuestionIndex];
    const correctIdx = currentQ.correctOptionIndex;

    // Calculate score for each player
    Object.values(room.players).forEach((p) => {
      if (p.currentAnswer === correctIdx) {
        p.isCorrect = true;
        const timeFraction = Math.max(0, 1 - (p.answerTimeMs || 5000) / (room.questionDurationSeconds * 1000));
        p.streak = (p.streak || 0) + 1;
        const speedBonus = Math.round(timeFraction * 500);
        const streakBonus = Math.min(p.streak * 50, 300);
        const earned = 500 + speedBonus + streakBonus;
        p.score += earned;
      } else {
        p.isCorrect = false;
        p.streak = 0;
      }
    });

    broadcastToRoom(roomId, {
      type: 'QUESTION_REVEAL',
      room,
      correctOptionIndex: correctIdx,
      explanation: currentQ.explanation,
    });

    // Wait 4.5 seconds on reveal screen, then advance to next question
    const nextTimer = setTimeout(() => {
      advanceQuestionCycle(roomId);
    }, 4500);

    roomTimers.set(roomId, nextTimer);
  }

  // WebSocket Connection Handler
  wss.on('connection', (ws: ClientSocket) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('error', (err) => {
      console.warn('Aviso conexión WebSocket cliente:', err?.message || err);
    });

    ws.on('message', (messageRaw: string) => {
      try {
        const text = messageRaw.toString().trim();
        if (!text || text === 'ping') return;
        const data = JSON.parse(text);
        const { type } = data;

        if (type === 'CREATE_ROOM') {
          const { roomName, quizId, customQuiz, player, maxPlayers } = data;
          const roomId = `QUIZ-${Math.floor(100 + Math.random() * 900)}`;
          const selectedQuiz = customQuiz || quizzes.find((q) => q.id === quizId) || quizzes[0];

          const newRoom: MultiplayerRoom = {
            id: roomId,
            name: roomName || `Sala de ${player.username}`,
            hostId: player.id,
            quiz: selectedQuiz,
            status: 'waiting',
            currentQuestionIndex: -1,
            questionStartTime: 0,
            questionDurationSeconds: 15,
            players: {
              [player.id]: {
                id: player.id,
                username: player.username,
                avatar: player.avatar,
                isHost: true,
                isReady: true,
                score: 0,
                currentAnswer: null,
                answerTimeMs: null,
                isCorrect: null,
                streak: 0,
              },
            },
            chat: [
              {
                id: `msg-${Date.now()}`,
                senderId: 'system',
                senderName: 'Sistema',
                senderAvatar: player.avatar,
                text: `¡Sala creada! Código de acceso: ${roomId}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isSystem: true,
              },
            ],
            maxPlayers: maxPlayers || 8,
          };

          activeRooms.set(roomId, newRoom);
          ws.roomId = roomId;
          ws.playerId = player.id;

          ws.send(JSON.stringify({ type: 'ROOM_CREATED', room: newRoom }));
        } else if (type === 'JOIN_ROOM') {
          const { roomId, player } = data;
          const room = activeRooms.get(roomId?.toUpperCase());

          if (!room) {
            return ws.send(JSON.stringify({ type: 'ERROR', message: 'Sala no encontrada con ese código' }));
          }

          if (Object.keys(room.players).length >= room.maxPlayers) {
            return ws.send(JSON.stringify({ type: 'ERROR', message: 'La sala está completa' }));
          }

          if (room.status !== 'waiting') {
            return ws.send(JSON.stringify({ type: 'ERROR', message: 'La partida ya ha comenzado' }));
          }

          ws.roomId = room.id;
          ws.playerId = player.id;

          room.players[player.id] = {
            id: player.id,
            username: player.username,
            avatar: player.avatar,
            isHost: false,
            isReady: false,
            score: 0,
            currentAnswer: null,
            answerTimeMs: null,
            isCorrect: null,
            streak: 0,
          };

          const joinMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            senderId: 'system',
            senderName: 'Sistema',
            senderAvatar: player.avatar,
            text: `${player.username} se ha unido a la sala`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true,
          };
          room.chat.push(joinMsg);

          broadcastToRoom(room.id, { type: 'ROOM_UPDATED', room });
        } else if (type === 'TOGGLE_READY') {
          if (!ws.roomId || !ws.playerId) return;
          const room = activeRooms.get(ws.roomId);
          if (!room || !room.players[ws.playerId]) return;

          room.players[ws.playerId].isReady = !room.players[ws.playerId].isReady;
          broadcastToRoom(room.id, { type: 'ROOM_UPDATED', room });
        } else if (type === 'SEND_CHAT') {
          if (!ws.roomId || !ws.playerId) return;
          const room = activeRooms.get(ws.roomId);
          if (!room || !room.players[ws.playerId]) return;

          const player = room.players[ws.playerId];
          const newMsg: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            senderId: player.id,
            senderName: player.username,
            senderAvatar: player.avatar,
            text: data.text.slice(0, 180),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          room.chat.push(newMsg);
          if (room.chat.length > 50) room.chat.shift();

          broadcastToRoom(room.id, { type: 'CHAT_MESSAGE', message: newMsg, room });
        } else if (type === 'START_GAME') {
          if (!ws.roomId || !ws.playerId) return;
          const room = activeRooms.get(ws.roomId);
          if (!room) return;

          if (room.hostId !== ws.playerId) {
            return ws.send(JSON.stringify({ type: 'ERROR', message: 'Solo el anfitrión puede iniciar la partida' }));
          }

          room.status = 'starting';
          broadcastToRoom(room.id, { type: 'GAME_STARTING', countdown: 3 });

          setTimeout(() => {
            advanceQuestionCycle(room.id);
          }, 3000);
        } else if (type === 'SUBMIT_ANSWER') {
          if (!ws.roomId || !ws.playerId) return;
          const room = activeRooms.get(ws.roomId);
          if (!room || room.status !== 'question') return;

          const player = room.players[ws.playerId];
          if (!player) return;

          player.currentAnswer = data.optionIndex;
          player.answerTimeMs = Math.max(100, Date.now() - room.questionStartTime);

          broadcastToRoom(room.id, {
            type: 'PLAYER_ANSWERED',
            playerId: player.id,
            room,
          });

          // Check if all players answered
          const allAnswered = Object.values(room.players).every((p) => p.currentAnswer !== null);
          if (allAnswered) {
            if (roomTimers.has(room.id)) {
              clearTimeout(roomTimers.get(room.id)!);
            }
            revealAnswer(room.id);
          }
        } else if (type === 'LEAVE_ROOM') {
          if (!ws.roomId || !ws.playerId) return;
          const room = activeRooms.get(ws.roomId);
          if (room) {
            delete room.players[ws.playerId];
            if (Object.keys(room.players).length === 0) {
              if (roomTimers.has(room.id)) {
                clearTimeout(roomTimers.get(room.id)!);
                roomTimers.delete(room.id);
              }
              activeRooms.delete(room.id);
            } else {
              // If host left, appoint new host
              if (room.hostId === ws.playerId) {
                const nextHostId = Object.keys(room.players)[0];
                room.hostId = nextHostId;
                room.players[nextHostId].isHost = true;
              }
              broadcastToRoom(room.id, { type: 'ROOM_UPDATED', room });
            }
          }
          ws.roomId = undefined;
          ws.playerId = undefined;
        }
      } catch (err) {
        console.warn('Aviso procesando mensaje WebSocket:', err);
      }
    });

    ws.on('close', () => {
      if (ws.roomId && ws.playerId) {
        const room = activeRooms.get(ws.roomId);
        if (room) {
          delete room.players[ws.playerId];
          if (Object.keys(room.players).length === 0) {
            if (roomTimers.has(room.id)) {
              clearTimeout(roomTimers.get(room.id)!);
              roomTimers.delete(room.id);
            }
            activeRooms.delete(room.id);
          } else {
            if (room.hostId === ws.playerId) {
              const nextHostId = Object.keys(room.players)[0];
              room.hostId = nextHostId;
              room.players[nextHostId].isHost = true;
            }
            broadcastToRoom(room.id, { type: 'ROOM_UPDATED', room });
          }
        }
      }
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Trivia Quiz Server activo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
