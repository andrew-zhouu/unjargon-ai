// app/api/upload/sign/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf', 'text/plain'
];

const {
  S3_REGION,
  S3_BUCKET,
  S3_PUBLIC_BASE,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY
} = process.env;

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

export async function POST(req) {
  try {
    const bad = (msg, code = 400) => NextResponse.json({ error: msg }, { status: code });

    let body;
    try { body = await req.json(); } catch { return bad('Invalid JSON body'); }

    const filename = String(body?.filename || '').slice(0, 200);
    const contentType = String(body?.contentType || 'application/octet-stream');
    const size = Number(body?.size || 0);

    if (!filename) return bad('Missing filename');
    if (!ALLOWED_MIME.includes(contentType)) return bad('File type not allowed');
    if (!Number.isFinite(size) || size <= 0 || size > MAX_SIZE_BYTES) return bad('File too large');

    if (!S3_REGION || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      return bad('Server misconfigured: missing S3 env', 500);
    }

    const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
    const key = `uploads/${new Date().toISOString().slice(0,10)}/${crypto.randomBytes(12).toString('hex')}.${ext.toLowerCase()}`;

    // PUT (upload) URL
    const putUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: 60 }
    );

    // Short-lived GET (view) URL, useful immediately after upload
    const viewUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
      { expiresIn: 300 }
    );

    // Public URL only useful if bucket/object is public (yours isn’t, that’s fine)
    const publicUrl = S3_PUBLIC_BASE ? `${S3_PUBLIC_BASE}/${key}` : null;

    return NextResponse.json({
      url: putUrl,         // presigned PUT
      key,
      contentType,
      publicUrl,
      viewUrl,             // presigned GET for a few minutes
    });
  } catch (err) {
    console.error('sign route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
