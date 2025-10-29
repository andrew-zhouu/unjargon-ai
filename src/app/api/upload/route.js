// app/api/upload/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';

// config
const UPLOAD_DIR = '/tmp/unjargn_uploads'; // ephemeral; change to your preferred temp dir in production
const MAX_FILE_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024); // default 5 MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
]);

function sanitizeFilename(name = '') {
  // Basic sanitization: remove path parts, control chars, and replace spaces
  return name.replace(/.*[\\/]/, '').replace(/[^\w\-.() ]+/g, '_').slice(0, 200);
}

async function parseForm(req) {
  const form = new IncomingForm({
    multiples: true,
    maxFileSize: MAX_FILE_BYTES,
    uploadDir: UPLOAD_DIR,
    keepExtensions: true,
  });

  // return promise wrapper
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export async function POST(req) {
  try {
    // ensure upload dir exists
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o700 });

    const { fields, files } = await parseForm(req);

    // normalize to array
    const fileList = [];
    const incomingFiles = Array.isArray(files.file) ? files.file : files.file ? [files.file] : [];

    for (const f of incomingFiles) {
      // validate size again (defense in depth)
      if (f.size > MAX_FILE_BYTES) {
        // remove temporary file
        try { fs.unlinkSync(f.filepath); } catch (e) {}
        return new Response(JSON.stringify({ error: 'File too large' }), { status: 413 });
      }

      const mime = f.mimetype || f.type || 'application/octet-stream';

      // Validate mime
      if (!ALLOWED_MIME.has(mime)) {
        try { fs.unlinkSync(f.filepath); } catch (e) {}
        return new Response(JSON.stringify({ error: 'Unsupported file type' }), { status: 400 });
      }

      // sanitize and move into final location (optional)
      const safeName = sanitizeFilename(f.originalFilename || `upload-${Date.now()}`);
      const dest = path.join(UPLOAD_DIR, `${Date.now()}-${safeName}`);

      fs.renameSync(f.filepath, dest);
      // set strict permissions
      fs.chmodSync(dest, 0o600);

      // produce a minimal safe metadata response only
      fileList.push({
        originalName: f.originalFilename,
        savedName: path.basename(dest),
        size: f.size,
        mime,
      });
    }

    // NOTE: here you could call an async virus-scan microservice to scan saved files.
    // For now we'll return metadata and a success status.
    return new Response(JSON.stringify({ success: true, files: fileList }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Upload error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
