// Hyprova Health Notification & Reminder Service

export interface NotificationSettings {
  enabled: boolean;
  morningReminder: boolean; // 08:00
  morningTime: string; // "08:00"
  hydrationReminder: boolean; // every 3 hours
  eveningReminder: boolean; // 21:00
  eveningTime: string; // "21:00"
}

const STORAGE_KEY = 'hyprova_notification_config';

export const getStoredNotificationConfig = (): NotificationSettings => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
  }
  return {
    enabled: true,
    morningReminder: true,
    morningTime: '08:30',
    hydrationReminder: true,
    eveningReminder: true,
    eveningTime: '21:00'
  };
};

export const saveNotificationConfig = (config: NotificationSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    console.warn('Could not request notification permission', e);
    return 'denied';
  }
};

export const sendNotification = (title: string, body: string, icon = '✨'): boolean => {
  // Check browser Notification API
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png'
      });
      return true;
    } catch (e) {
      console.warn('Browser notification failed, falling back to in-app event', e);
    }
  }

  // Dispatch custom in-app event for UI toast
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('hyprova-toast', {
      detail: { title, body, icon }
    });
    window.dispatchEvent(event);
  }
  return true;
};

export const testNotification = async (): Promise<{ granted: boolean; permission: string }> => {
  let perm: string = 'granted';
  if ('Notification' in window) {
    if (Notification.permission !== 'granted') {
      perm = await Notification.requestPermission();
    } else {
      perm = Notification.permission;
    }
  }

  sendNotification(
    'Hyprova Vitality Check-in',
    'How are you feeling right now? Take 10 seconds to log your energy and mood to update your Vitality Score.',
    '⚡'
  );

  return { granted: perm === 'granted', permission: perm };
};

// Scheduler hook/check
let schedulerInterval: any = null;

export const startNotificationScheduler = () => {
  if (schedulerInterval) clearInterval(schedulerInterval);

  schedulerInterval = setInterval(() => {
    const config = getStoredNotificationConfig();
    if (!config.enabled) return;

    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const todayStr = now.toISOString().split('T')[0];

    const lastTriggeredMorning = localStorage.getItem('hyprova_last_morning_notif');
    if (config.morningReminder && currentTimeStr === config.morningTime && lastTriggeredMorning !== todayStr) {
      localStorage.setItem('hyprova_last_morning_notif', todayStr);
      sendNotification(
        'Good Morning! ☀️',
        'Ready for your morning check-in? Log your sleep quality and starting energy.',
        '🌅'
      );
    }

    const lastTriggeredEvening = localStorage.getItem('hyprova_last_evening_notif');
    if (config.eveningReminder && currentTimeStr === config.eveningTime && lastTriggeredEvening !== todayStr) {
      localStorage.setItem('hyprova_last_evening_notif', todayStr);
      sendNotification(
        'Evening Wind-down 🌙',
        'Review your daily vitality forecast and log your evening recovery state.',
        '🌙'
      );
    }
  }, 30000); // Check every 30s
};
