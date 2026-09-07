"use client";
import { useState } from "react";

export default function DocumentAccessModal({ document, students, access, onClose, onToggleAccess, onDelete }) {
  const [busy, setBusy] = useState(false);

  function hasAccess(studentId) {
    return access.some((a) => a.document_id === document.id && a.user_id === studentId);
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete "${document.title}"? Every student loses access. This can't be undone.`)) return;
    setBusy(true);
    await onDelete(document.id);
    setBusy(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{document.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <button className="btn-danger" onClick={handleDelete} disabled={busy} style={{ width: "100%", marginBottom: 20 }}>
          {busy ? "Deleting..." : "Delete document"}
        </button>

        <h3 style={{ marginBottom: 8 }}>Who can view this</h3>
        {students.length === 0 ? (
          <p style={{ color: "#888", fontSize: 13 }}>No students yet.</p>
        ) : (
          students.map((s) => {
            const granted = hasAccess(s.id);
            return (
              <div key={s.id} className="enrolled-course-row">
                <span>{s.full_name || s.email}</span>
                <button
                  className={granted ? "" : "btn-secondary"}
                  onClick={() => onToggleAccess(document.id, s.id, granted)}
                >
                  {granted ? "Granted ✓" : "Grant access"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
