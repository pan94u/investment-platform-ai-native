'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

const ALLOWED_EXTENSIONS = ['doc', 'docx', 'pdf', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'];
const MAX_SIZE_MB = 50;

/** 已上传文件的引用（后端代理上传后得到的 URL） */
export interface UploadedFileRef {
  filename: string;
  url: string;
  fileSize: number;
  mimeType: string;
}

interface AttachmentItem {
  id: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

interface UploadingItem {
  name: string;
  size: number;
  mimeType: string;
  status: 'uploading' | 'done' | 'error';
  url?: string;
  error?: string;
}

interface FileUploadProps {
  /** 已有备案 ID：上传成功后立即注册到 DB */
  filingId?: string;
  /** 新建表单模式：上传成功后通知父组件 */
  onFilesChange?: (files: UploadedFileRef[]) => void;
  readonly?: boolean;
}

/** 通过后端代理上传到战投系统，返回 URL */
async function uploadViaProxy(file: File): Promise<UploadedFileRef> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('haier-user-center-access-token') : null;
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/attachments/upload-proxy', {
    method: 'POST',
    headers: {
      ...(token ? { 'Access-Token': token } : {}),
      'X-User-Id': localStorage.getItem('userId') ?? '',
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`上传失败 ${res.status}: ${text.slice(0, 100)}`);
  }

  const json = await res.json() as { success: boolean; data: UploadedFileRef; error?: string };
  if (!json.success) throw new Error(json.error ?? '上传失败');
  return json.data;
}

export function FileUpload({ filingId, onFilesChange, readonly }: FileUploadProps) {
  // 已存入 DB 的附件（有 filingId 时从接口加载）
  const [saved, setSaved] = useState<AttachmentItem[]>([]);
  // 本次正在上传或已上传的文件（新建表单 / 补充上传）
  const [items, setItems] = useState<UploadingItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadSaved = useCallback(async () => {
    if (!filingId) return;
    try {
      const list = await api.getAttachments(filingId);
      setSaved(list as AttachmentItem[]);
    } catch { /* ignore */ }
  }, [filingId]);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  // 通知父组件（新建表单模式）
  useEffect(() => {
    if (!onFilesChange) return;
    const done = items
      .filter((i) => i.status === 'done' && i.url)
      .map((i) => ({ filename: i.name, url: i.url!, fileSize: i.size, mimeType: i.mimeType }));
    onFilesChange(done);
  }, [items, onFilesChange]);

  function validate(file: File): string | null {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(ext))
      return `不支持 .${ext}，允许: ${ALLOWED_EXTENSIONS.join(', ')}`;
    if (file.size > MAX_SIZE_MB * 1024 * 1024)
      return `文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB)，限制 ${MAX_SIZE_MB}MB`;
    return null;
  }

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList);
    for (const file of files) {
      const err = validate(file);
      if (err) {
        setItems((prev) => [...prev, { name: file.name, size: file.size, mimeType: file.type, status: 'error', error: err }]);
        continue;
      }

      // 加入上传中状态
      const key = `${file.name}-${Date.now()}`;
      setItems((prev) => [...prev, { name: file.name, size: file.size, mimeType: file.type, status: 'uploading' }]);

      try {
        const result = await uploadViaProxy(file);

        // 如果有 filingId，立即注册到 DB
        if (filingId) {
          await api.registerAttachment(filingId, result);
          await loadSaved();
          // 注册成功后从 items 移除（由 saved 列表展示）
          setItems((prev) => prev.filter((i) => !(i.name === file.name && i.status === 'uploading')));
        } else {
          setItems((prev) =>
            prev.map((i) => i.name === file.name && i.status === 'uploading' ? { ...i, status: 'done', url: result.url } : i)
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '上传失败';
        setItems((prev) =>
          prev.map((i) => i.name === file.name && i.status === 'uploading' ? { ...i, status: 'error', error: msg } : i)
        );
      }

      void key; // suppress unused warning
    }
  }

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`确认删除 "${filename}"？`)) return;
    try {
      await api.deleteAttachment(id);
      await loadSaved();
    } catch { /* ignore */ }
  }

  function removeItem(name: string) {
    setItems((prev) => prev.filter((i) => i.name !== name));
  }

  return (
    <div>
      {!readonly && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
          className={`relative rounded-lg border-2 border-dashed p-6 text-center transition ${
            dragOver ? 'border-[#0066CC] bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')}
            className="hidden"
            onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }}
          />
          <div className="text-sm text-gray-400">
            拖拽文件到此处或{' '}
            <button type="button" onClick={() => inputRef.current?.click()} className="text-[#0066CC] hover:underline">
              点击选择
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-300">
            支持 doc/docx/pdf/ppt/pptx/xls/xlsx/jpg/png/gif，单文件最大 {MAX_SIZE_MB}MB
          </p>
        </div>
      )}

      {/* 上传中 / 结果列表 */}
      {items.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {items.map((item, i) => (
            <div key={`${item.name}-${i}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: item.status === 'error' ? '#fca5a5' : item.status === 'uploading' ? '#bfdbfe' : '#d1fae5',
                       background: item.status === 'error' ? '#fff1f2' : item.status === 'uploading' ? '#eff6ff' : '#f0fdf4' }}>
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon mimeType={item.mimeType} />
                <span className="truncate text-gray-700">{item.name}</span>
                <span className="shrink-0 text-xs text-gray-300">{formatSize(item.size)}</span>
                {item.status === 'uploading' && (
                  <span className="shrink-0 text-xs text-blue-400 flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
                    上传中
                  </span>
                )}
                {item.status === 'error' && <span className="shrink-0 text-xs text-red-400">{item.error}</span>}
                {item.status === 'done' && <span className="shrink-0 text-xs text-green-500">✓ 已上传</span>}
              </div>
              {item.status !== 'uploading' && (
                <button type="button" onClick={() => removeItem(item.name)}
                  className="ml-2 shrink-0 rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-50">
                  移除
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 已保存的附件 */}
      {saved.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {saved.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon mimeType={f.mimeType} />
                <span className="truncate text-gray-700">{f.filename}</span>
                <span className="shrink-0 text-xs text-gray-300">{formatSize(f.fileSize)}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button type="button" onClick={() => api.downloadAttachment(f.id, f.filename, f.filePath)}
                  className="rounded px-2 py-0.5 text-xs text-[#0066CC] hover:bg-blue-50">下载</button>
                {!readonly && (
                  <button type="button" onClick={() => handleDelete(f.id, f.filename)}
                    className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-50">删除</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const color = mimeType.includes('pdf') ? 'text-red-400'
    : mimeType.includes('word') ? 'text-blue-400'
    : mimeType.includes('sheet') || mimeType.includes('excel') ? 'text-green-400'
    : mimeType.includes('presentation') || mimeType.includes('powerpoint') ? 'text-orange-400'
    : mimeType.startsWith('image/') ? 'text-purple-400'
    : 'text-gray-400';
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`shrink-0 ${color}`}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
