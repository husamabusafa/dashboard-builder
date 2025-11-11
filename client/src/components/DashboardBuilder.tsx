import { HsafaChat, ContentContainer } from '@hsafa/ui-sdk';
import { HsafaProvider } from '@hsafa/ui-sdk';
import { useHsafa } from '@hsafa/ui-sdk';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { createDashboardTools } from './DashboardBuilderTools';
import type { DashboardState } from '../types/types';
import { ComponentRenderer } from './ComponentRenderer';
import { EmptyGridArea } from './EmptyGridArea';
import { saveDashboardVersion, loadLatestDashboard } from '../utils/opfs';

const EMPTY_DASHBOARD: DashboardState = {
  grid: {
    columns: '',
    rows: '',
    gap: '16px',
    templateAreas: []
  },
  components: {},
  metadata: {
    name: 'New Dashboard',
    description: 'Ask AI to create your dashboard',
    createdAt: new Date().toISOString(),
  }
};

const AGENT_ID = import.meta.env.VITE_AGENT_ID || 'cmhijn9sv0007qggw7c4ipwm3';
const AGENT_BASE_URL = import.meta.env.VITE_AGENT_BASE_URL || 'http://localhost:3900';

export default function DashboardBuilder() {
  return (
    <HsafaProvider baseUrl={AGENT_BASE_URL}>
      <ContentContainer>
        <DashboardContent />
      </ContentContainer>
    </HsafaProvider>
  );
}

function DashboardContent() {
  const [dashboardState, setDashboardState] = useState<DashboardState>(EMPTY_DASHBOARD);
  const dashboardStateRef = useRef(dashboardState);
  const { currentChatId, isAnyChatOpen } = useHsafa();
  const readStoredChatId = useCallback(() => {
    try { return localStorage.getItem(`hsafaChat_${AGENT_ID}.currentChatId`); } catch { return null; }
  }, []);
  const resolveActiveChatId = useCallback(() => (currentChatId || readStoredChatId() || undefined) as string | undefined, [currentChatId, readStoredChatId]);

  useEffect(() => {
    dashboardStateRef.current = dashboardState;
  }, [dashboardState]);

  // Track messages to detect edits
  // const prevMessagesRef = useRef<any[]>([]);
  // const lastChatIdRef = useRef<string | undefined>(undefined);
  // const handleMessagesChange = useCallback(async (messages: any[], chatId?: string) => {
  //   console.log('[Dashboard] Messages changed', messages, 'chatId:', chatId);
  //   if (!chatId) {
  //     console.warn('[Dashboard] No chatId provided to onMessagesChange, skipping version check');
  //     return;
  //   }
  //   lastChatIdRef.current = chatId;

  //   // Detect if messages were truncated (edit scenario)
  //   const prevLength = prevMessagesRef.current.length;
  //   const newLength = messages.length;
  //   const wasTruncated = newLength < prevLength;
  //   console.log('[Dashboard] Edit detection', { prevLength, newLength, wasTruncated, chatId });

  //   // Always try to restore to the nearest assistant message that has a saved version
  //   const reversed = [...messages].reverse();
  //   const assistantMsgs = reversed.filter((m: any) => m?.role === 'assistant' && !!m?.id);
  //   console.log('[Dashboard] Assistant messages (newest->oldest):', assistantMsgs.map((m: any, i: number) => ({ i, id: m.id })));
  //   let restored = false;
  //   for (const am of assistantMsgs) {
  //     try {
  //       console.log('[Dashboard] Checking hasVersion for', { chatId, messageId: am.id });
  //       const exists = await hasVersion(String(chatId), String(am.id));
  //       console.log('[Dashboard] hasVersion result', { chatId, messageId: am.id, exists });
  //       if (exists) {
  //         console.log('[Dashboard] Loading dashboard version', { chatId, messageId: am.id });
  //         const version = await loadDashboardVersion(String(chatId), String(am.id));
  //         console.log('[Dashboard] Loaded version', { chatId, messageId: am.id, versionSummary: version ? { areas: (version.grid?.templateAreas || []).length, components: Object.keys(version.components || {}).length } : null });
  //         if (version) {
  //           setDashboardState(version);
  //           restored = true;
  //           break;
  //         }
  //       }
  //     } catch (e) {
  //       console.error('[Dashboard] Version restore error', e);
  //     }
  //   }

  //   if (!restored && wasTruncated) {
  //     // No assistant messages left after truncation: reset to empty
  //     setDashboardState(EMPTY_DASHBOARD);
  //     console.log('[Dashboard] No version found and conversation truncated. Reset to EMPTY_DASHBOARD');
  //   }

  //   prevMessagesRef.current = messages;
  //   console.log('[Dashboard] Updated prevMessagesRef length ->', prevMessagesRef.current.length);
  // }, []);

  useEffect(() => {
    const id = resolveActiveChatId();
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        console.log('[Dashboard] Loading latest dashboard for chat', id);
        const latest = await loadLatestDashboard(String(id));
        if (cancelled) return;
        setDashboardState(latest || EMPTY_DASHBOARD);
        console.log('[Dashboard] Loaded latest dashboard result', { chatId: id, hasLatest: !!latest, areas: latest ? (latest.grid?.templateAreas || []).length : 0, components: latest ? Object.keys(latest.components || {}).length : 0 });
      } catch (e) {
        console.error('[Dashboard] LoadLatest error', e);
      }
    })();
    return () => { cancelled = true; };
  }, [currentChatId, isAnyChatOpen, resolveActiveChatId]);

  const dashboardTools = useMemo(
    () => createDashboardTools(() => dashboardStateRef.current, setDashboardState),
    [setDashboardState]
  );

  const gridAreas = useMemo(() => {
    const areas = dashboardState.grid.templateAreas
      .join(' ')
      .split(/\s+/)
      .filter(area => area && area !== '.');
    return [...new Set(areas)];
  }, [dashboardState.grid.templateAreas]);

  const gridAreasWithComponents = useMemo(() => {
    return gridAreas.map(area => ({
      area,
      component: Object.values(dashboardState.components).find(c => c.gridArea === area)
    }));
  }, [gridAreas, dashboardState.components]);

  // Debounced autosave of the latest dashboard for the active chat
  const autosaveTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const id = resolveActiveChatId();
    if (!id || !isAnyChatOpen) return;
    if (autosaveTimerRef.current) { window.clearTimeout(autosaveTimerRef.current); }
    console.log('[Dashboard] Autosave scheduled for chat', id);
    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        const summary = { areas: (dashboardStateRef.current.grid?.templateAreas || []).length, components: Object.keys(dashboardStateRef.current.components || {}).length };
        console.log('[Dashboard] Autosave firing', { chatId: id, messageId: '__latest', summary });
        await saveDashboardVersion(String(id), '__latest', dashboardStateRef.current);
        console.log('[Dashboard] Autosave done', { chatId: id });
      } catch (e) {
        console.error('[Dashboard] AutoSave error', e);
      }
    }, 800);
    return () => {
      if (autosaveTimerRef.current) { window.clearTimeout(autosaveTimerRef.current); }
    };
  }, [dashboardState, currentChatId, isAnyChatOpen, resolveActiveChatId]);

  return (
    <>
      <div style={{
        flex: 1,
        padding: '24px',
        overflow: 'auto'
      }}>
        {!isAnyChatOpen ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '500px',
            background: 'linear-gradient(135deg, #1a1b1e 0%, #17181c 100%)',
            border: '2px dashed #2A2C33',
            borderRadius: '16px',
            padding: '48px 24px',
          }}>
            <div style={{ textAlign: 'center', maxWidth: '500px' }}>
              <div style={{ 
                display: 'inline-flex',
                padding: '20px',
                borderRadius: '16px',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                marginBottom: '24px'
              }}>
                <Icon icon="lucide:message-square" style={{ fontSize: '64px', color: '#6366F1', opacity: 0.9 }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#FFFFFF' }}>Open the chat to view this dashboard</h3>
              <p style={{ marginTop: '12px', color: '#888', fontSize: '14px', lineHeight: '1.6' }}>Each chat has its own dashboard. Open or switch chats to see their dashboards.</p>
            </div>
          </div>
        ) : gridAreas.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '500px',
            background: 'linear-gradient(135deg, #1a1b1e 0%, #17181c 100%)',
            border: '2px dashed #2A2C33',
            borderRadius: '16px',
            padding: '48px 24px',
          }}>
            <div style={{ textAlign: 'center', maxWidth: '550px' }}>
              <div style={{ 
                display: 'inline-flex',
                padding: '24px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                marginBottom: '28px',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.15)'
              }}>
                <Icon icon="lucide:layout-dashboard" style={{ fontSize: '72px', color: '#6366F1' }} />
              </div>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '28px',
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: '-0.02em'
              }}>
                No Dashboard Yet
              </h3>
              <p style={{
                margin: '0 0 32px 0',
                fontSize: '15px',
                color: '#999',
                lineHeight: '1.7'
              }}>
                Start by asking the AI to create a grid layout for your dashboard.
                The AI will help you design and populate it with components.
              </p>
              <div style={{
                padding: '20px 24px',
                background: 'rgba(99, 102, 241, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                textAlign: 'left'
              }}>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#6366F1', 
                  marginBottom: '12px', 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Icon icon="lucide:sparkles" style={{ fontSize: '16px' }} />
                  Try asking:
                </div>
                <div style={{ fontSize: '14px', color: '#AAA', lineHeight: '2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <Icon icon="lucide:check" style={{ fontSize: '16px', color: '#6366F1', flexShrink: 0 }} />
                    <span>"Create a 2x2 grid layout"</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <Icon icon="lucide:check" style={{ fontSize: '16px', color: '#6366F1', flexShrink: 0 }} />
                    <span>"Set up a dashboard with header and main area"</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon icon="lucide:check" style={{ fontSize: '16px', color: '#6366F1', flexShrink: 0 }} />
                    <span>"Make a 3-column layout with sidebar"</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: dashboardState.grid.columns,
              gridTemplateRows: dashboardState.grid.rows,
              gap: dashboardState.grid.gap,
              gridTemplateAreas: dashboardState.grid.templateAreas.map(area => `"${area}"`).join(' '),
              minHeight: '500px',
              width: '100%'
            }}
          >
            {gridAreasWithComponents.map(({ area, component }) => (
              component ? (
                <ComponentRenderer
                  key={component.id}
                  component={component}
                />
              ) : (
                <EmptyGridArea
                  key={area}
                  gridArea={area}
                />
              )
            ))}
          </div>
        )}
      </div>
      
      <HsafaChat
        agentId={AGENT_ID}
        theme="dark"
        title="Dashboard Builder Assistant"
        placeholder="Describe the dashboard you want to build..."
        primaryColor="#6366F1"
        accentColor="#8B5CF6"
        alwaysOpen={true}
        expandable={false}
        HsafaTools={dashboardTools}
        HsafaUI={{}}
        presetPrompts={[
    {
      label: "Code Review",
      prompt: "Please review this code and provide suggestions for improvement"
    },
    {
      label: "Documentation",
      prompt: "Can you help me write comprehensive documentation for this function? I need it to include examples, parameter descriptions, and return value details."
    }
  ]}
        // onMessagesChange={handleMessagesChange}
        // onFinish={async (payload: { chatId?: string; message?: { id?: string; role?: string }; messages?: Array<{ id?: string; role?: string }> }) => {
        //   try {
        //     console.log('[Dashboard] onFinish called with payload:', payload);
        //     const anyPayload = payload as unknown as { assistantMessageId?: string; messages?: Array<{ id?: string; role?: string }>; message?: { id?: string; role?: string } };
        //     const providerId = resolveActiveChatId();
        //     const fromMessages = lastChatIdRef.current;
        //     const resolvedChatId = String(fromMessages || providerId || payload?.chatId || '');
        //     console.log('[Dashboard] onFinish resolve chat ids', { fromMessages, providerId, payloadChatId: payload?.chatId, resolvedChatId });
        //     let messageId: string | undefined = anyPayload?.assistantMessageId || anyPayload?.message?.id;
        //     if (!messageId && Array.isArray(payload?.messages)) {
        //       const reversed = [...payload.messages].reverse();
        //       const lastAssistant = reversed.find((m) => m?.role === 'assistant' && !!m?.id);
        //       if (lastAssistant?.id) messageId = lastAssistant.id;
        //     }
        //     console.log('[Dashboard] onFinish saving version:', { chatId: resolvedChatId, messageId });
        //     if (!resolvedChatId || !messageId) {
        //       console.warn('[Dashboard] onFinish skipped - missing chatId or messageId');
        //       return;
        //     }
        //     await saveDashboardVersion(String(resolvedChatId), String(messageId), dashboardStateRef.current);
        //     console.log('[Dashboard] onFinish saved version OK', { chatId: resolvedChatId, messageId });
        //   } catch (e) {
        //     console.error('[Dashboard] SaveVersion error', e);
        //   }
        // }}
      />
    </>
  );
}
