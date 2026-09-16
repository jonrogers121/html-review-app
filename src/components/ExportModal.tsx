import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Project, CommentPin } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  comments: CommentPin[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  comments
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const openCount = comments.filter((c) => c.status !== 'resolved').length;
  const resolvedCount = comments.filter((c) => c.status === 'resolved').length;

  // Generate Markdown report
  const generateMarkdown = (): string => {
    let md = `# Prototype Review Report: ${project.title}\n`;
    md += `**Status:** ${project.status.toUpperCase()} | **Version:** v${project.version} | **Generated:** ${new Date().toLocaleString()}\n`;
    md += `**Summary:** ${comments.length} total comments (${openCount} open, ${resolvedCount} resolved)\n\n`;
    md += `## Review Comments & Actionable Changes\n\n`;

    if (comments.length === 0) {
      md += `*No comments recorded yet on this prototype.*\n`;
      return md;
    }

    comments.forEach((c) => {
      const statusIcon = c.status === 'resolved' ? '✅ [RESOLVED]' : '⏳ [OPEN]';
      md += `### Pin #${c.pinNumber} - ${statusIcon} ${c.content.slice(0, 50)}...\n`;
      md += `- **Author:** ${c.authorName} (${c.authorRole})\n`;
      md += `- **Category:** ${c.category.toUpperCase()} | **Priority:** ${c.priority.toUpperCase()}\n`;
      md += `- **Location:** ${
        c.targetSelector
          ? `Attached to \`${c.targetSelector}\``
          : `Coordinate (${c.xPercent.toFixed(1)}%, ${c.yPercent.toFixed(1)}%)`
      }\n`;
      md += `- **Feedback:**\n  ${c.content}\n`;

      if (c.suggestedChange) {
        md += `\n- **Suggested Code / Change:**\n\`\`\`html\n${c.suggestedChange}\n\`\`\`\n`;
      }

      if (c.replies && c.replies.length > 0) {
        md += `\n- **Thread Discussion (${c.replies.length}):**\n`;
        c.replies.forEach((r) => {
          md += `  - **${r.authorName}** (${new Date(r.createdAt).toLocaleTimeString()}): ${r.content}\n`;
        });
      }
      md += `\n---\n\n`;
    });

    return md;
  };

  const markdownText = generateMarkdown();

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${project.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-review.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        id="export-modal-card"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Export Review Report</h2>
              <p className="text-xs text-slate-500">
                Actionable tasks and code suggestions formatted for tickets & sprint planning
              </p>
            </div>
          </div>
          <button
            id="close-export-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats preview */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="text-slate-400 font-normal">Total Pins:</span>
            <span className="font-bold text-slate-900">{comments.length}</span>
          </div>
          <div className="flex items-center gap-2 text-amber-700 font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>Open: {openCount}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-700 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Resolved: {resolvedCount}</span>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed select-all">
          <pre className="whitespace-pre-wrap">{markdownText}</pre>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">Markdown format compatible with GitHub & Jira</span>
          <div className="flex items-center gap-3">
            <button
              id="copy-export-markdown-btn"
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl shadow-2xs hover:shadow-xs transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Markdown'}</span>
            </button>
            <button
              id="download-export-file-btn"
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow transition-all hover:-translate-y-0.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
