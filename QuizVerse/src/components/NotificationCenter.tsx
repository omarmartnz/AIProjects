import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Send, Sparkles, Trophy, Users, Flame, Volume2, VolumeX } from 'lucide-react';
import { PushNotificationItem } from '../types';
import {
  NotificationSettings,
  getStoredSettings,
  saveStoredSettings,
  getStoredNotifications,
  saveStoredNotifications,
  requestPushPermission,
  triggerPushNotification,
} from '../utils/notifications';
import { sound } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const NotificationCenter: React.FC<Props> = ({ isOpen, onClose, onNavigateToTab }) => {
  const [settings, setSettings] = useState<NotificationSettings>(getStoredSettings());
  const [notifications, setNotifications] = useState<PushNotificationItem[]>(getStoredNotifications());
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    sound.playClick();
    const perm = await requestPushPermission();
    setBrowserPermission(perm);
    if (perm === 'granted') {
      const notif = triggerPushNotification(
        '🔔 ¡Notificaciones Activadas!',
        'Recibirás avisos personalizados sobre retos diarios y salas multijugador.',
        'daily'
      );
      setNotifications(getStoredNotifications());
    }
  };

  const handleToggleSetting = (key: keyof NotificationSettings) => {
    sound.playClick();
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveStoredSettings(updated);
    if (key === 'soundEnabled') {
      sound.enabled = updated.soundEnabled;
    }
  };

  const handleSendTestPush = () => {
    sound.playClick();
    const sampleNotifications = [
      {
        title: '🔥 ¡Reto Diario Disponible!',
        body: 'El reto de hoy te espera con +500 puntos para escalar en la tabla.',
        category: 'daily' as const,
      },
      {
        title: '⚔️ ¡Alguien te reta en Multijugador!',
        body: 'Hay una sala abierta esperando jugadores en la categoría Cine y Cultura.',
        category: 'multiplayer' as const,
      },
      {
        title: '🏆 ¡Nuevo récord registrado!',
        body: 'La clasificación mensual de Septiembre está muy reñida. ¡Juega ahora!',
        category: 'ranking' as const,
      },
    ];

    const pick = sampleNotifications[Math.floor(Math.random() * sampleNotifications.length)];
    triggerPushNotification(pick.title, pick.body, pick.category);
    setNotifications(getStoredNotifications());

    setTestSent(true);
    setTimeout(() => setTestSent(false), 2500);
  };

  const handleMarkAllRead = () => {
    sound.playClick();
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  const getCategoryIcon = (category: PushNotificationItem['category']) => {
    switch (category) {
      case 'daily':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'multiplayer':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'ranking':
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display">Notificaciones Push</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Personaliza tus avisos para no perderte ningún reto</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Browser Permission Banner */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">Estado del Navegador:</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      browserPermission === 'granted'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : browserPermission === 'denied'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {browserPermission === 'granted'
                      ? 'Permitidas'
                      : browserPermission === 'denied'
                      ? 'Bloqueadas en navegador'
                      : 'Pendiente de permiso'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Permite avisos push en tu dispositivo para enterarte de nuevos retos y salas al instante.
                </p>
              </div>

              {browserPermission !== 'granted' && (
                <button
                  onClick={handleRequestPermission}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shrink-0"
                >
                  Activar en Navegador
                </button>
              )}
            </div>

            {/* Notification Preference Toggles */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Preferencias de Notificaciones
              </h4>

              <div className="space-y-2">
                {[
                  {
                    key: 'dailyReminder' as const,
                    title: 'Recordatorios de Retos Diarios',
                    desc: 'Aviso diario matutino para no perder tu racha de puntuación.',
                    icon: <Flame className="w-4 h-4 text-amber-500" />,
                  },
                  {
                    key: 'multiplayerAlerts' as const,
                    title: 'Alertas de Salas Multijugador',
                    desc: 'Notificación cuando se abren salas públicas o te invitan.',
                    icon: <Users className="w-4 h-4 text-blue-500" />,
                  },
                  {
                    key: 'rankingAlerts' as const,
                    title: 'Alertas de Récords y Clasificación',
                    desc: 'Avisos cuando alguien supera tu récord o se actualiza la tabla mensual.',
                    icon: <Trophy className="w-4 h-4 text-yellow-500" />,
                  },
                  {
                    key: 'soundEnabled' as const,
                    title: 'Sonidos de la Aplicación',
                    desc: 'Efectos de audio interactivos en preguntas, aciertos y victorias.',
                    icon: settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-zinc-400" />,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => handleToggleSetting(item.key)}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 mt-0.5">
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{item.desc}</div>
                      </div>
                    </div>

                    <div
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        settings[item.key] ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                    >
                      <motion.div
                        layout
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          settings[item.key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Push Button */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  Prueba el Sistema de Push
                </div>
                <div className="text-xs text-indigo-700 dark:text-indigo-400">
                  Envía una notificación instantánea a tu pantalla para comprobar el funcionamiento.
                </div>
              </div>

              <button
                onClick={handleSendTestPush}
                disabled={testSent}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 shrink-0"
              >
                {testSent ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    ¡Enviada!
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Probar Push
                  </>
                )}
              </button>
            </div>

            {/* Notification History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Historial Reciente ({notifications.length})
                </h4>
                {notifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-xs text-zinc-400">
                    No tienes notificaciones pendientes
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-2xl border transition-colors flex items-start gap-3 ${
                        notif.read
                          ? 'bg-zinc-50/60 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800/80 opacity-70'
                          : 'bg-white dark:bg-zinc-800 border-indigo-200 dark:border-indigo-900/60 shadow-sm'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-700/60 shrink-0">
                        {getCategoryIcon(notif.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold truncate">{notif.title}</span>
                          <span className="text-[10px] text-zinc-400 whitespace-nowrap">{notif.timestamp}</span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
                          {notif.body}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold transition-all hover:opacity-90"
            >
              Listo
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
