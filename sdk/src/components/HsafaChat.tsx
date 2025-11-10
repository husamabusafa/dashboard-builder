import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChatHeader } from "./hsafa-chat/ChatHeader";
import { useFileUpload } from "../hooks/useFileUploadHook";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { useHsafaAgent } from "../hooks/useHsafaAgent";
import { useChatStorage } from "../hooks/useChatStorage";
import { HsafaChatProps } from "../types/chat";
import { MessageList } from "./hsafa-chat";
import { ChatInput } from "./hsafa-chat";
import { createChatStorage } from "../utils/chat-storage";
import { ChatHistoryModal } from "./hsafa-chat/ChatHistoryModal";
import { ConfirmEditModal } from "./hsafa-chat/ConfirmEditModal";
import { useHsafa } from "../providers/HsafaProvider";
import { FloatingChatButton } from "./FloatingChatButton";
import CursorController from "./web-controler/CursorController";

export function HsafaChat({
  agentId,
  theme,
  primaryColor,
  primaryColorDark,
  primaryColorLight,
  backgroundColor,
  borderColor,
  textColor,
  accentColor,
  baseUrl = '',
  initialMessages = [],
  onMessagesChange,
  defaultOpen = true,
  floatingButtonPosition = { bottom: 24, right: 24 },
  
  HsafaTools = {},
  HsafaUI = {},
  componentAboveInput,
  editProcessContent,
  onStart,
  onFinish,
  currentChat,
  onChatChanged,
}: HsafaChatProps & { 
  baseUrl?: string;
  initialMessages?: any[];
  onMessagesChange?: (messages: any[], chatId?: string) => void;
  HsafaUI?: Record<string, React.ComponentType<any>>;
}) {
  console.log('HsafaChat123', agentId);
  const { dir: providerDir, theme: providerTheme, baseUrl: providerBaseUrl, setStreamingState, setChatOpenState } = useHsafa();
  const effectiveTheme = (theme || providerTheme || 'dark');
  const effectiveBaseUrl = (baseUrl && baseUrl.length > 0) ? baseUrl : (providerBaseUrl || '');
  
  // Determine the primary color based on theme
  const effectivePrimaryColor = effectiveTheme === 'dark' 
    ? (primaryColorDark || primaryColor || '#ffffff')
    : (primaryColorLight || primaryColor || '#000000');
  
  const themeColors = {
    primaryColor: effectivePrimaryColor,
    backgroundColor: backgroundColor || (effectiveTheme === 'dark' ? '#0B0B0F' : '#FFFFFF'),
    borderColor: borderColor || (effectiveTheme === 'dark' ? '#2A2C33' : '#E5E7EB'),
    textColor: textColor || (effectiveTheme === 'dark' ? '#EDEEF0' : '#111827'),
    accentColor: accentColor || (effectiveTheme === 'dark' ? '#17181C' : '#F9FAFB'),
    mutedTextColor: effectiveTheme === 'dark' ? '#6f7276' : '#6B7280',
    inputBackground: effectiveTheme === 'dark' ? '#17181C' : '#F3F4F6',
    cardBackground: effectiveTheme === 'dark' ? '#121318' : '#FFFFFF',
    hoverBackground: effectiveTheme === 'dark' ? '#1c1e25' : '#F3F4F6',
  };

  const resolvedColors = themeColors;
  const t = (key: string) => ({
    'header.new': 'New',
    'header.history': 'History',
    'header.close': 'Close chat',
    'input.placeholder': 'Ask your question...',
    'input.attachFiles': 'Attach files',
    'input.insertLink': 'Insert link',
    'input.send': 'Send',
    'input.stop': 'Stop',
    'input.uploadingFiles': 'Uploading files...',
    'input.previewImage': 'Preview image',
    'input.removeFile': 'Remove file',
    'messages.empty': 'Start by sending a message to the agent.',
    'general.agent': 'Agent',
    'editor.cancel': 'Cancel',
    'editor.saveAndRegenerate': 'Save & Regenerate',
    'editor.clickToEdit': 'Click to edit',
  } as Record<string, string>)[key] || key;

  // Use the agent hook for all agent-related logic
  const agent = useHsafaAgent({
    agentId,
    baseUrl: effectiveBaseUrl,
    tools: HsafaTools,
    uiComponents: HsafaUI,
    controlledChatId: currentChat,
    onChatIdChange: currentChat === undefined
      ? (id: string) => {
          if (onChatChanged) onChatChanged(id);
        }
      : undefined,
    onStart: useCallback((message: any) => {
      if (onStart) onStart(message);
    }, [onStart]),
    onFinish: useCallback((message: any) => {
      if (onFinish) onFinish(message);
    }, [onFinish]),
    onError: useCallback((error: Error) => {
      console.error('Chat error:', error);
    }, []),
    initialMessages,
    onMessagesChange,
  });

  // Destructure what we need from agent
  const {
    input,
    setInput,
    messages: chatMessages,
    isLoading,
    status,
    error: chatError,
    sendMessage,
    stop,
    setMessages,
    notifyMessagesChange,
    chatId: internalChatId,
    setChatId: setInternalChatId,
    tools: allTools,
    uiComponents: allUI,
    formHostRef,
    formStateRef,
    cleanupForms: cleanupAllForms,
    onUISuccess: handleUISuccess,
    onUIError: handleUIError,
    chatApi,
  } = agent;

  // Use controlled chatId if provided, otherwise use internal state
  const chatId = currentChat !== undefined ? currentChat : internalChatId;
  
  // Wrapper for setChatId that calls onChatChanged if provided
  const setChatId = useCallback((newChatId: string) => {
    if (currentChat === undefined) {
      // Uncontrolled mode: update internal state
      setInternalChatId(newChatId);
    }
    // Always notify parent if callback provided
    if (onChatChanged) {
      onChatChanged(newChatId);
    }
  }, [currentChat, setInternalChatId, onChatChanged]);

  // Sync internal chatId with controlled prop when it changes externally
  useEffect(() => {
    if (currentChat !== undefined && currentChat !== internalChatId) {
      setInternalChatId(currentChat);
    }
  }, [currentChat, internalChatId, setInternalChatId]);

  // File upload hook
  const {
    attachments,
    uploading,
    fileInputRef,
    formatBytes,
    handleRemoveAttachment,
    handleFileSelection,
    clearAttachments,
    setAttachments,
  } = useFileUpload(effectiveBaseUrl);

  const [uploadError, setUploadError] = useState<string | null>(null);

  // Hsafa provider integration and header/history state
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const tmp = createChatStorage(agentId);
      return tmp.loadShowChatPreference(Boolean(defaultOpen));
    } catch {
      return Boolean(defaultOpen);
    }
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const historyBtnRef = useRef<HTMLButtonElement>(null);
  const historyPopupRef = useRef<HTMLDivElement>(null);
  const [openReasoningIds, setOpenReasoningIds] = useState<Set<string>>(new Set());
  const [isConfirmEditOpen, setIsConfirmEditOpen] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<{ id: string; text: string; attachments: any[] } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useAutoScroll<HTMLDivElement>(isLoading);

  // Use chat storage hook for automatic persistence
  const chatStorage = useChatStorage({
    agentId,
    chatId,
    messages: chatMessages,
    isLoading,
    autoSave: true,
    autoRestore: false, // We handle restore manually to set chatId
  });
  
  // Keep reference to raw storage for UI preferences
  const storage = chatStorage.storage;
  
  // On mount: restore last opened chat and its messages (uncontrolled only)
  const restoredOnMountRef = useRef<boolean>(false);
  const lastLoadedChatRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (restoredOnMountRef.current) return;
    if (currentChat !== undefined) {
      // Controlled mode: restore messages for the provided chatId without changing chatId
      try {
        const saved = storage.loadChat(currentChat);
        const msgs = (saved && Array.isArray((saved as any).messages)) ? (saved as any).messages : [];
        if (msgs.length > 0) { try { setMessages(msgs); } catch {} }
        lastLoadedChatRef.current = currentChat;
      } catch {}
      try { storage.saveCurrentChatId(currentChat); } catch {}
      restoredOnMountRef.current = true;
      return;
    }
    try {
      const savedId = storage.loadCurrentChatId();
      if (savedId) {
        setChatId(savedId);
        const saved = storage.loadChat(savedId);
        const msgs = (saved && Array.isArray((saved as any).messages)) ? (saved as any).messages : [];
        try { setMessages(msgs); } catch {}
        lastLoadedChatRef.current = savedId;
      }
    } catch {}
    restoredOnMountRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat]);

  // In controlled mode: reload messages when currentChat changes (for switching)
  useEffect(() => {
    if (!restoredOnMountRef.current) return; // Wait for initial restore
    if (currentChat === undefined) return; // Only for controlled mode
    if (currentChat === lastLoadedChatRef.current) return; // Already loaded
    
    // Chat switched: load new chat's messages
    try {
      const saved = storage.loadChat(currentChat);
      const msgs = (saved && Array.isArray((saved as any).messages)) ? (saved as any).messages : [];
      try { setMessages(msgs); } catch {}
      lastLoadedChatRef.current = currentChat;
      try { storage.saveCurrentChatId(currentChat); } catch {}
    } catch {}
  }, [currentChat, storage, setMessages]);

  // After restore: persist current chatId so it is used on next reload
  useEffect(() => {
    if (!restoredOnMountRef.current) return;
    try { storage.saveCurrentChatId(chatId); } catch {}
  }, [chatId, storage]);

  // Reflect streaming/open state via provider
  useEffect(() => {
    try { setStreamingState(chatId, isLoading); } catch {}
    return () => {
      // Cleanup: remove streaming state when component unmounts or chatId changes
      try { setStreamingState(chatId, false); } catch {}
    };
  }, [chatId, isLoading, setStreamingState]);

  useEffect(() => {
    try { setChatOpenState(chatId, isOpen); } catch {}
    return () => {
      // Cleanup: remove open state when component unmounts or chatId changes
      try { setChatOpenState(chatId, false); } catch {}
    };
  }, [chatId, isOpen, setChatOpenState]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && attachments.length === 0) return;
    if (isLoading) return;

    // Capture current state before clearing
    const currentAttachments = [...attachments];

    // Clear input and attachments immediately for better UX
    setInput('');
    clearAttachments();
    setUploadError(null);

    try {
      // Send message with proper format for Vercel AI SDK v5
      // FileUIPart uses 'url' field, convertToModelMessages will convert to 'data' for the model
      await sendMessage({
        text: trimmedInput,
        files: currentAttachments.map(att => ({
          type: 'file' as const,
          url: att.url,
          mediaType: att.mimeType || 'application/octet-stream',
          ...(att.name ? { name: att.name } : {}),
          ...(att.size ? { size: att.size } : {}),
        })),
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setUploadError('Failed to send message. Please try again.');
    }
  }, [input, attachments, isLoading, sendMessage, clearAttachments]);

  // Header actions handlers
  const handleNewChat = useCallback(() => {
    if (isLoading) return;
    cleanupAllForms();
    setInput('');
    clearAttachments();
    setUploadError(null);
    try { setMessages([]); } catch {}
    const newId = `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    // Reset the loaded chat ref so the new chat is tracked
    lastLoadedChatRef.current = newId;
    // Use storage hook to mark a new chat session; actual metadata is created on first send
    try {
      chatStorage.createNewChat(() => {
        setChatId(newId);
        try { storage.saveCurrentChatId(newId); } catch {}
      });
    } catch {
      // Fallback: still set id to avoid being stuck
      setChatId(newId);
      try { storage.saveCurrentChatId(newId); } catch {}
    }
  }, [isLoading, clearAttachments, storage, setMessages, setChatId, cleanupAllForms, chatStorage]);

  const handleToggleHistory = useCallback(() => {
    setHistoryOpen(v => !v);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    try { storage.saveShowChatPreference(false); } catch {}
  }, [storage]);


  // Handle file input change
  const onFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await handleFileSelection(files, setUploadError);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelection, fileInputRef]);

  // Auto-resize textarea effect for main input
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to initial value first
    textarea.style.height = '24px';
    // Force reflow
    textarea.offsetHeight;
    // Then calculate proper height
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200); // max height of 200px
    textarea.style.height = `${newHeight}px`;
  }, [input]);


  const handleUserMessageClick = useCallback((message: any, id: string, text: string, attachments?: any[]) => {
    setMessageToEdit({ id, text, attachments: attachments || [] });
    setIsConfirmEditOpen(true);
  }, []);

  const handleConfirmEdit = useCallback(() => {
    if (!messageToEdit || isLoading) return;
    
    try {
      // Find the message index
      const messageIndex = chatMessages.findIndex((m: any) => m.id === messageToEdit.id);
      if (messageIndex === -1) return;

      // Remove messages from the edited message onwards
      const updatedMessages = chatMessages.slice(0, messageIndex);
      try { setMessages(updatedMessages); } catch {}
      
      // Set the message content in the main input
      setInput(messageToEdit.text);
      
      // Set the message attachments in the main input
      setAttachments(messageToEdit.attachments);
      
      // Close modal and reset state
      setIsConfirmEditOpen(false);
      setMessageToEdit(null);
      
      // Notify about messages change after edit
      notifyMessagesChange();
    } catch (error) {
      console.error('Failed to edit message:', error);
      setUploadError('Failed to edit message. Please try again.');
    }
  }, [messageToEdit, isLoading, chatMessages, setMessages, setAttachments, notifyMessagesChange]);

  const handleCancelEdit = useCallback(() => {
    setIsConfirmEditOpen(false);
    setMessageToEdit(null);
  }, []);

 

  const panel = (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: "420px",
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        color: resolvedColors.textColor,
        gap: '16px',
        zIndex: 1000,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease-out, width 0.2s ease-out'
      }}
    >
     <ChatHeader 
      title={t('general.agent')}
      alwaysOpen={false}
      streaming={isLoading}
      dir={(providerDir || 'ltr') as any}
      resolvedColors={resolvedColors as any}
      onNew={handleNewChat}
      onToggleHistory={handleToggleHistory}
      onClose={handleClose}
      historyBtnRef={historyBtnRef}
      t={t as any}
    />

      {/* MessageList */}
      <div
        ref={scrollRef}
        className="chat-scroll-container"
        style={{
          flex: '1',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 4px 16px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          scrollBehavior: 'smooth',
          // Theme variables for inline forms and controls
          ['--hsafa-primary' as any]: (resolvedColors as any).primaryColor,
          ['--hsafa-border' as any]: (resolvedColors as any).borderColor,
          ['--hsafa-card' as any]: (resolvedColors as any).cardBackground,
          ['--hsafa-text' as any]: (resolvedColors as any).textColor,
          ['--hsafa-muted' as any]: (resolvedColors as any).mutedTextColor,
          ['--hsafa-bg' as any]: (resolvedColors as any).backgroundColor,
          ['--hsafa-hover' as any]: (resolvedColors as any).hoverBackground,
          ['--hsafa-input-bg' as any]: (resolvedColors as any).inputBackground,
          ['--hsafa-accent' as any]: (resolvedColors as any).accentColor,
        }}
      >
        {chatMessages.length === 0 ? (
          <div style={{ 
            padding: '32px', 
            textAlign: 'center', 
            color: resolvedColors.mutedTextColor,
            fontSize: '14px' 
          }}>
            {t('messages.empty')}
          </div>
        ) : (
          <MessageList
            chatMessages={chatMessages as any}
            isLoading={isLoading}
            openReasoningIds={openReasoningIds}
            toggleReasoning={(id) => setOpenReasoningIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
            resolvedColors={resolvedColors as any}
            t={t}
            onUserMessageClick={handleUserMessageClick}
            HsafaUI={allUI}
            onUIError={handleUIError}
            onUISuccess={handleUISuccess}
            addToolResult={(payload: any) => (chatApi as any)?.addToolResult?.(payload)}
            editableMessageIcon={editProcessContent?.message_icon}
          />
        )}
      </div>

   

      {/* ChatInput */}
      <div style={{ position: 'sticky', bottom: '0', marginTop: 'auto', paddingBottom: '8px', }}>
           {/* Component Above Input */}
      {componentAboveInput && React.createElement(componentAboveInput, {})}
        {uploadError && (
          <div style={{ padding: '8px 12px', marginBottom: '8px', backgroundColor: '#ef4444', color: '#fff', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px' }}>×</button>
          </div>
        )}

        {chatError && (
          <div style={{ padding: '8px 12px', marginBottom: '8px', backgroundColor: '#ef4444', color: '#fff', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>An error occurred: {chatError.message || 'Please try again.'}</span>
            <button onClick={() => window.location.reload()} style={{ background: 'none', border: '1px solid #fff', color: '#fff', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Refresh</button>
          </div>
        )}

        <ChatInput
          input={input}
          setInput={setInput}
          textareaRef={textareaRef}
          fileInputRef={fileInputRef}
          isLoading={isLoading}
          uploading={uploading}
          attachments={attachments as any}
          formatBytes={formatBytes}
          handleRemoveAttachment={handleRemoveAttachment}
          onFileInputChange={onFileInputChange}
          onSend={handleSendMessage}
          onStop={() => stop()}
          status={status as 'ready' | 'streaming' | 'submitted' | 'error' | undefined}
          t={t}
          resolvedColors={resolvedColors as any}
        />
      </div>

      {/* History Modal */}
      <ChatHistoryModal
        historyOpen={historyOpen}
        historySearch={historySearch}
        currentChatId={chatId}
        refreshKey={historyRefreshKey}
        resolvedColors={resolvedColors as any}
        onClose={() => setHistoryOpen(false)}
        onSearchChange={setHistorySearch}
        onChatSelect={(id) => {
          setHistoryOpen(false);
          if (id && id !== chatId) {
            cleanupAllForms();
            setChatId(id);
            // In controlled mode, messages will be loaded by the effect above
            // In uncontrolled mode, load messages here
            if (currentChat === undefined) {
              try { storage.saveCurrentChatId(id); } catch {}
              try {
                const saved = storage.loadChat(id);
                const msgs = (saved && Array.isArray((saved as any).messages)) ? (saved as any).messages : [];
                try { setMessages(msgs); } catch {}
              } catch {}
            }
          }
        }}
        onChatDelete={(id) => {
          try {
            storage.deleteChat(id);
            setHistoryRefreshKey((v) => v + 1);
            if (id === chatId) {
              handleNewChat();
            }
          } catch {}
        }}
        loadChatsIndex={() => storage.loadChatsIndex()}
        historyPopupRef={historyPopupRef}
      />

      {/* Confirm Edit Modal */}
      <ConfirmEditModal
        isOpen={isConfirmEditOpen}
        resolvedColors={resolvedColors as any}
        onConfirm={handleConfirmEdit}
        onCancel={handleCancelEdit}
        editProcessContent={editProcessContent}
      />

      {/* Animations */}
      <style>
        {`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}
      </style>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return (
      <>
        <CursorController />
        {createPortal(panel, document.body)}
        <FloatingChatButton
          show={!isOpen}
          onClick={() => { setIsOpen(true); try { storage.saveShowChatPreference(true); } catch {} }}
          resolvedColors={resolvedColors as any}
          floatingButtonPosition={floatingButtonPosition}
        />
      </>
    );
  }

  return panel;
}
