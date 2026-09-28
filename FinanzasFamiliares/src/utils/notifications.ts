/**
 * Notification management utilities for Finanzas Familiares
 * Supports Web Notifications API, permission handling, and optional audio chime.
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionStatus;
  } catch (err) {
    console.warn('Error solicitando permisos de notificación:', err);
    return Notification.permission as NotificationPermissionStatus;
  }
}

/**
 * Play a subtle, pleasant audio chime using Web Audio API (no external sound files needed).
 */
export function playNotificationSound(type: 'warning' | 'danger' | 'success' = 'warning') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    gainNode.gain.setValueAtTime(0.08, now);

    if (type === 'danger') {
      // Urgent tone
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(440.00, now + 0.12); // A4
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.36);
    } else if (type === 'success') {
      // Upbeat friendly chime
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc2.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.45);
    } else {
      // Gentle warning chime
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(587.33, now + 0.12); // D5
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.32);
    }
  } catch (_) {
    // AudioContext may be restricted by autoplay policy until user gesture
  }
}

export interface ShowNotificationOptions {
  body: string;
  icon?: string;
  tag?: string;
  playSound?: boolean;
  soundType?: 'warning' | 'danger' | 'success';
}

/**
 * Dispatches a native browser notification if permissions are granted.
 */
export function showBrowserNotification(
  title: string,
  options: ShowNotificationOptions
): boolean {
  if (!isNotificationSupported()) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    if (options.playSound) {
      playNotificationSound(options.soundType || 'warning');
    }

    const n = new Notification(title, {
      body: options.body,
      icon: options.icon || '/icon.svg',
      badge: '/icon.svg',
      tag: options.tag || 'finanzas-alert',
    });

    n.onclick = () => {
      window.focus();
      n.close();
    };

    // Auto-close after 6 seconds
    setTimeout(() => {
      try {
        n.close();
      } catch (_) {}
    }, 6000);

    return true;
  } catch (e) {
    console.warn('No se pudo desplegar la notificación del navegador:', e);
    return false;
  }
}
