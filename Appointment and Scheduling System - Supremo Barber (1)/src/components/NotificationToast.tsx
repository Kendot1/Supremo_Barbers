import { useEffect, useRef } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Clock,
  Star,
  Settings,
} from 'lucide-react';
import type { Notification } from './NotificationCenter';

interface NotificationToastProps {
  notifications: Notification[];
  userId: string;
}

export function NotificationToast({ notifications, userId }: NotificationToastProps) {
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Filter notifications for current user that haven't been shown yet
    const newNotifications = notifications.filter(
      (notification) =>
        !shownNotificationsRef.current.has(notification.id) &&
        !notification.read
    );

    // Show toast for each new notification
    newNotifications.forEach((notification) => {
      shownNotificationsRef.current.add(notification.id);
      showNotificationToast(notification);
    });
  }, [notifications, userId]);

  const showNotificationToast = (notification: Notification) => {
    const getIcon = () => {
      switch (notification.type) {
        case 'payment':
          return DollarSign;
        case 'booking':
          return Calendar;
        case 'cancellation':
          return XCircle;
        case 'reschedule':
          return Clock;
        case 'review':
          return Star;
        case 'loyalty':
          return CheckCircle2;
        case 'system':
          return Settings;
        default:
          return Bell;
      }
    };

    const Icon = getIcon();

    const toastContent = (
      <div className="flex items-start gap-3 w-full">
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            ${notification.priority === 'high' && 'bg-[#FFEBEE]'}
            ${notification.priority === 'medium' && 'bg-[#FFF9F0]'}
            ${notification.priority === 'low' && 'bg-[#F5F5F5]'}
          `}
        >
          <Icon
            className={`
              w-5 h-5
              ${notification.priority === 'high' && 'text-[#E57373]'}
              ${notification.priority === 'medium' && 'text-[#DB9D47]'}
              ${notification.priority === 'low' && 'text-[#87765E]'}
            `}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[#5C4A3A] mb-1">
            {notification.title}
          </h4>
          <p className="text-sm text-[#87765E] line-clamp-2">
            {notification.message}
          </p>
        </div>
      </div>
    );

    // Show toast based on priority with custom styling
    const commonStyle = {
      background: '#FFFDF8',
      border: '1px solid #E8DCC8',
      boxShadow: '0 4px 12px rgba(92, 74, 58, 0.15)',
      padding: '16px',
      borderRadius: '12px',
      minWidth: '360px',
      maxWidth: '420px',
    };

    switch (notification.priority) {
      case 'high':
        toast(toastContent, {
          duration: 8000,
          style: {
            ...commonStyle,
            borderLeft: '4px solid #E57373',
          },
          icon: '🔴',
        });
        break;
      case 'medium':
        toast(toastContent, {
          duration: 6000,
          style: {
            ...commonStyle,
            borderLeft: '4px solid #DB9D47',
          },
          icon: '🟡',
        });
        break;
      case 'low':
        toast(toastContent, {
          duration: 5000,
          style: {
            ...commonStyle,
            borderLeft: '4px solid #87765E',
          },
          icon: '⚪',
        });
        break;
      default:
        toast(toastContent, {
          duration: 5000,
          style: commonStyle,
          icon: '🔔',
        });
    }
  };

  return null; // This component doesn't render anything
}
