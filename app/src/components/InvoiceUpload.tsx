'use client';

import { useState } from "react";

export function InvoiceUpload({
  onUploaded,
}: {
  onUploaded: (ipfsUrl: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
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
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ border: "1px dashed #888", borderRadius: 8, padding: "0.75rem", display: "grid", gap: "0.5rem" }}>
      <input
        type="file"
        accept="application/pdf,image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
      />
      {uploading && <small>Uploading invoice to IPFS...</small>}
      {preview && (
        <a href={preview} target="_blank" rel="noreferrer">
          View uploaded invoice
        </a>
      )}
      {error && <small style={{ color: "crimson" }}>{error}</small>}
    </div>
  );
}
