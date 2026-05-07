'use client';

import { useState, useRef } from "react";
import { Upload, FileCheck, Loader2, AlertCircle, FileText, X } from "lucide-react";

export function InvoiceUpload({
  onUploaded,
}: {
  onUploaded: (ipfsUrl: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setFileName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = (await res.json()) as { cid: string; ipfsUrl: string };
      setPreview(data.ipfsUrl);
      onUploaded(data.ipfsUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setFileName(null);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setFileName(null);
    setError(null);
    onUploaded("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div 
      onClick={() => fileInputRef.current?.click()}
      className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-6 flex flex-col items-center justify-center gap-3 ${
        preview 
          ? "border-green-500/50 bg-green-500/5" 
          : error 
            ? "border-red-500/50 bg-red-500/5" 
            : "border-border hover:border-primary/50 hover:bg-primary/5"
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
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Uploading to IPFS...</p>
        </div>
      ) : preview ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-500">
            <FileCheck size={24} />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-foreground truncate max-w-[200px]">{fileName}</p>
            <p className="text-[9px] font-bold text-green-500 uppercase tracking-tighter">Securely Pinning</p>
          </div>
          <button 
            onClick={clearFile}
            className="absolute top-2 right-2 p-1 rounded-lg bg-background border border-border hover:bg-secondary transition-colors"
          >
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-all">
            <Upload size={24} />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-foreground">Upload Trade Evidence</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">PDF or Image (Max 5MB)</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-500 mt-2">
          <AlertCircle size={12} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{error}</span>
        </div>
      )}
    </div>
  );
}
