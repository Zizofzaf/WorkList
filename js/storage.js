'use strict';
    const KEY = 'jobtrack_v1_applications';

    function validJob(j) {
      return j && typeof j.id === 'string' && typeof j.company === 'string' && typeof j.position === 'string' &&
        typeof j.applied === 'string' && typeof j.platform === 'string' && typeof j.status === 'string' && typeof j.notes === 'string' &&
        ['Pending','Assessment','Interview','Offer'].includes(j.status);
    }
    function readJobs() {
      try {
        const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(raw) ? raw.filter(validJob) : [];
      } catch { return []; }
    }

