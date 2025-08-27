export const dynamic = 'force-dynamic';
import mailparser from 'mailparser';

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const allowedHosts = new Set(['storage.googleapis.com']);
    return allowedHosts.has(url.hostname);
  } catch {
    return false;
  }
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  const type = searchParams.get('type');
  if (!target) {
    return new Response('Missing url', { status: 400 });
  }
  if (!isAllowedUrl(target)) {
    return new Response('URL not allowed', { status: 400 });
  }

  const range = req.headers.get('range') ?? undefined;

  let upstream = await fetch(target, {
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
  if (type === 'eml') {
    const mail = await mailparser.simpleParser(await upstream.text());

    const escapeHtml = (s: string) => String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

    const from = mail.from ? (mail.from.text.replaceAll('"', '') || '') : '';
    const to = mail.to
      ? (Array.isArray(mail.to)
          ? mail.to.map((t: any) => t.text).join('; ').replaceAll('"', '')
          : (mail.to as any).text.replaceAll('"', ''))
      : '';
    const cc = mail.cc
      ? (Array.isArray(mail.cc)
          ? mail.cc.map((t: any) => t.text).join('; ').replaceAll('"', '')
          : (mail.cc as any).text.replaceAll('"', ''))
      : '';
    const sent = mail.date ? new Date(mail.date as any).toLocaleString() : '';
    const subject = mail.subject || '';
    const attachments = (mail.attachments || [])
      .map((a: any) => a?.filename)
      .filter(Boolean)
      .join(', ');

    const headerRows: string[] = [];
    headerRows.push(`<div class=\"row\"><div class=\"label\">From:</div><div class=\"value\">${escapeHtml(from)}</div></div>`);
    headerRows.push(`<div class=\"row\"><div class=\"label\">To:</div><div class=\"value\">${escapeHtml(to)}</div></div>`);
    if (cc) headerRows.push(`<div class=\"row\"><div class=\"label\">Cc:</div><div class=\"value\">${escapeHtml(cc)}</div></div>`);
    headerRows.push(`<div class=\"row\"><div class=\"label\">Subject:</div><div class=\"value\">${escapeHtml(subject)}</div></div>`);
    if (sent) headerRows.push(`<div class=\"row\"><div class=\"label\">Sent:</div><div class=\"value\">${escapeHtml(sent)}</div></div>`);
    if (attachments)
      headerRows.push(`<div class=\"row\"><div class=\"label\">Attachments:</div><div class=\"value\">${escapeHtml(attachments)}</div></div>`);

    const bodyHtml = mail.html
      ? String(mail.html)
      : `<pre class=\"body-text\">${escapeHtml(String(mail.text || ''))}</pre>`;

    const html = `<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; line-height: 1.4; }
    .card { max-width: 900px; margin: 0 auto; }
    .header { margin-bottom: 16px; }
    .row { display: grid; grid-template-columns: 110px 1fr; gap: 12px; padding: 6px 0; align-items: start; }
    .label { color: #6b7280; min-width: 110px; }
    .value { color: #111827; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
    .body { padding-top: 8px; }
    .body-text { white-space: pre-wrap; margin: 0; }
    @media (prefers-color-scheme: dark) {
      body { background: #0b0b0c; color: #e5e7eb; }
      .label { color: #9ca3af; }
      .value { color: #e5e7eb; }
      hr { border-top-color: #374151; }
    }
  </style>
</head>
<body>
  <div class=\"card\">
    <div class=\"header\">
      ${headerRows.join('')}
    </div>
    <hr />
    <div class=\"body\">${bodyHtml}</div>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        ...headers,
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}
