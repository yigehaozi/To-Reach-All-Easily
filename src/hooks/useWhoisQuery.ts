import { useState, useCallback } from 'react';
import { lookupWhois } from '@/utils/api';
import { saveQuery, generateId } from '@/utils/storage';
import type { WhoisResponse, WhoisResult } from '@/types/whois';

interface WhoisQueryState {
  loading: boolean;
  data: WhoisResult | null;
  error: string | null;
  cached: boolean;
  responseTime: number;
  source: string;
}

export function useWhoisQuery() {
  const [state, setState] = useState<WhoisQueryState>({
    loading: false,
    data: null,
    error: null,
    cached: false,
    responseTime: 0,
    source: '',
  });

  const query = useCallback(async (domain: string) => {
    const trimmed = domain.trim();
    if (!trimmed) return;

    setState({
      loading: true,
      data: null,
      error: null,
      cached: false,
      responseTime: 0,
      source: '',
    });

    try {
      const response: WhoisResponse = await lookupWhois(trimmed);

      if (response.status && response.result) {
        setState({
          loading: false,
          data: response.result,
          error: null,
          cached: response.cached || false,
          responseTime: response.time,
          source: response.source || '',
        });

        saveQuery({
          id: generateId(),
          query: trimmed,
          timestamp: Date.now(),
          status: true,
          result: response.result,
        });
      } else {
        const errorMsg = response.error || response.code || '查询失败，请检查域名是否正确';
        setState({
          loading: false,
          data: null,
          error: errorMsg,
          cached: false,
          responseTime: response.time,
          source: response.source || '',
        });

        saveQuery({
          id: generateId(),
          query: trimmed,
          timestamp: Date.now(),
          status: false,
          error: errorMsg,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '网络错误，请稍后重试';
      setState({
        loading: false,
        data: null,
        error: errorMsg,
        cached: false,
        responseTime: 0,
        source: '',
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      data: null,
      error: null,
      cached: false,
      responseTime: 0,
      source: '',
    });
  }, []);

  return { ...state, query, reset };
}
