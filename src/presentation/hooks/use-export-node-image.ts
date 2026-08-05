'use client';

import { useCallback } from 'react';

import * as htmlToImage from 'html-to-image';

const PNG_MIME_TYPE = 'image/png';

/**
 * Outcome of a copy attempt. `copied` means the PNG made it onto the
 * clipboard; `downloaded` means the clipboard image write was unsupported
 * (e.g. the Tauri WKWebView, or a browser without `ClipboardItem` image
 * support) so we fell back to downloading the file instead.
 */
export type CopyImageResult = 'copied' | 'downloaded';

interface UseExportNodeImageOptions {
  /**
   * Solid background painted behind the node so the PNG is never
   * transparent. Should match the share card's own background.
   */
  backgroundColor?: string;
  /** Device-pixel multiplier for a crisp export. Defaults to 2 (retina). */
  pixelRatio?: number;
}

/**
 * Parses a `data:image/png;base64,...` URL into a Blob without going
 * through `fetch()` — jsdom and some embedded WebViews don't resolve
 * `fetch` against `data:` URLs, so we decode the base64 payload directly.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = /data:([^;]+);base64/.exec(header);
  const mime = mimeMatch?.[1] ?? PNG_MIME_TYPE;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** Triggers a browser download of a PNG data URL via a throwaway anchor. */
function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Writes a PNG data URL to the clipboard as an `image/png` `ClipboardItem`.
 * Throws when the environment can't write images to the clipboard so the
 * caller can fall back to a download.
 */
async function copyPngToClipboard(dataUrl: string): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('Clipboard image write is not supported in this environment');
  }
  const blob = dataUrlToBlob(dataUrl);
  await navigator.clipboard.write([new ClipboardItem({ [PNG_MIME_TYPE]: blob })]);
}

/**
 * Renders a live DOM node to a PNG for copy/download. The rendering step is
 * shared by both actions; only the delivery differs (clipboard vs. anchor),
 * which is why this lives in a hook instead of being inlined twice.
 *
 * jsdom can't rasterize canvas, so tests mock `html-to-image`; the visual
 * fidelity of the export is manual-QA only.
 */
export function useExportNodeImage({
  backgroundColor,
  pixelRatio = 2,
}: UseExportNodeImageOptions = {}) {
  const renderToPng = useCallback(
    (node: HTMLElement) => htmlToImage.toPng(node, { pixelRatio, backgroundColor }),
    [backgroundColor, pixelRatio],
  );

  const downloadImage = useCallback(
    async (node: HTMLElement, filename: string): Promise<void> => {
      const dataUrl = await renderToPng(node);
      triggerDownload(dataUrl, filename);
    },
    [renderToPng],
  );

  const copyImage = useCallback(
    async (node: HTMLElement, filename: string): Promise<CopyImageResult> => {
      const dataUrl = await renderToPng(node);
      try {
        await copyPngToClipboard(dataUrl);
        return 'copied';
      } catch {
        // Clipboard image write unsupported — degrade to a download so the
        // user still gets the image out.
        triggerDownload(dataUrl, filename);
        return 'downloaded';
      }
    },
    [renderToPng],
  );

  return { copyImage, downloadImage };
}
