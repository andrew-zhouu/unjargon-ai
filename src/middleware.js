// middleware.js
import { NextResponse } from 'next/server';

export function middleware(req) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      const body = JSON.stringify({
        error: 'Under maintenance',
        detail: process.env.MAINTENANCE_MESSAGE || 'Please try again soon.',
      });
      return new NextResponse(body, {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
