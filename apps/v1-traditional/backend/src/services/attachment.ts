import { eq } from 'drizzle-orm';
import { attachments, filings } from '@filing/database';
import { db } from '../lib/db.js';
import { generateId } from '../lib/id.js';
import * as auditService from './audit.js';
import { getEmployeesByCode } from './org-query.js';
import { getStrategicApiBase, getStrategicToken } from './strategic-auth.js';

/**
 * 战投系统文件上传 — /file/fileBase/uploadVant
 * 认证: 复用 strategic-auth getStrategicToken（IAM → checkUser → 战投 token）
 * 接口签名: POST multipart/form-data
 *   - dataType: 业务分类（影响存储路径）
 *   - files: 文件列表
 * 返回: AjaxResult { code:200, msg, data: [{ fileName, fileId }] }
 */
const UPLOAD_API_URL = `${getStrategicApiBase()}/file/fileBase/uploadVant`;
const UPLOAD_DATA_TYPE = process.env.STRATEGIC_UPLOAD_DATATYPE ?? 'investmentFiling';
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

/** 手动构造 multipart/form-data body
 *
 * 注意: 不能用 Node 原生 FormData + fetch —— undici 会用 Transfer-Encoding: chunked
 * 不预先计算 Content-Length，战投后端 (Spring StandardMultipartHttpServletRequest)
 * 不接受 chunked multipart，会永远 hang 等 Content-Length。
 * 已验证 6 轮：curl 1 秒返回 200，Node fetch + FormData 30s 准时 abort。
 */
async function buildMultipartBody(
  fields: Array<{ name: string; value: string }>,
  file: { name: string; type: string; buffer: Buffer },
): Promise<{ body: Buffer; contentType: string }> {
  const boundary = `----InvestmentFilingBoundary${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  const CRLF = '\r\n';
  const parts: Buffer[] = [];

  // 普通字段
  for (const { name, value } of fields) {
    parts.push(
      Buffer.from(
        `--${boundary}${CRLF}` +
          `Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}` +
          `${value}${CRLF}`,
        'utf8',
      ),
    );
  }

  // 文件字段（filename 直接放原始字节，UTF-8 编码，多数后端都能处理中文）
  parts.push(
    Buffer.from(
      `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="files"; filename="${file.name}"${CRLF}` +
        `Content-Type: ${file.type || 'application/octet-stream'}${CRLF}${CRLF}`,
      'utf8',
    ),
  );
  parts.push(file.buffer);
  parts.push(Buffer.from(CRLF, 'utf8'));

  // 结束 boundary
  parts.push(Buffer.from(`--${boundary}--${CRLF}`, 'utf8'));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

/** 调用战投系统 uploadVant 接口
 *
 * 战投后端 (FileBaseController.uploadVant) 签名:
 *   POST /file/fileBase/uploadVant
 *   form-data: dataType (string), files (file[])
 *   return: AjaxResult.success(List<FileBase>) — 即 { code, msg, data: [{ id, url, realName, ... }] }
 */
async function uploadToRemote(file: File, iamToken: string): Promise<{ fileUrl: string; fileId?: string }> {
  const token = await getStrategicToken(iamToken);

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { body, contentType } = await buildMultipartBody(
    [{ name: 'dataType', value: UPLOAD_DATA_TYPE }],
    { name: file.name, type: file.type, buffer: fileBuffer },
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

  try {
    console.log(
      `[Attachment] 上传至战投: ${UPLOAD_API_URL} dataType=${UPLOAD_DATA_TYPE} file=${file.name} size=${body.length}`,
    );
    const res = await fetch(UPLOAD_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType,
        'Content-Length': String(body.length),
        // 关键: 不复用连接池中的死连接（战投 nginx keep-alive 时间短，
        // 此前 strategic-api GET 留下的连接可能已被服务端单方面关闭，
        // undici 复用它会导致 30s 超时）
        'Connection': 'close',
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`战投上传返回 ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json() as Record<string, unknown>;
    console.log('[Attachment] uploadVant 响应:', JSON.stringify(json).slice(0, 400));

    // AjaxResult code 非 200 视为失败
    const code = json.code as number | undefined;
    if (code !== undefined && code !== 200) {
      throw new Error(`战投上传业务失败 code=${code} msg=${(json.msg ?? json.message ?? 'unknown') as string}`);
    }

    // 兼容: data 可能是 List<FileBase> 或 单个 FileBase 或 直接字段
    const dataRaw = (json.data ?? json.datas ?? json.result ?? json) as unknown;
    const first = (Array.isArray(dataRaw) ? dataRaw[0] : dataRaw) as Record<string, unknown> | undefined;
    if (!first || typeof first !== 'object') {
      throw new Error('战投上传返回结构异常: 无 data');
    }

    const fileUrl = (first.url ?? first.fileUrl ?? first.filePath ?? first.path ?? '') as string;
    const fileId = (first.id ?? first.fileId ?? first.documentId ?? '') as string;

    if (!fileUrl && !fileId) {
      console.warn('[Attachment] 战投上传返回无 URL/ID，原始响应:', JSON.stringify(json));
    }

    return { fileUrl, fileId };
  } finally {
    clearTimeout(timer);
  }
}

/** 从战投系统下载文件，返回流式响应
 *
 * 战投后端 (FileBaseController.fileDownload):
 *   GET /file/fileBase/common/download?id={fileId}&isPreview=false
 *   返回二进制流（response.getOutputStream().write）
 */
export async function downloadFromStrategic(
  fileId: string,
  iamToken: string,
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string; contentLength?: number }> {
  const token = await getStrategicToken(iamToken);
  const url = `${getStrategicApiBase()}/file/fileBase/common/download?id=${encodeURIComponent(fileId)}&isPreview=false`;

  console.log(`[Attachment] 战投下载: ${url}`);
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      // 同上传：避免 undici 复用已被服务端关闭的 keep-alive 连接
      'Connection': 'close',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`战投下载返回 ${res.status}: ${text.slice(0, 200)}`);
  }

  if (!res.body) {
    throw new Error('战投下载响应无 body');
  }

  return {
    body: res.body,
    contentType: res.headers.get('content-type') ?? 'application/octet-stream',
    contentLength: Number(res.headers.get('content-length') ?? 0) || undefined,
  };
}

/** 仅代理上传到战投，不写 DB（新建备案时 filingId 还不存在） */
export async function proxyUpload(file: File, iamToken: string) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`不支持的文件类型: ${file.type}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`文件过大: ${(file.size / 1024 / 1024).toFixed(1)}MB，限制 50MB`);
  }

  const result = await uploadToRemote(file, iamToken);
  const url = result.fileUrl || `remote://${result.fileId || 'uploaded'}`;
  console.log(`[Attachment] 代理上传成功: ${file.name} → ${url}`);
  return { filename: file.name, url, fileSize: file.size, mimeType: file.type };
}

/** 上传附件（有 filingId，上传 + 写 DB） */
export async function uploadAttachment(
  filingId: string,
  file: File,
  userId: string,
  userName: string,
  iamToken: string,
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
    const result = await uploadToRemote(file, iamToken);
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
  await db.insert(attachments).values({
    id,
    filingId,
    filename: file.name,
    filePath,
    fileSize: file.size,
    mimeType: file.type,
    uploadedBy: userId,
  });
  const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);

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

/** 注册已上传的附件（前端直传文档服务后，将 URL 写入 DB） */
export async function registerAttachment(
  filingId: string,
  data: { filename: string; url: string; fileSize: number; mimeType: string },
  userId: string,
  userName: string,
) {
  const filing = await db.select().from(filings).where(eq(filings.id, filingId)).limit(1);
  if (filing.length === 0) throw new Error('备案不存在');

  const id = generateId('att');
  await db.insert(attachments).values({
    id,
    filingId,
    filename: data.filename,
    filePath: data.url,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    uploadedBy: userId,
  });
  const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);

  await auditService.logAudit({
    action: 'attachment_uploaded',
    entityType: 'attachment',
    entityId: id,
    userId,
    userName,
    detail: { filingId, filename: data.filename, fileSize: data.fileSize, filePath: data.url },
  });

  return attachment;
}

/** 查询附件列表 */
export async function getAttachments(filingId: string) {
  const rows = await db
    .select({
      id: attachments.id,
      filingId: attachments.filingId,
      filename: attachments.filename,
      filePath: attachments.filePath,
      fileSize: attachments.fileSize,
      mimeType: attachments.mimeType,
      uploadedBy: attachments.uploadedBy,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .where(eq(attachments.filingId, filingId));

  // 从 org 表批量查上传人姓名
  const empCodes = [...new Set(rows.map(r => r.uploadedBy).filter(Boolean))];
  const empMap = empCodes.length > 0 ? await getEmployeesByCode(empCodes) : new Map();

  return rows.map(r => ({
    ...r,
    uploaderName: empMap.get(r.uploadedBy)?.name ?? r.uploadedBy,
  }));
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
