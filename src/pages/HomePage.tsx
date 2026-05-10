import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HeroSection from '@/components/Hero/HeroSection';
import QueryInput from '@/components/Query/QueryInput';
import QueryResult from '@/components/Query/QueryResult';
import BulkQueryResult from '@/components/Query/BulkQueryResult';
import PendingQueryResult from '@/components/Query/PendingQueryResult';
import SessionConversationHeader from '@/components/Session/SessionConversationHeader';
import SessionInsightsPanel from '@/components/Session/SessionInsightsPanel';
import SessionMessageNavigator from '@/components/Session/SessionMessageNavigator';
import QueryCompletionNotificationPrompt from '@/components/Session/QueryCompletionNotificationPrompt';
import { streamBulkLookup, streamWhoisLookup, type QueryStreamProgressEvent } from '@/utils/api';
import { useSessionStore } from '@/store/useSessionStore';
import { useAppStore } from '@/store/useAppStore';
import { createUserMessage, createAssistantMessage } from '@/utils/sessionStorage';
import type { WhoisResult } from '@/types/whois';
import type { QueryMode } from '@/types/query';
import {
  formatSessionConversationTime,
  getSessionLastConversationTimestamp,
  getSessionQueryAggregateItems,
  getSessionQueryItems,
  getSessionSuffixStats,
  getSessionBulkResults,
  getSessionBulkStatusStats,
  getSessionBulkGroupStats,
} from '@/utils/sessionConversation';
import type { Message } from '@/types/session';
import {
  getQueryModeLabel,
  inferEffectiveQueryMode,
  normalizeBulkQueryInput,
  normalizeSingleQueryInput,
} from '@/utils/queryMode';
import {
  dismissQueryCompletionNotificationPrompt,
  getQueryCompletionNotificationState,
  requestQueryCompletionNotificationPermission,
  showBulkQueryCompletionNotification,
  showSingleQueryCompletionNotification,
} from '@/utils/queryCompletionNotification';
import { showToast } from '@/utils/toastBus';

function findLatestUserQuery(messages: Message[], index: number): string {
  for (let pointer = index - 1; pointer >= 0; pointer -= 1) {
    if (messages[pointer]?.role === 'user') {
      return messages[pointer].content;
    }
  }
  return '';
}

function looksLikeWhoisFailure(result?: WhoisResult): boolean {
  if (!result) return false;

  const registrar = typeof result.registrar === 'string' ? result.registrar : '';
  const whoisServer = typeof result.whoisServer === 'string' ? result.whoisServer : '';

  return whoisServer === 'api.error' || registrar.includes('API Error');
}

function getWhoisFailureMessage(result?: WhoisResult): string {
  if (looksLikeWhoisFailure(result)) {
    return 'WHOIS 查询失败，上游接口未返回有效结果。';
  }

  return '查询失败，请稍后重试。';
}

function isVisibleInMode(message: Message, mode: QueryMode): boolean {
  if (mode === 'bulk') {
    if (message.role === 'user') {
      return message.queryMode === 'bulk';
    }

    return message.queryMode === 'bulk' || message.kind === 'bulk' || Boolean(message.bulkResult);
  }

  if (message.role === 'user') {
    return message.queryMode !== 'bulk';
  }

  return message.queryMode !== 'bulk' && message.kind !== 'bulk' && !message.bulkResult;
}

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [notificationPromptLoading, setNotificationPromptLoading] = useState(false);
  const [notificationState, setNotificationState] = useState(getQueryCompletionNotificationState);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const {
    sessions,
    activeSessionIdByMode,
    ensureActiveSession,
    appendMessageToSession,
    updateMessageInSession,
  } = useSessionStore();
  const {
    queryMode,
    sessionInsightsOpen,
    toggleSessionInsights,
    setSessionInsightsOpen,
    setSessionShellActive,
    setQueryMode,
  } = useAppStore();

  useEffect(() => {
    ensureActiveSession(queryMode);
  }, [ensureActiveSession, queryMode]);

  const activeSessionId = activeSessionIdByMode[queryMode];
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId && session.mode === queryMode),
    [activeSessionId, queryMode, sessions]
  );

  const messages = useMemo(
    () => (activeSession?.messages ?? []).filter((message) => isVisibleInMode(message, queryMode)),
    [activeSession?.messages, queryMode]
  );
  const hasMessages = messages.length > 0;
  const sessionQueryItems = useMemo(
    () => getSessionQueryItems(messages, activeSession?.mode ?? queryMode),
    [activeSession?.mode, messages, queryMode]
  );
  const sessionQueryAggregateItems = useMemo(
    () => getSessionQueryAggregateItems(sessionQueryItems),
    [sessionQueryItems]
  );
  const suffixStats = useMemo(() => getSessionSuffixStats(sessionQueryItems), [sessionQueryItems]);
  const bulkResults = useMemo(() => getSessionBulkResults(messages), [messages]);
  const bulkStatusStats = useMemo(() => getSessionBulkStatusStats(bulkResults), [bulkResults]);
  const bulkGroupStats = useMemo(() => getSessionBulkGroupStats(bulkResults), [bulkResults]);
  const lastConversationTime = formatSessionConversationTime(
    getSessionLastConversationTimestamp(activeSession)
  );
  const queryModeLabel = getQueryModeLabel(queryMode);
  const shouldShowNotificationPrompt =
    notificationState.supported && !notificationState.enabled && !notificationState.dismissed;
  const messageAnchors = sessionQueryItems.map((item) => ({
    id: item.id,
    label: item.display,
  }));

  const refreshNotificationState = useCallback(() => {
    setNotificationState(getQueryCompletionNotificationState());
  }, []);

  useEffect(() => {
    document.title = hasMessages
      ? `${activeSession?.title || '新会话'} - OneFour`
      : `${queryModeLabel} - OneFour`;
  }, [activeSession?.title, hasMessages, queryModeLabel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  useEffect(() => {
    setSessionInsightsOpen(false);
  }, [activeSessionId, queryMode, setSessionInsightsOpen]);

  useEffect(() => {
    setSessionShellActive(hasMessages);
    return () => {
      setSessionShellActive(false);
    };
  }, [hasMessages, setSessionShellActive]);

  useEffect(() => {
    refreshNotificationState();

    const handleWindowFocus = () => {
      refreshNotificationState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshNotificationState();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshNotificationState]);

  const handleEnableQueryNotifications = useCallback(async () => {
    if (notificationPromptLoading) {
      return;
    }

    setNotificationPromptLoading(true);

    try {
      const permission = await requestQueryCompletionNotificationPermission();

      if (permission === 'granted') {
        showToast({ message: '通知已开启', variant: 'success' });
      } else if (permission === 'unsupported') {
        showToast({ message: '当前浏览器暂不支持通知', variant: 'error' });
      } else {
        showToast({ message: '通知未开启，请在浏览器中允许通知权限', variant: 'error' });
      }
    } finally {
      refreshNotificationState();
      setNotificationPromptLoading(false);
    }
  }, [notificationPromptLoading, refreshNotificationState]);

  const handleDismissQueryNotificationPrompt = useCallback(() => {
    dismissQueryCompletionNotificationPrompt();
    refreshNotificationState();
  }, [refreshNotificationState]);

  const runQuery = async (input: string, preferredMode: QueryMode) => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const effectiveMode = inferEffectiveQueryMode(trimmed);
    const normalizedQuery =
      effectiveMode === 'bulk' ? normalizeBulkQueryInput(trimmed) : normalizeSingleQueryInput(trimmed);

    if (!normalizedQuery) return;

    const targetSession = ensureActiveSession(effectiveMode);
    if (preferredMode !== effectiveMode || queryMode !== effectiveMode) {
      setQueryMode(effectiveMode);
    }

    const userMsg = createUserMessage(normalizedQuery, effectiveMode);
    appendMessageToSession(targetSession.id, userMsg, effectiveMode);
    const pendingAssistantMessage = createAssistantMessage({
      content:
        effectiveMode === 'bulk'
          ? '正在准备批量后缀检测链路。'
          : '正在准备 WHOIS 查询链路。',
      kind: effectiveMode === 'bulk' ? 'bulk' : 'whois',
      queryMode: effectiveMode,
      summary: '查询中',
      status: 'pending',
    });
    appendMessageToSession(targetSession.id, pendingAssistantMessage, effectiveMode);
    setLoading(true);

    try {
      const updatePendingProgress = (progress: QueryStreamProgressEvent) => {
        updateMessageInSession(targetSession.id, pendingAssistantMessage.id, (message) => ({
          ...message,
          summary: progress.label || message.summary || '查询中',
          content: progress.detail || message.content,
          timestamp: progress.timestamp || Date.now(),
          status: 'pending',
        }));
      };

      if (effectiveMode === 'bulk') {
        const startedAt = performance.now();
        const bulkResult = await streamBulkLookup(normalizedQuery, {
          onProgress: updatePendingProgress,
        });

        updateMessageInSession(targetSession.id, pendingAssistantMessage.id, (message) => ({
          ...message,
          content: '',
          summary: undefined,
          bulkResult,
          error: undefined,
          responseTime: (performance.now() - startedAt) / 1000,
          rawData: bulkResult,
          status: 'success',
          timestamp: Date.now(),
        }));
        showBulkQueryCompletionNotification(normalizedQuery, bulkResult);
        return;
      }

      const response = await streamWhoisLookup(normalizedQuery, {
        onProgress: updatePendingProgress,
      });

      if (response.status && response.result) {
        if (looksLikeWhoisFailure(response.result)) {
          const errorMsg = getWhoisFailureMessage(response.result);
          updateMessageInSession(targetSession.id, pendingAssistantMessage.id, (message) => ({
            ...message,
            content: errorMsg,
            summary: undefined,
            error: errorMsg,
            result: response.result,
            rawWhoisContent: response.result.rawWhoisContent,
            rawData: response.result,
            responseTime: response.time,
            source: response.source,
            cached: response.cached,
            status: 'error',
            timestamp: Date.now(),
          }));
          return;
        }

        updateMessageInSession(targetSession.id, pendingAssistantMessage.id, (message) => ({
          ...message,
          content: '',
          summary: undefined,
          result: response.result,
          rawWhoisContent: response.result.rawWhoisContent,
          rawData: response.result,
          error: undefined,
          responseTime: response.time,
          source: response.source,
          cached: response.cached,
          status: 'success',
          timestamp: Date.now(),
        }));
        showSingleQueryCompletionNotification(normalizedQuery, response.result);
      } else {
        const errorMsg = response.error || response.code || '查询失败，请检查域名是否正确';
        updateMessageInSession(targetSession.id, pendingAssistantMessage.id, (message) => ({
          ...message,
          content: errorMsg,
          summary: undefined,
          error: errorMsg,
          responseTime: response.time,
          source: response.source,
          cached: response.cached,
          status: 'error',
          timestamp: Date.now(),
        }));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '网络错误，请稍后重试';
      updateMessageInSession(targetSession.id, pendingAssistantMessage.id, (message) => ({
        ...message,
        content: errorMsg,
        summary: undefined,
        error: errorMsg,
        status: 'error',
        timestamp: Date.now(),
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async (query: string) => {
    await runQuery(query, queryMode);
  };

  return (
    <div id="onefour-session-canvas" className="relative flex h-full min-h-0 flex-col bg-[var(--bg-base)]">
      {!hasMessages ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative flex min-h-full flex-col">
            {shouldShowNotificationPrompt ? (
              <div className="shrink-0 px-4 pt-5">
                <QueryCompletionNotificationPrompt
                  loading={notificationPromptLoading}
                  onEnable={() => {
                    void handleEnableQueryNotifications();
                  }}
                  onClose={handleDismissQueryNotificationPrompt}
                />
              </div>
            ) : null}

            <div className="flex flex-1 flex-col items-center justify-center">
              <HeroSection mode={queryMode} />
            </div>
            <div className="shrink-0 px-4 pb-6">
              <QueryInput onQuery={handleQuery} loading={loading} mode={queryMode} />
            </div>
          </div>
        </div>
      ) : (
        <>
          <SessionConversationHeader
            title={activeSession?.title || '新会话'}
            lastConversationTime={lastConversationTime}
            insightsOpen={sessionInsightsOpen}
            onToggleInsights={toggleSessionInsights}
            showInsightsToggle={hasMessages}
          />

          {shouldShowNotificationPrompt ? (
            <div className="shrink-0 px-4 pt-4">
              <QueryCompletionNotificationPrompt
                loading={notificationPromptLoading}
                onEnable={() => {
                  void handleEnableQueryNotifications();
                }}
                onClose={handleDismissQueryNotificationPrompt}
              />
            </div>
          ) : null}

          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            <div
              id="onefour-session-main-column"
              className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
            >
              <div className="relative min-h-0 flex-1 overflow-x-hidden">
                <div ref={messagesScrollRef} className="h-full overflow-y-auto overflow-x-hidden">
                  <div className="mx-auto flex w-full max-w-[760px] flex-col gap-10 px-4 pb-10 pl-10 pt-8 sm:pl-11 md:pl-12 xl:px-0">
                    {messages.map((message, index) => {
                      if (message.role === 'user') {
                        return (
                          <div key={message.id} id={message.id} className="flex justify-end">
                            <div className="max-w-[360px] rounded-[10px] bg-[var(--bg-overlay)] px-4 py-3 text-[13px] leading-5 text-[var(--text-primary)]">
                              {message.content}
                            </div>
                          </div>
                        );
                      }

                      if (message.status === 'pending') {
                        return (
                          <PendingQueryResult
                            key={message.id}
                            mode={message.queryMode ?? 'single'}
                            detail={message.content}
                          />
                        );
                      }

                      if (message.kind === 'bulk' || message.bulkResult) {
                        return (
                          <BulkQueryResult
                            key={message.id}
                            query={findLatestUserQuery(messages, index)}
                            data={message.bulkResult}
                            error={message.error}
                            responseTime={message.responseTime}
                            status={message.status}
                            onRefresh={() => {
                              const query = findLatestUserQuery(messages, index);
                              if (!query) return;
                              void runQuery(query, message.queryMode ?? 'bulk');
                            }}
                            onDomainClick={(domain) => {
                              void runQuery(domain, 'single');
                            }}
                          />
                        );
                      }

                      return (
                        <QueryResult
                          key={message.id}
                          query={findLatestUserQuery(messages, index)}
                          data={message.result}
                          rawData={message.rawData}
                          rawWhoisContent={message.rawWhoisContent}
                          responseTime={message.responseTime}
                          cached={message.cached}
                          source={message.source}
                          error={message.error}
                          status={message.status}
                          onRefresh={() => {
                            const query = findLatestUserQuery(messages, index);
                            if (!query) return;
                            void runQuery(query, message.queryMode ?? 'single');
                          }}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <SessionMessageNavigator anchors={messageAnchors} scrollContainerRef={messagesScrollRef} />
              </div>

              <div className="shrink-0 bg-[var(--bg-base)]/95 px-4 py-4 backdrop-blur">
                <QueryInput onQuery={handleQuery} loading={loading} mode={queryMode} />
              </div>
            </div>

            <SessionInsightsPanel
              open={sessionInsightsOpen}
              mode={queryMode}
              queries={sessionQueryAggregateItems}
              suffixStats={suffixStats}
              bulkStatusStats={bulkStatusStats}
              bulkGroupStats={bulkGroupStats}
            />
          </div>
        </>
      )}
    </div>
  );
}
