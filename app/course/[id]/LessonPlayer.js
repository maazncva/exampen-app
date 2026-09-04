"use client";
import { useEffect, useState } from "react";

export default function LessonPlayer({ lessons }) {
  const [activeId, setActiveId] = useState(lessons[0].id);
  const [embedUrl, setEmbedUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEmbedUrl(null);
    fetch("/api/lesson-embed-url", { method: "POST", body: JSON.stringify({ lessonId: activeId }) })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setEmbedUrl(json.embedUrl || null);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [activeId]);

  return (
    <div style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 600px", minWidth: 300 }}>
        <div style={{ position: "relative", paddingTop: "56.25%", background: "#000", borderRadius: 8, overflow: "hidden" }}>
          {loading && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}
          {embedUrl && (
            <iframe
              src={embedUrl}
              loading="lazy"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
      <div style={{ flex: "0 0 260px" }}>
        <h3 style={{ marginTop: 0 }}>Lessons</h3>
        {lessons.map((l, i) => (
          <div
            key={l.id}
            onClick={() => setActiveId(l.id)}
            className="card"
            style={{
              marginBottom: 8, cursor: "pointer", padding: "12px 14px",
              border: l.id === activeId ? "1px solid #4f7cff" : "1px solid #23262f"
            }}
          >
            {i + 1}. {l.title}
          </div>
        ))}
      </div>
    </div>
  );
}
