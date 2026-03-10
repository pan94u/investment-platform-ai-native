import type { FilingConversation, ChatMessage } from '@filing/shared';
import { generateId } from '../lib/id.js';

/** 会话存储（PoC 内存存储） */
const conversations = new Map<string, FilingConversation>();

/** 创建新会话 */
export function createConversation(userId: string): FilingConversation {
  const id = generateId('conv');
  const now = new Date();

  const conversation: FilingConversation = {
    id,
    filingId: null,
    userId,
    messages: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  conversations.set(id, conversation);
  return conversation;
}

/** 添加消息到会话 */
export function addMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: ChatMessage['metadata'],
): ChatMessage {
  const conversation = conversations.get(conversationId);
  if (!conversation) throw new Error('会话不存在');

  const message: ChatMessage = {
    id: generateId('msg'),
    role,
    content,
    timestamp: new Date(),
    metadata,
  };

  // 由于 readonly 约束，通过创建新数组来添加消息
  const updatedConversation: FilingConversation = {
    ...conversation,
    messages: [...conversation.messages, message],
    updatedAt: new Date(),
  };

  conversations.set(conversationId, updatedConversation);
  return message;
}

/** 获取会话详情 */
export function getConversation(conversationId: string): FilingConversation | undefined {
  return conversations.get(conversationId);
}

/** 列出用户的所有会话 */
export function listConversations(userId: string): FilingConversation[] {
  const result: FilingConversation[] = [];
  for (const conv of conversations.values()) {
    if (conv.userId === userId) {
      result.push(conv);
    }
  }
  // 按更新时间倒序
  return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** 关联会话到备案 */
export function linkConversationToFiling(conversationId: string, filingId: string): void {
  const conversation = conversations.get(conversationId);
  if (!conversation) throw new Error('会话不存在');

  const updated: FilingConversation = {
    ...conversation,
    filingId,
    updatedAt: new Date(),
  };
  conversations.set(conversationId, updated);
}

/** 完成会话 */
export function completeConversation(conversationId: string): void {
  const conversation = conversations.get(conversationId);
  if (!conversation) return;

  const updated: FilingConversation = {
    ...conversation,
    status: 'completed',
    updatedAt: new Date(),
  };
  conversations.set(conversationId, updated);
}
