"use client";
import { useState } from "react";

export default function CourseDetailModal({
  course,
  lessons,
  bunnyVideos,
  bunnyLoading,
  onLoadBunnyVideos,
  onClose,
  onAddLesson,
  onRemoveLesson,
  onDeleteCourse
}) {
  const [view, setView] = useState("lessons"); // "lessons" | "addLessons"
  const [busy, setBusy] = useState(false);

  function openAddLessons() {
    setView("addLessons");
    if (!bunnyVideos) onLoadBunnyVideos();
  }

  async function handleRemoveLesson(lesson) {
    if (!confirm(`Remove "${lesson.title}" from this course? Students enrolled here will lose access to it.`)) return;
    await onRemoveLesson(lesson.id);
  }

  async function handleDeleteCourse() {
    if (!confirm(`Permanently delete "${course.title}"? This removes all its lessons and every student's access to it. This can't be undone.`)) return;
    setBusy(true);
    await onDeleteCourse(course.id);
    setBusy(false);
  }

  function isAttached(videoId) {
    return lessons.some((l) => l.bunny_video_id === videoId);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>{course.title}</h2>
            <p style={{ color: "#999", fontSize: 13, margin: "4px 0 0" }}>{lessons.length} lesson(s)</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {view === "lessons" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button onClick={openAddLessons} style={{ flex: 1 }}>+ Add lesson from Bunny Library</button>
              <button className="btn-danger" onClick={handleDeleteCourse} disabled={busy}>
                {busy ? "Deleting..." : "Delete course"}
              </button>
            </div>

            {lessons.length === 0 ? (
              <p style={{ color: "#888", fontSize: 13 }}>No lessons yet — add one above.</p>
            ) : (
              <div className="grid">
                {lessons.map((l) => (
                  <div key={l.id} className="course-card">
                    <div className="course-thumb-wrap">
                      {l.thumbnail_url ? (
                        <img src={l.thumbnail_url} alt={l.title} onError={(e) => (e.target.style.display = "none")} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: "#222" }} />
                      )}
                    </div>
                    <div className="course-title">{l.title}</div>
                    <div style={{ padding: "0 14px 14px" }}>
                      <button className="btn-danger" style={{ width: "100%" }} onClick={() => handleRemoveLesson(l)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === "addLessons" && (
          <>
            <button className="btn-secondary" onClick={() => setView("lessons")} style={{ marginBottom: 16 }}>
              &larr; Back to lessons
            </button>
            <p style={{ color: "#999", fontSize: 13 }}>
              Pick videos from your Bunny library to add as lessons in this course.
            </p>

            {bunnyLoading && <p>Loading...</p>}
            {bunnyVideos && bunnyVideos.length === 0 && (
              <p style={{ color: "#888" }}>No videos found — upload some in your Bunny dashboard first.</p>
            )}

            <div className="grid">
              {(bunnyVideos || []).map((v) => {
                const attached = isAttached(v.id);
                return (
                  <div key={v.id} className="course-card">
                    <div className="course-thumb-wrap">
                      <img src={v.thumbnailUrl} alt={v.title} onError={(e) => (e.target.style.display = "none")} />
                    </div>
                    <div className="course-title">{v.title}</div>
                    <div style={{ padding: "0 14px 14px" }}>
                      {v.status !== 4 && <div className="tag" style={{ marginBottom: 8 }}>Still processing...</div>}
                      <button
                        className={attached ? "btn-secondary" : ""}
                        style={{ width: "100%" }}
                        disabled={attached || v.status !== 4}
                        onClick={() => onAddLesson(v, course.id)}
                      >
                        {attached ? "Already added ✓" : "Add to this course"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
