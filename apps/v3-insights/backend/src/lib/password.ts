import { createHash } from 'node:crypto';

/** 简易密码哈希（PoC 用，非生产级） */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
