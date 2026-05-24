// ============================================================
//  CRMS — Criminal Record Management System
//  Frontend JS | Muhammad Sarmad | NUTech CS160 | AI-25 B
// ============================================================
const API = '';
const $ = id => document.getElementById(id);

// ── Page meta ──
const pageMeta = {
  dashboard       : { title:'Dashboard',               sub:'Overview of criminal records & case activity' },
  search          : { title:'Search Criminal Records',  sub:'Lookup by CNIC or full name' },
  wanted          : { title:'Most Wanted List',          sub:'Active wanted persons ranked by case count' },
  stats           : { title:'Monthly Crime Statistics',  sub:'Aggregated case analytics' },
  officers        : { title:'Officer Performance Report',sub:'Cases handled & arrest records per officer' },
  cases           : { title:'Case Management',           sub:'Filter, track, edit & delete cases' },
  'criminals-list': { title:'All Criminals',             sub:'View, edit & delete criminal records' },
};

let chartInstances = {};
let updateCaseId   = null;
let deleteTarget   = { type: null, id: null, name: null };
let editMode       = false;

// ── Clock ──
function updateClock() {
  $('clock').textContent =
    new Date().toLocaleDateString('en-PK',{weekday:'short',day:'2-digit',month:'short'}) + '  ' +
    new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'});
}
setInterval(updateClock, 1000); updateClock();

// ── Badge ──
function badge(val) {
  const map = {
    'Wanted':'badge-wanted','Arrested':'badge-arrested','Released':'badge-released',
    'Open':'badge-open','Under Investigation':'badge-investigation','Closed':'badge-closed',
    'Severe':'badge-severe','Moderate':'badge-moderate','Minor':'badge-minor',
  };
  return `<span class="badge ${map[val]||'badge-primary'}"><span class="dot"></span>${val}</span>`;
}

// ── Toast ──
function toast(msg, type='') {
  const t = $('toast');
  t.className = `toast ${type==='error'?'toast-error':type==='success'?'toast-success':''}`;
  const icon = type==='error'?'✕':type==='success'?'✓':'ℹ';
  t.innerHTML = `<span style="font-size:15px">${icon}</span> ${msg}`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Modal ──
function openModal(id)  { $(id).classList.add('show'); }
function closeModal(id) { $(id).classList.remove('show'); }

// ── Spinner ──
const spinner = () => `<div class="spinner-wrap"><div class="spinner"></div></div>`;
const emptyState = (icon,title,text) => `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${text}</p></div>`;

// ── API wrapper ──
async function apiFetch(url, opts = {}) {
  const res  = await fetch(API + url, { headers:{'Content-Type':'application/json'}, ...opts });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'API Error');
  return data.data;
}

// ── Navigation ──
function showView(id, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  $('view-'+id).classList.add('active');
  if (btn) btn.classList.add('active');
  const m = pageMeta[id];
  if (m) { $('page-title').textContent = m.title; $('page-sub').textContent = m.sub; }
  if (id === 'dashboard')      loadDashboard();
  if (id === 'wanted')         loadWanted();
  if (id === 'stats')          setTimeout(loadStats, 60);
  if (id === 'officers')       loadOfficers();
  if (id === 'cases')          loadCases();
  if (id === 'criminals-list') loadAllCriminals();
}

// ════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════
async function loadDashboard() {
  try {
    const d = await apiFetch('/api/reports/dashboard');
    $('kpi-criminals').textContent = d.total_criminals;
    $('kpi-wanted').textContent    = d.wanted;
    $('kpi-open').textContent      = d.open_cases;
    $('kpi-closed').textContent    = d.closed_cases;
    $('nav-badge-wanted').textContent    = d.wanted;
    $('nav-badge-open').textContent      = d.open_cases;
    $('nav-badge-criminals').textContent = d.total_criminals;
  } catch(e) { console.warn(e.message); }

  try {
    const cases = await apiFetch('/api/cases');
    $('dash-cases-tbody').innerHTML = cases.slice(0,8).map(c => `
      <tr>
        <td><span class="mono-blue">C-${String(c.case_id).padStart(3,'0')}</span></td>
        <td style="max-width:200px"><div class="fw-600 fs-13">${c.case_title}</div></td>
        <td><span class="fs-12 text-muted">${c.crime_name}</span></td>
        <td>${badge(c.status)}</td>
      </tr>`).join('');
  } catch(e) { $('dash-cases-tbody').innerHTML = `<tr><td colspan="4" class="text-muted" style="padding:16px">Unable to load.</td></tr>`; }

  try {
    const ct = await apiFetch('/api/reports/crime-types');
    const max = Math.max(...ct.map(x=>x.total_cases), 1);
    const colors = ['#2563eb','#b91c1c','#7c3aed','#b45309','#0891b2','#059669'];
    $('dash-crime-bars').innerHTML = ct.map((x,i) => `
      <div style="margin-bottom:13px">
        <div class="flex-between" style="margin-bottom:4px">
          <span class="fs-12 fw-600">${x.crime_name}</span>
          <span class="fs-12 text-muted">${x.total_cases} cases</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${(x.total_cases/max*100).toFixed(0)}%;background:${colors[i%colors.length]}"></div></div>
      </div>`).join('');
  } catch(e) {}

  try {
    const sm = await apiFetch('/api/cases/summary/status');
    const sc = { Open:'#b45309','Under Investigation':'#1d4ed8',Closed:'#15803d' };
    $('dash-status').innerHTML = sm.map(s => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:10px;height:10px;border-radius:50%;background:${sc[s.status]||'#64748b'}"></div>
          <span class="fs-13 fw-600">${s.status}</span>
        </div>
        <span style="font-size:18px;font-weight:700;color:${sc[s.status]||'#64748b'}">${s.total}</span>
      </div>`).join('');
  } catch(e) {}
}

// ════════════════════════════════════════
//  SEARCH
// ════════════════════════════════════════
async function performSearch() {
  const q = $('search-input').value.trim();
  const type = $('search-type').value;
  const div  = $('search-results');
  if (!q) { div.innerHTML = emptyState('🔍','Search Criminal Records','Enter a CNIC number or full name.'); return; }
  div.innerHTML = spinner();
  try {
    let data;
    if (type === 'cnic')       data = [await apiFetch(`/api/criminals/cnic/${encodeURIComponent(q)}`)];
    else if (type === 'name')  data = await apiFetch(`/api/criminals/search/${encodeURIComponent(q)}`);
    else {
      try { data = [await apiFetch(`/api/criminals/cnic/${encodeURIComponent(q)}`)]; }
      catch { data = await apiFetch(`/api/criminals/search/${encodeURIComponent(q)}`); }
    }
    if (!data || !data.length) { div.innerHTML = emptyState('❌','No Records Found',`Nothing matched "<strong>${q}</strong>".`); return; }

    const cards = await Promise.all(data.map(async c => {
      let cases = [];
      try { const det = await apiFetch(`/api/criminals/${c.criminal_id}`); cases = det.cases||[]; } catch {}
      const ini = c.full_name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
      return `<div class="card mb-16">
        <div class="criminal-profile">
          <div class="profile-avatar">${ini}</div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <h3 style="font-size:16px;font-weight:700">${c.full_name}</h3>${badge(c.status)}
            </div>
            <div class="profile-meta">
              <span class="meta-pill">🪪 ${c.cnic}</span>
              <span class="meta-pill">📁 ${c.total_cases||0} Cases</span>
              ${c.phone?`<span class="meta-pill">📞 ${c.phone}</span>`:''}
              ${c.address?`<span class="meta-pill">📍 ${c.address}</span>`:''}
            </div>
            <div style="margin-top:12px;display:flex;gap:8px">
              <button class="btn btn-edit btn-xs" onclick="openEditCriminalModal(${c.criminal_id})">✏️ Edit</button>
              <button class="btn btn-danger btn-xs" onclick="askDeleteCriminal(${c.criminal_id},'${c.full_name.replace(/'/g,"\\'")}')">🗑 Delete</button>
            </div>
            ${cases.length?`<div class="detail-section"><div class="detail-section-title">Related Cases</div>
              <div class="table-wrap"><table><thead><tr><th>Case ID</th><th>Title</th><th>Crime</th><th>Status</th></tr></thead>
              <tbody>${cases.map(r=>`<tr>
                <td><span class="mono-blue">C-${String(r.case_id).padStart(3,'0')}</span></td>
                <td>${r.case_title}</td><td>${r.crime_name}</td><td>${badge(r.status)}</td>
              </tr>`).join('')}</tbody></table></div></div>`:''}
          </div>
        </div>
      </div>`;
    }));
    div.innerHTML = cards.join('');
  } catch(e) { div.innerHTML = emptyState('❌','Not Found', e.message); }
}

function clearSearch() {
  $('search-input').value = '';
  $('search-results').innerHTML = emptyState('🔍','Search Criminal Records','Enter a CNIC number or full name.');
}

// ════════════════════════════════════════
//  ALL CRIMINALS LIST
// ════════════════════════════════════════
async function loadAllCriminals() {
  const tbody = $('criminals-list-tbody');
  tbody.innerHTML = `<tr><td colspan="8">${spinner()}</td></tr>`;
  try {
    const data = await apiFetch('/api/criminals');
    $('nav-badge-criminals').textContent = data.length;
    tbody.innerHTML = data.map(c => {
      const ini = c.full_name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
      return `<tr>
        <td><span class="mono-blue">#${c.criminal_id}</span></td>
        <td><div style="display:flex;align-items:center;gap:9px">
          <div style="width:32px;height:32px;border-radius:8px;background:var(--sky);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--blue)">${ini}</div>
          <div class="fw-600 fs-13">${c.full_name}</div>
        </div></td>
        <td><span class="mono">${c.cnic}</span></td>
        <td>${c.gender||'—'}</td>
        <td><span class="fs-12 text-muted">${c.phone||'—'}</span></td>
        <td>${badge(c.status)}</td>
        <td><span class="fw-600" style="color:var(--blue)">${c.total_cases||0}</span></td>
        <td><div class="action-group">
          <button class="btn btn-edit btn-xs" onclick="openEditCriminalModal(${c.criminal_id})">✏️ Edit</button>
          <button class="btn btn-danger btn-xs" onclick="askDeleteCriminal(${c.criminal_id},'${c.full_name.replace(/'/g,"\\'")}')">🗑 Delete</button>
        </div></td>
      </tr>`;
    }).join('');
    if (!data.length) tbody.innerHTML = `<tr><td colspan="8">${emptyState('👤','No Criminals','No criminal records found.')}</td></tr>`;
  } catch(e) { tbody.innerHTML = `<tr><td colspan="8" style="padding:16px;color:var(--danger)">${e.message}</td></tr>`; }
}

// ════════════════════════════════════════
//  MOST WANTED
// ════════════════════════════════════════
async function loadWanted() {
  const tbody = $('wanted-tbody');
  tbody.innerHTML = `<tr><td colspan="7">${spinner()}</td></tr>`;
  try {
    const data = await apiFetch('/api/criminals/wanted');
    const rc = ['gold','silver','bronze'];
    tbody.innerHTML = data.map((c,i) => {
      const ini = c.full_name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
      return `<tr>
        <td><div class="rank-num ${rc[i]||''}">${i+1}</div></td>
        <td><div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:8px;background:var(--sky);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--blue)">${ini}</div>
          <div><div class="fw-600 fs-13">${c.full_name}</div><div class="mono">${c.cnic}</div></div>
        </div></td>
        <td><span class="mono">${c.cnic}</span></td>
        <td><span class="fw-600" style="color:var(--blue)">${c.total_cases}</span></td>
        <td>${badge(c.status)}</td>
        <td style="max-width:160px;font-size:12px;color:var(--muted)">${c.address||'—'}</td>
        <td><div class="action-group">
          <button class="btn btn-success btn-xs" onclick="updateCriminalStatus(${c.criminal_id},'Arrested')">✓ Arrested</button>
          <button class="btn btn-edit btn-xs" onclick="openEditCriminalModal(${c.criminal_id})">✏️ Edit</button>
          <button class="btn btn-danger btn-xs" onclick="askDeleteCriminal(${c.criminal_id},'${c.full_name.replace(/'/g,"\\'")}')">🗑</button>
        </div></td>
      </tr>`;
    }).join('');
    if (!data.length) tbody.innerHTML = `<tr><td colspan="7">${emptyState('✅','No Wanted Criminals','All apprehended!')}</td></tr>`;
  } catch(e) { tbody.innerHTML = `<tr><td colspan="7" style="padding:16px;color:var(--danger)">${e.message}</td></tr>`; }
}

// ════════════════════════════════════════
//  ADD / EDIT CRIMINAL
// ════════════════════════════════════════
function openAddCriminalModal() {
  editMode = false;
  $('edit-criminal-id').value = '';
  $('modal-criminal-title').textContent = 'Register New Criminal';
  $('btn-save-criminal').textContent = 'Register Criminal';
  ['new-name','new-cnic','new-phone','new-address'].forEach(id => $(id).value = '');
  $('new-dob').value = ''; $('new-gender').value = 'Male'; $('new-status').value = 'Wanted';
  loadCrimeTypesDropdown();
  openModal('modal-criminal');
}

async function openEditCriminalModal(id) {
  editMode = true;
  $('edit-criminal-id').value = id;
  $('modal-criminal-title').textContent = 'Edit Criminal Record';
  $('btn-save-criminal').textContent = 'Save Changes';
  openModal('modal-criminal');
  try {
    const det = await apiFetch(`/api/criminals/${id}`);
    const c = det.criminal;
    $('new-name').value    = c.full_name || '';
    $('new-cnic').value    = c.cnic || '';
    $('new-dob').value     = c.date_of_birth ? c.date_of_birth.substring(0,10) : '';
    $('new-gender').value  = c.gender || 'Male';
    $('new-phone').value   = c.phone || '';
    $('new-status').value  = c.status || 'Wanted';
    $('new-address').value = c.address || '';
  } catch(e) { toast(e.message,'error'); }
}

async function saveCriminal() {
  const full_name = $('new-name').value.trim();
  const cnic      = $('new-cnic').value.trim();
  if (!full_name || !cnic) { toast('Full name and CNIC required','error'); return; }
  if (!/^\d{13}$/.test(cnic)) { toast('CNIC must be 13 digits','error'); return; }

  const body = {
    full_name, cnic,
    date_of_birth: $('new-dob').value || null,
    gender:  $('new-gender').value,
    phone:   $('new-phone').value.trim() || null,
    status:  $('new-status').value,
    address: $('new-address').value.trim() || null,
  };

  const btn = $('btn-save-criminal');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const id = $('edit-criminal-id').value;
    if (editMode && id) {
      await apiFetch(`/api/criminals/${id}`, { method:'PUT', body:JSON.stringify(body) });
      toast(`${full_name} updated successfully`, 'success');
    } else {
      await apiFetch('/api/criminals', { method:'POST', body:JSON.stringify(body) });
      toast(`${full_name} registered successfully`, 'success');
    }
    closeModal('modal-criminal');
    loadDashboard(); loadAllCriminals();
    if ($('view-wanted').classList.contains('active')) loadWanted();
  } catch(e) { toast(e.message,'error'); }
  finally { btn.disabled=false; btn.textContent = editMode ? 'Save Changes' : 'Register Criminal'; }
}

async function updateCriminalStatus(id, status) {
  try {
    await apiFetch(`/api/criminals/${id}/status`, { method:'PUT', body:JSON.stringify({status}) });
    toast(`Status updated to ${status}`, 'success');
    loadWanted(); loadDashboard(); loadAllCriminals();
  } catch(e) { toast(e.message,'error'); }
}

// ── Delete Criminal ──
function askDeleteCriminal(id, name) {
  deleteTarget = { type:'criminal', id, name };
  $('delete-item-name').textContent = `Criminal: ${name}`;
  openModal('modal-delete');
}

// ════════════════════════════════════════
//  ADD / EDIT CASE
// ════════════════════════════════════════
function openAddCaseModal() {
  editMode = false;
  $('edit-case-id').value = '';
  $('modal-case-title').textContent = 'File New Case (FIR)';
  $('btn-save-case').textContent = 'File Case';
  $('nc-title').value = ''; $('nc-desc').value = '';
  $('nc-date').value = new Date().toISOString().split('T')[0];
  $('nc-status').value = 'Open';
  Promise.all([loadCrimeTypesDropdown(), loadLocationsDropdown(), loadSeverityDropdown()]);
  openModal('modal-case');
}

async function openEditCaseModal(id) {
  editMode = true;
  $('edit-case-id').value = id;
  $('modal-case-title').textContent = 'Edit Case Record';
  $('btn-save-case').textContent = 'Save Changes';
  await Promise.all([loadCrimeTypesDropdown(), loadLocationsDropdown(), loadSeverityDropdown()]);
  openModal('modal-case');
  try {
    const det = await apiFetch(`/api/cases/${id}`);
    const c = det.caseRow;
    $('nc-title').value  = c.case_title || '';
    $('nc-desc').value   = c.description || '';
    $('nc-date').value   = c.case_date ? c.case_date.substring(0,10) : '';
    $('nc-status').value = c.status || 'Open';
    // set dropdowns after they load
    setTimeout(() => {
      if (c.crime_type_id) $('nc-crime').value    = c.crime_type_id;
      if (c.severity_id)   $('nc-severity').value = c.severity_id;
      if (c.location_id)   $('nc-location').value = c.location_id;
    }, 300);
  } catch(e) { toast(e.message,'error'); }
}

async function saveCase() {
  const case_title    = $('nc-title').value.trim();
  const crime_type_id = $('nc-crime').value;
  const severity_id   = $('nc-severity').value;
  const location_id   = $('nc-location').value;
  const status        = $('nc-status').value;
  const case_date     = $('nc-date').value || new Date().toISOString().split('T')[0];
  const description   = $('nc-desc').value.trim() || null;

  if (!case_title) { toast('Case title is required','error'); return; }

  const btn = $('btn-save-case');
  btn.disabled=true; btn.textContent='Saving…';
  try {
    const id = $('edit-case-id').value;
    if (editMode && id) {
      await apiFetch(`/api/cases/${id}`, { method:'PUT', body:JSON.stringify({case_title,crime_type_id,severity_id,location_id,status,case_date,description}) });
      toast('Case updated successfully', 'success');
    } else {
      const res = await apiFetch('/api/cases', { method:'POST', body:JSON.stringify({case_title,crime_type_id,severity_id,location_id,status,case_date,description}) });
      toast(`Case C-${String(res.case_id).padStart(3,'0')} filed`, 'success');
    }
    closeModal('modal-case');
    loadCases(); loadDashboard();
  } catch(e) { toast(e.message,'error'); }
  finally { btn.disabled=false; btn.textContent = editMode?'Save Changes':'File Case'; }
}

// ── Delete Case ──
function askDeleteCase(id, title) {
  deleteTarget = { type:'case', id, name:title };
  $('delete-item-name').textContent = `Case: ${title}`;
  openModal('modal-delete');
}

// ── Confirm Delete ──
async function confirmDelete() {
  const btn = $('btn-confirm-delete');
  btn.disabled=true; btn.textContent='Deleting…';
  try {
    if (deleteTarget.type === 'criminal') {
      await apiFetch(`/api/criminals/${deleteTarget.id}`, { method:'DELETE' });
      toast(`Criminal "${deleteTarget.name}" deleted`, 'success');
      loadAllCriminals(); loadWanted(); loadDashboard();
      if ($('search-results').innerHTML.includes(deleteTarget.name)) clearSearch();
    } else if (deleteTarget.type === 'case') {
      await apiFetch(`/api/cases/${deleteTarget.id}`, { method:'DELETE' });
      toast(`Case deleted successfully`, 'success');
      loadCases(); loadDashboard();
    }
    closeModal('modal-delete');
  } catch(e) { toast(e.message,'error'); }
  finally { btn.disabled=false; btn.textContent='Yes, Delete Permanently'; }
}

// ════════════════════════════════════════
//  CASE MANAGEMENT
// ════════════════════════════════════════
let currentCaseFilter = '';

async function loadCases(statusFilter) {
  if (statusFilter !== undefined) currentCaseFilter = statusFilter;
  const tbody = $('cases-tbody');
  tbody.innerHTML = `<tr><td colspan="8">${spinner()}</td></tr>`;
  try {
    const url = currentCaseFilter ? `/api/cases?status=${encodeURIComponent(currentCaseFilter)}` : '/api/cases';
    const data = await apiFetch(url);
    $('cases-count-label').textContent = `Showing ${data.length} record${data.length!==1?'s':''}`;
    $('nav-badge-open').textContent = data.filter(c=>c.status==='Open').length;
    if (!data.length) { tbody.innerHTML = `<tr><td colspan="8">${emptyState('📂','No Cases Found','No cases match the filter.')}</td></tr>`; return; }
    tbody.innerHTML = data.map(c => `<tr>
      <td><span class="mono-blue">C-${String(c.case_id).padStart(3,'0')}</span></td>
      <td style="max-width:200px"><div class="fw-600 fs-13">${c.case_title}</div></td>
      <td>${c.crime_name}</td>
      <td><span class="fs-12 text-muted">📍 ${c.area_name}</span></td>
      <td>${badge(c.severity_level)}</td>
      <td>${badge(c.status)}</td>
      <td><span class="mono">${c.case_date?c.case_date.substring(0,10):'—'}</span></td>
      <td><div class="action-group">
        <button class="btn btn-secondary btn-xs" onclick="viewCaseDetail(${c.case_id})">👁 View</button>
        <button class="btn btn-edit btn-xs" onclick="openEditCaseModal(${c.case_id})">✏️ Edit</button>
        <button class="btn btn-warning btn-xs" onclick="openStatusModal(${c.case_id},'${c.case_title.replace(/'/g,"\\'")}','${c.status}')">🔄</button>
        <button class="btn btn-danger btn-xs" onclick="askDeleteCase(${c.case_id},'${c.case_title.replace(/'/g,"\\'")}')">🗑</button>
      </div></td>
    </tr>`).join('');
  } catch(e) { tbody.innerHTML = `<tr><td colspan="8" style="padding:16px;color:var(--danger)">${e.message}</td></tr>`; }
}

function filterCasesBtn(status, btn) {
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  loadCases(status);
}

function openStatusModal(caseId, title, currentStatus) {
  updateCaseId = caseId;
  $('update-case-title').textContent = title;
  $('update-status-select').value    = currentStatus;
  openModal('modal-status');
}

async function confirmStatusUpdate() {
  const status = $('update-status-select').value;
  try {
    await apiFetch(`/api/cases/${updateCaseId}/status`, { method:'PUT', body:JSON.stringify({status}) });
    toast(`Case updated to "${status}"`, 'success');
    closeModal('modal-status'); loadCases(); loadDashboard();
  } catch(e) { toast(e.message,'error'); }
}

async function viewCaseDetail(caseId) {
  $('case-detail-body').innerHTML = spinner();
  openModal('modal-case-detail');
  try {
    const d = await apiFetch(`/api/cases/${caseId}`);
    const c = d.caseRow;
    $('case-detail-body').innerHTML = `
      <div style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px">
          <span class="mono-blue" style="font-size:14px">C-${String(c.case_id).padStart(3,'0')}</span>
          ${badge(c.status)} ${badge(c.severity_level)}
        </div>
        <h3 style="font-size:16px;font-weight:700;margin-bottom:6px">${c.case_title}</h3>
        <p class="fs-13 text-muted" style="line-height:1.6">${c.description||'No description.'}</p>
        <div class="profile-meta" style="margin-top:10px">
          <span class="meta-pill">⚖️ ${c.crime_name}</span>
          <span class="meta-pill">📍 ${c.area_name}, ${c.district}</span>
          <span class="meta-pill">📅 ${c.case_date?c.case_date.substring(0,10):'—'}</span>
        </div>
      </div>
      ${d.criminals.length?`<div class="detail-section"><div class="detail-section-title">Suspects (${d.criminals.length})</div>
        <div class="table-wrap"><table><thead><tr><th>Name</th><th>CNIC</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>${d.criminals.map(cr=>`<tr><td class="fw-600">${cr.full_name}</td><td><span class="mono">${cr.cnic}</span></td><td>${cr.role}</td><td>${badge(cr.status)}</td></tr>`).join('')}
        </tbody></table></div></div>`:''}
      ${d.officers.length?`<div class="detail-section"><div class="detail-section-title">Assigned Officers</div>
        <div class="table-wrap"><table><thead><tr><th>Officer</th><th>Badge</th><th>Rank</th><th>Role</th></tr></thead>
        <tbody>${d.officers.map(o=>`<tr><td class="fw-600">${o.full_name}</td><td><span class="mono">${o.badge_number}</span></td><td>${o.rank||o['rank']||'—'}</td><td>${o.role}</td></tr>`).join('')}
        </tbody></table></div></div>`:''}
      ${d.victims.length?`<div class="detail-section"><div class="detail-section-title">Victims (${d.victims.length})</div>
        ${d.victims.map(v=>`<div style="padding:8px 0;border-bottom:1px solid #f1f5f9"><span class="fw-600 fs-13">${v.full_name}</span>${v.injury_detail?`<p class="fs-12 text-muted" style="margin-top:3px">${v.injury_detail}</p>`:''}</div>`).join('')}
      </div>`:''}
      ${d.evidence.length?`<div class="detail-section"><div class="detail-section-title">Evidence (${d.evidence.length})</div>
        ${d.evidence.map(e=>`<div style="padding:8px 0;border-bottom:1px solid #f1f5f9"><span class="fw-600 fs-13">${e.evidence_type}</span><p class="fs-12 text-muted">${e.description||''}</p></div>`).join('')}
      </div>`:''}
      ${d.firs.length?`<div class="detail-section"><div class="detail-section-title">FIR / Complaint</div>
        ${d.firs.map(f=>`<div style="padding:8px 0"><div class="flex-between" style="margin-bottom:4px"><span class="fw-600 fs-13">Complainant: ${f.complainant_name}</span><span class="mono">${f.station_name}</span></div><p class="fs-12 text-muted">${f.fir_text||''}</p></div>`).join('')}
      </div>`:''}
      ${d.court.length?`<div class="detail-section"><div class="detail-section-title">Court Status</div>
        ${d.court.map(ct=>`<div style="padding:8px 0"><div class="fw-600 fs-13">${ct.court_name}</div><div class="fs-12 text-muted">Judge: ${ct.judge_name||'—'} | ${ct.court_status}</div>${ct.verdict?`<div class="fs-12 fw-600 text-blue" style="margin-top:3px">Verdict: ${ct.verdict}</div>`:''}</div>`).join('')}
      </div>`:''}`;
  } catch(e) { $('case-detail-body').innerHTML = `<div class="text-danger" style="padding:16px">${e.message}</div>`; }
}

// ════════════════════════════════════════
//  STATS
// ════════════════════════════════════════
async function loadStats() {
  try {
    const [monthly, crimeTypes] = await Promise.all([
      apiFetch('/api/reports/monthly'),
      apiFetch('/api/reports/crime-types'),
    ]);
    const labels = monthly.map(r => r.month_name.substring(0,3)+' '+r.year);
    const counts = monthly.map(r => r.cases_filed);
    renderMonthlyChart(labels, counts, $('chart-type-select').value||'bar');
    renderCrimeTypeChart(crimeTypes.map(x=>x.crime_name), crimeTypes.map(x=>x.total_cases));
    const qData=[0,0,0,0];
    monthly.forEach(r=>{ qData[Math.floor((parseInt(r.month)-1)/3)]+=parseInt(r.cases_filed); });
    renderQuarterChart(qData);
  } catch(e) { toast(e.message,'error'); }
}

function renderMonthlyChart(labels, counts, type) {
  if (chartInstances.monthly) chartInstances.monthly.destroy();
  const ctx = document.getElementById('monthlyChart'); if(!ctx)return;
  chartInstances.monthly = new Chart(ctx, {
    type, data:{ labels, datasets:[{ label:'Cases Filed', data:counts,
      backgroundColor:type==='line'?'rgba(37,99,235,0.12)':'rgba(37,99,235,0.75)',
      borderColor:'#2563eb',borderWidth:2,borderRadius:type==='line'?0:6,fill:type==='line',tension:0.4,
      pointBackgroundColor:'#2563eb',pointRadius:type==='line'?4:0 }] },
    options:{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
              scales:{x:{grid:{color:'#f1f5f9'}},y:{grid:{color:'#f1f5f9'},beginAtZero:true}} }
  });
}
function renderCrimeTypeChart(labels, data) {
  if (chartInstances.crimeType) chartInstances.crimeType.destroy();
  const ctx = document.getElementById('crimeTypeChart'); if(!ctx)return;
  chartInstances.crimeType = new Chart(ctx, {
    type:'doughnut', data:{ labels, datasets:[{ data, backgroundColor:['#2563eb','#b91c1c','#7c3aed','#b45309','#0891b2','#059669'],borderWidth:0,hoverOffset:5 }] },
    options:{ responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{boxWidth:10,font:{size:11}}}} }
  });
}
function renderQuarterChart(qData) {
  if (chartInstances.quarter) chartInstances.quarter.destroy();
  const ctx = document.getElementById('quarterChart'); if(!ctx)return;
  chartInstances.quarter = new Chart(ctx, {
    type:'bar', data:{ labels:['Q1 (Jan–Mar)','Q2 (Apr–Jun)','Q3 (Jul–Sep)','Q4 (Oct–Dec)'],
      datasets:[{ data:qData, backgroundColor:['rgba(37,99,235,0.75)','rgba(5,150,105,0.75)','rgba(124,58,237,0.75)','rgba(185,28,28,0.75)'],borderRadius:6 }] },
    options:{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
              scales:{x:{grid:{color:'#f1f5f9'}},y:{grid:{color:'#f1f5f9'},beginAtZero:true}} }
  });
}
function changeChartType() { loadStats(); }

// ════════════════════════════════════════
//  OFFICERS
// ════════════════════════════════════════
async function loadOfficers() {
  const tbody = $('officers-tbody');
  tbody.innerHTML = `<tr><td colspan="7">${spinner()}</td></tr>`;
  try {
    let data = await apiFetch('/api/reports/officers');
    const fs = $('officer-station-filter').value;
    if (fs) data = data.filter(o => o.station_name === fs);
    const maxC = Math.max(...data.map(o=>o.cases_handled),1);
    $('off-total-cases').textContent   = data.reduce((s,o)=>s+o.cases_handled,0);
    $('off-total-arrests').textContent = data.reduce((s,o)=>s+o.arrests_made,0);
    const tc = data.reduce((s,o)=>s+o.cases_handled,0);
    const ta = data.reduce((s,o)=>s+o.arrests_made,0);
    $('off-avg-rate').textContent = tc?(ta/tc*100).toFixed(1)+'%':'0%';
    tbody.innerHTML = data.map((o,i) => {
      const rate = o.cases_handled?Math.round(o.arrests_made/o.cases_handled*100):0;
      const rl = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
      const ini = o.full_name.split(' ').pop().substring(0,2).toUpperCase();
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--sky);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--blue)">${ini}</div>
          <div><div class="fw-600 fs-13">${rl} ${o.full_name}</div><div class="fs-12 text-muted">${o['rank']||o.rank||'—'}</div></div>
        </div></td>
        <td><span class="mono">${o.badge_number}</span></td>
        <td>${o.station_name}</td>
        <td><div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:6px;background:#f1f5f9;border-radius:3px;min-width:60px;overflow:hidden"><div style="height:100%;border-radius:3px;background:var(--blue);width:${(o.cases_handled/maxC*100).toFixed(0)}%"></div></div>
          <span class="fw-600 fs-13">${o.cases_handled}</span>
        </div></td>
        <td><span style="font-size:15px;font-weight:700;color:var(--success)">${o.arrests_made}</span></td>
        <td><div><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span class="fs-12 text-muted">${rate}%</span></div>
          <div style="height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden;min-width:80px"><div style="height:100%;border-radius:3px;background:${rate>=80?'var(--success)':rate>=60?'#f59e0b':'var(--danger)'};width:${rate}%"></div></div>
        </div></td>
        <td>${badge(rate>=80?'Closed':rate>=60?'Under Investigation':'Open').replace(/Closed|Under Investigation|Open/,rate>=80?'Excellent':rate>=60?'Good':'Average')}</td>
      </tr>`;
    }).join('');
  } catch(e) { tbody.innerHTML = `<tr><td colspan="7" style="padding:16px;color:var(--danger)">${e.message}</td></tr>`; }
}

// ════════════════════════════════════════
//  LOOKUP DROPDOWNS
// ════════════════════════════════════════
async function loadCrimeTypesDropdown() {
  try {
    const t = await apiFetch('/api/lookup/crime-types');
    const h = t.map(x=>`<option value="${x.crime_type_id}">${x.crime_name}</option>`).join('');
    $('nc-crime').innerHTML = h;
    if($('new-crime-type')) $('new-crime-type').innerHTML = h;
  } catch(e) {}
}
async function loadLocationsDropdown() {
  try {
    const l = await apiFetch('/api/lookup/locations');
    $('nc-location').innerHTML = l.map(x=>`<option value="${x.location_id}">${x.area_name} — ${x.station_name}</option>`).join('');
  } catch(e) {}
}
async function loadSeverityDropdown() {
  try {
    const s = await apiFetch('/api/lookup/crime-severity');
    $('nc-severity').innerHTML = s.map(x=>`<option value="${x.severity_id}">${x.severity_level}</option>`).join('');
  } catch(e) {}
}

// ════════════════════════════════════════
//  PUT update criminal (full)
// ════════════════════════════════════════
// Already handled in saveCriminal() with editMode flag

// ════════════════════════════════════════
//  INIT
// ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  fetch('/api/health').then(r=>r.json()).then(d=>{
    if (d.status==='OK') {
      $('conn-banner').className='conn-banner success';
      $('conn-banner').innerHTML='<span>✓</span> Connected to CRMS Backend — MySQL database active';
      setTimeout(()=>$('conn-banner').classList.add('hidden'), 4000);
    }
  }).catch(()=>{
    $('conn-banner').innerHTML='<span>⚠</span> Cannot reach backend. Run: npm start';
  });
});
