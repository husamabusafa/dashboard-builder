import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { IconWrapper } from '../IconWrapper';
import { ThemeColors } from '../../utils/chat-theme';
import { timeAgo } from '../../utils/time';

interface ChatMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

interface ChatHistoryModalProps {
  historyOpen: boolean;
  historySearch: string;
  currentChatId: string | null;
  refreshKey?: number;
  resolvedColors: ThemeColors;
  onClose: () => void;
  onSearchChange: (search: string) => void;
  onChatSelect: (chatId: string) => void;
  onChatDelete: (chatId: string) => void;
  loadChatsIndex: () => ChatMeta[];
  historyPopupRef: React.RefObject<HTMLDivElement>;
}

export function ChatHistoryModal({
  historyOpen,
  historySearch,
  currentChatId,
  refreshKey,
  resolvedColors,
  onClose,
  onSearchChange,
  onChatSelect,
  onChatDelete,
  loadChatsIndex,
  historyPopupRef
}: ChatHistoryModalProps) {
  if (!historyOpen) return null;

  const modalContent = (
    <>
      {/* Backdrop with blur */}
      <div
        style={{
          position: 'fixed',
          inset: '0',
          zIndex: 1100,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      />
      {/* Command palette panel */}
      <div
        ref={historyPopupRef}
        style={{
          position: 'fixed',
          left: '50%',
          top: '64px',
          transform: 'translateX(-50%)',
          zIndex: 1101,
          width: '680px',
          maxWidth: '94vw',
          overflow: 'hidden',
          borderRadius: '16px',
          border: `1px solid ${resolvedColors.borderColor}`,
          backgroundColor: `${resolvedColors.backgroundColor}f0`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: `1px solid ${resolvedColors.borderColor}`,
          padding: '12px 16px'
        }}>
          <div style={{ flex: '1' }}>
            <input
              autoFocus
              value={historySearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search"
              style={{
                width: '100%',
                borderRadius: '8px',
                backgroundColor: resolvedColors.inputBackground,
                padding: '8px 12px',
                fontSize: '14px',
                color: resolvedColors.textColor,
                border: `1px solid ${resolvedColors.borderColor}`,
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = resolvedColors.primaryColor}
              onBlur={(e) => e.currentTarget.style.borderColor = resolvedColors.borderColor}
            />
          </div>
        </div>
        <div style={{
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
          {(() => {
            const q = historySearch.toLowerCase().trim();
            let list = loadChatsIndex();
            if (q) list = list.filter(m => (m.title || '').toLowerCase().includes(q));
            if (!list || list.length === 0) return (
              <div style={{
                padding: '24px',
                color: resolvedColors.mutedTextColor,
                textAlign: 'center'
              }}>No chats found.</div>
            );
            return (
              <div>
                {list.map((meta, index) => (
                  <div key={meta.id} style={{
                    borderTop: index > 0 ? `1px solid ${resolvedColors.borderColor}` : 'none'
                  }}>
                    <div style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: meta.id === currentChatId ? resolvedColors.cardBackground : 'transparent'
                    }}>
                      <button
                        style={{
                          flex: '1',
                          textAlign: 'left',
                          transition: 'background-color 0.2s',
                          borderRadius: '8px',
                          padding: '8px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          color: resolvedColors.textColor
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = resolvedColors.hoverBackground}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => onChatSelect(meta.id)}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}>
                          <div style={{ minWidth: '0', flex: '1' }}>
                            <div style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '14px',
                              color: resolvedColors.textColor
                            }}>{meta.title || 'Untitled chat'}</div>
                          </div>
                          <div style={{
                            flexShrink: 0,
                            fontSize: '12px',
                            color: resolvedColors.mutedTextColor
                          }}>{timeAgo(meta.updatedAt)}</div>
                        </div>
                      </button>
                      <button
                        style={{
                          flexShrink: 0,
                          borderRadius: '6px',
                          padding: '8px',
                          color: resolvedColors.mutedTextColor,
                          border: '1px solid transparent',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title="Delete chat"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = resolvedColors.mutedTextColor;
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderColor = 'transparent';
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChatDelete(meta.id);
                        }}
                      >
                        <IconWrapper IconComponent={Trash2} size="16" strokeWidth="2" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
  
  // Only use portal if document.body is available
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  
  // Fallback to inline rendering
  return modalContent;
}
