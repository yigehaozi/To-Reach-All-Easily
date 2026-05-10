import { useState, useCallback, useEffect } from 'react';
import { getHistory, deleteQuery, clearHistory } from '@/utils/storage';
import type { QueryRecord } from '@/types/whois';

export function useQueryHistory() {
  const [records, setRecords] = useState<QueryRecord[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setRecords(getHistory());
  }, [refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const remove = useCallback((id: string) => {
    deleteQuery(id);
    refresh();
  }, [refresh]);

  const clear = useCallback(() => {
    clearHistory();
    refresh();
  }, [refresh]);

  return { records, refresh, remove, clear };
}
