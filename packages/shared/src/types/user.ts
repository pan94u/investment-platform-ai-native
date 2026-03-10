/** 用户角色 */
export type UserRole = 'initiator' | 'supervisor' | 'group_approver' | 'admin' | 'viewer';

/** 用户 */
export interface User {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly role: UserRole;
  readonly department: string;
  readonly domain: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** 登录请求 */
export interface LoginRequest {
  readonly username: string;
  readonly password: string;
}

/** 登录响应 */
export interface LoginResponse {
  readonly token: string;
  readonly user: Omit<User, 'createdAt' | 'updatedAt'>;
}
