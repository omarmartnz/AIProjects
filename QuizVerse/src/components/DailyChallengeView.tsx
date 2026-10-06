import React from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  Calendar,
  Gift,
  CheckCircle,
  Play,
  Bell,
  Sparkles,
  Zap,
  Award,
} from 'lucide-react';
import { DailyChallenge, Quiz, UserProfile } from '../types';
import { sound } from '../utils/audio';
import { triggerPushNotification } from '../utils/notifications';

interface Props {
  dailyChallenge: DailyChallenge;
  user: UserProfile;
  quiz?: Quiz;
  onPlayChallenge: (quiz: Quiz) => void;
  onOpenNotifications: () => void;
}

export const DailyChallengeView: React.FC<Props> = ({
  dailyChallenge,
  user,
  quiz,
  onPlayChallenge,
  onOpenNotifications,
}) => {
  const isCompletedToday = user.completedDailyChallenges?.includes(dailyChallenge.id);

  const daysOfWeek = [
    { label: 'Lun', completed: true },
    { label: 'Mar', completed: true },
    { label: 'Mié', completed: isCompletedToday, today: true },
    { label: 'Jue', completed: false },
    { label: 'Vie', completed: false },
    { label: 'Sáb', completed: false },
    { label: 'Dom', completed: false },
  ];

  const handleTestReminder = () => {
    sound.playClick();
    triggerPushNotification(
      '🔥 Recordatorio de Racha Diaria',
      '¡No pierdas tu racha de 3 días! El reto diario está esperando por ti.',
      'daily'
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero Streak Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold">
              <Calendar className="w-3.5 h-3.5" />
              Retos Diarios · 9 de Septiembre
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display">
              Racha Actual: {user.streakDays} Días Consecutivos
            </h2>
            <p className="text-xs sm:text-sm text-white/90">
              Supera el desafío de cada día para ganar puntos multiplicados y defender tu racha frente a los demás competidores.
            </p>
          </div>

          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-lg">
            <Flame className="w-12 h-12 text-amber-200 fill-amber-300 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Week Progress Tracker */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Calendario Semanal de Racha
          </h3>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {isCompletedToday ? '✓ Reto de hoy superado' : 'Pendiente para hoy'}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map((day, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                day.today
                  ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10'
                  : day.completed
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 opacity-50'
              }`}
            >
              <span className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">{day.label}</span>
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                  day.completed
                    ? 'bg-emerald-500 text-white'
                    : day.today
                    ? 'bg-amber-500 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                }`}
              >
                {day.completed ? <CheckCircle className="w-4 h-4" /> : idx + 7}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Mission Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60">
              Desafío Destacado
            </span>
            <h3 className="text-xl sm:text-2xl font-bold font-display text-zinc-900 dark:text-zinc-100 mt-2">
              {dailyChallenge.title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl">
              {dailyChallenge.description}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 text-center shrink-0">
            <Award className="w-6 h-6 mx-auto" />
            <span className="text-[10px] font-extrabold uppercase mt-1 block">+{dailyChallenge.bonusPoints} pts</span>
          </div>
        </div>

        {/* Requirements Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Objetivo Mínimo</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Acertar al menos {dailyChallenge.requiredCorrect} preguntas
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Insignia Especial</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {dailyChallenge.rewardBadge}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleTestReminder}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors flex items-center justify-center gap-2"
          >
            <Bell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Programar Recordatorio Push
          </button>

          {isCompletedToday ? (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <CheckCircle className="w-4 h-4" />
              ¡Reto de hoy completado con éxito!
            </div>
          ) : (
            <button
              onClick={() => {
                if (quiz) {
                  sound.playClick();
                  onPlayChallenge(quiz);
                }
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-white" />
              Iniciar Reto Diario (+500 pts)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
