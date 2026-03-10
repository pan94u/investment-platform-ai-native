import { nanoid } from 'nanoid';

export function generateId(prefix?: string): string {
  const id = nanoid(16);
  return prefix ? `${prefix}-${id}` : id;
}

/** 生成备案编号 BG{YYYYMMDD}-{NNN} */
export function generateFilingNumber(seq: number): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `BG${date}-${String(seq).padStart(3, '0')}`;
}
