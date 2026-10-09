
"use strict";

const $ = id => document.getElementById(id);

// Application state

const STARTER_JOBS = [
  {
    company: "Colgate",
    position: "Management Trainee",
    applied: "",
    platform: "Other",
    status: "Pending",
    notes: "Applied in September 2026. Exact date not recorded."
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
    notes: "Email received on 8 October 2026 at 8:00 AM."
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
    notes: "Position, platform and application date not provided."
  }
];

// Import starter data only once per browser.
const STARTER_IMPORT_KEY = "jobtrack_starter_v1_imported";

let jobs = readJobs();

if (localStorage.getItem(STARTER_IMPORT_KEY) !== "yes") {
  const existing = new Set(
    jobs.map(job =>
      `${job.company}|${job.position}`.toLowerCase().trim()
    )
  );

  const missing = STARTER_JOBS
    .filter(job =>
      !existing.has(
        `${job.company}|${job.position}`.toLowerCase().trim()
      )
    )
    .map(job => ({
      ...job,
      id: createJobId()
    }));

  const updated = [...jobs, ...missing];

  if (writeJobs(updated)) {
    jobs = updated;
    localStorage.setItem(STARTER_IMPORT_KEY, "yes");
  }
}

let currentTab = "active";
let editingId = null;
let pendingAction = null;

// ----------------------------
// HELPERS
// ----------------------------

function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  element.textContent = text;

  return element;
}


function formatDate(value) {
  if (!value) {
    return "Date not set";
  }

  const parts = value.split("-").map(Number);

  if (
    parts.length !== 3 ||
    !parts[0] ||
    !parts[1] ||
    !parts[2]
  ) {
    return value;
  }

  const date = new Date(
    Date.UTC(parts[0], parts[1] - 1, parts[2])
  );

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}


function todayLocal() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function persist(nextJobs) {
  if (!writeJobs(nextJobs)) {
    return false;
  }

  jobs = nextJobs;
  render();

  return true;
}

// ----------------------------
// FILTER APPLICATIONS
// ----------------------------

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

// ----------------------------
// SWITCH TAB
// ----------------------------

function switchTab(tab) {
  currentTab = tab;

  $("search").value = "";

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

  if (tab === "active") {
    $("listTitle").textContent = "Your applications";

    $("listDescription").textContent =
      "Applications you're currently tracking.";
  } else {
    $("listTitle").textContent = "Application history";

    $("listDescription").textContent =
      "Your previous applications and outcomes.";
  }

  render();
}

// ----------------------------
// RENDER
// ----------------------------

function render() {
  const activeJobs = getActiveJobs();
  const historyJobs = getHistoryJobs();

  $("activeCount").textContent = activeJobs.length;
  $("historyCount").textContent = historyJobs.length;

  const query = $("search").value
    .trim()
    .toLowerCase();

  const currentJobs = getCurrentJobs();

  const visibleJobs = currentJobs.filter(job => {
    const searchable = [
      job.company,
      job.position,
      job.platform,
      job.status,
      job.notes
    ].join(" ").toLowerCase();

    return searchable.includes(query);
  });

  const list = $("list");
  list.replaceChildren();

  if (visibleJobs.length === 0) {
    renderEmpty(list, currentJobs.length, query);
    return;
  }

  // Latest applications first
  const sortedJobs = [...visibleJobs].sort((a, b) => {
    return (b.applied || "").localeCompare(a.applied || "");
  });

  sortedJobs.forEach(job => {
    list.appendChild(createJobCard(job));
  });
}

// ----------------------------
// APPLICATION CARD
// ----------------------------

function createJobCard(job) {
  const button = createElement("button", "job");
  button.type = "button";

  button.setAttribute(
    "aria-label",
    `Edit ${job.company} application`
  );

  const left = createElement("div", "job-info");

  const company = createElement(
    "span",
    "company",
    job.company
  );

  const position = createElement(
    "span",
    "role",
    job.position
  );

  const meta = createElement(
    "span",
    "meta",
    `${job.platform} · ${formatDate(job.applied)}`
  );

  left.append(company, position, meta);

  const right = createElement("div", "job-end");

  const statusClass = job.status
    .toLowerCase()
    .replace(/\s+/g, "-");

  const status = createElement(
    "span",
    `status ${statusClass}`,
    job.status
  );

  const arrow = createElement("span", "arrow", "›");

  right.append(status, arrow);
  button.append(left, right);

  button.addEventListener("click", () => {
    openEditor(job);
  });

  return button;
}

// ----------------------------
// EMPTY STATE
// ----------------------------

function renderEmpty(list, total, query) {
  const empty = createElement("div", "empty");

  const icon = createElement(
    "div",
    "empty-icon",
    currentTab === "history" ? "↺" : "✧"
  );

  const title = createElement("strong");

  const description = createElement("p");

  if (query && total > 0) {
    title.textContent = "No matching applications.";
    description.textContent = "Try another search.";

  } else if (currentTab === "history") {
    title.textContent = "No history yet.";
    description.textContent =
      "Rejected and closed applications will appear here.";

  } else {
    title.textContent = "All caught up.";
    description.textContent =
      "Add your first job application to get started.";
  }

  empty.append(icon, title, description);
  list.appendChild(empty);
}

// ----------------------------
// OPEN ADD / EDIT POPUP
// ----------------------------

function openEditor(job = null) {
  editingId = job ? job.id : null;

  $("modalTitle").textContent = job
    ? "Edit application"
    : "New application";

  $("company").value = job?.company || "";
  $("position").value = job?.position || "";
  $("applied").value = job?.applied || todayLocal();
  $("platform").value = job?.platform || "JobStreet";
  $("status").value = job?.status || "Pending";
  $("notes").value = job?.notes || "";

  updateStatusHelp();

  $("editorOverlay").classList.remove("hidden");

  document.body.style.overflow = "hidden";

  $("company").focus();
}

// ----------------------------
// CLOSE POPUP
// ----------------------------

function closeEditor() {
  $("editorOverlay").classList.add("hidden");

  document.body.style.overflow = "";

  editingId = null;
}

function updateStatusHelp() {
  const status = $("status").value;

  if (isHistoryStatus(status)) {
    $("statusHelp").textContent =
      "This application will be saved under History.";
  } else {
    $("statusHelp").textContent =
      "This application will be shown under Active.";
  }
}

// ----------------------------
// SAVE APPLICATION
// ----------------------------

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
    company: company,
    position: position,
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

  const movedToHistory = (
    isHistoryStatus(data.status) &&
    !isHistoryStatus(oldJob?.status)
  );

  const movedToActive = (
    !isHistoryStatus(data.status) &&
    isHistoryStatus(oldJob?.status)
  );

  closeEditor();

  // Automatically show the correct tab
  if (movedToHistory) {
    switchTab("history");
  } else if (movedToActive) {
    switchTab("active");
  }
}

// ----------------------------
// BACKUP
// ----------------------------

function backupData() {
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

  link.download =
    `jobtrack-backup-${todayLocal()}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// ----------------------------
// CONFIRMATION POPUP
// ----------------------------

function openConfirm(message, action) {
  pendingAction = action;

  $("confirmText").textContent = message;

  $("confirmOverlay").classList.remove("hidden");

  $("cancelConfirm").focus();
}

function closeConfirm() {
  $("confirmOverlay").classList.add("hidden");
  pendingAction = null;
}

// ----------------------------
// RESTORE
// ----------------------------

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
      `This will replace your current ${jobs.length} ` +
      `applications, including Active and History.`,
      () => {
        if (persist(restoredJobs)) {
          switchTab("active");
        }
      }
    );

  } catch (error) {
    console.error(error);

    alert(
      "Invalid backup file. " +
      "Please select a valid JobTrack JSON backup."
    );
  }

  event.target.value = "";
}

// ----------------------------
// EVENT LISTENERS
// ----------------------------

// Tabs
$("activeTab").addEventListener("click", () => {
  switchTab("active");
});

$("historyTab").addEventListener("click", () => {
  switchTab("history");
});

// Add application
$("addBtn").addEventListener("click", () => {
  openEditor();
});

// Save application
$("jobForm").addEventListener(
  "submit",
  saveApplication
);

// Status description
$("status").addEventListener(
  "change",
  updateStatusHelp
);

// Close editor
document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", closeEditor);
});

// Click outside popup
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

// Search
$("search").addEventListener("input", render);

// Backup
$("backupBtn").addEventListener("click", backupData);

// Restore
$("restoreBtn").addEventListener("click", () => {
  $("restoreFile").value = "";
  $("restoreFile").click();
});

$("restoreFile").addEventListener(
  "change",
  restoreData
);

// Confirmation
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

// ----------------------------
// INITIAL LOAD
// ----------------------------

switchTab("active");
