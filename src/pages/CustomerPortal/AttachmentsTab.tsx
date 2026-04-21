import { Paperclip, FileText, Image, File, Download, ExternalLink } from 'lucide-react';
import type { PortalAttachment } from './types';
import { formatBytes, fileTypeLabel, fileTypeColor } from '../Documents/useDocuments';

interface PortalDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size_bytes: number | null;
  description: string | null;
  created_at: string;
  document_categories?: { name: string; color: string } | null;
}

interface Props {
  attachments: PortalAttachment[];
  portalDocs: PortalDocument[];
  loading: boolean;
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
  if (type === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-gray-500" />;
}

function legacyFormatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentsTab({ attachments, portalDocs, loading }: Props) {
  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent" />
    </div>
  );

  const grouped: Record<string, PortalAttachment[]> = {};
  attachments.forEach(a => {
    const key = a.work_orders ? `${a.work_orders.wo_number} — ${a.work_orders.title}` : 'Uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });

  const hasAnything = portalDocs.length > 0 || attachments.length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Files &amp; Documents</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {portalDocs.length + attachments.length} file{portalDocs.length + attachments.length !== 1 ? 's' : ''} shared with you
        </p>
      </div>

      {!hasAnything ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Paperclip className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-gray-600 font-semibold">No files shared yet</p>
          <p className="text-sm text-gray-400 mt-1">Files and documents from your account will appear here.</p>
        </div>
      ) : (
        <>
          {portalDocs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Documents
                <span className="text-xs font-normal text-gray-400">({portalDocs.length})</span>
              </h3>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {portalDocs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{doc.file_name}</p>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${fileTypeColor(doc.file_type)}`}>
                            {fileTypeLabel(doc.file_type)}
                          </span>
                          {doc.document_categories && (
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: doc.document_categories.color }}
                            >
                              {doc.document_categories.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {doc.description && <span className="text-gray-500">{doc.description} · </span>}
                          {formatBytes(doc.file_size_bytes)}
                          {doc.file_size_bytes ? ' · ' : ''}
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <a
                          href={doc.file_url}
                          download={doc.file_name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors"
                          title="Open"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-gray-500" />
                Work Order Attachments
                <span className="text-xs font-normal text-gray-400">({attachments.length})</span>
              </h3>
              <div className="space-y-3">
                {Object.entries(grouped).map(([group, files]) => (
                  <div key={group} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-700">{group}</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {files.map(file => (
                        <div key={file.id} className="flex items-center gap-4 px-5 py-3.5">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {fileIcon(file.file_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{file.file_name}</p>
                            <p className="text-xs text-gray-400">
                              {legacyFormatBytes(file.file_size_bytes)}
                              {file.file_size_bytes && ' · '}
                              {new Date(file.created_at).toLocaleDateString()}
                            </p>
                            {file.caption && <p className="text-xs text-gray-500 mt-0.5 truncate">{file.caption}</p>}
                          </div>
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors flex-shrink-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
