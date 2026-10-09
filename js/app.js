
"use strict";

/* ================================
   JOBTRACK V2 — MAIN APPLICATION
================================ */

const $ = id => document.getElementById(id);

/* ================================
   STATE
================================ */

const savedJobs = readJobs();

let jobs = savedJobs || [];
let storageReady = savedJobs !== null;

let currentTab = "active";
let currentSort = "newest";
let editingId = null;
let pendingAction = null;

/* ================================
   HELPERS
================================ */

function createElement(tag, className = "", text = "") {
  const el = document.createElement(tag);

  if (className) {
    el.className = className;
  }

  el.textContent = text;
  return el;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/* FORMAT DATE WITH WEEKDAY */

function formatDate(value) {
  const date = parseDate(value);

  if (!date) {
    return value || "Date not set";
  }

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

/* TODAY IN LOCAL TIME */

function todayLocal() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* ================================
   DAYS SINCE APPLIED
================================ */

function getDaysSinceApplied(value) {
  const appliedDate = parseDate(value);

  if (!appliedDate) {
    return null;
  }

  const today = parseDate(todayLocal());

  const difference = today.getTime() -
    appliedDate.getTime();

  return Math.round(
    difference / (1000 * 60 * 60 * 24)
  );
}

function formatDaysSinceApplied(value) {
  const days = getDaysSinceApplied(value);

  if (days === null) {
    return "No date";
  }

  if (days < 0) {
    const remaining = Math.abs(days);

    return remaining === 1
      ? "In 1 day"
      : `In ${remaining} days`;
  }

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Yesterday";
  }

  return `${days} days ago`;
}

/* ================================
   STORAGE
================================ */

function persist(nextJobs) {
  if (!storageReady) {
    alert("Saved data is unavailable. Changes are disabled.");
    return false;
  }

  if (!writeJobs(nextJobs)) {
    return false;
  }

  jobs = nextJobs;
  render();

  return true;
}

/* ================================
   APPLICATION FILTERS
================================ */

function getActiveJobs() {
  return jobs.filter(job =>
    !isHistoryStatus(job.status)
  );
}

function getHistoryJobs() {
  return jobs.filter(job =>
    isHistoryStatus(job.status)
  );
}

function getCurrentJobs() {
  return currentTab === "history"
    ? getHistoryJobs()
    : getActiveJobs();
}

/* ================================
   SORT APPLICATIONS
================================ */

function sortJobs(input) {
  const sorted = [...input];

  sorted.sort((a, b) => {

    // COMPANY A-Z
    if (currentSort === "az") {
      return a.company.localeCompare(
        b.company,
        "en",
        { sensitivity: "base" }
      );
    }

    const dateA = parseDate(a.applied)?.getTime() ?? null;
    const dateB = parseDate(b.applied)?.getTime() ?? null;

    // Missing dates always go last.
    if (dateA === null && dateB !== null) return 1;
    if (dateB === null && dateA !== null) return -1;

    if (dateA === null && dateB === null) {
      return 0;
    }

    // OLDEST FIRST
    if (currentSort === "oldest") {
      return dateA - dateB;
    }

    // NEWEST FIRST (DEFAULT)
    return dateB - dateA;
  });

  return sorted;
}

/* ================================
   UPDATE STATISTICS
================================ */

function updateStats() {
  const active = getActiveJobs();
  const history = getHistoryJobs();

  const interviews = active.filter(job =>
    job.status === "Interview"
  );

  $("statActive").textContent = active.length;
  $("statInterview").textContent = interviews.length;
  $("statHistory").textContent = history.length;

  $("activeCount").textContent = active.length;
  $("historyCount").textContent = history.length;
}

/* ================================
   TABS
================================ */

function switchTab(tab) {
  currentTab = tab;

  $("activeTab").classList.toggle(
    "active",
    tab === "active"
  );

  $("historyTab").classList.toggle(
    "active",
    tab === "history"
  );

  $("activeTab").setAttribute(
    "aria-pressed",
    String(tab === "active")
  );

  $("historyTab").setAttribute(
    "aria-pressed",
    String(tab === "history")
  );

  $("search").value = "";

  render();
}

/* ================================
   RENDER APPLICATIONS
================================ */

function render() {
  updateStats();

  const list = $("list");
  list.replaceChildren();

  const query = $("search")
    .value
    .trim()
    .toLowerCase();

  const currentJobs = getCurrentJobs();

  const filtered = currentJobs.filter(job => {
    const text = [
      job.company,
      job.position,
      job.platform,
      job.status,
      job.notes
    ].join(" ").toLowerCase();

    return text.includes(query);
  });

  const sorted = sortJobs(filtered);

  if (sorted.length === 0) {
    renderEmpty(list, currentJobs.length, query);
    return;
  }

  sorted.forEach(job => {
    list.appendChild(createJobCard(job));
  });
}

/* ================================
   JOB CARD
================================ */

function createJobCard(job) {
  const button = createElement(
    "button",
    "job-card"
  );

  button.type = "button";
  button.setAttribute(
    "aria-label",
    `Edit ${job.company} application`
  );

  // TOP
  const top = createElement("div", "job-top");

  const main = createElement("div", "job-main");

  const company = createElement(
    "div",
    "job-company",
    job.company
  );

  const position = createElement(
    "div",
    "job-position",
    job.position
  );

  main.append(company, position);

  const right = createElement("div", "job-right");

  const statusClass = job.status
    .toLowerCase()
    .replace(/\s+/g, "-");

  const badge = createElement(
    "span",
    `status-badge status-${statusClass}`,
    job.status
  );

  const chevron = createElement(
    "span",
    "job-chevron",
    "›"
  );

  right.append(badge, chevron);
  top.append(main, right);

  // BOTTOM
  const bottom = createElement(
    "div",
    "job-bottom"
  );

  const meta = createElement(
    "div",
    "job-meta"
  );

  const platform = createElement(
    "span",
    "",
    job.platform || "Other"
  );

  const separator = createElement(
    "span",
    "meta-separator",
    "·"
  );

  const date = createElement(
    "span",
    "",
    formatDate(job.applied)
  );

  meta.append(platform, separator, date);

  const age = createElement(
    "div",
    "job-age"
  );

  const dot = createElement(
    "span",
    "age-dot"
  );

  const ageText = createElement(
    "span",
    "",
    formatDaysSinceApplied(job.applied)
  );

  age.append(dot, ageText);

  bottom.append(meta, age);
  button.append(top, bottom);

  button.addEventListener("click", () => {
    openEditor(job);
  });

  return button;
}

/* ================================
   EMPTY STATE
================================ */

function renderEmpty(list, total, query) {
  const wrapper = createElement(
    "div",
    "empty-state"
  );

  const icon = createElement(
    "div",
    "empty-icon",
    currentTab === "history" ? "↺" : "✦"
  );

  const title = createElement("h3");
  const description = createElement("p");

  if (query && total > 0) {
    title.textContent = "No applications found";
    description.textContent =
      "Try searching with another keyword.";

  } else if (currentTab === "history") {
    title.textContent = "No history yet";
    description.textContent =
      "Rejected and closed applications will appear here.";

  } else {
    title.textContent = "Your journey starts here";
    description.textContent =
      "Add your first application to get started.";
  }

  wrapper.append(icon, title, description);
  list.appendChild(wrapper);
}

/* ================================
   ADD / EDIT MODAL
================================ */

function openEditor(job = null) {
  if (!storageReady) {
    alert("Cannot edit while saved data is unavailable.");
    return;
  }

  editingId = job ? job.id : null;

  $("modalTitle").textContent = job
    ? "Edit application"
    : "New application";

  $("saveBtn").textContent = job
    ? "Save changes"
    : "Save application";

  $("company").value = job?.company ?? "";
  $("position").value = job?.position ?? "";

  // Existing records with no date stay blank.
  $("applied").value = job
    ? job.applied
    : todayLocal();

  const platform = job?.platform || "JobStreet";

  const platformExists = Array.from(
    $("platform").options
  ).some(option => option.value === platform);

  $("platform").value = platformExists
    ? platform
    : "Other";

  $("status").value = job?.status || "Pending";
  $("notes").value = job?.notes || "";

  updateStatusHelp();

  $("editorOverlay").classList.remove("hidden");

  document.body.style.overflow = "hidden";

  $("company").focus();
}

function closeEditor() {
  $("editorOverlay").classList.add("hidden");

  document.body.style.overflow = "";

  editingId = null;
}

function updateStatusHelp() {
  const status = $("status").value;

  $("statusHelp").textContent = isHistoryStatus(status)
    ? "This application will appear under History."
    : "This application will appear under Active.";
}

/* ================================
   SAVE APPLICATION
================================ */

function saveApplication(event) {
  event.preventDefault();

  const company = $("company").value.trim();
  const position = $("position").value.trim();

  if (!company || !position) {
    return;
  }

  const oldJob = editingId
    ? jobs.find(job => job.id === editingId)
    : null;

  const data = {
    id: editingId || createJobId(),
    company,
    position,
    applied: $("applied").value,
    platform: $("platform").value,
    status: $("status").value,
    notes: $("notes").value.trim()
  };

  const nextJobs = editingId
    ? jobs.map(job =>
        job.id === editingId ? data : job
      )
    : [...jobs, data];

  if (!persist(nextJobs)) {
    return;
  }

  const wasHistory = oldJob
    ? isHistoryStatus(oldJob.status)
    : false;

  const nowHistory = isHistoryStatus(data.status);

  closeEditor();

  // Move to the corresponding view on change.
  if (wasHistory !== nowHistory) {
    switchTab(nowHistory ? "history" : "active");
  }

  // New History application
  if (!oldJob && nowHistory) {
    switchTab("history");
  }
}

/* ================================
   BACKUP JSON
================================ */

function backupData() {
  if (!storageReady) {
    alert("Unable to back up unreadable saved data.");
    return;
  }

  const backup = {
    app: "JobTrack",
    version: 2,
    exportedAt: new Date().toISOString(),
    applications: jobs
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = `jobtrack-backup-${todayLocal()}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* ================================
   CONFIRMATION MODAL
================================ */

function openConfirm(message, callback) {
  pendingAction = callback;

  $("confirmText").textContent = message;
  $("confirmOverlay").classList.remove("hidden");

  $("cancelConfirm").focus();
}

function closeConfirm() {
  $("confirmOverlay").classList.add("hidden");
  pendingAction = null;
}

/* ================================
   RESTORE BACKUP
================================ */

async function restoreData(event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  try {
    const content = await file.text();
    const backup = JSON.parse(content);

    if (!validateBackup(backup)) {
      throw new Error("Invalid JobTrack backup");
    }

    const restoredJobs = backup.applications;

    openConfirm(
      `Restore ${restoredJobs.length} applications? ` +
      `This will replace all current Active and History records.`,
      () => {
        if (!writeJobs(restoredJobs)) {
          return;
        }

        storageReady = true;
        jobs = restoredJobs;
        switchTab("active");
      }
    );

  } catch (error) {
    console.error("Restore failed:", error);

    alert(
      "Invalid backup file. Please select a valid " +
      "JobTrack JSON backup."
    );
  }

  event.target.value = "";
}

/* ================================
   EVENT LISTENERS
================================ */

// Add application
$("addBtn").addEventListener("click", () => {
  openEditor();
});

// Tabs
$("activeTab").addEventListener("click", () => {
  switchTab("active");
});

$("historyTab").addEventListener("click", () => {
  switchTab("history");
});

// Search
$("search").addEventListener("input", render);

// Sorting
$("sortSelect").addEventListener("change", event => {
  currentSort = event.target.value;
  render();
});

// Save
$("jobForm").addEventListener(
  "submit",
  saveApplication
);

// Status helper
$("status").addEventListener(
  "change",
  updateStatusHelp
);

// Close modal buttons
document.querySelectorAll("[data-close]").forEach(
  button => {
    button.addEventListener("click", closeEditor);
  }
);

// Click outside editor
$("editorOverlay").addEventListener("click", event => {
  if (event.target === $("editorOverlay")) {
    closeEditor();
  }
});

// Escape key
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") {
    return;
  }

  if (!$("confirmOverlay").classList.contains("hidden")) {
    closeConfirm();

  } else if (!$("editorOverlay").classList.contains("hidden")) {
    closeEditor();
  }
});

// Backup
$("backupBtn").addEventListener(
  "click",
  backupData
);

// Restore
$("restoreBtn").addEventListener("click", () => {
  $("restoreFile").value = "";
  $("restoreFile").click();
});

$("restoreFile").addEventListener(
  "change",
  restoreData
);

// Restore confirmation
$("cancelConfirm").addEventListener(
  "click",
  closeConfirm
);

$("confirmAction").addEventListener("click", () => {
  const action = pendingAction;

  closeConfirm();

  if (action) {
    action();
  }
});

/* ================================
   INITIALIZE
================================ */

switchTab("active");

// Refresh day counts when user returns to the tab.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    render();
  }
});
