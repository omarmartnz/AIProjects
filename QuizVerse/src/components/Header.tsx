import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Trophy,
  Flame,
  PlusCircle,
  Users,
  Compass,
  Sun,
  Moon,
  Bell,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { UserProfile, PushNotificationItem } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { sound } from '../utils/audio';

interface Props {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  user: UserProfile;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAvatarModal: () => void;
  onOpenNotificationsModal: () => void;
  unreadCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  user,
  isDark,
  onToggleTheme,
  onOpenAvatarModal,
  onOpenNotificationsModal,
  unreadCount,
  soundEnabled,
  onToggleSound,
}) => {
  const navItems = [
    { id: 'explore', label: 'Explorar', icon: Compass },
    { id: 'multiplayer', label: 'Multijugador', icon: Users, badge: 'En Vivo' },
    { id: 'create', label: 'Crear Quiz', icon: PlusCircle },
    { id: 'leaderboard', label: 'Récords', icon: Trophy },
    { id: 'daily', label: 'Reto Diario', icon: Flame, highlight: true },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo Brand */}
          <div
            onClick={() => {
              sound.playClick();
              onSelectTab('explore');
            }}
            className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight font-display bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Trivia Quiz
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-md">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block">
                Multijugador & Saber
              </p>
            </div>
          </div>

          {/* Center Navigation for Desktop */}
          <nav className="hidden md:flex items-center gap-1.5 bg-zinc-100/80 dark:bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    sound.playClick();
                    onSelectTab(item.id);
                  }}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-indigo-600 rounded-xl"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className={`w-4 h-4 ${item.highlight && !isActive ? 'text-amber-500' : ''}`} />
                    {item.label}
                    {item.badge && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-pink-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Daily Streak Pill */}
            <div
              onClick={() => {
                sound.playClick();
                onSelectTab('daily');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 cursor-pointer hover:scale-105 transition-transform"
              title="Tu racha diaria de quiz"
            >
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-bounce" />
              <span className="text-xs font-bold">{user.streakDays}d</span>
            </div>

            {/* Sound Mute Toggle */}
            <button
              onClick={onToggleSound}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
            </button>

            {/* Push Notification Center Bell */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenNotificationsModal();
              }}
              className="relative p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Notificaciones push"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white dark:border-zinc-950 rounded-full animate-ping" />
              )}
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white dark:border-zinc-950 rounded-full" />
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => {
                sound.playClick();
                onToggleTheme();
              }}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* User Profile Pill */}
            <div
              onClick={() => {
                sound.playClick();
                onOpenAvatarModal();
              }}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-all hover:scale-[1.02]"
              title="Personalizar tu avatar y perfil"
            >
              <AvatarDisplay avatar={user.avatar} size="xs" />
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold leading-tight truncate max-w-[100px]">
                  {user.username}
                </div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold leading-tight">
                  {user.totalScore.toLocaleString()} pts
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar at bottom or inline */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  sound.playClick();
                  onSelectTab(item.id);
                }}
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
