import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase } from '@/integrations/supabase/client';

interface OfflineDB extends DBSchema {
  'pending-operations': {
    key: string;
    value: {
      id: string;
      table: string;
      operation: 'insert' | 'update' | 'delete';
      data: any;
      timestamp: number;
    };
  };
  'offline-data': {
    key: string;
    value: {
      table: string;
      data: any;
      timestamp: number;
    };
  };
}

class OfflineSyncManager {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private syncing = false;

  async init() {
    this.db = await openDB<OfflineDB>('offline-sync-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending-operations')) {
          db.createObjectStore('pending-operations', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offline-data')) {
          db.createObjectStore('offline-data', { keyPath: 'table' });
        }
      },
    });
  }

  async queueOperation(
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: any
  ) {
    if (!this.db) await this.init();
    
    const id = `${table}-${operation}-${Date.now()}-${Math.random()}`;
    await this.db!.add('pending-operations', {
      id,
      table,
      operation,
      data,
      timestamp: Date.now(),
    });
  }

  async cacheData(table: string, data: any) {
    if (!this.db) await this.init();
    
    await this.db!.put('offline-data', {
      table,
      data,
      timestamp: Date.now(),
    });
  }

  async getCachedData(table: string) {
    if (!this.db) await this.init();
    
    const cached = await this.db!.get('offline-data', table);
    return cached?.data || null;
  }

  async sync() {
    if (this.syncing || !navigator.onLine) return;
    
    this.syncing = true;
    
    try {
      if (!this.db) await this.init();
      
      const operations = await this.db!.getAll('pending-operations');
      
      for (const op of operations) {
        try {
          switch (op.operation) {
            case 'insert':
              await (supabase as any).from(op.table).insert(op.data);
              break;
            case 'update':
              await (supabase as any).from(op.table).update(op.data).eq('id', op.data.id);
              break;
            case 'delete':
              await (supabase as any).from(op.table).delete().eq('id', op.data.id);
              break;
          }
          
          await this.db!.delete('pending-operations', op.id);
        } catch (error) {
          console.error('Failed to sync operation:', op, error);
        }
      }
    } finally {
      this.syncing = false;
    }
  }

  async getPendingCount() {
    if (!this.db) await this.init();
    return (await this.db!.getAll('pending-operations')).length;
  }
}

export const offlineSyncManager = new OfflineSyncManager();
