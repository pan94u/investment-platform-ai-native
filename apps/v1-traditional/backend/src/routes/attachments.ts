import { Hono } from 'hono';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import type { AppEnv } from '../lib/types.js';
import { authMiddleware } from '../middleware/auth.js';
import * as attachmentService from '../services/attachment.js';

const attachmentsRouter = new Hono<AppEnv>();

attachmentsRouter.use('/*', authMiddleware);

/** POST /api/filings/:filingId/attachments — 上传附件 */
attachmentsRouter.post('/filings/:filingId/attachments', async (c) => {
  const user = c.get('user');
  const filingId = c.req.param('filingId');

  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, data: null, error: '请选择文件' }, 400);
    }

    const attachment = await attachmentService.uploadAttachment(filingId, file, user.id, user.name);
    return c.json({ success: true, data: attachment, error: null }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '上传失败';
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

  // remote:// 占位符 → 无法下载
  if (attachment.filePath.startsWith('remote://')) {
    return c.json({ success: false, data: null, error: '文件存储在远程系统，请通过文档管理平台下载' }, 400);
  }

  // 本地文件 → 流式返回
  try {
    const fileStat = await stat(attachment.filePath);
    const stream = createReadStream(attachment.filePath);

    c.header('Content-Type', attachment.mimeType);
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.filename)}"`);
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
