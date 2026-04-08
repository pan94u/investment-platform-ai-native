import { Hono } from 'hono';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import * as attachmentService from '../services/attachment.js';

const attachmentsRouter = new Hono<AppEnv>();

attachmentsRouter.use('/*', authMiddleware);

/** POST /api/attachments/upload-proxy — 仅代理上传到战投，返回 URL（不写 DB） */
attachmentsRouter.post('/attachments/upload-proxy', async (c) => {
  const iamToken = c.req.header('access-token') ?? '';
  try {
    const body = await c.req.parseBody();
    const file = body['file'];
    if (!file || !(file instanceof File)) {
      return c.json({ success: false, data: null, error: '请选择文件' }, 400);
    }
    const result = await attachmentService.proxyUpload(file, iamToken);
    return c.json({ success: true, data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '上传失败';
    console.error('[Attachment] 代理上传失败:', message);
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** POST /api/filings/:filingId/attachments — 上传附件（上传 + 写 DB） */
attachmentsRouter.post('/filings/:filingId/attachments', async (c) => {
  const user = c.get('user');
  const filingId = c.req.param('filingId');
  const iamToken = c.req.header('access-token') ?? '';

  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, data: null, error: '请选择文件' }, 400);
    }

    const attachment = await attachmentService.uploadAttachment(filingId, file, user.id, user.name, iamToken);
    return c.json({ success: true, data: attachment, error: null }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '上传失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** POST /api/filings/:filingId/attachments/register — 注册已上传的附件（前端直传后调用） */
attachmentsRouter.post('/filings/:filingId/attachments/register', async (c) => {
  const user = c.get('user');
  const filingId = c.req.param('filingId');
  try {
    const body = await c.req.json<{ filename: string; url: string; fileSize: number; mimeType: string }>();
    if (!body.filename || !body.url) {
      return c.json({ success: false, data: null, error: '缺少 filename 或 url' }, 400);
    }
    const attachment = await attachmentService.registerAttachment(filingId, body, user.id, user.name);
    return c.json({ success: true, data: attachment, error: null }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '注册失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

/** GET /api/filings/:filingId/attachments — 查询附件列表 */
attachmentsRouter.get('/filings/:filingId/attachments', async (c) => {
  const filingId = c.req.param('filingId');
  const list = await attachmentService.getAttachments(filingId);
  return c.json({ success: true, data: list, error: null });
});

/** GET /api/attachments/:id/download — 下载附件 */
attachmentsRouter.get('/attachments/:id/download', async (c) => {
  const attachment = await attachmentService.getAttachmentById(c.req.param('id'));
  if (!attachment) {
    return c.json({ success: false, data: null, error: '附件不存在' }, 404);
  }

  // 远程 URL → 重定向
  if (attachment.filePath.startsWith('http')) {
    return c.redirect(attachment.filePath);
  }

  // remote://{fileId} → 调战投 download 接口流式转发
  if (attachment.filePath.startsWith('remote://')) {
    const fileId = attachment.filePath.slice('remote://'.length);
    if (!fileId || fileId === 'uploaded') {
      return c.json({ success: false, data: null, error: '附件 fileId 缺失，无法下载' }, 400);
    }
    const iamToken = c.req.header('access-token') ?? '';
    if (!iamToken) {
      return c.json({ success: false, data: null, error: '缺少 access-token，无法访问远程文件' }, 401);
    }
    try {
      const { body, contentType, contentLength } = await attachmentService.downloadFromStrategic(fileId, iamToken);
      c.header('Content-Type', contentType || attachment.mimeType);
      // 中文文件名用 RFC 5987 编码
      c.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`);
      if (contentLength) c.header('Content-Length', String(contentLength));
      return new Response(body, { headers: c.res.headers });
    } catch (err) {
      const message = err instanceof Error ? err.message : '战投下载失败';
      console.error('[Attachment] 战投下载失败:', message);
      return c.json({ success: false, data: null, error: message }, 502);
    }
  }

  // 本地文件 → 流式返回
  try {
    const fileStat = await stat(attachment.filePath);
    const stream = createReadStream(attachment.filePath);

    c.header('Content-Type', attachment.mimeType);
    c.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`);
    c.header('Content-Length', String(fileStat.size));

    const webStream = Readable.toWeb(stream) as ReadableStream;
    return new Response(webStream, { headers: c.res.headers });
  } catch {
    return c.json({ success: false, data: null, error: '文件不存在或已被删除' }, 404);
  }
});

/** DELETE /api/attachments/:id — 删除附件 */
attachmentsRouter.delete('/attachments/:id', async (c) => {
  const user = c.get('user');
  try {
    await attachmentService.deleteAttachment(c.req.param('id'), user.id, user.name, user.role === 'admin');
    return c.json({ success: true, data: null, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除失败';
    return c.json({ success: false, data: null, error: message }, 400);
  }
});

export { attachmentsRouter };
