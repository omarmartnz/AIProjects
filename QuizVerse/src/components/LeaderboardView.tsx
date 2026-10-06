import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  Calendar,
  Globe2,
  Crown,
  Medal,
  Flame,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { LeaderboardEntry, UserProfile } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { sound } from '../utils/audio';

interface Props {
  user: UserProfile;
}

export const LeaderboardView: React.FC<Props> = ({ user }) => {
  const [tab, setTab] = useState<'monthly' | 'allTime'>('monthly');
  const [leaderboardData, setLeaderboardData] = useState<{
    currentMonth: string;
    allTime: LeaderboardEntry[];
    monthly: LeaderboardEntry[];
  }>({
    currentMonth: '2026-09',
    allTime: [],
    monthly: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/leaderboard?month=2026-09');
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data);
      }
    } catch (err) {
      console.warn('Aviso al obtener clasificación:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const list = tab === 'monthly' ? leaderboardData.monthly : leaderboardData.allTime;
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);

  // Find user rank
  const myRank = list.findIndex((e) => e.userId === user.id);
  const myEntry = myRank !== -1 ? list[myRank] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
          <Trophy className="w-3.5 h-3.5" />
          Salón de la Fama y Récords
        </div>
        <h2 className="text-3xl font-extrabold font-display text-zinc-900 dark:text-zinc-100">
          Tabla de Clasificación Oficial
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          Gana quien tenga más puntos. Compite en partidas individuales o salas multijugador para ascender en el ranking mensual y global.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 gap-1">
          <button
            onClick={() => {
              sound.playClick();
              setTab('monthly');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'monthly'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Septiembre 2026 (Mensual)
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setTab('allTime');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'allTime'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Globe2 className="w-4 h-4" />
            Récord Global Histórico
          </button>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {/* Rank 2 (Silver) */}
          {top3[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="sm:order-1 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center relative"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 flex items-center justify-center text-slate-500 font-bold text-xs absolute top-4 left-4">
                #2
              </div>
              <AvatarDisplay avatar={top3[1].avatar} size="lg" animate />
              <div className="mt-3 font-bold font-display text-sm truncate max-w-full text-zinc-900 dark:text-zinc-100">
                {top3[1].username}
              </div>
              <span className="text-[10px] text-zinc-400 font-medium">
                {top3[1].avatar.title}
              </span>

              <div className="mt-4 w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Puntuación</div>
                <div className="text-xl font-black font-display text-zinc-800 dark:text-zinc-200">
                  {(tab === 'monthly' ? top3[1].monthlyScore : top3[1].score).toLocaleString()} pts
                </div>
              </div>
            </motion.div>
          )}

          {/* Rank 1 (Gold - Center & Elevated) */}
          {top3[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sm:order-2 p-7 rounded-3xl bg-gradient-to-b from-amber-500/10 via-white dark:via-zinc-900 to-white dark:to-zinc-900 border-2 border-amber-400 dark:border-amber-500/60 shadow-xl flex flex-col items-center text-center relative sm:-translate-y-3"
            >
              <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm absolute top-4 left-4 shadow-md">
                <Crown className="w-4 h-4 fill-white" />
              </div>
              <div className="relative">
                <AvatarDisplay avatar={top3[0].avatar} size="xl" animate />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold uppercase shadow-sm">
                  Líder Supremo
                </span>
              </div>
              <div className="mt-4 font-black font-display text-base truncate max-w-full text-zinc-900 dark:text-zinc-100">
                {top3[0].username}
              </div>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                {top3[0].avatar.title}
              </span>

              <div className="mt-4 w-full p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30">
                <div className="text-[10px] uppercase font-extrabold text-amber-700 dark:text-amber-300">
                  Puntuación Récord
                </div>
                <div className="text-2xl font-black font-display text-amber-600 dark:text-amber-400">
                  {(tab === 'monthly' ? top3[0].monthlyScore : top3[0].score).toLocaleString()} pts
                </div>
              </div>
            </motion.div>
          )}

          {/* Rank 3 (Bronze) */}
          {top3[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="sm:order-3 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center relative"
            >
              <div className="w-8 h-8 rounded-full bg-amber-800/15 border border-amber-800/30 flex items-center justify-center text-amber-700 font-bold text-xs absolute top-4 left-4">
                #3
              </div>
              <AvatarDisplay avatar={top3[2].avatar} size="lg" animate />
              <div className="mt-3 font-bold font-display text-sm truncate max-w-full text-zinc-900 dark:text-zinc-100">
                {top3[2].username}
              </div>
              <span className="text-[10px] text-zinc-400 font-medium">
                {top3[2].avatar.title}
              </span>

              <div className="mt-4 w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Puntuación</div>
                <div className="text-xl font-black font-display text-zinc-800 dark:text-zinc-200">
                  {(tab === 'monthly' ? top3[2].monthlyScore : top3[2].score).toLocaleString()} pts
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Ranks 4+ Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
          <span>Posición y Jugador</span>
          <span>Puntos Totales</span>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rest.map((entry) => {
            const isMe = entry.userId === user.id;
            return (
              <div
                key={entry.userId}
                className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                  isMe
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-l-4 border-indigo-600'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 text-center font-bold text-xs text-zinc-400 font-mono">
                    #{entry.rank}
                  </span>
                  <AvatarDisplay avatar={entry.avatar} size="xs" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {entry.username}
                      </span>
                      {isMe && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-bold">
                          TÚ
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 truncate block">
                      {entry.avatar.title} · {entry.gamesWon} victorias ({entry.winRate}%)
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-black font-display text-indigo-600 dark:text-indigo-400">
                    {(tab === 'monthly' ? entry.monthlyScore : entry.score).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-zinc-400">puntos</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current User Summary Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AvatarDisplay avatar={user.avatar} size="sm" />
          <div>
            <div className="text-xs text-white/80 font-medium">Tu Rendimiento Personal</div>
            <div className="font-extrabold text-base font-display">
              {user.username} · {user.totalScore.toLocaleString()} pts acumulados
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-white/80">Posición estimada</span>
          <div className="text-xl font-black font-display">
            {myRank !== -1 ? `#${myRank + 1}` : '#Top 10'}
          </div>
        </div>
      </div>
    </div>
  );
};
