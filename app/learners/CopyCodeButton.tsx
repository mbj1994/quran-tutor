'use client';

import { useState } from 'react';

export default function CopyCodeButton({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!code) return;

    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copyCode}
      disabled={!code}
      className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {copied ? 'Copied' : 'Copy code'}
    </button>
  );
}
