import { PushNotificationItem } from '../types';

export interface NotificationSettings {
  dailyReminder: boolean;
  multiplayerAlerts: boolean;
  rankingAlerts: boolean;
  soundEnabled: boolean;
}

const SETTINGS_KEY = 'trivia_notification_settings';
const HISTORY_KEY = 'trivia_notification_history';

export const DEFAULT_SETTINGS: NotificationSettings = {
  dailyReminder: true,
  multiplayerAlerts: true,
  rankingAlerts: true,
  soundEnabled: true,
};

export const INITIAL_NOTIFICATIONS: PushNotificationItem[] = [
  {
    id: 'notif-1',
    title: '🔥 ¡Reto Diario Disponible!',
    body: 'El reto de hoy "Reto del Saber Universal" tiene +500 puntos de bonificación esperándote.',
    category: 'daily',
    timestamp: 'Hace 10 min',
    read: false,
  },
  {
    id: 'notif-2',
    title: '🏆 Clasificación Mensual Actualizada',
    body: '¡Valkiria_Quiz lidera el mes de Septiembre con 4.820 pts! ¿Podrás superarla?',
    category: 'ranking',
    timestamp: 'Hace 1 hora',
    read: false,
  },
  {
    id: 'notif-3',
    title: '⚔️ Salas Multijugador Activas',
    body: 'Hay jugadores esperando en salas públicas para competir en tiempo real.',
    category: 'multiplayer',
    timestamp: 'Hace 2 horas',
    read: true,
  },
];

export function getStoredSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore error
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore error
  }
}

export function getStoredNotifications(): PushNotificationItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore error
  }
  return INITIAL_NOTIFICATIONS;
}

export function saveStoredNotifications(notifs: PushNotificationItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(notifs));
  } catch {
    // Ignore error
  }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function triggerPushNotification(
  title: string,
  body: string,
  category: 'daily' | 'multiplayer' | 'ranking' | 'quiz' = 'daily'
): PushNotificationItem {
  const item: PushNotificationItem = {
    id: `notif-${Date.now()}`,
    title,
    body,
    category,
    timestamp: 'Ahora mismo',
    read: false,
  };

  // Browser Notification if granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    } catch {
      // Fallback handled smoothly
    }
  }

  // Update local history
  const history = getStoredNotifications();
  history.unshift(item);
  saveStoredNotifications(history.slice(0, 20));

  return item;
}
