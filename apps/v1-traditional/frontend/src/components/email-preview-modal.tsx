'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

interface Recipient {
  email: string;
  name: string;
}

interface EmailPreviewModalProps {
  filingId: string;
  approvalId: string;
  comment: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmailPreviewModal({ filingId, approvalId, comment, onClose, onSuccess }: EmailPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toList, setToList] = useState<Recipient[]>([]);
  const [ccList, setCcList] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [toQuery, setToQuery] = useState('');
  const [ccQuery, setCcQuery] = useState('');
  const [toResults, setToResults] = useState<Array<{ id: string; name: string; email: string; department: string }>>([]);
  const [ccResults, setCcResults] = useState<Array<{ id: string; name: string; email: string; department: string }>>([]);
  const [toOpen, setToOpen] = useState(false);
  const [ccOpen, setCcOpen] = useState(false);
  const toRef = useRef<HTMLDivElement>(null);
  const ccRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getEmailPreview(filingId).then((data) => {
      setToList(data.to);
      setCcList(data.cc);
      setSubject(data.subject);
      setHtmlBody(data.htmlBody);
      setAttachmentNames(data.attachments.map(a => a.filename));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filingId]);

  function removeTo(email: string) {
    setToList((prev) => prev.filter(r => r.email !== email));
  }
  function removeCc(email: string) {
    setCcList((prev) => prev.filter(r => r.email !== email));
  }
  // 搜索收件人
  useEffect(() => {
    if (toQuery.length < 2) { setToResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const list = await api.searchUsers(toQuery);
        setToResults(list.map(u => ({ id: u.id, name: u.name, email: (u as Record<string, unknown>).email as string ?? '', department: u.department })));
      } catch { setToResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [toQuery]);

  // 搜索抄送人
  useEffect(() => {
    if (ccQuery.length < 2) { setCcResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const list = await api.searchUsers(ccQuery);
        setCcResults(list.map(u => ({ id: u.id, name: u.name, email: (u as Record<string, unknown>).email as string ?? '', department: u.department })));
      } catch { setCcResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [ccQuery]);

  // 点击外部关闭下拉
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (toRef.current && !toRef.current.contains(e.target as Node)) setToOpen(false);
      if (ccRef.current && !ccRef.current.contains(e.target as Node)) setCcOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function addTo(person: { name: string; email: string }) {
    if (person.email && !toList.some(r => r.email === person.email)) {
      setToList((prev) => [...prev, { email: person.email, name: person.name }]);
    }
    setToQuery(''); setToOpen(false);
  }
  function addCc(person: { name: string; email: string }) {
    if (person.email && !ccList.some(r => r.email === person.email)) {
      setCcList((prev) => [...prev, { email: person.email, name: person.name }]);
    }
    setCcQuery(''); setCcOpen(false);
  }

  async function handleConfirmAndSend() {
    setSubmitting(true);
    try {
      await api.approveApproval(approvalId, comment, {
        emailOverrides: {
          to: toList.map(r => r.email),
          cc: ccList.map(r => r.email),
          subject,
        },
      });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmOnly() {
    setSubmitting(true);
    try {
      await api.approveApproval(approvalId, comment, { skipEmail: true });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 rounded-t-xl">
          <h2 className="text-base font-semibold text-gray-900">确认并发送备案邮件</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#0066CC]" />
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* 收件人 */}
            <div ref={toRef} className="relative">
              <label className="mb-1.5 block text-sm font-medium text-gray-600">收件人</label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1.5 min-h-[40px]">
                {toList.map((r) => (
                  <Pill key={r.email} label={`${r.name} <${r.email}>`} onRemove={() => removeTo(r.email)} />
                ))}
                <input
                  value={toQuery}
                  onChange={(e) => { setToQuery(e.target.value); setToOpen(true); }}
                  onFocus={() => { if (toQuery.length >= 2) setToOpen(true); }}
                  placeholder="输入姓名或工号搜索..."
                  className="flex-1 min-w-[140px] border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-300"
                />
              </div>
              {toOpen && toQuery.length >= 2 && (
                <SearchDropdown results={toResults} onSelect={addTo} />
              )}
            </div>

            {/* 抄送 */}
            <div ref={ccRef} className="relative">
              <label className="mb-1.5 block text-sm font-medium text-gray-600">抄送</label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1.5 min-h-[40px]">
                {ccList.map((r) => (
                  <Pill key={r.email} label={`${r.name} <${r.email}>`} onRemove={() => removeCc(r.email)} />
                ))}
                <input
                  value={ccQuery}
                  onChange={(e) => { setCcQuery(e.target.value); setCcOpen(true); }}
                  onFocus={() => { if (ccQuery.length >= 2) setCcOpen(true); }}
                  placeholder="输入姓名或工号搜索..."
                  className="flex-1 min-w-[140px] border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-300"
                />
              </div>
              {ccOpen && ccQuery.length >= 2 && (
                <SearchDropdown results={ccResults} onSelect={addCc} />
              )}
            </div>

            {/* 主题 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600">邮件主题</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="form-input"
              />
            </div>

            {/* 附件 */}
            {attachmentNames.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600">附件 ({attachmentNames.length})</label>
                <div className="flex flex-wrap gap-1.5">
                  {attachmentNames.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 邮件正文预览 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600">邮件正文预览</label>
              <div
                className="rounded-md border border-gray-200 bg-gray-50 p-4 max-h-[300px] overflow-y-auto text-sm"
                dangerouslySetInnerHTML={{ __html: htmlBody }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2.5 border-t border-gray-100 bg-white px-6 py-4 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-md px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirmOnly}
            disabled={submitting}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            仅确认不发邮件
          </button>
          <button
            onClick={handleConfirmAndSend}
            disabled={submitting || toList.length === 0}
            className="rounded-md bg-[#0066CC] px-4 py-2 text-sm font-medium text-white hover:bg-[#0055AA] disabled:opacity-50"
          >
            {submitting ? '处理中...' : '确认并发送邮件'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchDropdown({ results, onSelect }: {
  results: Array<{ id: string; name: string; email: string; department: string }>;
  onSelect: (person: { name: string; email: string }) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="absolute z-30 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg px-3 py-2 text-sm text-gray-400">
        未找到匹配人员
      </div>
    );
  }
  return (
    <div className="absolute z-30 mt-1 w-full max-h-40 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
      {results.map((r) => (
        <button key={r.id} type="button" onClick={() => onSelect(r)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50">
          <span className="text-gray-700">{r.name}</span>
          <span className="ml-2 text-xs text-gray-400">{r.email || r.department}</span>
        </button>
      ))}
    </div>
  );
}

function Pill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-blue-400 hover:text-blue-700 leading-none"
      >
        &times;
      </button>
    </span>
  );
}
