// Browser notification utilities

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });
  }
};

export const notifyNewMessage = (
  senderName: string,
  preview: string,
  provider: 'gmail' | 'telegram'
) => {
  const icon = provider === 'gmail' ? '📧' : '💬';
  showNotification(`${icon} New message from ${senderName}`, {
    body: preview.substring(0, 100),
    tag: 'new-message',
    requireInteraction: false,
  });
};
