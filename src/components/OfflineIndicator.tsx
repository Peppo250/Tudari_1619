import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi, Cloud } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, pendingCount } = useOnlineStatus();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge 
        variant={isOnline ? "default" : "destructive"}
        className="flex items-center gap-2 px-3 py-2"
      >
        {isOnline ? (
          <>
            <Cloud className="h-4 w-4" />
            Syncing {pendingCount} items...
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            Offline Mode
          </>
        )}
      </Badge>
    </div>
  );
}
