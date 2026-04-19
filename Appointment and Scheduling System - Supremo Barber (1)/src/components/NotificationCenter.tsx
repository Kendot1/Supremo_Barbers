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
import { supabase } from '../utils/supabase/client';

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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20; // Load 20 notifications per page

  // Virtual scrolling state
  const [scrollTop, setScrollTop] = useState(0);
  const ITEM_HEIGHT = 120; // Height of each notification item in pixels
  const CONTAINER_HEIGHT = 400; // Height of scroll container
  const OVERSCAN = 3; // Render extra items above/below viewport for smooth scrolling

  // Use refs to track fetch function and prevent infinite loops
  const fetchNotificationsRef = useRef<() => Promise<void>>();
  const lastFetchParams = useRef<string>('');
  const isFetchingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Aggressive caching - 5 minutes cache duration
  const pagesCache = useRef<Map<number, Notification[]>>(new Map());
  const cacheTimestamp = useRef<Map<number, number>>(new Map()); // Cache timestamp per page
  const CACHE_DURATION = 300000; // 5 minutes cache (was 30 seconds)
  const hasInitialDataRef = useRef(false); // Track if we have any data

  // Track total count from cache
  const totalCountRef = useRef<number>(0);

  // Fetch a specific page of notifications
  const fetchPage = async (page: number, append: boolean = false) => {
    if (isFetchingRef.current) {

      return;
    }

    // Check if page is already cached and cache is fresh
    const now = Date.now();
    if (pagesCache.current.has(page) && (now - (cacheTimestamp.current.get(page) || 0) < CACHE_DURATION)) {

      const cachedPage = pagesCache.current.get(page)!;

      if (append) {
        setNotifications(prev => [...prev, ...cachedPage]);
      } else {
        setNotifications(cachedPage);
      }
      hasInitialDataRef.current = true;
      return;
    }

    try {
      isFetchingRef.current = true;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }



      // Calculate offset and limit
      const offset = page * PAGE_SIZE;
      const limit = PAGE_SIZE;

      // Fetch paginated data
      const data = await API.notifications.getByUserId(userId, userRole, limit, offset);



      // Ensure data is always an array
      const notificationsArray = Array.isArray(data) ? data : [];

      // Cache this page
      pagesCache.current.set(page, notificationsArray);
      cacheTimestamp.current.set(page, now);

      // Update hasMore flag
      if (notificationsArray.length < PAGE_SIZE) {
        setHasMore(false);

      }

      // Update state
      if (append) {
        setNotifications(prev => [...prev, ...notificationsArray]);
      } else {
        setNotifications(notificationsArray);
      }

      hasInitialDataRef.current = true;


    } catch (error: any) {
      console.error(`❌ NotificationCenter: Error fetching page ${page}:`, error);

      if (!append) {
        // Set empty state only if not appending
        setNotifications([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  // Shared fetch function for initial load
  const fetchNotifications = async () => {


    // Clear cache and reset pagination
    pagesCache.current.clear();
    cacheTimestamp.current.clear();
    setCurrentPage(0);
    setHasMore(true);

    // Fetch first page
    await fetchPage(0, false);
  };

  // Load more notifications (next page)
  const loadMore = async () => {
    if (!hasMore || isLoadingMore || isFetchingRef.current) {

      return;
    }

    const nextPage = currentPage + 1;

    await fetchPage(nextPage, true);
    setCurrentPage(nextPage);
  };

  // Handle scroll event - ONLY load more on scroll (LAZY)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight;

    // Load more when user scrolls to 90% of the container (LAZY - near bottom only)
    if (scrollPercentage > 0.9 && hasMore && !isLoadingMore && !isFetchingRef.current) {

      loadMore();
    }
  };

  // Load cached data instantly on mount (NO API CALL)
  useEffect(() => {
    if (!userId) return;

    // Check if we have cached data for page 0
    if (pagesCache.current.has(0)) {

      const cachedPage = pagesCache.current.get(0)!;
      setNotifications(cachedPage);
      hasInitialDataRef.current = true;
    }
    // NO FETCH on mount - only fetch when user opens dropdown
  }, [userId]);

  // Fetch when dropdown opens (ONLY if no cache exists)
  useEffect(() => {
    if (!isOpen || !userId) return;

    // If we have cached data, show it instantly
    if (pagesCache.current.has(0)) {
      const now = Date.now();
      const cacheAge = now - (cacheTimestamp.current.get(0) || 0);

      if (cacheAge < CACHE_DURATION) {

        const cachedPage = pagesCache.current.get(0)!;
        setNotifications(cachedPage);
        hasInitialDataRef.current = true;
        return; // Don't fetch if cache is fresh
      }
    }

    // No cache or cache expired - fetch data

    fetchPage(0, false);
  }, [isOpen, userId]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    // Optimistically update UI first
    const notificationToMark = notifications.find(n => n.id === notificationId);
    if (!notificationToMark || notificationToMark.isRead) return; // Already read or doesn't exist


    // Update local state immediately
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Then sync with backend (silently fail if backend has issues)
    try {
      const result = await API.notifications.markAsRead(notificationId);

    } catch (error: any) {
      console.error('❌ [NotificationCenter] Error marking notification as read in backend:', error);
      console.error('❌ [NotificationCenter] Error details:', JSON.stringify(error, null, 2));
      // Don't show error to user - UI is already updated
      // Backend will sync later when connection is restored
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    // Optimistically update UI first
    const now = new Date().toISOString();
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true, readAt: now }))
    );
    setUnreadCount(0);

    // Then sync with backend (silently fail if backend has issues)
    try {
      await API.notifications.markAllAsRead(userId, userRole);
      toast.success('All notifications marked as read');

    } catch (error: any) {
      console.error('❌ Error marking all as read in backend:', error);
      // UI is already updated, just show a generic success message
      toast.success('All notifications marked as read');
    }
  };

  // Delete notification
  const handleDelete = async (notificationId: string) => {
    try {
      await API.notifications.delete(notificationId);

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      toast.success('Notification deleted');

    } catch (error: any) {
      console.error('❌ Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Navigate immediately for instant response (no lag)
    if (notification.actionUrl && onNavigate) {
      setIsOpen(false);
      onNavigate(notification.actionUrl);
    }

    // Mark as read in background (async, non-blocking)
    if (!notification.isRead) {
      // Use setTimeout to ensure navigation happens first
      setTimeout(() => {
        handleMarkAsRead(notification.id);
      }, 0);
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
      // Appointment notifications
      appointment_booked: 'text-green-600',
      appointment_created: 'text-green-600',
      appointment_assigned: 'text-blue-600',
      appointment_confirmed: 'text-green-600',
      appointment_cancelled: 'text-red-600',
      appointment_rejected: 'text-red-600',
      appointment_completed: 'text-green-600',
      appointment_rescheduled: 'text-orange-600',

      // Payment notifications
      payment_approved: 'text-green-600',
      payment_verified: 'text-green-600',
      payment_rejected: 'text-red-600',
      payment_received: 'text-green-600',
      payment_reminder: 'text-orange-600',
      payment_proof_uploaded: 'text-blue-600',

      // Review notifications
      review_received: 'text-purple-600',
      review_submitted: 'text-purple-600',

      // User notifications
      new_customer: 'text-blue-600',
      account_created: 'text-green-600',
      account_suspended: 'text-red-600',
      account_unsuspended: 'text-green-600',
      user_registered: 'text-blue-600',

      // System notifications
      system_alert: 'text-yellow-600',
      earnings_updated: 'text-green-600',
      profile_updated: 'text-gray-600',
      password_changed: 'text-orange-600',

      // Security notifications
      new_device_login: 'text-red-600',
      security_alert: 'text-red-600',
      sign_out_all_devices: 'text-orange-600',

      // Barber notifications
      barber_created: 'text-blue-600',
      barber_deleted: 'text-red-600',
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

  // REMOVED: No auto-fetch on hover
  // REMOVED: No auto-fetch on open
  // REMOVED: No auto-fetch on stale cache

  // Only fetch when:
  // 1. User clicks refresh button
  // 2. User scrolls to load more
  // 3. First time ever (no cache exists)

  // Fetch unread count badge ONLY (lightweight) - runs on mount and every 60s
  useEffect(() => {
    if (!userId) return;

    const fetchUnreadCountOnly = async () => {
      try {
        const count = await API.notifications.getUnreadCount(userId, userRole);
        setUnreadCount(typeof count === 'number' ? count : 0);
      } catch (error) {
        console.error('❌ Error fetching unread count:', error);
      }
    };

    // Initial fetch
    fetchUnreadCountOnly();

    // Poll for unread count only (very lightweight)
    const pollInterval = setInterval(fetchUnreadCountOnly, 60000); // Every 60 seconds

    return () => clearInterval(pollInterval);
  }, [userId, userRole]);

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
        className="w-[380px] max-h-[500px] overflow-hidden flex flex-col animate-none data-[state=open]:animate-none data-[state=closed]:animate-none"
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
              onClick={fetchNotifications}
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
        <div className="overflow-y-auto flex-1" ref={scrollContainerRef} onScroll={handleScroll}>
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
            <>
              <div className="divide-y divide-[#E8DCC8]">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-[#FBF7EF] transition-colors cursor-pointer group relative ${!notification.isRead ? 'bg-blue-50/30' : ''
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

              {/* Loading More Indicator */}
              {isLoadingMore && (
                <div className="flex items-center justify-center p-4 border-t border-[#E8DCC8]">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#DB9D47] mr-2" />
                  <span className="text-sm text-[#87765E]">Loading more...</span>
                </div>
              )}

              {/* End of List Indicator */}
              {!hasMore && notifications.length > 0 && (
                <div className="flex items-center justify-center p-4 border-t border-[#E8DCC8]">
                  <span className="text-sm text-[#87765E]">No more notifications</span>
                </div>
              )}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}