import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {


    // Extract the path after /api/uploads/
    const url = new URL(request.url);

    console.log("url", url);

    const path = decodeURIComponent(url.pathname.replace(/^\/api\/uploads\//, ''));
    const filePath = join(process.env.UPLOAD_PATH!, path);

    console.log("looking for filePath", filePath, process.cwd());
    // Check if file exists and is accessible
    try {
      await stat(filePath);
    } catch {
      return new NextResponse('Not found', { status: 404 });
    }

    // Read and return the file
    const file = await readFile(filePath);
    const contentType = getContentType(path);

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
} 