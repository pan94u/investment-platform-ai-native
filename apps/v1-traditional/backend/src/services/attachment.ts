import { eq } from 'drizzle-orm';
import { attachments, filings, users } from '@filing/database';
import { db } from '../lib/db.js';
import { generateId } from '../lib/id.js';
import * as auditService from './audit.js';

/**
 * 文档上传接口配置
 * 测试: http://10.138.68.2:30302/kwg/api/kwgDocument/upload
 * 生产: https://hsip.haier.net/kwg/api/kwgDocument/upload
 */
const UPLOAD_API_URL = process.env.DOC_UPLOAD_URL
  ?? (process.env.NODE_ENV === 'production'
    ? 'https://hsip.haier.net/kwg/api/kwgDocument/upload'
    : 'http://10.138.68.2:30302/kwg/api/kwgDocument/upload');

const UPLOAD_TIMEOUT = 30_000; // 30s

const ALLOWED_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/** 调用远程文档上传接口 */
async function uploadToRemote(file: File): Promise<{ fileUrl: string; fileId?: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

  try {
    const res = await fetch(UPLOAD_API_URL, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`文档上传服务返回 ${res.status}: ${text}`);
    }

    const json = await res.json() as Record<string, unknown>;

    // 兼容多种返回格式
    const data = (json.data ?? json.result ?? json) as Record<string, unknown>;
    const fileUrl = (data.url ?? data.fileUrl ?? data.filePath ?? data.path ?? '') as string;
    const fileId = (data.id ?? data.fileId ?? data.documentId ?? '') as string;

    if (!fileUrl) {
      console.warn('[Attachment] 远程上传返回无 URL，原始响应:', JSON.stringify(json));
    }

    return { fileUrl, fileId };
  } finally {
    clearTimeout(timer);
  }
}

/** 上传附件 */
export async function uploadAttachment(
  filingId: string,
  file: File,
  userId: string,
  userName: string,
) {
  // 验证备案存在
  const filing = await db.select().from(filings).where(eq(filings.id, filingId)).limit(1);
  if (filing.length === 0) throw new Error('备案不存在');

  // 验证文件类型
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`不支持的文件类型: ${file.type}，允许: doc/docx/pdf/ppt/pptx/xls/xlsx/jpg/png/gif`);
  }

  // 验证文件大小
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`文件过大: ${(file.size / 1024 / 1024).toFixed(1)}MB，限制 50MB`);
  }

  // 调用远程上传接口
  let filePath: string;
  try {
    const result = await uploadToRemote(file);
    filePath = result.fileUrl || `remote://${result.fileId || 'uploaded'}`;
    console.log(`[Attachment] 上传成功: ${file.name} → ${filePath}`);
  } catch (err) {
    console.error(`[Attachment] 远程上传失败，降级本地存储:`, err);
    // 降级: 本地存储
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
    const dir = join(uploadDir, filingId);
    await mkdir(dir, { recursive: true });
    const id = generateId('att');
    const ext = file.name.split('.').pop() ?? '';
    const safeFilename = `${id}.${ext}`;
    filePath = join(dir, safeFilename);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));
  }

  // 写 DB
  const id = generateId('att');
  const [attachment] = await db.insert(attachments).values({
    id,
    filingId,
    filename: file.name,
    filePath,
    fileSize: file.size,
    mimeType: file.type,
    uploadedBy: userId,
  }).returning();

  await auditService.logAudit({
    action: 'attachment_uploaded',
    entityType: 'attachment',
    entityId: id,
    userId,
    userName,
    detail: { filingId, filename: file.name, fileSize: file.size, filePath },
  });

  return attachment;
}

/** 查询附件列表 */
export async function getAttachments(filingId: string) {
  return db
    .select({
      id: attachments.id,
      filingId: attachments.filingId,
      filename: attachments.filename,
      filePath: attachments.filePath,
      fileSize: attachments.fileSize,
      mimeType: attachments.mimeType,
      uploadedBy: attachments.uploadedBy,
      uploaderName: users.name,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .leftJoin(users, eq(attachments.uploadedBy, users.id))
    .where(eq(attachments.filingId, filingId));
}

/** 获取单个附件（含文件路径） */
export async function getAttachmentById(id: string) {
  const result = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  return result[0] ?? null;
}

/** 删除附件 */
export async function deleteAttachment(id: string, userId: string, userName: string, isAdmin: boolean) {
  const existing = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (existing.length === 0) throw new Error('附件不存在');

  const attachment = existing[0];

  // 仅创建者或 admin 可删
  if (attachment.uploadedBy !== userId && !isAdmin) {
    throw new Error('无权删除此附件');
  }

  // 尝试删除本地文件（如果是本地路径）
  if (!attachment.filePath.startsWith('http') && !attachment.filePath.startsWith('remote://')) {
    try {
      const { unlink } = await import('node:fs/promises');
      await unlink(attachment.filePath);
    } catch {
      // 文件不存在也可以继续删 DB 记录
    }
  }

  // 删 DB
  await db.delete(attachments).where(eq(attachments.id, id));

  await auditService.logAudit({
    action: 'attachment_deleted',
    entityType: 'attachment',
    entityId: id,
    userId,
    userName,
    detail: { filingId: attachment.filingId, filename: attachment.filename },
  });

  return { success: true };
}
