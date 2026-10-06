import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quiz, UserProfile, DailyChallenge, PushNotificationItem } from './types';
import { INITIAL_QUIZZES, TODAY_DAILY_CHALLENGE, DEFAULT_AVATARS } from './data/seedData';
import { Header } from './components/Header';
import { QuizLibrary } from './components/QuizLibrary';
import { SoloGameView } from './components/SoloGameView';
import { MultiplayerView } from './components/MultiplayerView';
import { QuizCreator } from './components/QuizCreator';
import { LeaderboardView } from './components/LeaderboardView';
import { DailyChallengeView } from './components/DailyChallengeView';
import { AvatarCustomizer } from './components/AvatarCustomizer';
import { NotificationCenter } from './components/NotificationCenter';
import { sound } from './utils/audio';
import { getStoredNotifications, getStoredSettings } from './utils/notifications';

const USER_STORAGE_KEY = 'trivia_master_user_profile';
const THEME_STORAGE_KEY = 'trivia_master_theme';

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved !== null) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return true;
    }
  });

  // Apply dark mode class to root HTML
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [isDark]);

  // User Profile
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return {
      id: `user-${Math.floor(1000 + Math.random() * 9000)}`,
      username: 'NeoQuizzer',
      avatar: DEFAULT_AVATARS.alex,
      totalScore: 1250,
      gamesPlayed: 4,
      gamesWon: 2,
      streakDays: 3,
      lastDailyDate: '2026-09-08',
      completedDailyChallenges: [],
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore
    }
  }, [user]);

  // Quizzes list from server
  const [quizzes, setQuizzes] = useState<Quiz[]>(INITIAL_QUIZZES);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge>(TODAY_DAILY_CHALLENGE);

  // Active view state
  const [activeTab, setActiveTab] = useState<string>('explore');
  const [playingQuiz, setPlayingQuiz] = useState<Quiz | null>(null);
  const [multiplayerPreselectedQuiz, setMultiplayerPreselectedQuiz] = useState<Quiz | null>(null);

  // Modals state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Notification state
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(2);
  const [activePushToast, setActivePushToast] = useState<PushNotificationItem | null>(null);

  // Fetch initial quizzes & daily challenge from server
  useEffect(() => {
    fetch('/api/quizzes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setQuizzes(data);
        }
      })
      .catch((err) => console.log('Using initial fallback seed data', err));

    fetch('/api/daily-challenge')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setDailyChallenge(data);
        }
      })
      .catch(() => {});

    // Notification sound preference
    const settings = getStoredSettings();
    setSoundEnabled(settings.soundEnabled);
    sound.enabled = settings.soundEnabled;

    const notifs = getStoredNotifications();
    const unread = notifs.filter((n) => !n.read).length;
    setUnreadNotificationsCount(unread);
  }, []);

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
  };

  const handlePlaySolo = (quiz: Quiz) => {
    setPlayingQuiz(quiz);
    setActiveTab('game_solo');
  };

  const handleCreateMultiplayerWithQuiz = (quiz: Quiz) => {
    setMultiplayerPreselectedQuiz(quiz);
    setActiveTab('multiplayer');
  };

  const handleFinishSoloGame = (pointsEarned: number, correctCount: number, totalQuestions: number) => {
    const isDaily = playingQuiz?.id === dailyChallenge.quizId;
    const meetsDailyGoal = correctCount >= dailyChallenge.requiredCorrect;
    const bonus = isDaily && meetsDailyGoal ? dailyChallenge.bonusPoints : 0;

    setUser((prev) => {
      const newCompleted = isDaily && meetsDailyGoal && !prev.completedDailyChallenges.includes(dailyChallenge.id)
        ? [...prev.completedDailyChallenges, dailyChallenge.id]
        : prev.completedDailyChallenges;

      const newStreak = isDaily && meetsDailyGoal ? prev.streakDays + 1 : prev.streakDays;

      return {
        ...prev,
        totalScore: prev.totalScore + pointsEarned + bonus,
        gamesPlayed: prev.gamesPlayed + 1,
        gamesWon: correctCount >= Math.ceil(totalQuestions * 0.7) ? prev.gamesWon + 1 : prev.gamesWon,
        streakDays: newStreak,
        completedDailyChallenges: newCompleted,
      };
    });
  };

  const handleQuizCreated = (newQuiz: Quiz) => {
    setQuizzes((prev) => [newQuiz, ...prev]);
    setActiveTab('explore');
    // Show in-app celebration toast
    setActivePushToast({
      id: `toast-${Date.now()}`,
      title: '🎉 ¡Quiz Publicado con Éxito!',
      body: `"${newQuiz.title}" ya está disponible para toda la comunidad.`,
      category: 'quiz',
      timestamp: 'Ahora',
      read: true,
    });
    setTimeout(() => setActivePushToast(null), 4000);
  };

  const handleUpdateUserScore = (points: number) => {
    setUser((prev) => ({
      ...prev,
      totalScore: prev.totalScore + points,
      gamesPlayed: prev.gamesPlayed + 1,
      gamesWon: prev.gamesWon + 1,
    }));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-300">
      {/* Push Notification In-App Toast Banner */}
      <AnimatePresence>
        {activePushToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className="fixed top-20 right-4 z-50 max-w-sm p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-900/60 shadow-2xl flex items-start gap-3"
          >
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              🔔
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold truncate">{activePushToast.title}</h5>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                {activePushToast.body}
              </p>
            </div>
            <button
              onClick={() => setActivePushToast(null)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main App Navigation Header */}
      <Header
        activeTab={activeTab === 'game_solo' ? 'explore' : activeTab}
        onSelectTab={(tab) => {
          setPlayingQuiz(null);
          setActiveTab(tab);
        }}
        user={user}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onOpenAvatarModal={() => setIsAvatarModalOpen(true)}
        onOpenNotificationsModal={() => {
          setIsNotificationsModalOpen(true);
          setUnreadNotificationsCount(0);
        }}
        unreadCount={unreadNotificationsCount}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Dynamic View with Smooth Motion Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'explore' && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <QuizLibrary
                quizzes={quizzes}
                onPlaySolo={handlePlaySolo}
                onCreateMultiplayer={handleCreateMultiplayerWithQuiz}
                onNavigateToCreate={() => setActiveTab('create')}
              />
            </motion.div>
          )}

          {activeTab === 'game_solo' && playingQuiz && (
            <motion.div
              key="game_solo"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <SoloGameView
                quiz={playingQuiz}
                user={user}
                onFinishGame={handleFinishSoloGame}
                onExit={() => {
                  setPlayingQuiz(null);
                  setActiveTab('explore');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'multiplayer' && (
            <motion.div
              key="multiplayer"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <MultiplayerView
                user={user}
                quizzes={quizzes}
                preselectedQuiz={multiplayerPreselectedQuiz}
                onClearPreselectedQuiz={() => setMultiplayerPreselectedQuiz(null)}
                onUpdateUserScore={handleUpdateUserScore}
              />
            </motion.div>
          )}

          {activeTab === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <QuizCreator
                user={user}
                onQuizCreated={handleQuizCreated}
                onCancel={() => setActiveTab('explore')}
              />
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <LeaderboardView user={user} />
            </motion.div>
          )}

          {activeTab === 'daily' && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <DailyChallengeView
                dailyChallenge={dailyChallenge}
                user={user}
                quiz={quizzes.find((q) => q.id === dailyChallenge.quizId) || quizzes[0]}
                onPlayChallenge={handlePlaySolo}
                onOpenNotifications={() => setIsNotificationsModalOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800/80 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Trivia Quiz Multijugador en Tiempo Real · Competición Global</span>
          <span>Desafía a tus amigos con cuestionarios públicos y gana medallas</span>
        </div>
      </footer>

      {/* Avatar Customizer Modal */}
      <AvatarCustomizer
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        user={user}
        onSave={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
      />

      {/* Push Notification Center Modal */}
      <NotificationCenter
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        onNavigateToTab={(tab) => {
          setIsNotificationsModalOpen(false);
          setActiveTab(tab);
        }}
      />
    </div>
  );
}
