import { supabase } from '@/integrations/supabase/client';
import { offlineSyncManager } from './offlineSync';

export const offlineSupabase = {
  from: (table: string) => {
    let queryBuilder: any = { table, filters: [], selectQuery: '*' };

    const buildQuery = () => {
      let query = (supabase as any).from(table);
      
      if (queryBuilder.selectQuery) {
        query = query.select(queryBuilder.selectQuery);
      }
      
      queryBuilder.filters.forEach((filter: any) => {
        query = query[filter.method](...filter.args);
      });
      
      return query;
    };

    const executeQuery = async (): Promise<any> => {
      if (navigator.onLine) {
        const result = await buildQuery();
        if (result.data) {
          await offlineSyncManager.cacheData(table, result.data);
        }
        return result;
      } else {
        const cached = await offlineSyncManager.getCachedData(table);
        return { data: cached, error: null };
      }
    };

    const createChainableMethods = (): any => ({
      eq: (column: string, value: any) => {
        queryBuilder.filters.push({ method: 'eq', args: [column, value] });
        return createChainableMethods();
      },
      gte: (column: string, value: any) => {
        queryBuilder.filters.push({ method: 'gte', args: [column, value] });
        return createChainableMethods();
      },
      lte: (column: string, value: any) => {
        queryBuilder.filters.push({ method: 'lte', args: [column, value] });
        return createChainableMethods();
      },
      order: (column: string, options: any) => {
        queryBuilder.filters.push({ method: 'order', args: [column, options] });
        return createChainableMethods();
      },
      single: () => executeQuery().then((result: any) => {
        if (result.data && Array.isArray(result.data)) {
          return { ...result, data: result.data[0] || null };
        }
        return result;
      }),
      ...makeAwaitable(executeQuery)
    });

    const makeAwaitable = (fn: () => Promise<any>) => ({
      then: (onfulfilled: any, onrejected: any) => fn().then(onfulfilled, onrejected),
      catch: (onrejected: any) => fn().catch(onrejected),
      finally: (onfinally: any) => fn().finally(onfinally),
    });

    return {
      select: (query = '*') => {
        queryBuilder.selectQuery = query;
        return createChainableMethods();
      },
      
      insert: (data: any) => {
        const promise = new Promise<any>(async (resolve, reject) => {
          try {
            if (navigator.onLine) {
              const result = await (supabase as any).from(table).insert(data);
              resolve(result);
            } else {
              await offlineSyncManager.queueOperation(table, 'insert', data);
              resolve({ data, error: null });
            }
          } catch (error) {
            reject(error);
          }
        });

        return Object.assign(promise, {
          select: () => ({
            single: async () => {
              if (navigator.onLine) {
                return await (supabase as any).from(table).insert(data).select().single();
              } else {
                const tempData = { ...data, id: `temp-${Date.now()}` };
                await offlineSyncManager.queueOperation(table, 'insert', data);
                return { data: tempData, error: null };
              }
            }
          })
        }) as any;
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
    };
  },
  auth: (supabase as any).auth,
  functions: (supabase as any).functions
};
