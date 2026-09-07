"use client";
import { useEffect, useRef, useState } from "react";

const PDFJS_VERSION = "3.11.174";

export default function DocumentViewer({ documentId, watermarkText }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

        const res = await fetch(`/api/documents/${documentId}/file`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Failed to load document");
        }
        const arrayBuffer = await res.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;

        const container = containerRef.current;
        container.innerHTML = "";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.4 });

          const pageWrapper = document.createElement("div");
          pageWrapper.style.cssText = "position: relative; margin-bottom: 16px; line-height: 0;";

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.cssText = "width: 100%; height: auto; display: block; border-radius: 8px;";
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;

          const watermark = document.createElement("div");
          watermark.style.cssText = `
            position: absolute; inset: 0; display: flex; flex-wrap: wrap; align-content: space-around;
            justify-content: space-around; overflow: hidden; pointer-events: none; user-select: none;
            transform: rotate(-28deg) scale(1.3);
          `;
          for (let i = 0; i < 24; i++) {
            const span = document.createElement("span");
            span.textContent = watermarkText;
            span.style.cssText = "color: rgba(255,255,255,0.16); font-size: 13px; font-weight: 600; white-space: nowrap;";
            watermark.appendChild(span);
          }

          pageWrapper.appendChild(canvas);
          pageWrapper.appendChild(watermark);
          container.appendChild(pageWrapper);
        }

        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Failed to load document");
          setLoading(false);
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [documentId, watermarkText]);

  return (
    <div onContextMenu={(e) => e.preventDefault()} style={{ userSelect: "none" }}>
      {loading && <p style={{ color: "#999" }}>Loading document...</p>}
      {error && <div className="error">{error}</div>}
      <div ref={containerRef} />
    </div>
  );
}
