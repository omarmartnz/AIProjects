export type QuizCategory =
  | 'ciencia'
  | 'historia'
  | 'cine'
  | 'geografia'
  | 'deportes'
  | 'arte'
  | 'tecnologia'
  | 'religion'
  | 'cultura_general';

export type QuizDifficulty = 'facil' | 'medio' | 'dificil';

export interface AvatarConfig {
  skinTone: string;
  hairStyle: 'corto' | 'largo' | 'rizado' | 'cresta' | 'coleta' | 'calvo' | 'gorra' | 'auriculares';
  hairColor: string;
  expression: 'sonrisa' | 'guiño' | 'inteligente' | 'emocionado' | 'gafas_sol' | 'concentrado';
  accessory: 'ninguno' | 'gafas' | 'corona' | 'auriculares' | 'medalla' | 'varita';
  bgColor: string;
  title: string;
}

export interface Question {
  id: string;
  text: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  options: [string, string, string, string];
  correctOptionIndex: number;
  timeLimitSeconds: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  questions: Question[];
  authorName: string;
  authorAvatar: AvatarConfig;
  createdAt: string;
  playsCount: number;
  rating: number;
  isPublic: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar: AvatarConfig;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  streakDays: number;
  lastDailyDate: string;
  completedDailyChallenges: string[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: AvatarConfig;
  score: number;
  monthlyScore: number;
  month: string; // e.g. "2026-09"
  gamesWon: number;
  winRate: number;
}

export interface DailyChallenge {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  quizId: string;
  bonusPoints: number;
  requiredCorrect: number;
  rewardBadge: string;
}

export interface RoomPlayer {
  id: string;
  username: string;
  avatar: AvatarConfig;
  isHost: boolean;
  isReady: boolean;
  score: number;
  currentAnswer: number | null;
  answerTimeMs: number | null;
  isCorrect: boolean | null;
  streak: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: AvatarConfig;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface MultiplayerRoom {
  id: string;
  name: string;
  hostId: string;
  quiz: Quiz;
  status: 'waiting' | 'starting' | 'question' | 'reveal' | 'finished';
  currentQuestionIndex: number;
  questionStartTime: number;
  questionDurationSeconds: number;
  players: Record<string, RoomPlayer>;
  chat: ChatMessage[];
  maxPlayers: number;
}

export interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'daily' | 'multiplayer' | 'ranking' | 'quiz';
  timestamp: string;
  read: boolean;
}
