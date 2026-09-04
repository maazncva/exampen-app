"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function AdminPanel({ initialUsers, initialCourses, initialEnrollments, initialLessons }) {
  const [tab, setTab] = useState("courses");
  const [users, setUsers] = useState(initialUsers);
  const [courses, setCourses] = useState(initialCourses);
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [lessons, setLessons] = useState(initialLessons);
  const [bunnyVideos, setBunnyVideos] = useState(null); // null = not loaded yet
  const [bunnyLoading, setBunnyLoading] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

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
    setUsers([json.profile, ...users]);
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
      body: JSON.stringify({ courseId, bunnyVideoId: video.id, title: video.title })
    });
    const json = await res.json();
    if (!res.ok) return flash(setErr, json.error || "Failed to attach video");
    setLessons([...lessons, json.lesson]);
    flash(setMsg, `"${video.title}" attached to course`);
  }

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
          {courses.map((c) => (
            <div key={c.id} className="card" style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{c.title}</strong>
                <span className="tag">{lessonsFor(c.id).length} lesson(s)</span>
              </div>
              {lessonsFor(c.id).length === 0 ? (
                <p style={{ color: "#888", fontSize: 13 }}>No videos attached yet — go to the Bunny Library tab.</p>
              ) : (
                <table>
                  <tbody>
                    {lessonsFor(c.id).map((l) => (
                      <tr key={l.id}>
                        <td>{l.title}</td>
                        <td style={{ textAlign: "right" }}>
                          <button className="btn-danger" onClick={() => removeLesson(l.id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
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
            Upload videos in your Bunny dashboard as usual — they'll show up here automatically. Pick which course each one belongs to.
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
                  <select id={`select-${v.id}`} defaultValue="">
                    <option value="" disabled>Attach to course...</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <button
                    style={{ width: "100%" }}
                    onClick={() => attachVideo(v, document.getElementById(`select-${v.id}`).value)}
                    disabled={v.status !== 4}
                  >
                    Attach
                  </button>
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
            <thead><tr><th>Email</th><th>Name</th><th>Role</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}><td>{u.email}</td><td>{u.full_name || "—"}</td><td>{u.role}</td></tr>
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
    </div>
  );
}
