'use client';

import { useRef, useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';

const MAX_BYTES = 3_000_000; // 2MB cap (same as server)
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const ALLOWED_EXT = new Set(['.jpeg', '.jpg', '.png', '.webp', '.pdf']);

export default function UploadBox({ onUploaded, disabled, onError, compact = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  function reportError(msg) {
    if (onError) onError(msg);
    else setErrorMsg(msg);
  }

  function clearErrorSoon() {
    // soft-clear after a short delay so message is readable but not sticky
    setTimeout(() => setErrorMsg(null), 3500);
  }

  function isAllowed(file) {
    if (ALLOWED_MIME.has(file.type)) return true;
    // fallback: trust extension if some browsers omit strict MIME
    const name = (file.name || '').toLowerCase();
    const ext = name.slice(name.lastIndexOf('.'));
    if (ALLOWED_EXT.has(ext)) return true;
    return false;
  }

  function humanSize(bytes) {
    return bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
      : `${Math.ceil(bytes / 1024)} KB`;
  }

  async function presignAndUpload(file) {
    setBusy(true);
    try {
      // 1) Ask server for a presigned PUT URL
      const signRes = await fetch('/api/upload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        }),
      });

      const signText = await signRes.text();
      let signData;
      try {
        signData = JSON.parse(signText);
      } catch {
        console.error('Presign returned non-JSON:', signText);
        throw new Error(`Presign failed (${signRes.status})`);
      }
      if (!signRes.ok) {
        console.error('Presign error JSON:', signData);
        throw new Error(signData?.error || `Presign failed (${signRes.status})`);
      }

      // 2) PUT the file to S3
      const putRes = await fetch(signData.url, {
        method: 'PUT',
        headers: {
          'Content-Type':
            signData.contentType || file.type || 'application/octet-stream',
        },
        body: file,
      }).catch((netErr) => {
        console.error('Network error PUT->S3:', netErr);
        throw new Error('Network/CORS prevented contacting storage.');
      });

      if (!putRes.ok) {
        const errText = await putRes.text(); // S3 error XML if any
        console.error('S3 PUT error:', putRes.status, errText);
        throw new Error(`Storage rejected the upload (${putRes.status}).`);
      }

      // 3) Notify parent
      onUploaded?.(
        {
          id: signData.key,
          key: signData.key,
          mime: file.type,
          size: file.size,
          stored: 's3',
          publicUrl: signData.publicUrl,
          viewUrl: signData.viewUrl, // your presigned GET
          isPdf: file.type === 'application/pdf',
        },
        file
      );
    } catch (e) {
      console.error('Upload failed:', e);
      reportError(e.message || 'Upload failed.');
      clearErrorSoon();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handlePick(e) {
    setErrorMsg(null);
    const f = e.target.files?.[0];
    if (!f) return;

    // Client-side validation BEFORE any network call:
    if (!isAllowed(f)) {
      reportError('Unsupported file type. Please upload JPG, JPEG, PNG, WEBP, or PDF.');
      clearErrorSoon();
      return;
    }

    if (f.size > MAX_BYTES) {
      reportError(
        `File too large (${humanSize(f.size)}). Maximum size allowed is ${humanSize(MAX_BYTES)}.`
      );
      clearErrorSoon();
      return;
    }

    await presignAndUpload(f);
  }

  return (
    <div className="relative">
      {/* Hidden file input — the actual selector */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handlePick}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Button that opens the hidden input */}
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => inputRef.current?.click()}
        aria-label={compact ? (busy ? 'Uploading file' : 'Upload file or photo') : undefined}
        title="Upload a PDF or image (JPG, PNG, WEBP · up to 3 MB)"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white/[0.04] px-2.5 text-sm font-medium text-text sm:px-3
                   hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <LoaderCircle className="size-4 motion-safe:animate-spin text-text-soft" aria-hidden="true" />
        ) : (
          <Upload className="size-4 text-text-soft" aria-hidden="true" />
        )}
        <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>
          {busy ? 'Uploading…' : 'Upload file / photo'}
        </span>
      </button>

      {/* Inline error (only when the parent doesn't handle errors itself) */}
      {errorMsg && !onError && (
        <div role="alert" className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-red-400/40 bg-ink-800 px-3 py-2 text-sm text-red-200 shadow-xl">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
