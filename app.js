(() => {
  "use strict";

  const STORAGE_KEY = "cds-project-tracker:v1";
  const STATUSES = [
    { name: "Not started", color: "var(--s-notstarted)" },
    { name: "In progress", color: "var(--s-progress)" },
    { name: "On hold", color: "var(--s-hold)" },
    { name: "Blocked", color: "var(--s-blocked)" },
    { name: "Completed", color: "var(--s-done)" },
  ];
  const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

  const $ = (sel, root = document) => root.querySelector(sel);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const localDate = (d) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
  const today = () => localDate(new Date());
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const statusColor = (name) => (STATUSES.find((s) => s.name === name) || STATUSES[0]).color;
  const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

  // ---------- storage ----------
  let projects = load();
  let currentId = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(data)) return [];
      data.forEach((p) => { delete p.timerStart; }); // timer feature removed
      return data;
    } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); }
    catch (e) { alert("Could not save to browser storage: " + e.message); }
  }
  const find = (id) => projects.find((p) => p.id === id);
  const touch = (p) => { p.updatedAt = new Date().toISOString(); };

  function progressOf(p) {
    if (p.status === "Completed") return 100;
    if (p.tasks && p.tasks.length) {
      return Math.round((p.tasks.filter((t) => t.done).length / p.tasks.length) * 100);
    }
    return Number(p.progress) || 0;
  }
  const isOverdue = (p) => p.dueDate && p.status !== "Completed" && p.dueDate < today();

  // ---------- time tracking ----------
  // Entries are stored in minutes; everything is shown in hours.
  const loggedMins = (p, from = "", to = "9999") =>
    (p.time || []).filter((t) => t.date >= from && t.date <= to).reduce((a, t) => a + t.minutes, 0);
  const totalMins = (p) => loggedMins(p);
  const weekStart = (offsetWeeks = 0) => { // Monday of the week, local time
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offsetWeeks * 7);
    return localDate(d);
  };
  const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return localDate(d); };
  const weekMins = (p) => loggedMins(p, weekStart());
  const hrs = (m) => +(m / 60).toFixed(2);
  const fmtHrs = (m) => `${hrs(m)} h`;
  const fmtMins = fmtHrs;

  function estimateHtml(p, compact = false) {
    const est = Number(p.estimateHours) || 0;
    const spent = hrs(totalMins(p));
    if (!est) return compact ? (spent ? `<span>⏱ ${spent} h logged</span>` : "") : "";
    const pct = Math.min(100, Math.round((spent / est) * 100));
    const over = spent > est;
    const remaining = +(est - spent).toFixed(2);
    if (compact) {
      return `<span class="${over ? "overdue" : ""}">⏱ ${spent} / ${est} h${over ? " (over estimate)" : ""}</span>`;
    }
    return `
      <div class="progress-row est-row">
        <div class="bar"><span style="width:${pct}%;background:${over ? "var(--danger)" : "var(--accent)"}"></span></div>
        <span><strong>${spent}</strong> of ${est} h estimated ·
          ${over ? `<span class="overdue">${+(spent - est).toFixed(2)} h over</span>` : `${remaining} h remaining`}</span>
      </div>`;
  }

  function addTime(p, date, minutes, note) {
    p.time = p.time || [];
    p.time.push({ id: uid(), date, minutes, note, loggedAt: new Date().toISOString() });
    p.time.sort((a, b) => b.date.localeCompare(a.date));
    addLog(p, `Logged ${fmtHrs(minutes)} for ${fmtDate(date)}${note ? `: ${note}` : ""}`, true);
  }

  function timeFormHtml(withProject) {
    const opts = withProject ? [...projects]
      .sort((a, b) => (a.status === "Completed") - (b.status === "Completed") || a.name.localeCompare(b.name))
      .map((p) => `<option value="${p.id}">${esc(p.name)}${p.status === "Completed" ? " (completed)" : ""}</option>`).join("") : "";
    return `
      <form class="time-form ${withProject ? "with-project" : ""}" id="${withProject ? "quickTimeForm" : "timeForm"}">
        ${withProject ? `<select name="project" required aria-label="Project"><option value="">Choose project…</option>${opts}</select>` : ""}
        <input type="date" name="date" value="${today()}" required aria-label="Date worked">
        <input type="number" name="hours" min="0.25" max="24" step="0.25" placeholder="Hours" required aria-label="Hours worked">
        <input name="note" placeholder="What did you work on? (optional)" aria-label="Note">
        <button class="btn small primary">Log hours</button>
      </form>`;
  }

  function submitTime(f, p) {
    const minutes = Math.round(Number(f.hours.value) * 60);
    if (!p || !f.date.value || !(minutes > 0)) { alert("Enter a date and the hours you worked."); return false; }
    addTime(p, f.date.value, minutes, f.note.value.trim());
    touch(p); save();
    return true;
  }

  function deleteTime(projId, timeId) {
    const p = find(projId);
    const t = p && (p.time || []).find((x) => x.id === timeId);
    if (!t || !confirm(`Remove ${fmtHrs(t.minutes)} logged on ${fmtDate(t.date)} for "${p.name}"?`)) return;
    p.time = p.time.filter((x) => x.id !== timeId);
    addLog(p, `Removed ${fmtHrs(t.minutes)} logged for ${fmtDate(t.date)}`, true);
    touch(p); save(); render();
    if (currentId === p.id) renderDetail();
  }

  function logRange() {
    const v = $("#logRange").value;
    const t = today();
    if (v === "week") return [weekStart(), t];
    if (v === "lastweek") return [weekStart(-1), addDays(weekStart(), -1)];
    if (v === "month") return [t.slice(0, 8) + "01", t];
    return ["", "9999"];
  }

  function renderTimeLog() {
    $("#quickTimeSlot").innerHTML = projects.length ? timeFormHtml(true)
      : `<p class="sub">Add a project first, then log your hours here.</p>`;
    const [from, to] = logRange();
    const entries = [];
    projects.forEach((p) => (p.time || []).forEach((t) => {
      if (t.date >= from && t.date <= to) entries.push({ p, t });
    }));
    const days = {};
    entries.forEach((e) => (days[e.t.date] = days[e.t.date] || []).push(e));
    const dates = Object.keys(days).sort().reverse();
    const total = entries.reduce((a, e) => a + e.t.minutes, 0);

    const byProj = {};
    entries.forEach(({ p, t }) => { byProj[p.id] = (byProj[p.id] || 0) + t.minutes; });
    const projRows = Object.entries(byProj).sort((a, b) => b[1] - a[1]).map(([id, m]) => {
      const p = find(id);
      return `<li><span>${esc(p.name)}</span><strong>${fmtHrs(m)}</strong></li>`;
    }).join("");

    $("#timeLogBody").innerHTML = !entries.length
      ? `<p class="empty">No hours logged for this period.</p>`
      : `
      <div class="log-summary">
        <div class="stat"><div class="num">${fmtHrs(total)}</div><div class="lbl">Hours in period</div></div>
        <div class="stat"><div class="num">${dates.length}</div><div class="lbl">Days with time logged</div></div>
        <div class="stat"><div class="num">${fmtHrs(total / dates.length)}</div><div class="lbl">Average per day logged</div></div>
      </div>
      <div class="log-cols">
        <div>
          ${dates.map((d) => {
            const list = days[d];
            const dayTotal = list.reduce((a, e) => a + e.t.minutes, 0);
            return `
            <section class="day">
              <header><h3>${new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</h3>
                <strong>${fmtHrs(dayTotal)}</strong></header>
              <ul class="list">
                ${list.map(({ p, t }) => `
                  <li>
                    <span><a href="#" data-open="${p.id}">${esc(p.name)}</a>${t.note ? ` — ${esc(t.note)}` : ""}</span>
                    <strong>${fmtHrs(t.minutes)}</strong>
                    <button class="btn link" data-deltime="${t.id}" data-proj="${p.id}" title="Remove entry">✕</button>
                  </li>`).join("")}
              </ul>
            </section>`;
          }).join("")}
        </div>
        <aside class="day">
          <header><h3>By project</h3></header>
          <ul class="list totals">${projRows}</ul>
        </aside>
      </div>`;
  }

  // ---------- rendering ----------
  function renderStats() {
    const active = projects.filter((p) => p.status !== "Completed");
    const avg = active.length ? Math.round(active.reduce((a, p) => a + progressOf(p), 0) / active.length) : 0;
    const items = [
      ["Total projects", projects.length],
      ["In progress", projects.filter((p) => p.status === "In progress").length],
      ["Completed", projects.filter((p) => p.status === "Completed").length],
      ["Blocked / on hold", projects.filter((p) => p.status === "Blocked" || p.status === "On hold").length],
      ["Overdue", projects.filter(isOverdue).length, "warn"],
      ["Avg. progress (active)", avg + "%"],
      ["Hours this week", fmtHrs(projects.reduce((a, p) => a + weekMins(p), 0))],
      ["Total hours logged", fmtHrs(projects.reduce((a, p) => a + totalMins(p), 0))],
    ];
    $("#stats").innerHTML = items.map(([lbl, num, cls]) =>
      `<div class="stat ${cls && num ? cls : ""}"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`).join("");
  }

  function filtered() {
    const q = $("#search").value.trim().toLowerCase();
    const st = $("#filterStatus").value;
    const pr = $("#filterPriority").value;
    const hideDone = $("#hideDone").checked;
    const sort = $("#sortBy").value;

    let list = projects.filter((p) => {
      if (st && p.status !== st) return false;
      if (pr && p.priority !== pr) return false;
      if (hideDone && p.status === "Completed") return false;
      if (q) {
        const hay = [p.name, p.description, p.area, (p.tags || []).join(" "),
          ...(p.log || []).map((l) => l.text), ...(p.tasks || []).map((t) => t.text)].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const cmp = {
      updated: (a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""),
      due: (a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
      priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
      progress: (a, b) => progressOf(b) - progressOf(a),
      time: (a, b) => totalMins(b) - totalMins(a),
      name: (a, b) => a.name.localeCompare(b.name),
    }[sort];
    return list.sort(cmp);
  }

  function renderList() {
    const list = filtered();
    $("#empty").hidden = projects.length !== 0;
    $("#projectList").innerHTML = list.map((p) => {
      const pct = progressOf(p);
      const tasks = p.tasks || [];
      return `
      <article class="card" data-id="${p.id}" tabindex="0" style="--status-color:${statusColor(p.status)}">
        <div class="meta">
          <span class="pill" style="color:${statusColor(p.status)}">${esc(p.status)}</span>
          <span class="pill">${esc(p.priority)} priority</span>
          ${p.area ? `<span>${esc(p.area)}</span>` : ""}
        </div>
        <h3>${esc(p.name)}</h3>
        ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ""}
        <div class="progress-row">
          <div class="bar"><span style="width:${pct}%"></span></div><strong>${pct}%</strong>
        </div>
        <div class="meta">
          ${estimateHtml(p, true)}
          ${tasks.length ? `<span>${tasks.filter((t) => t.done).length}/${tasks.length} tasks</span>` : ""}
          ${p.dueDate ? `<span class="${isOverdue(p) ? "overdue" : ""}">Due ${fmtDate(p.dueDate)}${isOverdue(p) ? " (overdue)" : ""}</span>` : ""}
          ${(p.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}
        </div>
      </article>`;
    }).join("");
  }

  function render() { renderStats(); renderList(); if (!$("#timelogView").hidden) renderTimeLog(); }

  // ---------- project form ----------
  const dlg = $("#projectDialog");
  const form = $("#projectForm");

  function openForm(p) {
    form.reset();
    $("#dialogTitle").textContent = p ? "Edit project" : "New project";
    $("#deleteProjectBtn").hidden = !p;
    form.dataset.id = p ? p.id : "";
    const v = p || { status: "Not started", priority: "Medium", startDate: today(), progress: 0 };
    form.name.value = v.name || "";
    form.description.value = v.description || "";
    form.status.value = v.status;
    form.priority.value = v.priority;
    form.startDate.value = v.startDate || "";
    form.dueDate.value = v.dueDate || "";
    form.area.value = v.area || "";
    form.tags.value = (v.tags || []).join(", ");
    form.progress.value = v.progress || 0;
    form.estimateHours.value = v.estimateHours || "";
    dlg.showModal();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = form.dataset.id;
    const data = {
      name: form.name.value.trim(),
      description: form.description.value.trim(),
      status: form.status.value,
      priority: form.priority.value,
      startDate: form.startDate.value,
      dueDate: form.dueDate.value,
      area: form.area.value.trim(),
      tags: form.tags.value.split(",").map((t) => t.trim()).filter(Boolean),
      progress: Number(form.progress.value),
      estimateHours: form.estimateHours.value === "" ? "" : Math.max(0, Number(form.estimateHours.value)),
    };
    if (!data.name) return;
    let p = id && find(id);
    if (p) {
      if (p.status !== data.status) addLog(p, `Status changed: ${p.status} → ${data.status}`, true);
      if (data.status === "Completed" && !p.completedAt) data.completedAt = today();
      if (data.status !== "Completed") data.completedAt = "";
      Object.assign(p, data);
    } else {
      p = { id: uid(), createdAt: new Date().toISOString(), tasks: [], log: [], ...data };
      if (data.status === "Completed") p.completedAt = today();
      addLog(p, "Project created", true);
      projects.push(p);
    }
    touch(p); save(); dlg.close(); render();
    if (currentId === p.id) renderDetail();
  });

  $("#cancelBtn").addEventListener("click", () => dlg.close());
  $("#deleteProjectBtn").addEventListener("click", () => {
    const p = find(form.dataset.id);
    if (!p || !confirm(`Permanently delete "${p.name}" and all its tasks and notes?`)) return;
    projects = projects.filter((x) => x.id !== p.id);
    save(); dlg.close();
    if (currentId === p.id) { detail.close(); currentId = null; }
    render();
  });

  // ---------- detail view ----------
  const detail = $("#detailDialog");

  function addLog(p, text, system = false) {
    p.log = p.log || [];
    p.log.unshift({ id: uid(), date: new Date().toISOString(), text, system });
  }

  function openDetail(id) { currentId = id; renderDetail(); if (!detail.open) detail.showModal(); }

  function renderDetail() {
    const p = find(currentId);
    if (!p) return;
    const pct = progressOf(p);
    $("#detailBody").innerHTML = `
      <div class="detail-head">
        <div>
          <div class="meta">
            <span class="pill" style="color:${statusColor(p.status)}">${esc(p.status)}</span>
            <span class="pill">${esc(p.priority)} priority</span>
            ${p.area ? `<span>${esc(p.area)}</span>` : ""}
          </div>
          <h2 style="margin:8px 0 4px">${esc(p.name)}</h2>
        </div>
        <div class="actions">
          <button class="btn small" data-act="edit">Edit</button>
          <button class="btn small" data-act="close">Close</button>
        </div>
      </div>
      ${p.description ? `<p style="white-space:pre-wrap;margin:0 0 10px">${esc(p.description)}</p>` : ""}
      <div class="meta" style="margin-bottom:10px">
        ${p.startDate ? `<span>Started ${fmtDate(p.startDate)}</span>` : ""}
        ${p.dueDate ? `<span class="${isOverdue(p) ? "overdue" : ""}">· Due ${fmtDate(p.dueDate)}</span>` : ""}
        ${p.completedAt ? `<span>· Completed ${fmtDate(p.completedAt)}</span>` : ""}
        ${(p.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}
      </div>
      <div class="progress-row" style="--status-color:${statusColor(p.status)}">
        <div class="bar"><span style="width:${pct}%"></span></div><strong>${pct}%</strong>
      </div>
      <section class="time-box">
        <div class="time-head">
          <h3>Hours</h3>
          <div class="time-totals">
            <span><strong>${fmtHrs(totalMins(p))}</strong> total</span>
            <span><strong>${fmtHrs(weekMins(p))}</strong> this week</span>
            ${p.estimateHours ? "" : `<span>No estimate set. Add one with <em>Edit</em>.</span>`}
          </div>
        </div>
        ${estimateHtml(p)}
        ${timeFormHtml(false)}
        ${(p.time || []).length ? `
        <details>
          <summary>${p.time.length} day${p.time.length === 1 ? "" : "s"} logged</summary>
          <ul class="list">
            ${p.time.map((t) => `
              <li>
                <span><strong>${fmtHrs(t.minutes)}</strong> · ${fmtDate(t.date)}${t.note ? ` — ${esc(t.note)}` : ""}</span>
                <button class="btn link" data-deltime="${t.id}" data-proj="${p.id}" title="Remove entry">✕</button>
              </li>`).join("")}
          </ul>
        </details>` : ""}
      </section>
      <div class="detail-cols">
        <div>
          <h3>Tasks &amp; milestones</h3>
          <ul class="list">
            ${(p.tasks || []).map((t) => `
              <li class="${t.done ? "done" : ""}">
                <input type="checkbox" data-task="${t.id}" ${t.done ? "checked" : ""} aria-label="Mark done">
                <span>${esc(t.text)}</span>
                <button class="btn link" data-deltask="${t.id}" title="Remove task">✕</button>
              </li>`).join("") || `<li><span class="sub">No tasks yet — progress uses the manual slider.</span></li>`}
          </ul>
          <form class="inline-add" id="taskForm">
            <input name="text" placeholder="Add a task…" required>
            <button class="btn small primary">Add</button>
          </form>
        </div>
        <div>
          <h3>Progress log</h3>
          <form class="inline-add" id="logForm" style="margin-bottom:10px">
            <textarea name="text" rows="2" placeholder="What did you get done? Any blockers?" required></textarea>
            <button class="btn small primary">Log</button>
          </form>
          <ul class="list">
            ${(p.log || []).map((l) => `
              <li>
                <span><span class="log-date">${new Date(l.date).toLocaleString()}</span>
                ${l.system ? `<em>${esc(l.text)}</em>` : esc(l.text).replace(/\n/g, "<br>")}</span>
                ${l.system ? "" : `<button class="btn link" data-dellog="${l.id}" title="Remove entry">✕</button>`}
              </li>`).join("")}
          </ul>
        </div>
      </div>`;
  }

  detail.addEventListener("click", (e) => {
    if (e.target === detail) { detail.close(); return; } // click on backdrop
    const p = find(currentId);
    if (!p) return;
    const t = e.target;
    if (t.dataset.deltime) deleteTime(t.dataset.proj, t.dataset.deltime);
    else if (t.dataset.act === "close") detail.close();
    else if (t.dataset.act === "edit") openForm(p);
    else if (t.dataset.task) {
      const task = p.tasks.find((x) => x.id === t.dataset.task);
      task.done = t.checked;
      if (task.done) addLog(p, `Completed task: ${task.text}`, true);
      touch(p); save(); renderDetail(); render();
    } else if (t.dataset.deltask) {
      p.tasks = p.tasks.filter((x) => x.id !== t.dataset.deltask);
      touch(p); save(); renderDetail(); render();
    } else if (t.dataset.dellog) {
      if (!confirm("Remove this log entry?")) return;
      p.log = p.log.filter((x) => x.id !== t.dataset.dellog);
      touch(p); save(); renderDetail(); render();
    }
  });

  detail.addEventListener("submit", (e) => {
    e.preventDefault();
    const p = find(currentId);
    if (e.target.id === "timeForm") {
      if (submitTime(e.target, p)) { renderDetail(); render(); }
      return;
    }
    const text = e.target.text.value.trim();
    if (!p || !text) return;
    if (e.target.id === "taskForm") {
      p.tasks = p.tasks || [];
      p.tasks.push({ id: uid(), text, done: false });
    } else if (e.target.id === "logForm") {
      addLog(p, text);
    }
    touch(p); save(); renderDetail(); render();
    const again = $("#" + e.target.id + " [name=text]");
    if (again) again.focus();
  });

  detail.addEventListener("close", () => { currentId = null; });

  // ---------- import / export ----------
  $("#exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), projects }, null, 2)],
      { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `project-tracker-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = Array.isArray(data) ? data : data.projects;
      if (!Array.isArray(incoming)) throw new Error("No projects found in file.");
      const replace = confirm(
        `Found ${incoming.length} project(s).\n\nOK = REPLACE all current projects (${projects.length}) with the file.\nCancel = MERGE (add/update by ID, keep everything else).`);
      if (replace) projects = incoming;
      else incoming.forEach((p) => {
        const i = projects.findIndex((x) => x.id === p.id);
        if (i >= 0) projects[i] = p; else projects.push(p);
      });
      save(); render();
    } catch (err) { alert("Import failed: " + err.message); }
  });

  // ---------- wiring ----------
  const statusOpts = STATUSES.map((s) => `<option>${s.name}</option>`).join("");
  $("#filterStatus").insertAdjacentHTML("beforeend", statusOpts);
  form.status.innerHTML = statusOpts;

  $("#newProjectBtn").addEventListener("click", () => openForm(null));
  ["#search", "#filterStatus", "#filterPriority", "#sortBy", "#hideDone"].forEach((s) =>
    $(s).addEventListener("input", renderList));
  $("#projectList").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) openDetail(card.dataset.id);
  });
  $("#projectList").addEventListener("keydown", (e) => {
    const card = e.target.closest(".card");
    if (card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openDetail(card.dataset.id); }
  });

  // views
  function showView(name) {
    $("#projectsView").hidden = name !== "projects";
    $("#timelogView").hidden = name !== "timelog";
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    try { localStorage.setItem(STORAGE_KEY + ":view", name); } catch {}
    render();
  }
  document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
  $("#logRange").addEventListener("input", renderTimeLog);

  $("#timelogView").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.id !== "quickTimeForm") return;
    const keep = f.project.value;
    if (submitTime(f, find(f.project.value))) {
      render();
      const nf = $("#quickTimeForm");
      if (nf) { nf.project.value = keep; nf.hours.focus(); }
    }
  });
  $("#timelogView").addEventListener("click", (e) => {
    const t = e.target;
    if (t.dataset.deltime) deleteTime(t.dataset.proj, t.dataset.deltime);
    else if (t.dataset.open) { e.preventDefault(); openDetail(t.dataset.open); }
  });

  let startView = "projects";
  try { startView = localStorage.getItem(STORAGE_KEY + ":view") === "timelog" ? "timelog" : "projects"; } catch {}
  showView(startView);
})();
