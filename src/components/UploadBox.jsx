'use client';

import { useRef, useState, useMemo } from 'react';

export default function UploadBox({ onUploaded, disabled }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  // Very light iOS detection: avoid forcing camera so users see the full sheet.
  const isiOS = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }, []);

  async function presignAndUpload(file) {
  setBusy(true);
  try {
    // 1) Ask server for a presigned **PUT** URL
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
    try { signData = JSON.parse(signText); } catch {
      console.error('Presign returned non-JSON:', signText);
      throw new Error(`Presign failed (${signRes.status})`);
    }
    if (!signRes.ok) {
      console.error('Presign error JSON:', signData);
      throw new Error(signData?.error || `Presign failed (${signRes.status})`);
    }

    // 2) PUT the file directly to S3 (NOT multipart/form POST)
    const putRes = await fetch(signData.url, {
      method: 'PUT',
      headers: { 'Content-Type': signData.contentType || file.type || 'application/octet-stream' },
      body: file,
    }).catch((netErr) => {
      console.error('Network error PUT->S3:', netErr);
      throw new Error('Network/CORS prevented contacting S3 (see console).');
    });

    if (!putRes.ok) {
      const errText = await putRes.text(); // S3 error XML if any
      console.error('S3 PUT error:', putRes.status, errText);
      throw new Error(`S3 rejected the upload (${putRes.status}). Check CORS/region/policy.`);
    }

    // 3) Notify parent (your note-in-text behavior)
    onUploaded?.(
      {
        id: signData.key,
        key: signData.key,
        mime: file.type,
        size: file.size,
        stored: 's3',
        publicUrl: signData.publicUrl, // will 403 if object private (expected)
        viewUrl: signData.viewUrl,
      },
      file
    );
    } catch (e) {
      console.error('Upload failed:', e);
      alert(e.message || 'Upload failed. See console for details.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }


  async function handlePick(e) {
    const f = e.target.files?.[0];
    if (f) await presignAndUpload(f);
  }

  return (
    <div className="mt-4">
      <label className="block text-lg font-bold text-gray-300 mb-2">Upload file / photo</label>

    
    <div className="flex items-center gap-3">
      {/* Hidden file input — this is the ONLY actual selector */}
      <input
        ref={inputRef}
        type="file"
        // iOS: leaving capture OFF + keeping accept broad gives the native sheet:
        // “Take Photo or Video / Photo Library / Browse”
        accept="image/*,application/pdf,text/plain"
        className="hidden" // completely hides “Choose File” text
        onChange={handlePick}
        // Don’t set capture on iOS so user sees the sheet. On Android/desktop it doesn’t matter.
        {...(!isiOS ? {} : {})}
      />

      {/* One big button that programmatically opens the hidden input */}
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg px-4 py-1.5 font-semibold bg-cyan-500 hover:bg-cyan-600 text-white
                   hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? 'Uploading…' : 'Upload'}
      </button>
    </div>
    </div>
  );
}
