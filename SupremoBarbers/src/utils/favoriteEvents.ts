// Simple event emitter for favorite changes
// This allows components to listen for favorite add/remove events in real-time

type FavoriteEventType = 'added' | 'removed';

interface FavoriteEvent {
  type: FavoriteEventType;
  serviceId: string;
  userId: string;
}

type FavoriteEventListener = (event: FavoriteEvent) => void;

class FavoriteEventEmitter {
  private listeners: FavoriteEventListener[] = [];

  subscribe(listener: FavoriteEventListener) {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(event: FavoriteEvent) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in favorite event listener:', error);
      }
    });
  }

  addFavorite(userId: string, serviceId: string) {
    this.emit({ type: 'added', serviceId, userId });
  }

  removeFavorite(userId: string, serviceId: string) {
    this.emit({ type: 'removed', serviceId, userId });
  }
}

// Export singleton instance
export const favoriteEvents = new FavoriteEventEmitter();
