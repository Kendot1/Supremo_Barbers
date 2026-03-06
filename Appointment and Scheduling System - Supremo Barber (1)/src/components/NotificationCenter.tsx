/**
 * Notification Center Component
 * Universal notification system that works for Customer, Barber, and Admin roles
 */

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import API from '../services/api.service';

interface Notification {
  id: string;
  userId: string;
  userRole: 'customer' | 'barber' | 'admin';
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  updatedAt: string;
}

// Export Notification type for backwards compatibility
export type { Notification };

/**
 * Helper function to create a notification (backwards compatibility)
 * Legacy format for older components
 */
export function createNotification(
  userId: string,
  title: string,
  message: string,
  priority: 'low' | 'normal' | 'high' = 'normal',
  metadata?: any
): Notification {
  // Map priority to notification type
  const typeMap = {
    low: 'system_alert',
    normal: 'system_alert',
    high: 'system_alert',
  };
  
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    userRole: 'customer', // Default, will be updated when saved
    type: typeMap[priority],
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...metadata,
  };
}

interface NotificationCenterProps {
  userId: string;
  userRole: 'customer' | 'barber' | 'admin';
  onNavigate?: (url: string) => void;
}

export function NotificationCenter({ userId, userRole, onNavigate }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
  // Use refs to track fetch function and prevent infinite loops
  const fetchNotificationsRef = useRef<() => Promise<void>>();
  const lastFetchParams = useRef<string>('');

  // Auto-fetch on mount and when user changes
  useEffect(() => {
    if (!userId) return;
    
    // Create a unique key for current params to prevent duplicate fetches
    const currentParams = `${userId}-${userRole}`;
    if (lastFetchParams.current === currentParams) {
      return; // Already fetched for these params
    }
    
    lastFetchParams.current = currentParams;
    
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        
        const data = await API.notifications.getByUserId(userId, userRole);
        const count = await API.notifications.getUnreadCount(userId, userRole);
        
        // Ensure data is always an array
        setNotifications(Array.isArray(data) ? data : []);
        setUnreadCount(typeof count === 'number' ? count : 0);
      } catch (error: any) {
        console.error('❌ Error fetching notifications:', error);
        // Don't show error toast on initial load - tables might not exist yet
        
        // Set empty state
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Store in ref for manual refresh button
    fetchNotificationsRef.current = fetchNotifications;
    
    // Initial fetch only
    fetchNotifications();
    
    // TEMPORARILY DISABLED polling to debug infinite loop
    // const interval = setInterval(fetchNotifications, 30000);
    // return () => clearInterval(interval);
  }, [userId, userRole]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await API.notifications.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('❌ Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await API.notifications.markAllAsRead(userId, userRole);
      
      // Update local state
      const now = new Date().toISOString();
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true, readAt: now }))
      );
      setUnreadCount(0);
      
      toast.success('All notifications marked as read');
    } catch (error: any) {
      console.error('❌ Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Delete notification
  const handleDelete = async (notificationId: string) => {
    try {
      await API.notifications.delete(notificationId);
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      toast.success('Notification deleted');
      console.log('✅ Notification deleted');
    } catch (error: any) {
      console.error('❌ Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // Navigate if action URL exists
    if (notification.actionUrl && onNavigate) {
      setIsOpen(false);
      onNavigate(notification.actionUrl);
    }
  };

  // Filter notifications
  const filteredNotifications = Array.isArray(notifications)
    ? filter === 'unread'
      ? notifications.filter(n => !n.isRead)
      : notifications
    : [];

  // Get notification icon color based on type
  const getNotificationColor = (type: string): string => {
    const colors: Record<string, string> = {
      appointment_booked: 'text-green-600',
      appointment_cancelled: 'text-red-600',
      appointment_completed: 'text-blue-600',
      payment_received: 'text-green-600',
      payment_reminder: 'text-orange-600',
      review_received: 'text-purple-600',
      new_customer: 'text-blue-600',
      system_alert: 'text-yellow-600',
      earnings_updated: 'text-green-600',
      profile_updated: 'text-gray-600',
    };
    return colors[type] || 'text-gray-600';
  };

  // Format relative time
  const formatRelativeTime = (date: string): string => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return created.toLocaleDateString();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative hover:bg-[#FBF7EF] cursor-pointer"
        >
          <Bell className="w-5 h-5 text-[#5C4A3A]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#DB9D47] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        className="w-[380px] max-h-[500px] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E8DCC8] p-4 space-y-3 z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#5C4A3A]">
              Notifications
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchNotificationsRef.current}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Filter and Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button
                variant={filter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-[#DB9D47] hover:bg-[#C58A3C]' : ''}
              >
                All ({notifications.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('unread')}
                className={filter === 'unread' ? 'bg-[#DB9D47] hover:bg-[#C58A3C]' : ''}
              >
                Unread ({unreadCount})
              </Button>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#DB9D47] hover:text-[#C58A3C]"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto flex-1">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="w-6 h-6 animate-spin text-[#DB9D47]" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="w-12 h-12 text-[#D4BDA4] mb-2" />
              <p className="text-sm text-[#87765E]">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E8DCC8]">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-[#FBF7EF] transition-colors cursor-pointer group relative ${
                    !notification.isRead ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#DB9D47] rounded-full" />
                  )}

                  <div className="flex gap-3 pl-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                      <Bell className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-[#5C4A3A] truncate">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-[#87765E] whitespace-nowrap">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm text-[#87765E] line-clamp-2 mb-2">
                        {notification.message}
                      </p>

                      {/* Action button */}
                      {notification.actionUrl && notification.actionLabel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-[#DB9D47] hover:text-[#C58A3C] p-0 h-auto font-normal"
                        >
                          {notification.actionLabel} →
                        </Button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="h-6 w-6 p-0"
                          title="Mark as read"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="h-6 w-6 p-0 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}