import { useEffect, useState } from 'react';
import { offlineSyncManager } from '@/lib/offlineSync';
import { toast } from 'sonner';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = async () => {
      const online = navigator.onLine;
      setIsOnline(online);

      if (online) {
        toast.success('Back online! Syncing data...');
        await offlineSyncManager.sync();
        const count = await offlineSyncManager.getPendingCount();
        setPendingCount(count);
        if (count === 0) {
          toast.success('All data synced successfully!');
        }
      } else {
        toast.warning('You are offline. Changes will sync when back online.');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check pending operations on mount
    offlineSyncManager.getPendingCount().then(setPendingCount);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return { isOnline, pendingCount };
}
