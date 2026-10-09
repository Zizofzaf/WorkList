
"use strict";

/* ================================
   JOBTRACK V2 — STORAGE
================================ */

// Keep the old key so existing data survives.
const KEY = "jobtrack_v1_applications";

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
  ...ACTIVE_STATUSES,
  ...HISTORY_STATUSES
];

function isHistoryStatus(status) {
  return HISTORY_STATUSES.includes(status);
}

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
    ALL_STATUSES.includes(job.status)
  );
}

/* READ DATA */

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
      "Do not restore or add new data until " +
      "you have checked your browser storage."
    );

    return null;
  }
}

/* SAVE DATA */

function writeJobs(data) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(data)
    );

    return true;

  } catch (error) {
    console.error("JobTrack save error:", error);

    alert(
      "Unable to save changes. " +
      "Please check your browser storage."
    );

    return false;
  }
}

/* CREATE UNIQUE ID */

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

/* VALIDATE BACKUP */

function validateBackup(data) {
  if (
    !data ||
    data.app !== "JobTrack" ||
    ![1, 2].includes(data.version) ||
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
