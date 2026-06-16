"use client";

type EmailHtmlPreviewProps = {
  html: string;
  title?: string;
};

export function EmailHtmlPreview({
  html,
  title = "Contenu email",
}: EmailHtmlPreviewProps) {
  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:16px;background:#ffffff;color:#111827;line-height:1.5;}a{color:#2563eb;}</style></head><body>${html}</body></html>`;

  return (
    <iframe
      sandbox=""
      title={title}
      srcDoc={srcDoc}
      className="min-h-[420px] w-full rounded-lg border border-gray-200 bg-white dark:border-gray-700"
    />
  );
}
