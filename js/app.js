
"use strict";

/* =====================================
   JOBTRACK V3 — MAIN APPLICATION
===================================== */

const $ = id => document.getElementById(id);

/* =====================================
   STATE
===================================== */


const savedJobs = readJobs();

let jobs = savedJobs || [];
let storageReady = savedJobs !== null;

// Initial JobTrack applications
const STARTER_JOBS = [
  {
    company: "Colgate",
    position: "Management Trainee",
    applied: "",
    platform: "Other",
    status: "Pending",
    notes: "Applied in September 2026."
  },
  {
    company: "P&G",
    position: "Sales Key Account Trainee",
    applied: "2026-09-24",
    platform: "Career Website",
    status: "Rejected",
    notes: "Assessment completed."
  },
  {
    company: "KWSP",
    position: "Exec I, Tech & Analytics, Legal Sight, Technology & Support",
    applied: "2026-09-24",
    platform: "Career Website",
    status: "Pending",
    notes: "Expected response within 2 months."
  },
  {
    company: "Hock Mei Trading",
    position: "HR & Admin Executive",
    applied: "2026-09-28",
    platform: "JobStreet",
    status: "Job Closed",
    notes: ""
  },
  {
    company: "SLB",
    position: "Early Careers (Commercial & Business)",
    applied: "2026-09-28",
    platform: "Career Website",
    status: "Pending",
    notes: ""
  },
  {
    company: "Duopharma Biotech",
    position: "Graduate Trainee Programme",
    applied: "2026-09-30",
    platform: "Career Website",
    status: "Pending",
    notes: ""
  },
  {
    company: "Econsave",
    position: "Management Trainee (Purchasing)",
    applied: "2026-10-05",
    platform: "JobStreet",
    status: "Pending",
    notes: ""
  },
  {
    company: "Toyota",
    position: "Management Trainee",
    applied: "2026-10-07",
    platform: "JobStreet",
    status: "Pending",
    notes: ""
  },
  {
    company: "SSM",
    position: "Apprenticeship Program (SAP)",
    applied: "2026-10-07",
    platform: "JobStreet",
    status: "Pending",
    notes: "Email activity: 8 October 2026, 8:00 AM."
  },
  {
    company: "MR.DIY",
    position: "Sales Executive (Corporate Sales)",
    applied: "",
    platform: "Career Website",
    status: "Pending",
    notes: "Application date not recorded."
  },
  {
    company: "Mydin",
    position: "Not specified",
    applied: "",
    platform: "Other",
    status: "Pending",
    notes: "Position and application date not recorded."
  }
];

// Import starter applications once per browser.
const IMPORT_KEY = "jobtrack_starter_v2_imported";

if (
  storageReady &&
  localStorage.getItem(IMPORT_KEY) !== "yes"
) {
  const existingCompanies = new Set(
    jobs.map(job => job.company.trim().toLowerCase())
  );

  const missingJobs = STARTER_JOBS
    .filter(job =>
      !existingCompanies.has(
        job.company.trim().toLowerCase()
      )
    )
    .map(job => ({
      ...job,
      id: createJobId()
    }));

  const updatedJobs = [...jobs, ...missingJobs];

  if (writeJobs(updatedJobs)) {
    jobs = updatedJobs;
    localStorage.setItem(IMPORT_KEY, "yes");
  }
}


let currentTab = "planned";
let currentSort = "newest";

let editingId = null;
let applyingId = null;
let pendingAction = null;
let deletingId = null;

/* =====================================
   HELPERS
===================================== */

function createElement(tag, className = "", text = "") {
  const el = document.createElement(tag);

  if (className) {
    el.className = className;
  }

  el.textContent = text;

  return el;
}

function parseDate(value) {
  if (!value) return null;

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

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

/* =====================================
   DAYS SINCE APPLIED
===================================== */

function getDaysSinceApplied(value) {
  const applied = parseDate(value);

  if (!applied) return null;

  const today = parseDate(todayLocal());

  return Math.round(
    (today.getTime() - applied.getTime()) /
    86400000
  );
}

function formatDaysSinceApplied(value) {
  const days = getDaysSinceApplied(value);

  if (days === null) {
    return "No date";
  }

  if (days < 0) {
    return `In ${Math.abs(days)} day${days === -1 ? "" : "s"}`;
  }

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";

  return `${days} days ago`;
}

/* =====================================
   URL HELPER
===================================== */

function safeJobUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return "";
    }

    return url.href;

  } catch {
    return "";
  }
}

/* =====================================
   STORAGE
===================================== */

function persist(nextJobs) {
  if (!storageReady) {
    alert(
      "Saved data is unavailable. " +
      "Changes are currently disabled."
    );
    return false;
  }

  if (!writeJobs(nextJobs)) {
    return false;
  }

  jobs = nextJobs;
  render();

  return true;
}

/* =====================================
   APPLICATION GROUPS
===================================== */

function getJobGroup(job) {
  if (isPlannedStatus(job.status)) {
    return "planned";
  }

  if (isHistoryStatus(job.status)) {
    return "history";
  }

  return "active";
}

function getPlannedJobs() {
  return jobs.filter(job =>
    getJobGroup(job) === "planned"
  );
}

function getActiveJobs() {
  return jobs.filter(job =>
    getJobGroup(job) === "active"
  );
}

function getHistoryJobs() {
  return jobs.filter(job =>
    getJobGroup(job) === "history"
  );
}

function getCurrentJobs() {
  if (currentTab === "planned") {
    return getPlannedJobs();
  }

  if (currentTab === "history") {
    return getHistoryJobs();
  }

  return getActiveJobs();
}

/* =====================================
   STATISTICS
===================================== */

function updateStats() {
  const planned = getPlannedJobs();
  const active = getActiveJobs();
  const history = getHistoryJobs();

  $("statPlanned").textContent = planned.length;
  $("statActive").textContent = active.length;
  $("statHistory").textContent = history.length;

  $("plannedCount").textContent = planned.length;
  $("activeCount").textContent = active.length;
  $("historyCount").textContent = history.length;
}

/* =====================================
   SORTING
===================================== */

function sortJobs(input) {
  const sorted = [...input];

  sorted.sort((a, b) => {
    if (currentSort === "az") {
      return a.company.localeCompare(
        b.company,
        "en",
        { sensitivity: "base" }
      );
    }

    // Planned applications are ordered by date added.
    // Active / History use application date.
    const getSortDate = job => {
      if (currentTab === "planned") {
        const created = Date.parse(job.createdAt || "");

        return Number.isFinite(created)
          ? created
          : null;
      }

      return parseDate(job.applied)?.getTime() ?? null;
    };

    const dateA = getSortDate(a);
    const dateB = getSortDate(b);

    // Missing dates always go last.
    if (dateA === null && dateB !== null) return 1;
    if (dateB === null && dateA !== null) return -1;

    if (dateA === null && dateB === null) {
      return 0;
    }

    if (currentSort === "oldest") {
      return dateA - dateB;
    }

    return dateB - dateA;
  });

  return sorted;
}

/* =====================================
   SWITCH TAB
===================================== */

function switchTab(tab) {
  currentTab = tab;

  const tabs = {
    planned: "plannedTab",
    active: "activeTab",
    history: "historyTab"
  };

  Object.entries(tabs).forEach(([key, id]) => {
    const isActive = key === tab;

    $(id).classList.toggle(
      "active",
      isActive
    );

    $(id).setAttribute(
      "aria-pressed",
      String(isActive)
    );
  });

  $("search").value = "";

  render();
}

/* =====================================
   RENDER APPLICATIONS
===================================== */

function render() {
  updateStats();

  const list = $("list");
  list.replaceChildren();

  const query = $("search")
    .value.trim().toLowerCase();

  const currentJobs = getCurrentJobs();

  const filtered = currentJobs.filter(job => {
    const text = [
      job.company,
      job.position,
      job.platform,
      job.status,
      job.notes,
      job.jobUrl || ""
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

/* =====================================
   JOB CARD
===================================== */

function createJobCard(job) {
  const card = createElement("article", "job-card");

  const openButton = createElement(
    "button",
    "card-open"
  );

  openButton.type = "button";

  openButton.setAttribute(
    "aria-label",
    `Edit ${job.company} application`
  );

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

  const right = createElement(
    "div",
    "job-right"
  );

  const statusClass = job.status
    .toLowerCase()
    .replace(/\s+/g, "-");

  const badge = createElement(
    "span",
    `status-badge status-${statusClass}`,
    job.status
  );

  right.appendChild(badge);

  top.append(main, right);

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

  let dateLabel;

  if (isPlannedStatus(job.status)) {
    dateLabel = "Not applied yet";
  } else {
    dateLabel = formatDate(job.applied);
  }

  const date = createElement(
    "span",
    "",
    dateLabel
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
    isPlannedStatus(job.status)
      ? "Planned"
      : formatDaysSinceApplied(job.applied)
  );

  age.append(dot, ageText);

  bottom.append(meta, age);

  openButton.append(top, bottom);

  openButton.addEventListener("click", () => {
    openEditor(job);
  });

  card.appendChild(openButton);

  // Job URL is separate from the edit button.
  const jobUrl = safeJobUrl(job.jobUrl);

  if (jobUrl) {
    const link = createElement(
      "a",
      "job-url",
      "↗ Open job posting"
    );

    link.href = jobUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    card.appendChild(link);
  }

  // Planned application actions.
  if (isPlannedStatus(job.status)) {
    const actions = createElement(
      "div",
      "job-actions"
    );

    const edit = createElement(
      "button",
      "edit-link",
      "Edit"
    );

    edit.type = "button";

    edit.addEventListener("click", () => {
      openEditor(job);
    });

    const applied = createElement(
      "button",
      "btn-applied",
      "✓ Mark as Applied"
    );

    applied.type = "button";

    applied.addEventListener("click", () => {
      openAppliedModal(job);
    });

    actions.append(edit, applied);
    card.appendChild(actions);
  }
  
  // DELETE BUTTON — HISTORY ONLY
  if (isHistoryStatus(job.status)) {
    const actions = createElement(
      "div",
      "job-actions"
    );

    const deleteButton = createElement(
      "button",
      "btn-delete",
      "Delete"
    );

    deleteButton.type = "button";

    deleteButton.addEventListener("click", () => {
      openDeleteModal(job);
    });

    actions.appendChild(deleteButton);
    card.appendChild(actions);
  }


  return card;
}

/* =====================================
   EMPTY STATE
===================================== */

function renderEmpty(list, total, query) {
  const wrapper = createElement(
    "div",
    "empty-state"
  );

  const icon = createElement(
    "div",
    "empty-icon",
    "✦"
  );

  const title = createElement("h3");
  const description = createElement("p");

  if (query && total > 0) {
    title.textContent = "No applications found";

    description.textContent =
      "Try searching with another keyword.";

  } else if (currentTab === "planned") {
    title.textContent = "Nothing planned yet";

    description.textContent =
      "Save the opportunities you want to apply for.";

  } else if (currentTab === "history") {
    title.textContent = "No history yet";

    description.textContent =
      "Rejected and closed applications will appear here.";

  } else {
    title.textContent = "Your journey starts here";

    description.textContent =
      "Applied jobs will appear here.";
  }

  wrapper.append(icon, title, description);
  list.appendChild(wrapper);
}

/* =====================================
   MODAL HELPERS
===================================== */

function openOverlay(id) {
  $(id).classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeOverlay(id) {
  $(id).classList.add("hidden");

  const anyOpen = [
    "editorOverlay",
    "appliedOverlay",
    "confirmOverlay"
  ].some(overlayId =>
    !$(overlayId).classList.contains("hidden")
  );

  if (!anyOpen) {
    document.body.classList.remove("modal-open");
  }
}

/* =====================================
   ADD / EDIT APPLICATION
===================================== */

function openEditor(job = null) {
  if (!storageReady) {
    alert("Saved data is unavailable.");
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

  // From To Apply, new jobs default to To Apply.
  // Existing records keep their current status.
  $("status").value = job?.status ||
    (currentTab === "planned"
      ? "To Apply"
      : "Pending");

  $("applied").value = job?.applied || "";

  if (!job && currentTab !== "planned") {
    $("applied").value = todayLocal();
  }

  const platform = job?.platform || "JobStreet";

  const platformExists = Array.from(
    $("platform").options
  ).some(option => option.value === platform);

  $("platform").value = platformExists
    ? platform
    : "Other";

  $("jobUrl").value = job?.jobUrl || "";
  $("notes").value = job?.notes || "";

  updateStatusHelp();

  openOverlay("editorOverlay");

  $("company").focus();
}

function closeEditor() {
  closeOverlay("editorOverlay");
  editingId = null;
}

function updateStatusHelp() {
  const status = $("status").value;
  const applied = $("applied");

  if (isPlannedStatus(status)) {
    $("statusHelp").textContent =
      "Save this job under To Apply. " +
      "Use Mark as Applied when you submit it.";

    applied.disabled = true;
    applied.value = "";

  } else if (isHistoryStatus(status)) {
    $("statusHelp").textContent =
      "This application will appear under History.";

    applied.disabled = false;

  } else {
    $("statusHelp").textContent =
      "This application will appear under Active.";

    applied.disabled = false;
  }
}

/* =====================================
   SAVE APPLICATION
===================================== */

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

  if (editingId && !oldJob) {
    alert("Application not found.");
    return;
  }

  const status = $("status").value;

  const rawUrl = $("jobUrl").value.trim();
  const jobUrl = rawUrl ? safeJobUrl(rawUrl) : "";

  if (rawUrl && !jobUrl) {
    alert("Please enter a valid HTTP or HTTPS job URL.");
    return;
  }

  const data = {
    ...oldJob,
    id: editingId || createJobId(),
    company,
    position,
    applied: isPlannedStatus(status)
      ? ""
      : $("applied").value,
    platform: $("platform").value,
    status,
    notes: $("notes").value.trim(),
    jobUrl,
    createdAt: oldJob?.createdAt ||
      new Date().toISOString()
  };

  const nextJobs = editingId
    ? jobs.map(job =>
        job.id === editingId ? data : job
      )
    : [...jobs, data];

  if (!persist(nextJobs)) {
    return;
  }

  closeEditor();

  switchTab(getJobGroup(data));
}

/* =====================================
   MARK AS APPLIED
===================================== */

function openAppliedModal(job) {
  if (!storageReady) {
    alert("Saved data is unavailable.");
    return;
  }

  applyingId = job.id;

  $("appliedCompany").textContent =
    `${job.company} — ${job.position}`;

  $("appliedDate").value = todayLocal();

  openOverlay("appliedOverlay");

  $("appliedDate").focus();
}

function closeAppliedModal() {
  closeOverlay("appliedOverlay");
  applyingId = null;
}

function confirmApplied(event) {
  event.preventDefault();

  if (!applyingId) {
    return;
  }

  const date = $("appliedDate").value;

  if (!parseDate(date)) {
    alert("Please select a valid application date.");
    return;
  }

  const job = jobs.find(item =>
    item.id === applyingId
  );

  if (!job || !isPlannedStatus(job.status)) {
    alert("This job is no longer under To Apply.");
    closeAppliedModal();
    return;
  }

  const updatedJobs = jobs.map(item => {
    if (item.id !== applyingId) {
      return item;
    }

    return {
      ...item,
      applied: date,
      status: "Pending"
    };
  });

  if (!persist(updatedJobs)) {
    return;
  }

  closeAppliedModal();

  // Automatically switch to Active.
  switchTab("active");
}

/* =====================================
   DELETE APPLICATION — HISTORY ONLY
===================================== */

function openDeleteModal(job) {
  if (!storageReady) {
    alert("Saved data is unavailable.");
    return;
  }

  // Safety: Only History applications can be deleted.
  if (!isHistoryStatus(job.status)) {
    return;
  }

  deletingId = job.id;

  $("deleteMessage").textContent =
    `Are you sure you want to delete ${job.company} — ` +
    `${job.position}?`;

  openOverlay("deleteOverlay");
}

function closeDeleteModal() {
  closeOverlay("deleteOverlay");
  deletingId = null;
}

function confirmDeleteApplication() {
  if (!deletingId) {
    return;
  }

  const job = jobs.find(item =>
    item.id === deletingId
  );

  // Double-check before deleting.
  if (!job || !isHistoryStatus(job.status)) {
    closeDeleteModal();
    return;
  }

  const updatedJobs = jobs.filter(item =>
    item.id !== deletingId
  );

  // Delete only if localStorage save succeeds.
  if (!persist(updatedJobs)) {
    return;
  }

  closeDeleteModal();
}

/* =====================================
   BACKUP
===================================== */

function backupData() {
  if (!storageReady) {
    alert("Unable to back up unreadable data.");
    return;
  }

  const backup = {
    app: "JobTrack",
    version: 3,
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

  link.download =
    `jobtrack-backup-${todayLocal()}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* =====================================
   RESTORE CONFIRMATION
===================================== */

function openConfirm(message, callback) {
  pendingAction = callback;

  $("confirmText").textContent = message;

  openOverlay("confirmOverlay");
  $("cancelConfirm").focus();
}

function closeConfirm() {
  closeOverlay("confirmOverlay");
  pendingAction = null;
}

/* =====================================
   RESTORE BACKUP
===================================== */

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
      "This will replace your current To Apply, " +
      "Active and History records.",
      () => {
        if (!writeJobs(restoredJobs)) {
          return;
        }

        jobs = restoredJobs;
        storageReady = true;

        switchTab("active");
      }
    );

  } catch (error) {
    console.error("Restore failed:", error);

    alert(
      "Invalid backup file. Please select a " +
      "valid JobTrack JSON backup."
    );
  }

  event.target.value = "";
}

/* =====================================
   EVENT LISTENERS
===================================== */

// New application
$("addBtn").addEventListener("click", () => {
  openEditor();
});

// Three tabs
$("plannedTab").addEventListener("click", () => {
  switchTab("planned");
});

$("activeTab").addEventListener("click", () => {
  switchTab("active");
});

$("historyTab").addEventListener("click", () => {
  switchTab("history");
});

// Search
$("search").addEventListener("input", render);

// Sort
$("sortSelect").addEventListener("change", event => {
  currentSort = event.target.value;
  render();
});

// Save application
$("jobForm").addEventListener(
  "submit",
  saveApplication
);

// Status selection
$("status").addEventListener(
  "change",
  updateStatusHelp
);

// Close editor
document.querySelectorAll("[data-close]").forEach(
  button => {
    button.addEventListener("click", closeEditor);
  }
);

// Mark as Applied
$("appliedForm").addEventListener(
  "submit",
  confirmApplied
);

$("closeApplied").addEventListener(
  "click",
  closeAppliedModal
);

$("cancelApplied").addEventListener(
  "click",
  closeAppliedModal
);

// Close when clicking outside modal
$("editorOverlay").addEventListener("click", event => {
  if (event.target === $("editorOverlay")) {
    closeEditor();
  }
});

$("appliedOverlay").addEventListener("click", event => {
  if (event.target === $("appliedOverlay")) {
    closeAppliedModal();
  }
});


 // Escape key
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;

  // Delete confirmation
  if (!$("deleteOverlay").classList.contains("hidden")) {
    closeDeleteModal();

  // Restore confirmation
  } else if (!$("confirmOverlay").classList.contains("hidden")) {
    closeConfirm();

  // Mark as Applied
  } else if (!$("appliedOverlay").classList.contains("hidden")) {
    closeAppliedModal();

  // Add / Edit application
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

// Confirm restore
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

// HISTORY DELETE EVENTS
$("cancelDelete").addEventListener("click", () => {
  closeDeleteModal();
});

$("confirmDelete").addEventListener("click", () => {
  confirmDeleteApplication();
});

$("deleteOverlay").addEventListener("click", event => {
  if (event.target === $("deleteOverlay")) {
    closeDeleteModal();
  }
});


/* =====================================
   INITIALIZATION
===================================== */

// V3 starts on To Apply.
switchTab("planned");

// Refresh elapsed-day labels when returning to Safari.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    render();
  }
});
