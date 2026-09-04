"use client";
import { useState } from "react";

export default function UserDetailModal({
  user,
  courses,
  enrollments,
  devices,
  onClose,
  onSaveDetails,
  onToggleStatus,
  onRemoveCourse,
  onDelete,
  onRevokeDevice
}) {
  const [fullName, setFullName] = useState(user.full_name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const enrolledCourses = courses.filter((c) =>
    enrollments.some((e) => e.user_id === user.id && e.course_id === c.id)
  );

  async function handleSave() {
    setSaving(true);
    await onSaveDetails(user.id, { full_name: fullName, phone });
    setSaving(false);
  }

  async function handleToggleStatus() {
    setBusyAction(true);
    await onToggleStatus(user.id, !user.active);
    setBusyAction(false);
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete ${user.email}? This removes their login and all course access. This can't be undone.`)) return;
    setBusyAction(true);
    await onDelete(user.id);
    setBusyAction(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>{user.full_name || user.email}</h2>
            <p style={{ color: "#999", fontSize: 13, margin: "4px 0 0" }}>{user.email}</p>
            <span className={`status-badge ${user.active ? "active" : "inactive"}`} style={{ marginTop: 8, display: "inline-block" }}>
              {user.active ? "Active" : "Inactive"}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <label style={{ fontSize: 13, color: "#aaa" }}>Name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />

        <label style={{ fontSize: 13, color: "#aaa" }}>Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />

        <button onClick={handleSave} disabled={saving} style={{ width: "100%", marginBottom: 20 }}>
          {saving ? "Saving..." : "Save changes"}
        </button>

        <h3 style={{ marginBottom: 8 }}>Courses ({enrolledCourses.length})</h3>
        {enrolledCourses.length === 0 ? (
          <p style={{ color: "#888", fontSize: 13 }}>No courses assigned yet.</p>
        ) : (
          <div style={{ marginBottom: 20 }}>
            {enrolledCourses.map((c) => (
              <div key={c.id} className="enrolled-course-row">
                <span>{c.title}</span>
                <button className="btn-danger" onClick={() => onRemoveCourse(user.id, c.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ marginBottom: 8 }}>Devices ({devices.length})</h3>
        {devices.length === 0 ? (
          <p style={{ color: "#888", fontSize: 13 }}>No login attempts yet.</p>
        ) : (
          <div style={{ marginBottom: 20 }}>
            {devices.map((d) => (
              <div key={d.id} className="enrolled-course-row">
                <div>
                  <div>
                    {d.device_label || "Unknown device"}
                    {d.is_current_session && <span className="status-badge active" style={{ marginLeft: 8 }}>Current</span>}
                    {!d.trusted && <span className="status-badge inactive" style={{ marginLeft: 8 }}>Not trusted</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#888" }}>
                    Last seen: {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : "—"}
                  </div>
                </div>
                {d.trusted && (
                  <button className="btn-danger" onClick={() => onRevokeDevice(d.id)}>Revoke trust</button>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 24, borderTop: "1px solid #23262f", paddingTop: 20 }}>
          <button className="btn-secondary" onClick={handleToggleStatus} disabled={busyAction} style={{ flex: 1 }}>
            {busyAction ? "Working..." : user.active ? "Deactivate account" : "Reactivate account"}
          </button>
          <button className="btn-danger" onClick={handleDelete} disabled={busyAction} style={{ flex: 1 }}>
            Delete user
          </button>
        </div>
      </div>
    </div>
  );
}
