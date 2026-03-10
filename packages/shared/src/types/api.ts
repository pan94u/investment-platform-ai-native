/** 统一 API 响应格式 */
export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
}

/** 健康检查响应 */
export interface HealthResponse {
  readonly status: 'ok' | 'error';
  readonly version: string;
  readonly timestamp: string;
  readonly database: 'connected' | 'disconnected';
}
