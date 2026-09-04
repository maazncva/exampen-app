"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import UserDetailModal from "./UserDetailModal";
import CourseDetailModal from "./CourseDetailModal";

export default function AdminPanel({ initialUsers, initialCourses, initialEnrollments, initialLessons, initialDeviceSessions }) {
  const [tab, setTab] = useState("courses");
  const [users, setUsers] = useState(initialUsers);
  const [courses, setCourses] = useState(initialCourses);
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [lessons, setLessons] = useState(initialLessons);
  const [deviceSessions, setDeviceSessions] = useState(initialDeviceSessions || []);
  const [bunnyVideos, setBunnyVideos] = useState(null); // null = not loaded yet
  const [bunnyLoading, setBunnyLoading] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  function flash(setter, text) {
    setter(text);
    setTimeout(() => setter(""), 4000);
  }

  function lessonsFor(courseId) {
    return lessons.filter((l) => l.course_id === courseId);
  }

  // ---- Create user (with course access chosen up front) ----
  async function createUser(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const courseIds = courses.filter((c) => fd.get(`course-${c.id}`) === "on").map((c) => c.id);
    const body = { email: fd.get("email"), password: fd.get("password"), full_name: fd.get("full_name"), courseIds };
    const res = await fetch("/api/admin/create-user", { method: "POST", body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) return flash(setErr, json.error || "Failed to create user");
    setUsers([{ ...json.profile, active: true }, ...users]);
    if (json.enrollments?.length) setEnrollments([...enrollments, ...json.enrollments]);
    e.target.reset();
    if (json.enrollError) {
      flash(setErr, "User created, but course access failed: " + json.enrollError);
    } else {
      flash(setMsg, `Candidate created${courseIds.length ? ` with access to ${courseIds.length} course(s)` : ""}`);
    }
  }

  // ---- Create course (upload thumbnail file, then create the shell) ----
  async function createCourse(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const file = fd.get("thumbnail_file");

    if (!file || file.size === 0) {
      return flash(setErr, "Please choose a thumbnail image");
    }

    setCreatingCourse(true);
    setErr("");

    const supabase = createClient();
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    const { error: uploadError } = await supabase.storage.from("thumbnails").upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

    if (uploadError) {
      setCreatingCourse(false);
      return flash(setErr, "Thumbnail upload failed: " + uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage.from("thumbnails").getPublicUrl(path);
    const thumbnail_url = publicUrlData.publicUrl;

    const body = { title: fd.get("title"), description: fd.get("description"), thumbnail_url };
    const res = await fetch("/api/admin/create-course", { method: "POST", body: JSON.stringify(body) });
    const json = await res.json();
    setCreatingCourse(false);
    if (!res.ok) return flash(setErr, json.error || "Failed to create course");

    setCourses([json.course, ...courses]);
    e.target.reset();
    setThumbPreview(null);
    flash(setMsg, "Course created — now attach video lessons from the Bunny Library tab");
  }

  function onThumbFileChange(e) {
    const file = e.target.files?.[0];
    setThumbPreview(file ? URL.createObjectURL(file) : null);
  }

  // ---- Assign / unassign course access ----
  async function toggleAssign(userId, courseId, currentlyEnrolled) {
    const res = await fetch("/api/admin/assign-course", {
      method: "POST",
      body: JSON.stringify({ userId, courseId, action: currentlyEnrolled ? "remove" : "add" })
    });
    const json = await res.json();
    if (!res.ok) return flash(setErr, json.error || "Failed to update");
    if (currentlyEnrolled) {
      setEnrollments(enrollments.filter((e) => !(e.user_id === userId && e.course_id === courseId)));
    } else {
      setEnrollments([...enrollments, json.enrollment]);
    }
  }

  // ---- User detail modal actions ----
  async function saveUserDetails(userId, { full_name, phone }) {
    const res = await fetch("/api/admin/update-user", {
      method: "POST",
      body: JSON.stringify({ userId, full_name, phone })
    });
    const json = await res.json();
    if (!res.ok) return flash(setErr, json.error || "Failed to save changes");
    setUsers(users.map((u) => (u.id === userId ? { ...u, ...json.profile } : u)));
    flash(setMsg, "Candidate details updated");
  }

  async function toggleUserStatus(userId, active) {
    const res = await fetch("/api/admin/set-user-status", {
      method: "POST",
      body: JSON.stringify({ userId, active })
    });
    const json = await res.json();
    if (!res.ok) return flash(setErr, json.error || "Failed to update status");
    setUsers(users.map((u) => (u.id === userId ? { ...u, active } : u)));
    flash(setMsg, active ? "Account reactivated" : "Account deactivated");
  }

  async function removeUserCourse(userId, courseId) {
    await toggleAssign(userId, courseId, true);
  }

  async function deleteUser(userId) {
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      body: JSON.stringify({ userId })
    });
    const json = await res.json();
    if (!res.ok) return flash(setErr, json.error || "Failed to delete user");
    setUsers(users.filter((u) => u.id !== userId));
    setEnrollments(enrollments.filter((e) => e.user_id !== userId));
    setSelectedUserId(null);
    flash(setMsg, "Candidate deleted");
  }

  async function revokeDevice(deviceSessionId) {
    const res = await fetch("/api/admin/revoke-device", {
      method: "POST",
      body: JSON.stringify({ deviceSessionId })
    });
    const json = await res.json();
    if (!res.ok) return flash(setErr, json.error || "Failed to revoke device");
    setDeviceSessions(
      deviceSessions.map((d) => (d.id === deviceSessionId ? { ...d, trusted: false, is_current_session: false } : d))
    );
    flash(setMsg, "Device marked untrusted — they'll need a new code next login");
  }

  const selectedUser = users.find((u) => u.id === selectedUserId) || null;

  // ---- Bunny library ----
  async function loadBunnyVideos() {
    setBunnyLoading(true);
    setErr("");
    const res = await fetch("/api/admin/bunny-videos");
    const json = await res.json();
    setBunnyLoading(false);
    if (!res.ok) return flash(setErr, json.error || "Failed to load Bunny library — check your Bunny env vars");
    setBunnyVideos(json.videos);
  }

  async function attachVideo(video, courseId) {
    if (!courseId) return;
    const res = await fetch("/api/admin/add-lesson", {
      method: "POST",
      body: JSON.stringify({ courseId, bunnyVideoId: video.id, title: video.title, thumbnailUrl: video.thumbnailUrl })
    });
    const json = await res.json();
    if (!res.ok) return flash(setErr, json.error || "Failed to attach video");
    setLessons([...lessons, json.lesson]);
    flash(setMsg, `"${video.title}" attached to course`);
  }

  async function detachVideo(video, courseId, courseTitle) {
    const lesson = lessons.find((l) => l.course_id === courseId && l.bunny_video_id === video.id);
    if (!lesson) return;
    if (!confirm(`Remove "${video.title}" from "${courseTitle}"?`)) return;
    await removeLesson(lesson.id);
  }

  async function deleteCourse(courseId) {
    const res = await fetch("/api/admin/delete-course", { method: "POST", body: JSON.stringify({ courseId }) });
    const json = await res.json();
    if (!res.ok) return flash(setErr, json.error || "Failed to delete course");
    setCourses(courses.filter((c) => c.id !== courseId));
    setLessons(lessons.filter((l) => l.course_id !== courseId));
    setEnrollments(enrollments.filter((e) => e.course_id !== courseId));
    setSelectedCourseId(null);
    flash(setMsg, "Course deleted");
  }

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || null;

  async function removeLesson(lessonId) {
    const res = await fetch("/api/admin/remove-lesson", { method: "POST", body: JSON.stringify({ lessonId }) });
    const json = await res.json();
    if (!res.ok) return flash(setErr, json.error || "Failed to remove lesson");
    setLessons(lessons.filter((l) => l.id !== lessonId));
  }

  return (
    <div>
      {msg && <div className="success">{msg}</div>}
      {err && <div className="error">{err}</div>}

      <div className="tabs">
        <button className={tab === "courses" ? "active" : ""} onClick={() => setTab("courses")}>Courses</button>
        <button className={tab === "bunny" ? "active" : ""} onClick={() => { setTab("bunny"); if (!bunnyVideos) loadBunnyVideos(); }}>
          Bunny Library
        </button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Users</button>
        <button className={tab === "assign" ? "active" : ""} onClick={() => setTab("assign")}>Assign access</button>
      </div>

      {tab === "courses" && (
        <div>
          <div className="card" style={{ maxWidth: 480 }}>
            <h3>1. Create a course</h3>
            <p style={{ color: "#999", fontSize: 13, marginTop: -6 }}>
              Just the title/thumbnail for now — attach video lessons in the Bunny Library tab next.
            </p>
            <form onSubmit={createCourse}>
              <input name="title" placeholder="Course title" required />
              <textarea name="description" placeholder="Short description" rows={3} />
              <label style={{ fontSize: 13, color: "#aaa" }}>Cover thumbnail</label>
              <input name="thumbnail_file" type="file" accept="image/*" required onChange={onThumbFileChange} />
              {thumbPreview && (
                <img src={thumbPreview} alt="preview" style={{ width: "100%", borderRadius: 8, marginBottom: 12, maxHeight: 160, objectFit: "cover" }} />
              )}
              <button type="submit" disabled={creatingCourse}>
                {creatingCourse ? "Creating..." : "Create course"}
              </button>
            </form>
          </div>

          <h3 style={{ marginTop: 32 }}>Your courses</h3>
          <p style={{ color: "#999", fontSize: 13 }}>Click a course to manage its lessons.</p>
          <div className="grid">
            {courses.map((c) => (
              <div key={c.id} className="course-card clickable-row" onClick={() => setSelectedCourseId(c.id)}>
                <div className="course-thumb-wrap">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "#222" }} />
                  )}
                </div>
                <div className="course-title">{c.title}</div>
                <div className="tag">{lessonsFor(c.id).length} lesson(s)</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "bunny" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>2. Videos in your Bunny Stream library</h3>
            <button onClick={loadBunnyVideos} disabled={bunnyLoading}>
              {bunnyLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <p style={{ color: "#999", fontSize: 13 }}>
            Upload videos in your Bunny dashboard as usual — they'll show up here automatically. Click any course
            below a video to add or remove it there — one video can belong to as many courses as you like.
          </p>

          {bunnyVideos === null && !bunnyLoading && <p>Loading...</p>}
          {bunnyVideos && bunnyVideos.length === 0 && <p style={{ color: "#888" }}>No videos found yet — upload some in your Bunny dashboard first.</p>}

          <div className="grid">
            {(bunnyVideos || []).map((v) => (
              <div key={v.id} className="course-card">
                <div className="course-thumb-wrap">
                  <img src={v.thumbnailUrl} alt={v.title} onError={(e) => (e.target.style.display = "none")} />
                </div>
                <div className="course-title">{v.title}</div>
                <div style={{ padding: "0 14px 14px" }}>
                  {v.status !== 4 && <div className="tag" style={{ marginBottom: 8 }}>Still processing...</div>}
                  {courses.length === 0 ? (
                    <p style={{ color: "#888", fontSize: 12 }}>Create a course first.</p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {courses.map((c) => {
                        const attached = lessons.some((l) => l.course_id === c.id && l.bunny_video_id === v.id);
                        return (
                          <button
                            key={c.id}
                            className={attached ? "" : "btn-secondary"}
                            style={{ fontSize: 12, padding: "6px 10px" }}
                            disabled={v.status !== 4}
                            onClick={() => (attached ? detachVideo(v, c.id, c.title) : attachVideo(v, c.id))}
                          >
                            {attached ? "✓ " : ""}{c.title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "users" && (
        <div>
          <div className="card" style={{ maxWidth: 460 }}>
            <h3>Add a candidate</h3>
            <form onSubmit={createUser}>
              <label style={{ fontSize: 13, color: "#aaa" }}>Candidate name</label>
              <input name="full_name" placeholder="Full name" required />
              <label style={{ fontSize: 13, color: "#aaa" }}>Email</label>
              <input name="email" type="email" placeholder="Email" required />
              <label style={{ fontSize: 13, color: "#aaa" }}>Password</label>
              <input name="password" type="password" placeholder="Temporary password" required minLength={6} />

              <label style={{ fontSize: 13, color: "#aaa" }}>Courses</label>
              {courses.length === 0 ? (
                <p style={{ color: "#888", fontSize: 13 }}>No courses created yet.</p>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  {courses.map((c) => (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, padding: "6px 0", marginBottom: 0 }}>
                      <input type="checkbox" name={`course-${c.id}`} style={{ width: "auto", marginBottom: 0 }} />
                      {c.title}
                    </label>
                  ))}
                </div>
              )}

              <button type="submit">Okay, create candidate</button>
            </form>
          </div>
          <table>
            <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Courses</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="clickable-row" onClick={() => u.role !== "admin" && setSelectedUserId(u.id)}>
                  <td>{u.email}</td>
                  <td>{u.full_name || "—"}</td>
                  <td>{u.role}</td>
                  <td>
                    {u.role === "admin" ? (
                      "—"
                    ) : (
                      <span className={`status-badge ${u.active ? "active" : "inactive"}`}>
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    )}
                  </td>
                  <td>{u.role === "admin" ? "—" : enrollments.filter((e) => e.user_id === u.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "assign" && (
        <div>
          <p style={{ color: "#999" }}>Toggle which courses each user can access. Granting a course unlocks all of its lessons.</p>
          <table>
            <thead>
              <tr>
                <th>User</th>
                {courses.map((c) => <th key={c.id}>{c.title}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role !== "admin").map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  {courses.map((c) => {
                    const enrolled = enrollments.some((e) => e.user_id === u.id && e.course_id === c.id);
                    return (
                      <td key={c.id}>
                        <button
                          className={enrolled ? "" : "btn-secondary"}
                          onClick={() => toggleAssign(u.id, c.id, enrolled)}
                        >
                          {enrolled ? "Enrolled ✓" : "Grant"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          lessons={lessonsFor(selectedCourse.id)}
          bunnyVideos={bunnyVideos}
          bunnyLoading={bunnyLoading}
          onLoadBunnyVideos={loadBunnyVideos}
          onClose={() => setSelectedCourseId(null)}
          onAddLesson={attachVideo}
          onRemoveLesson={removeLesson}
          onDeleteCourse={deleteCourse}
        />
      )}

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          courses={courses}
          enrollments={enrollments}
          devices={deviceSessions.filter((d) => d.user_id === selectedUser.id)}
          onClose={() => setSelectedUserId(null)}
          onSaveDetails={saveUserDetails}
          onToggleStatus={toggleUserStatus}
          onRemoveCourse={removeUserCourse}
          onDelete={deleteUser}
          onRevokeDevice={revokeDevice}
        />
      )}
    </div>
  );
}
