'use client';

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { api, getCurrentUser } from '@/lib/api';

const ALLOWED_EXTENSIONS = ['doc', 'docx', 'pdf', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'];
const MAX_SIZE_MB = 50;

interface AttachmentItem {
  id: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploaderName: string | null;
  createdAt: string;
}

interface FileUploadProps {
  filingId?: string;
  readonly?: boolean;
}

/** 暴露给父组件的方法 */
export interface FileUploadHandle {
  /** 获取暂存的待上传文件 */
  getPendingFiles(): File[];
  /** 批量上传暂存文件到指定 filingId */
  uploadPendingFiles(filingId: string): Promise<void>;
}

export const FileUpload = forwardRef<FileUploadHandle, FileUploadProps>(
  function FileUpload({ filingId, readonly }, ref) {
    const [files, setFiles] = useState<AttachmentItem[]>([]);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const currentUser = getCurrentUser();

    const isPendingMode = !filingId;

    const loadFiles = useCallback(async () => {
      if (!filingId) return;
      try {
        const list = await api.getAttachments(filingId);
        setFiles(list as AttachmentItem[]);
      } catch { /* ignore */ }
    }, [filingId]);

    useEffect(() => { loadFiles(); }, [loadFiles]);

    // 暴露给父组件
    useImperativeHandle(ref, () => ({
      getPendingFiles: () => pendingFiles,
      uploadPendingFiles: async (targetFilingId: string) => {
        if (pendingFiles.length === 0) return;
        for (const file of pendingFiles) {
          await api.uploadAttachment(targetFilingId, file);
        }
        setPendingFiles([]);
      },
    }), [pendingFiles]);

    function validateFile(file: File): string | null {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return `不支持的文件类型 .${ext}，允许: ${ALLOWED_EXTENSIONS.join(', ')}`;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return `文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB)，限制 ${MAX_SIZE_MB}MB`;
      }
      return null;
    }

    function handleAddFiles(fileList: FileList) {
      setError('');
      const toAdd = Array.from(fileList);
      for (const file of toAdd) {
        const err = validateFile(file);
        if (err) { setError(err); return; }
      }

      if (isPendingMode) {
        // 暂存模式：文件存前端
        setPendingFiles((prev) => [...prev, ...toAdd]);
      } else {
        // 已有 filingId：直接上传
        uploadFiles(toAdd);
      }
    }

    async function uploadFiles(toUpload: File[]) {
      if (!filingId) return;
      setUploading(true);
      try {
        for (const file of toUpload) {
          await api.uploadAttachment(filingId, file);
        }
        await loadFiles();
      } catch (e) {
        setError(e instanceof Error ? e.message : '上传失败');
      } finally {
        setUploading(false);
      }
    }

    function removePending(index: number) {
      setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    }

    async function handleDelete(id: string, filename: string) {
      if (!confirm(`确认删除 "${filename}"？`)) return;
      try {
        await api.deleteAttachment(id);
        await loadFiles();
      } catch (e) {
        setError(e instanceof Error ? e.message : '删除失败');
      }
    }

    function formatSize(bytes: number): string {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    return (
      <div>
        {/* Upload area */}
        {!readonly && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleAddFiles(e.dataTransfer.files); }}
            className={`relative rounded-lg border-2 border-dashed p-6 text-center transition ${
              dragOver ? 'border-[#0066CC] bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ALLOWED_EXTENSIONS.map(e => `.${e}`).join(',')}
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleAddFiles(e.target.files); e.target.value = ''; }}
            />
            <div className="text-sm text-gray-400">
              {uploading ? (
                <span className="text-[#0066CC]">上传中...</span>
              ) : (
                <>
                  拖拽文件到此处或{' '}
                  <button type="button" onClick={() => inputRef.current?.click()} className="text-[#0066CC] hover:underline">
                    点击选择
                  </button>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-300">
              支持 doc/docx/pdf/ppt/pptx/xls/xlsx/jpg/png/gif，单文件最大 {MAX_SIZE_MB}MB
            </p>
          </div>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}

        {/* Pending files (not yet uploaded) */}
        {pendingFiles.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {pendingFiles.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md border border-blue-100 bg-blue-50/30 px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon mimeType={f.type} />
                  <span className="truncate text-gray-700">{f.name}</span>
                  <span className="shrink-0 text-xs text-gray-300">{formatSize(f.size)}</span>
                  <span className="shrink-0 text-xs text-blue-400">待上传</span>
                </div>
                <button
                  type="button"
                  onClick={() => removePending(i)}
                  className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-50"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded files */}
        {files.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon mimeType={f.mimeType} />
                  <span className="truncate text-gray-700">{f.filename}</span>
                  <span className="shrink-0 text-xs text-gray-300">{formatSize(f.fileSize)}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => api.downloadAttachment(f.id, f.filePath)}
                    className="rounded px-2 py-0.5 text-xs text-[#0066CC] hover:bg-blue-50"
                  >
                    下载
                  </button>
                  {!readonly && (currentUser?.id === f.uploadedBy || currentUser?.role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id, f.filename)}
                      className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-50"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

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
