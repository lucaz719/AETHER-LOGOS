'use client';

import { useState, useRef } from 'react';
import { Upload, FileCheck, Loader2, AlertCircle, FileText, X, Hash } from 'lucide-react';

export function ComplianceUploadZone({
  onUploaded,
}: {
  onUploaded: (ipfsUrl: string, cid?: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileCid, setFileCid] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setFileName(file.name);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = (await res.json()) as { cid: string; ipfsUrl: string };
      setPreview(data.ipfsUrl);
      setFileCid(data.cid);
      onUploaded(data.ipfsUrl, data.cid);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setFileName(null);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setFileName(null);
    setFileCid(null);
    setError(null);
    onUploaded('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center gap-4 ${
        preview
          ? 'border-green-500/40 bg-green-500/5 backdrop-blur-sm'
          : error
            ? 'border-red-500/40 bg-red-500/5 backdrop-blur-sm'
            : 'border-white/20 bg-white/8 hover:border-primary/40 hover:bg-primary/8 backdrop-blur-xl'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3 animate-in fade-in">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-widest text-primary">
              Uploading to IPFS...
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">
              Cryptographically hashing...
            </p>
          </div>
        </div>
      ) : preview ? (
        <div className="flex flex-col items-center gap-3 animate-in fade-in">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center text-green-500 border border-green-500/30">
            <FileCheck size={28} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground truncate max-w-[280px]">{fileName}</p>
            <p className="text-[10px] font-bold text-green-500 uppercase tracking-tighter mt-1">
              Securely Pinned to IPFS
            </p>
            {fileCid && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 justify-center">
                  <Hash size={12} className="text-muted-foreground" />
                  <p className="text-[9px] font-mono text-muted-foreground truncate max-w-[200px]">
                    {fileCid}
                  </p>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={clearFile}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-background/80 border border-border hover:bg-secondary transition-colors"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/20 transition-all">
            <Upload size={28} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">Upload Company Authorization</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">
              PDF or Image (Max 5MB)
            </p>
            <p className="text-[9px] text-muted-foreground mt-2 leading-relaxed">
              Purchase Order, Invoice, or Corporate Authorization Document
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-red-500 mt-2 animate-in fade-in slide-in-from-top">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold uppercase tracking-tighter">{error}</p>
            <p className="text-[10px] text-red-400/80 mt-0.5">Please check file size and format</p>
          </div>
        </div>
      )}

      {!uploading && !preview && !error && (
        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-transparent group-hover:border-primary/40 transition-colors pointer-events-none" />
      )}
    </div>
  );
}
