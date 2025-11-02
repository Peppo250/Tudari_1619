import { supabase } from '@/integrations/supabase/client';
import { offlineSyncManager } from './offlineSync';

export const offlineSupabase = {
  from: (table: string) => ({
    select: async (query = '*') => {
      if (navigator.onLine) {
        const result = await (supabase as any).from(table).select(query);
        if (result.data) {
          await offlineSyncManager.cacheData(table, result.data);
        }
        return result;
      } else {
        const cached = await offlineSyncManager.getCachedData(table);
        return { data: cached, error: null };
      }
    },
    
    insert: async (data: any) => {
      if (navigator.onLine) {
        return await (supabase as any).from(table).insert(data);
      } else {
        await offlineSyncManager.queueOperation(table, 'insert', data);
        return { data, error: null };
      }
    },
    
    update: (data: any) => ({
      eq: async (column: string, value: any) => {
        const updateData = { ...data, [column]: value };
        if (navigator.onLine) {
          return await (supabase as any).from(table).update(data).eq(column, value);
        } else {
          await offlineSyncManager.queueOperation(table, 'update', updateData);
          return { data: updateData, error: null };
        }
      },
    }),
    
    delete: () => ({
      eq: async (column: string, value: any) => {
        if (navigator.onLine) {
          return await (supabase as any).from(table).delete().eq(column, value);
        } else {
          await offlineSyncManager.queueOperation(table, 'delete', { [column]: value });
          return { data: null, error: null };
        }
      },
    }),
  }),
};
