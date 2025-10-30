'use client';

import { useRef, useState, useMemo } from 'react';

const MAX_BYTES = 3_000_000; // 2MB cap (same as server)
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const ALLOWED_EXT = new Set(['.jpeg', '.jpg', '.png', '.webp', '.pdf']);

export default function UploadBox({ onUploaded, disabled }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Very light iOS detection: avoid forcing camera so users see the full sheet.
  const isiOS = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }, []);

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
      setErrorMsg(e.message || 'Upload failed.');
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
      setErrorMsg('Unsupported file type. Please upload JPG, JPEG, PNG, WEBP, or PDF.');
      clearErrorSoon();
      return;
    }

    if (f.size > MAX_BYTES) {
      setErrorMsg(
        `File too large (${humanSize(f.size)}). Maximum size allowed is ${humanSize(MAX_BYTES)}.`
      );
      clearErrorSoon();
      return;
    }

    await presignAndUpload(f);
  }

  return (
    <div className="mt-4">
      <label className="block text-lg font-bold text-gray-300 mb-2">
        Upload file / photo
      </label>

      {/* Inline error banner */}
      {errorMsg && (
        <div className="mb-2 rounded-md border border-red-400 bg-red-50/80 px-3 py-2 text-red-900 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Hidden file input — the actual selector */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handlePick}
          {...(!isiOS ? {} : {})}
        />

        {/* Button that opens the hidden input */}
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg px-4 py-1.5 font-semibold bg-cyan-500 hover:bg-cyan-600 text-white
                     focus:outline-none focus:ring-2 focus:ring-cyan-400
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </div>
  );
}
