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

// Toast notification system
type ToastType = 'success' | 'error' | 'warning' | 'info';

const createToast = (message: string, type: ToastType) => {
  // Remove existing toasts of the same type
  const existingToasts = document.querySelectorAll(`.toast-${type}`);
  existingToasts.forEach((toast) => toast.remove());

  const toast = document.createElement('div');
  toast.className = `toast-${type} fixed top-4 right-4 z-50 max-w-md bg-white rounded-lg shadow-lg border p-4 flex items-start space-x-3 animate-slide-in`;
  
  const colors = {
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: '✓' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: '✕' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: '⚠' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'ℹ' },
  };

  const color = colors[type];
  toast.className += ` ${color.bg} ${color.border}`;

  toast.innerHTML = `
    <div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${color.bg} ${color.text} font-bold text-sm">
      ${color.icon}
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm ${color.text} font-medium">${message}</p>
    </div>
    <button class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors" onclick="this.parentElement.remove()">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
      </svg>
    </button>
  `;

  document.body.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slide-out 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
};

export const showSuccessNotification = (message: string) => {
  createToast(message, 'success');
};

export const showErrorNotification = (message: string) => {
  createToast(message, 'error');
};

export const showWarningNotification = (message: string) => {
  createToast(message, 'warning');
};

export const showInfoNotification = (message: string) => {
  createToast(message, 'info');
};
