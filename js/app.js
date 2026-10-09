    'use strict';
    const $ = id => document.getElementById(id);
    let jobs = readJobs();
    let editingId = null;
    let pendingAction = null;
    function persist(next) {
      try { localStorage.setItem(KEY, JSON.stringify(next)); jobs = next; render(); return true; }
      catch { alert('Could not save. Check browser storage settings or available space.'); return false; }
    }
    function formatDate(date) {
      if (!date) return 'Date not set';
      const parts = date.split('-').map(Number);
      if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return date;
      return new Date(Date.UTC(parts[0],parts[1]-1,parts[2])).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
    }
    function textNode(tag, cls, value) {
      const el = document.createElement(tag); if (cls) el.className=cls; el.textContent=value; return el;
    }
    function render() {
      const q = $('search').value.trim().toLowerCase();
      const visible = jobs.filter(j => (j.company+' '+j.position+' '+j.platform).toLowerCase().includes(q));
      $('count').textContent = jobs.length;
      const list = $('list'); list.replaceChildren();
      if (!visible.length) {
        const empty = textNode('div','empty','');
        empty.append(textNode('div','empty-icon','✧'),textNode('strong','',jobs.length?'No matching applications.':'All caught up.'),textNode('p','',jobs.length?'Try another search.':'Add your first job application to get started.'));
        list.append(empty); return;
      }
      for (const job of visible) {
        const btn = textNode('button','job',''); btn.type='button'; btn.setAttribute('aria-label','Edit '+job.company+' application');
        const left=textNode('div','','');
        left.append(textNode('span','company',job.company),textNode('span','role',job.position),textNode('span','meta',job.platform+' · '+formatDate(job.applied)));
        const right=textNode('div','job-end','');
        const badge=textNode('span','status '+job.status.toLowerCase(),job.status);
        right.append(badge,textNode('span','arrow','›'));
        btn.append(left,right); btn.addEventListener('click',()=>openEditor(job)); list.append(btn);
      }
    }
    function openEditor(job=null) {
      editingId=job?job.id:null;
      $('modalTitle').textContent=job?'Edit application':'New application';
      $('company').value=job?.company||''; $('position').value=job?.position||'';
      $('applied').value=job?.applied||new Date().toLocaleDateString('en-CA');
      $('platform').value=job?.platform||'JobStreet'; $('status').value=job?.status||'Pending'; $('notes').value=job?.notes||'';
      $('editorOverlay').classList.remove('hidden'); $('company').focus();
    }
    function closeEditor() { $('editorOverlay').classList.add('hidden'); }
    function closeConfirm() { $('confirmOverlay').classList.add('hidden'); pendingAction=null; }
    function requestDelete(action, reason) {
      pendingAction=action;
      $('confirmText').textContent=reason;
      $('confirmOverlay').classList.remove('hidden'); $('cancelDelete').focus();
    }
    $('jobForm').addEventListener('submit',e=>{
      e.preventDefault();
      const data={
        id:editingId|| (crypto.randomUUID?.() || String(Date.now())+'-'+Math.random()),
        company:$('company').value.trim(),position:$('position').value.trim(),applied:$('applied').value,
        platform:$('platform').value,status:$('status').value,notes:$('notes').value.trim()
      };
      if (!data.company||!data.position) return;
      if (['Rejected','Job Closed'].includes(data.status)) {
        requestDelete(()=>{ if (editingId && persist(jobs.filter(j=>j.id!==editingId))) closeEditor(); else if (!editingId) closeEditor(); },
          `${data.company} — ${data.position} is marked ${data.status}. Delete it permanently?`);
        return;
      }
      const next=editingId?jobs.map(j=>j.id===editingId?data:j):[...jobs,data];
      if(persist(next)) closeEditor();
    });
    $('addBtn').addEventListener('click',()=>openEditor());
    document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',closeEditor));
    $('editorOverlay').addEventListener('click',e=>{if(e.target===$('editorOverlay'))closeEditor();});
    $('cancelDelete').addEventListener('click',closeConfirm);
    $('confirmDelete').addEventListener('click',()=>{ const act=pendingAction; closeConfirm(); if(act)act(); });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('confirmOverlay').classList.contains('hidden'))closeConfirm();else closeEditor();}});
    $('search').addEventListener('input',render);
    $('backupBtn').addEventListener('click',()=>{
      const blob=new Blob([JSON.stringify({app:'JobTrack',version:1,applications:jobs},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;
      a.download='jobtrack-backup-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    $('restoreBtn').addEventListener('click',()=>{ $('restoreFile').value=''; $('restoreFile').click(); });
    $('restoreFile').addEventListener('change',async e=>{
      const file=e.target.files?.[0]; if(!file)return;
      try {
        const raw=JSON.parse(await file.text());
        if(raw.app!=='JobTrack'||raw.version!==1||!Array.isArray(raw.applications)||!raw.applications.every(validJob)||new Set(raw.applications.map(j=>j.id)).size!==raw.applications.length)throw Error('Invalid JobTrack backup');
        if(confirm(`Restore ${raw.applications.length} applications? This will REPLACE your current ${jobs.length} applications.`))persist(raw.applications);
      } catch { alert('Invalid backup file. Please choose a JobTrack JSON backup.'); }
    });
    render();
