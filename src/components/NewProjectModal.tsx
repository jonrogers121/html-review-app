import React, { useState, useRef } from 'react';
import { X, Upload, FileCode, Sparkles, Check, Lock, Globe, ShieldCheck } from 'lucide-react';
import { SAMPLE_PROTOTYPES, SamplePreset } from '../data/samplePrototypes';
import type { Project, UserProfile } from '../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onCreateProject: (projectData: Omit<Project, 'id'>) => Promise<void>;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateProject
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'sample' | 'paste'>('upload');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedSample, setSelectedSample] = useState<SamplePreset | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    // Auto-generate title if empty
    if (!title) {
      const cleanName = (file?.name || '').replace(/\.(html|htm)$/i, '').replace(/[-_]/g, ' ').trim();
      if (cleanName) {
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      } else {
        setTitle('New Prototype');
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setHtmlContent(content || '');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: SamplePreset) => {
    setSelectedSample(sample);
    setTitle(sample.name);
    setDescription(sample.description);
    setHtmlContent(sample.html);
    setFileName(`${sample.id}.html`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !htmlContent.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateProject({
        title: title.trim(),
        description: description.trim() || 'Interactive prototype review',
        status: 'in_review',
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        ownerEmail: currentUser.email,
        isPublic,
        htmlContent,
        originalFileName: fileName || 'prototype.html',
        version: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [
          {
            id: `mem_${Date.now()}`,
            email: currentUser.email,
            role: 'owner',
            addedAt: new Date().toISOString(),
            status: 'active'
          }
        ]
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        id="new-project-modal-card"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">New Prototype Review</h2>
            <p className="text-xs text-slate-500">Upload an HTML file or select a starter prototype</p>
          </div>
          <button
            id="close-new-project-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Method Tabs */}
          <div className="flex p-1.5 bg-slate-100 rounded-xl border border-slate-200/60">
            <button
              id="tab-upload-html-btn"
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload HTML File</span>
            </button>
            <button
              id="tab-sample-presets-btn"
              type="button"
              onClick={() => setActiveTab('sample')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'sample' ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Preloaded Prototypes</span>
            </button>
            <button
              id="tab-paste-html-btn"
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'paste' ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Paste HTML Code</span>
            </button>
          </div>

          {/* Tab 1: Upload File */}
          {activeTab === 'upload' && (
            <div
              id="html-dropzone"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : fileName
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm"
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              {fileName ? (
                <div>
                  <p className="text-sm font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Loaded: {fileName}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Click or drag another file to replace</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to browse or drop an .html prototype here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepts standalone HTML files with inline CSS and JS
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Preset Samples */}
          {activeTab === 'sample' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-500">
                Select a ready-to-use prototype to test screen pinning, comments, and review tools immediately:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {SAMPLE_PROTOTYPES.map((sample) => {
                  const isSelected = selectedSample?.id === sample.id;
                  return (
                    <div
                      key={sample.id}
                      onClick={() => handleSelectSample(sample)}
                      className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{sample.name}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded">
                            {sample.category}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-xs text-slate-500 leading-normal">{sample.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Paste Code */}
          {activeTab === 'paste' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Raw HTML Code</label>
              <textarea
                id="raw-html-textarea"
                rows={6}
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<!DOCTYPE html><html><head>...</head><body>...</body></html>"
                className="w-full font-mono text-xs p-3 bg-slate-950 text-emerald-400 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}

          {/* Common fields: Title and description */}
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Project / Prototype Title</label>
              <input
                id="new-project-title-input"
                type="text"
                required
                placeholder="e.g. Executive Analytics Dashboard v1.4"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Scope & Context (Optional)</label>
              <input
                id="new-project-desc-input"
                type="text"
                placeholder="e.g. Prototype for sprint review; focus on checkout form and button hierarchy."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
              />
            </div>

            {/* Access & Visibility Settings */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Access & Security
                </label>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Account: {currentUser.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  id="visibility-private-btn"
                  onClick={() => setIsPublic(false)}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    !isPublic
                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${!isPublic ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Private Team Review</span>
                      {!isPublic && <span className="text-[10px] text-indigo-600 font-semibold">(Secure)</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Requires signed-in account. Only invited team members can view.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  id="visibility-public-btn"
                  onClick={() => setIsPublic(true)}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    isPublic
                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${isPublic ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Public Demo</div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Anyone with the link can view without signing in.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              id="cancel-new-project-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-new-project-btn"
              type="submit"
              disabled={isSubmitting || !title.trim() || !htmlContent.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              <span>{isSubmitting ? 'Creating...' : 'Start Prototype Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
