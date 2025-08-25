export const dynamic = 'force-dynamic';

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const allowedHosts = new Set([
      'storage.googleapis.com'
    ]);
    return allowedHosts.has(url.hostname);
  } catch {
    return false;
  }
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  if (!target) {
    return new Response('Missing url', { status: 400 });
  }
  if (!isAllowedUrl(target)) {
    return new Response('URL not allowed', { status: 400 });
  }

  const range = req.headers.get('range') ?? undefined;

  const upstream = await fetch(target, {
    headers: range ? { Range: range } : undefined,
    cache: 'no-store'
  });

  const forwardHeaderNames = [
    'content-type',
    'content-length',
    'content-disposition',
    'accept-ranges',
    'content-range',
    'last-modified',
    'etag',
    'cache-control'
  ];

  const headers = new Headers();
  for (const name of forwardHeaderNames) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
} 