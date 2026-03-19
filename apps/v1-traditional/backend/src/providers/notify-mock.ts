import type { NotifyProvider, TodoPayload } from './types.js';

/** Mock 通知提供者 — 仅打印日志，不调外部 API */
export class MockNotifyProvider implements NotifyProvider {
  async pushTodo(payload: TodoPayload): Promise<string | null> {
    console.log(`[MockNotify] pushTodo → ${payload.approverName}: "${payload.filingTitle}" (L${payload.level})`);
    return null;
  }

  async updateTodo(externalTodoId: string, update: Record<string, string>): Promise<void> {
    console.log(`[MockNotify] updateTodo ${externalTodoId}:`, update);
  }

  async closeTodo(externalTodoId: string, result: string): Promise<void> {
    console.log(`[MockNotify] closeTodo ${externalTodoId} → ${result}`);
  }
}
