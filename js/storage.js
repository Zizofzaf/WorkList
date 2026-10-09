
"use strict";

// Keep the existing key to preserve V1 data.
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
  if (!job || typeof job !== "object") {
    return false;
  }

  return (
    typeof job.id === "string" &&
    typeof job.company === "string" &&
    typeof job.position === "string" &&
    typeof job.applied === "string" &&
    typeof job.platform === "string" &&
    typeof job.status === "string" &&
    typeof job.notes === "string" &&
    ALL_STATUSES.includes(job.status)
  );
}

function readJobs() {
  try {
    const stored = localStorage.getItem(KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(validJob);

  } catch (error) {
    console.error("Unable to load applications:", error);
    return [];
  }
}

function writeJobs(applications) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(applications)
    );

    return true;

  } catch (error) {
    console.error("Unable to save applications:", error);

    alert(
      "Unable to save your application. " +
      "Please check your browser storage."
    );

    return false;
  }
}

function createJobId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2)
  );
}

function validateBackup(data) {
  if (!data || data.app !== "JobTrack") {
    return false;
  }

  // Support old V1 backups and new V2 backups.
  if (![1, 2].includes(data.version)) {
    return false;
  }

  if (!Array.isArray(data.applications)) {
    return false;
  }

  if (!data.applications.every(validJob)) {
    return false;
  }

  const ids = data.applications.map(job => job.id);

  return new Set(ids).size === ids.length;
}
