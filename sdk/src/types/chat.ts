/**
 * Type definitions for the Hsafa SDK - minimal exports used across the SDK
 */

import React from 'react';

export type Attachment = {
  id: string;
  name?: string;
  url: string;
  mimeType?: string;
  size?: number;
};

export type UserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: URL; mediaType: string }
  | { type: 'file'; data: string; mediaType: string; name?: string };

export type AssistantContentPart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'tool-call'; toolCallId: string; toolName?: string; input?: any };

export type ChatMessage =
  | {
      id: string;
      role: 'user';
      content: string | UserContentPart[];
      createdAt?: number;
      // legacy
      text?: string;
      attachments?: Attachment[];
    }
  | {
      id: string;
      role: 'assistant';
      content?: string | AssistantContentPart[];
      items: any[];
      reasoning?: string;
      reasoningOpen?: boolean;
      mainAgentActions?: any[];
      createdAt?: number;
    };

// Frontend tool configuration
export type HsafaTool = 
  | ((input: any) => any | Promise<any>)
  | {
      tool: (input: any) => any | Promise<any>;
      executeEachToken?: boolean;
    };

// Custom tool UI render props
export type CustomToolUIRenderProps = {
  toolName: string;
  toolCallId: string;
  input: any;
  output: any;
  status?: string;
  addToolResult: (result: any) => void;
};

export interface HsafaChatProps {
  agentId: string;
  theme?: 'dark' | 'light';
  primaryColor?: string;
  primaryColorDark?: string;
  primaryColorLight?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  accentColor?: string;
  width?: number | string;
  maxWidth?: number | string;
  height?: string;
  expandable?: boolean;
  alwaysOpen?: boolean;
  defaultOpen?: boolean;
  floatingButtonPosition?: {
    bottom?: number | string;
    right?: number | string;
    top?: number | string;
    left?: number | string;
  };
  placeholder?: string;
  title?: string;
  className?: string;
  chatContainerClassName?: string;
  dir?: 'rtl' | 'ltr';
  language?: 'en' | 'ar';
  defaultReasoningOpen?: boolean;
  hideReasoningContent?: boolean;
  HsafaTools?: Record<string, HsafaTool>;
  
  // Customization props
  componentAboveInput?: React.ComponentType<any>;
  editProcessContent?: EditProcessContent;
  
  // Message lifecycle callbacks
  onStart?: (message: any) => void;
  onFinish?: (message: any) => void;
  
  // Controlled chat state (optional)
  currentChat?: string;
  onChatChanged?: (chatId: string) => void;
}

export type EditProcessContent = {
  title?: string;
  content?: string | React.ComponentType<any>;
  submit_button_label?: string;
  cancel_button_label?: string;
  icon?: React.ComponentType<any>; // Icon shown in the modal header
  message_icon?: React.ComponentType<any>; // Icon shown in the editable message
};

export type { Attachment as DefaultAttachment };

