// If the page is opened from the server (port 3000) use a relative URL, otherwise talk to the server directly
const API = location.port === '3000' ? '/api/complaints' : 'http://localhost:3000/api/complaints';
const $ = (id) => document.getElementById(id);
let complaints = [];

// ---------- validation (same rules as the server: src/validate.js) ----------
const NAME_RE = /^[A-Z][a-z]+(?: [A-Z][a-z]+)+$/;   // e.g. Saira Abbas
const ROLL_RE = /^[A-Z]\d{2}[A-Z]{2}\d{3}$/;        // e.g. K22SW006
function nameError(v) {
  v = v.trim();
  if (!v) return 'Name is required';
  if (!NAME_RE.test(v)) return 'Enter the full name; every word must start with a capital letter (e.g. Saira Abbas)';
  return '';
}
function rollError(v) {
  v = v.trim();
  if (!v) return 'Roll number is required';
  if (!ROLL_RE.test(v)) return 'Use capital letters only, like K22SW006';
  return '';
}
// shows green (correct) or red (wrong) under the field; returns true if valid
function check(input, hint, fn) {
  const msg = fn(input.value);
  const empty = input.value.trim() === '';
  input.classList.toggle('valid', !msg);
  input.classList.toggle('invalid', !!msg && !empty);
  hint.className = 'hint ' + (!msg ? 'ok' : empty ? '' : 'err');
  hint.textContent = !msg ? '✓ Correct' : empty ? '' : msg;
  return !msg;
}
const checkLogin = () => {
  const a = check($('wName'), $('wNameHint'), nameError), b = check($('wRoll'), $('wRollHint'), rollError);
  $('loginBtn').disabled = !(a && b);
  return a && b;
};
const checkForm = () => {
  const a = check($('fName'), $('fNameHint'), nameError), b = check($('fRoll'), $('fRollHint'), rollError);
  return a && b;
};
['wName', 'wRoll'].forEach((id) => $(id).addEventListener('input', checkLogin));
['fName', 'fRoll'].forEach((id) => $(id).addEventListener('input', checkForm));
checkLogin();

// ---------- helpers ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function toast(msg, err) {
  const t = $('toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => (t.hidden = true), 2600);
}
async function call(url, opts) {
  let res;
  try { res = await fetch(url, opts && { headers: { 'Content-Type': 'application/json' }, ...opts }); }
  catch { $('offline').hidden = false; throw new Error('Cannot reach the server. Run "npm start" and open http://localhost:3000'); }
  $('offline').hidden = true;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function user() { try { return JSON.parse(localStorage.getItem('cct_user')); } catch { return null; } }

// ---------- activity log (stored in this browser) ----------
function logActivity(type, text) {
  const list = JSON.parse(localStorage.getItem('cct_activity') || '[]');
  list.unshift({ type, text, time: new Date().toLocaleString() });
  localStorage.setItem('cct_activity', JSON.stringify(list.slice(0, 20)));
  renderActivity();
}
function renderActivity() {
  const list = JSON.parse(localStorage.getItem('cct_activity') || '[]');
  const tags = { add: 'Added', upd: 'Updated', del: 'Deleted' };
  $('activity').innerHTML = list.length
    ? list.map((a) => `<li><time>${esc(a.time)}</time><span class="tag ${a.type}">${tags[a.type]}</span> ${esc(a.text)}</li>`).join('')
    : '<li class="muted">No activity yet.</li>';
}

// ---------- sidebar views ----------
function showView(name) {
  document.querySelectorAll('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== name));
  document.querySelectorAll('.sidebar a').forEach((a) => a.classList.toggle('active', a.dataset.view === name));
  $('sidebar').classList.remove('open');
}
document.querySelectorAll('.sidebar a').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  if (a.dataset.view === 'register' && !$('editId').value) resetForm();
  showView(a.dataset.view);
}));
$('menuBtn').addEventListener('click', () => $('sidebar').classList.toggle('open'));

// ---------- login / user ----------
function showApp() {
  const u = user();
  $('login').hidden = true; $('app').hidden = false;
  $('uName').textContent = u.name; $('uRoll').textContent = 'Roll No: ' + u.roll;
  document.querySelectorAll('.uNameInline').forEach((e) => (e.textContent = u.name));
  showView('dashboard');
  resetForm(); renderActivity(); load();
}
$('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!checkLogin()) return toast('Please correct the name and roll number', true);
  localStorage.setItem('cct_user', JSON.stringify({ name: $('wName').value.trim(), roll: $('wRoll').value.trim() }));
  showApp();
});
$('logout').addEventListener('click', () => {
  localStorage.removeItem('cct_user'); $('app').hidden = true; $('login').hidden = false;
  $('wName').value = ''; $('wRoll').value = ''; checkLogin();
});

// ---------- READ ----------
async function load() {
  try { complaints = await call(API); render(); }
  catch (e) { toast('Could not load complaints: ' + e.message, true); }
}
function render() {
  const f = $('filter').value;
  const q = $('search').value.trim().toLowerCase();
  const shown = complaints.filter((c) =>
    (!f || c.status === f) &&
    (!q || [c.studentName, c.rollNo, c.category, c.description, c.status].some((v) => String(v).toLowerCase().includes(q))));
  $('rows').innerHTML = shown.map((c) => `
    <tr>
      <td>${c.id}</td>
      <td>${esc(c.studentName)}<small>${esc(c.rollNo)}</small></td>
      <td>${esc(c.category)}</td>
      <td class="desc">${esc(c.description)}</td>
      <td><span class="badge ${esc(c.status).replace(/ /g, '-')}">${esc(c.status)}</span></td>
      <td class="actions">
        ${c.status !== 'Resolved' ? `<button class="btn small ok" onclick="markResolved(${c.id})">Mark Resolved</button>` : ''}
        <button class="btn small" onclick="editComplaint(${c.id})">Edit</button>
        <button class="btn small danger" onclick="deleteComplaint(${c.id})">Delete</button>
      </td>
    </tr>`).join('');
  $('empty').hidden = shown.length > 0;
  $('latestRows').innerHTML = complaints.slice(-5).reverse().map((c) => `<tr><td>${c.id}</td><td>${esc(c.studentName)}<small>${esc(c.rollNo)}</small></td><td>${esc(c.category)}</td><td><span class="badge ${esc(c.status).replace(/ /g, '-')}">${esc(c.status)}</span></td></tr>`).join('');
  $('latestEmpty').hidden = complaints.length > 0;
  // complaints by category
  const counts = {};
  complaints.forEach((c) => (counts[c.category] = (counts[c.category] || 0) + 1));
  const max = Math.max(1, ...Object.values(counts));
  $('catBars').innerHTML = Object.entries(counts).sort((x, y) => y[1] - x[1]).map(([k, v]) =>
    `<div class="cat-row"><span>${esc(k)}</span><div class="cat-bar"><i style="width:${(v / max) * 100}%"></i></div><b>${v}</b></div>`).join('');
  $('catEmpty').hidden = complaints.length > 0;
  const n = (s) => complaints.filter((c) => c.status === s).length;
  $('sTotal').textContent = complaints.length; $('sPending').textContent = n('Pending');
  $('sProgress').textContent = n('In Progress'); $('sResolved').textContent = n('Resolved');
}
$('filter').addEventListener('change', render);
$('search').addEventListener('input', render);

// ---------- CREATE / UPDATE ----------
function resetForm() {
  const u = user();
  $('complaintForm').reset(); $('editId').value = '';
  $('fName').value = u.name; $('fRoll').value = u.roll; checkForm();
  $('formTitle').textContent = 'Register a New Complaint';
  $('submitBtn').textContent = 'Submit Complaint'; $('cancelEdit').hidden = true;
}
$('cancelEdit').addEventListener('click', () => { resetForm(); showView('list'); });
$('complaintForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!checkForm()) return toast('Please correct the name and roll number', true);
  const id = $('editId').value;
  const body = JSON.stringify({
    studentName: $('fName').value.trim(), rollNo: $('fRoll').value.trim(), category: $('fCategory').value,
    description: $('fDesc').value.trim(), status: $('fStatus').value,
  });
  try {
    const saved = await call(id ? `${API}/${id}` : API, { method: id ? 'PUT' : 'POST', body });
    toast(id ? 'Complaint updated' : 'Complaint registered');
    logActivity(id ? 'upd' : 'add', `#${saved.id} (${saved.category}) by ${saved.studentName}` + (id ? ` – status: ${saved.status}` : ''));
    resetForm(); load(); showView('list');
  } catch (err) { toast(err.message, true); }
});
window.editComplaint = (id) => {
  const c = complaints.find((x) => x.id === id); if (!c) return;
  $('editId').value = c.id; $('fName').value = c.studentName; $('fRoll').value = c.rollNo;
  const opt = [...$('fCategory').options].some((o) => o.value === c.category);
  if (!opt) $('fCategory').add(new Option(c.category, c.category));
  $('fCategory').value = c.category; $('fDesc').value = c.description; $('fStatus').value = c.status; checkForm();
  $('formTitle').textContent = `Edit Complaint #${c.id}`; $('submitBtn').textContent = 'Update Complaint';
  $('cancelEdit').hidden = false; showView('register');
};

// ---------- quick status change (uses the same PUT request) ----------
window.markResolved = async (id) => {
  const c = complaints.find((x) => x.id === id); if (!c) return;
  try {
    const saved = await call(`${API}/${id}`, { method: 'PUT', body: JSON.stringify({ ...c, status: 'Resolved' }) });
    toast('Marked as Resolved'); logActivity('upd', `#${saved.id} (${saved.category}) by ${saved.studentName} – status: Resolved`);
    load();
  } catch (err) { toast(err.message, true); }
};

// ---------- DELETE ----------
window.deleteComplaint = async (id) => {
  const c = complaints.find((x) => x.id === id); if (!c) return;
  if (!confirm(`Delete complaint #${id} (${c.category}) by ${c.studentName}?`)) return;
  try {
    await call(`${API}/${id}`, { method: 'DELETE' });
    toast('Complaint deleted'); logActivity('del', `#${id} (${c.category}) by ${c.studentName}`);
    if ($('editId').value == id) resetForm();
    load();
  } catch (err) { toast(err.message, true); }
};

if (user()) showApp();
