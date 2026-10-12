
"use strict";

/* =====================================
   JOBTRACK V3 — STORAGE
===================================== */

// Do not change: preserves existing V1/V2 data.
const KEY = "jobtrack_v1_applications";

const PLANNED_STATUS = "To Apply";

const ACTIVE_STATUSES = [
  "Pending",
  "Assessment",
  "Interview",
  "Offer"
];

const HISTORY_STATUSES = [
  "Rejected",
  "Job Closed"
];

const ALL_STATUSES = [
  PLANNED_STATUS,
  ...ACTIVE_STATUSES,
  ...HISTORY_STATUSES
];

function isPlannedStatus(status) {
  return status === PLANNED_STATUS;
}

function isHistoryStatus(status) {
  return HISTORY_STATUSES.includes(status);
}

function isActiveStatus(status) {
  return ACTIVE_STATUSES.includes(status);
}

/* =====================================
   VALIDATE APPLICATION
===================================== */

function validJob(job) {
  if (
    !job ||
    typeof job !== "object" ||
    Array.isArray(job)
  ) {
    return false;
  }

  return (
    typeof job.id === "string" &&
    job.id.length > 0 &&
    typeof job.company === "string" &&
    typeof job.position === "string" &&
    typeof job.applied === "string" &&
    typeof job.platform === "string" &&
    typeof job.status === "string" &&
    typeof job.notes === "string" &&
    ALL_STATUSES.includes(job.status) &&
    (job.jobUrl === undefined ||
      typeof job.jobUrl === "string") &&
    (job.createdAt === undefined ||
      typeof job.createdAt === "string")
  );
}

/* =====================================
   READ LOCAL STORAGE
===================================== */

function readJobs() {
  try {
    const saved = localStorage.getItem(KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid saved data");
    }

    if (!parsed.every(validJob)) {
      throw new Error("Invalid application records");
    }

    return parsed;

  } catch (error) {
    console.error("JobTrack read error:", error);

    alert(
      "Unable to read saved applications. " +
      "Please do not overwrite your existing " +
      "browser data before making a backup."
    );

    return null;
  }
}

/* =====================================
   WRITE LOCAL STORAGE
===================================== */

function writeJobs(data) {
  try {
    if (
      !Array.isArray(data) ||
      !data.every(validJob)
    ) {
      throw new Error("Invalid application data");
    }

    localStorage.setItem(
      KEY,
      JSON.stringify(data)
    );

    return true;

  } catch (error) {
    console.error("JobTrack save error:", error);

    alert(
      "Unable to save applications. " +
      "Please check your browser storage."
    );

    return false;
  }
}

/* =====================================
   GENERATE UNIQUE ID
===================================== */

function createJobId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2)
  );
}

/* =====================================
   VALIDATE BACKUP
===================================== */

function validateBackup(data) {
  if (
    !data ||
    data.app !== "JobTrack" ||
    ![1, 2, 3].includes(data.version) ||
    !Array.isArray(data.applications)
  ) {
    return false;
  }

  if (!data.applications.every(validJob)) {
    return false;
  }

  const ids = data.applications.map(job => job.id);

  return new Set(ids).size === ids.length;
}
