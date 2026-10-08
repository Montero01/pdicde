// Mostra/esconde o botão do Academy conforme a tela
function updateAcademyFabVisibility() {
  const fab = document.querySelector('.academy-fab');
  const loginView = document.getElementById('login-view');
  if (!fab || !loginView) return;
  const loginVisible = !loginView.classList.contains('hidden');
  fab.style.display = loginVisible ? 'none' : 'flex';
}

// ==================== CONFIG ====================
const SUPABASE_URL = 'https://whjyvphamkbjcrdzhzoc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EyZgqDQTSV-M-O3_l63V7Q_LFcFDl69';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: window.localStorage,
    storageKey: 'cde-auth-session',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// ==================== ESTADO ====================
let currentUser = null;
let currentProfile = null;
let pendingCertsCache = {};
let pendingApproval = null;
let pendingDelete = null;
let pendingEdit = null;
let cachedRankingData = [];
let cachedAllGoals = [];
let currentSectorFilter = 'all';
let isManagement = false, isDiretor = false, isSupervisor = false, isMaster = false, canManageAll = false;

const SECTORS = [
  { key: 'COMERCIAL', label: 'Comercial', cls: 'comercial' },
  { key: 'PRODUCAO', label: 'Produção', cls: 'producao' },
  { key: 'ADMINISTRATIVO', label: 'Administrativo', cls: 'administrativo' }
];

// ==================== AUXILIARES ====================
function showMessage(text, type = 'success') {
  const box = document.getElementById('message-box');
  box.innerHTML = `<div class="msg ${type}">${text}</div>`;
  setTimeout(() => box.innerHTML = '', 5000);
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('pt-BR');
}
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function normalizeSector(s) {
  if (!s) return null;
  return String(s).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
function getSectorBadge(sector) {
  const n = normalizeSector(sector);
  if (!n) return '<span class="sector-badge none">Sem setor</span>';
  if (n === 'COMERCIAL') return '<span class="sector-badge comercial">Comercial</span>';
  if (n === 'PRODUCAO') return '<span class="sector-badge producao">Produção</span>';
  if (n === 'ADMINISTRATIVO') return '<span class="sector-badge administrativo">Administrativo</span>';
  return `<span class="sector-badge none">${escapeHtml(sector)}</span>`;
}
function getRoleBadge(role, isMasterUser = false) {
  const r = (role || '').toLowerCase();
  if (isMasterUser || r === 'master') return '<span class="role-badge master">👑 Master</span>';
  if (r === 'supervisor') return '<span class="role-badge">Supervisor</span>';
  if (r.includes('diretor') || r.includes('director') || r === 'diretoria') return '<span class="role-badge">Diretoria</span>';
  return '';
}
function canEditOrDeleteGoal(goal) {
  if (canManageAll) return true;
  return goal && goal.created_by && String(goal.created_by) === String(currentUser.id);
}

// ==================== TRIMESTRES ====================
function currentYear() { return new Date().getFullYear(); }
function currentQuarter() { return Math.floor(new Date().getMonth() / 3) + 1; }
function computeQuarters(certs) {
  const year = currentYear(), curQ = currentQuarter();
  const buckets = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const hasData = { 1: false, 2: false, 3: false, 4: false };
  (certs || []).forEach(c => {
    if (!c.validated_at) return;
    const d = new Date(c.validated_at);
    if (d.getFullYear() !== year) return;
    const q = Math.floor(d.getMonth() / 3) + 1;
    buckets[q] += (c.points_awarded || 0);
    hasData[q] = true;
  });
  const labels = ['1º TRI', '2º TRI', '3º TRI', '4º TRI'];
  return [1, 2, 3, 4].map(q => ({ label: labels[q - 1], value: buckets[q], hasData: hasData[q], isCurrent: q === curQ }));
}
function renderQuarters(containerId, quarters) {
  const el = document.getElementById(containerId);
  el.innerHTML = quarters.map(q => {
    const cls = q.isCurrent ? 'quarter-col current' : 'quarter-col';
    if (q.hasData) return `<div class="${cls}"><div class="q-label">${q.label}</div><div class="q-value">${q.value}</div></div>`;
    return `<div class="${cls}"><div class="q-label">${q.label}</div><div class="q-value empty">—</div></div>`;
  }).join('');
}
function calcCoefficient(p, m) { if (!m || m <= 0) return 0; return Math.min(100, Math.round((p / m) * 100)); }

// ==================== TABS ====================
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('hidden', c.id !== 'tab-' + name));
}

// ==================== AUTH ====================
async function login() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showMessage('Preencha e-mail e senha.', 'error');
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return showMessage(error.message, 'error');
  await loadUser();
}
async function logout() {
  await db.auth.signOut();
  location.reload();
}
async function loadUser() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  currentUser = user;
  const { data: profile, error } = await db.from('profiles').select('*').eq('id', user.id).single();
  if (error || !profile) return showMessage('Perfil não encontrado.', 'error');
  currentProfile = profile;
  document.getElementById('login-view').classList.add('hidden');
  updateAcademyFabVisibility();

  const roleLower = (profile.role || '').toLowerCase();
  isMaster = profile.is_master === true || roleLower === 'master';
  isSupervisor = roleLower === 'supervisor';
  isDiretor = roleLower.includes('diretor') || roleLower.includes('director') || roleLower === 'diretoria';
  canManageAll = isDiretor || isMaster;
  isManagement = isSupervisor || isDiretor || isMaster;

  if (isManagement) {
    document.getElementById('management-view').classList.remove('hidden');
    document.getElementById('employee-view').classList.add('hidden');
    const titleEl = document.getElementById('mgmt-title');
    if (isMaster) titleEl.textContent = '👑 Painel Master';
    else if (isDiretor) titleEl.textContent = 'Painel da Diretoria';
    else titleEl.textContent = 'Painel do Supervisor';

    document.getElementById('mgmt-user-info').innerHTML = `${escapeHtml(profile.full_name)} ${getRoleBadge(profile.role, isMaster)} ${(isSupervisor || profile.sector) ? getSectorBadge(profile.sector) : ''}`;

    const noticeEl = document.getElementById('director-notice');
    if (canManageAll) {
      document.getElementById('director-notice-role').textContent = isMaster ? 'Master' : 'Diretoria';
      noticeEl.classList.toggle('master', isMaster);
      noticeEl.classList.remove('hidden');
    } else noticeEl.classList.add('hidden');

    document.getElementById('tab-btn-mypdi').classList.toggle('hidden', !isSupervisor);

    const filterSel = document.getElementById('ranking-sector-filter');
    const filterLock = document.getElementById('filter-lock-msg');
    if (isSupervisor && !canManageAll && profile.sector) {
      const n = normalizeSector(profile.sector);
      if (['COMERCIAL', 'PRODUCAO', 'ADMINISTRATIVO'].includes(n)) {
        filterSel.value = n; filterSel.disabled = true;
        currentSectorFilter = n; filterLock.classList.remove('hidden');
      }
    } else {
      filterSel.value = 'all'; filterSel.disabled = false;
      currentSectorFilter = 'all'; filterLock.classList.add('hidden');
    }
    const goalsFilter = document.getElementById('goals-sector-filter');
    if (isSupervisor && !canManageAll && profile.sector) {
      goalsFilter.value = normalizeSector(profile.sector); goalsFilter.disabled = true;
    } else {
      goalsFilter.value = 'all'; goalsFilter.disabled = false;
    }

    if (isSupervisor) loadMgmtPersonalData();
    loadGoalAssignmentOptions();
    loadAllGoals();
    loadSectorComparisonAndRanking();
    loadPendingCertificates();
    loadValidatedCertificates();
  } else {
    document.getElementById('employee-view').classList.remove('hidden');
    document.getElementById('management-view').classList.add('hidden');
    document.getElementById('emp-user-info').innerHTML = `${escapeHtml(profile.full_name)} (Colaborador) ${getSectorBadge(profile.sector)}`;
    loadEmployeeData();
  }
}

// ==================== COLABORADOR ====================
async function loadEmployeeData() {
  await loadGoalsFor(currentUser.id, 'goals-list', 'cert-goal');
  await loadCertificatesFor(currentUser.id, 'emp-certs-list');
  await loadScoreFor(currentUser.id, 'emp-score', 'emp-quarters', 'emp-coef', 'emp-coef-bar');
}
async function loadMgmtPersonalData() {
  await loadGoalsFor(currentUser.id, 'mgmt-goals-list', 'mgmt-cert-goal');
  await loadCertificatesFor(currentUser.id, 'mgmt-certs-list');
  await loadScoreFor(currentUser.id, 'mgmt-score', 'mgmt-quarters', 'mgmt-coef', 'mgmt-coef-bar');
}

// ==================== GENERICOS ====================
async function loadGoalsFor(userId, listId, selectId) {
  const { data: goals, error } = await db.from('goals').select('*').eq('user_id', userId).order('deadline', { ascending: true });
  const list = document.getElementById(listId);
  const select = document.getElementById(selectId);
  if (error || !goals || goals.length === 0) {
    list.innerHTML = '<p style="color:#6D6E71;">Nenhuma meta cadastrada.</p>';
    if (select) select.innerHTML = '<option value="">Nenhuma meta disponível</option>';
    return;
  }
  list.innerHTML = goals.map(g => {
    const isDerived = g.goal_type === 'sector_derived';
    return `<div class="goal-item ${isDerived ? 'goal-derived' : ''}">
      <div class="info">
        <div class="title">${escapeHtml(g.title)}</div>
        <div class="meta">Prazo: ${formatDate(g.deadline)} | Pontos máx: ${g.max_points}${isDerived ? ' | <em style="color:#D4650F;">Meta setorial (30% do setor)</em>' : ''}</div>
        ${g.description ? `<div class="meta">${escapeHtml(g.description)}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  if (select) {
    select.innerHTML = goals.map(g => `<option value="${g.id}">${escapeHtml(g.title)} (prazo: ${formatDate(g.deadline)})</option>`).join('');
  }
}
async function loadCertificatesFor(userId, listId) {
  const { data: certs, error } = await db.from('certificates').select('*, goals(title)').eq('user_id', userId).order('submitted_at', { ascending: false });
  const list = document.getElementById(listId);
  if (error || !certs || certs.length === 0) { list.innerHTML = '<p style="color:#6D6E71;">Nenhum certificado enviado ainda.</p>'; return; }
  list.innerHTML = certs.map(c => `
    <div class="cert-item">
      <div class="info">
        <div class="title">${escapeHtml(c.goals?.title || 'Meta')}</div>
        <div class="meta">Enviado em ${formatDate(c.submitted_at)}</div>
      </div>
      <div>
        <span class="badge ${c.status}">${c.status === 'pending' ? 'Pendente' : c.status === 'approved' ? 'Aprovado' : 'Rejeitado'}</span>
        ${c.status === 'approved' ? `<strong style="margin-left:8px; color:#158A49;">+${c.points_awarded} pts</strong>` : ''}
      </div>
    </div>`).join('');
}
async function loadScoreFor(userId, scoreId, quartersId, coefId, coefBarId) {
  const { data: approved } = await db.from('certificates').select('points_awarded, validated_at').eq('user_id', userId).eq('status', 'approved');
  const { data: goals } = await db.from('goals').select('max_points, goal_type').eq('user_id', userId);
  const totalPoints = (approved || []).reduce((s, c) => s + (c.points_awarded || 0), 0);
  const maxPossible = (goals || []).reduce((s, g) => s + (g.max_points || 0), 0);
  const coef = calcCoefficient(totalPoints, maxPossible);
  document.getElementById(scoreId).textContent = totalPoints;
  renderQuarters(quartersId, computeQuarters(approved || []));
  document.getElementById(coefId).textContent = coef + '%';
  document.getElementById(coefBarId).style.width = coef + '%';
}

// ==================== UPLOAD ====================
async function submitCertificate(e) { e.preventDefault(); await _doUpload(currentUser.id, 'cert-goal', 'cert-file', 'emp-certs-list'); await loadScoreFor(currentUser.id, 'emp-score', 'emp-quarters', 'emp-coef', 'emp-coef-bar'); }
async function submitMgmtCertificate(e) { e.preventDefault(); await _doUpload(currentUser.id, 'mgmt-cert-goal', 'mgmt-cert-file', 'mgmt-certs-list'); await loadScoreFor(currentUser.id, 'mgmt-score', 'mgmt-quarters', 'mgmt-coef', 'mgmt-coef-bar'); }
async function _doUpload(userId, goalSelectId, fileInputId, listId) {
  const goalId = document.getElementById(goalSelectId).value;
  const fileInput = document.getElementById(fileInputId);
  const file = fileInput.files[0];
  if (!goalId || !file) return showMessage('Selecione a meta e o arquivo.', 'error');
  const ext = file.name.split('.').pop();
  const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = `${userId}/${cleanName}`;
  const { error: upErr } = await db.storage.from('certificates').upload(filePath, file);
  if (upErr) return showMessage('Erro no upload: ' + upErr.message, 'error');
  const { error: dbErr } = await db.from('certificates').insert({ user_id: userId, goal_id: goalId, file_url: filePath, file_name: file.name, status: 'pending' });
  if (dbErr) return showMessage('Erro ao registrar: ' + dbErr.message, 'error');
  showMessage('Certificado enviado! Aguarde validação.', 'success');
  fileInput.value = '';
  loadCertificatesFor(userId, listId);
}

// ==================== GERENCIAR METAS ====================
async function loadGoalAssignmentOptions() {
  const select = document.getElementById('goal-assignee');
  const hint = document.getElementById('goal-scope-hint');
  const { data, error } = await db.rpc('get_goal_assignees');
  if (error) return loadGoalAssignmentOptionsFallback();
  if (!data || data.length === 0) { select.innerHTML = `<option value="">Nenhum colaborador encontrado</option>`; return; }
  if (canManageAll) hint.innerHTML = `Você tem acesso <strong>total</strong>.`;
  else hint.innerHTML = `Você está criando metas para o setor <strong>${escapeHtml(currentProfile.sector || '')}</strong>.`;
  select.innerHTML = '<option value="">— Selecione —</option>' +
    data.map(p => {
      const isSup = (p.role || '').toLowerCase() === 'supervisor';
      const tag = isSup ? ' [Supervisor]' : '';
      const sec = p.sector ? ` — ${p.sector}` : '';
      return `<option value="${p.id}">${escapeHtml(p.full_name || p.email)}${tag}${sec}</option>`;
    }).join('');
}
async function loadGoalAssignmentOptionsFallback() {
  const select = document.getElementById('goal-assignee');
  const hint = document.getElementById('goal-scope-hint');
  const scopeSector = (!canManageAll && isSupervisor) ? currentProfile.sector : null;
  const roles = canManageAll ? ['employee', 'colaborador', 'supervisor'] : ['employee', 'colaborador'];
  let query = db.from('profiles').select('id, full_name, email, sector, role').in('role', roles);
  if (scopeSector) query = query.eq('sector', scopeSector);
  hint.innerHTML = scopeSector ? `Você está criando metas para o setor <strong>${escapeHtml(scopeSector)}</strong>.` : `Você tem acesso <strong>total</strong>.`;
  const { data, error } = await query;
  if (error || !data || data.length === 0) { select.innerHTML = `<option value="">Nenhum colaborador encontrado</option>`; return; }
  data.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  select.innerHTML = '<option value="">— Selecione —</option>' +
    data.map(p => {
      const isSup = (p.role || '').toLowerCase() === 'supervisor';
      return `<option value="${p.id}">${escapeHtml(p.full_name || p.email)}${isSup ? ' [Supervisor]' : ''}${p.sector ? ' — ' + p.sector : ''}</option>`;
    }).join('');
}
async function createGoal(e) {
  e.preventDefault();
  const assigneeId = document.getElementById('goal-assignee').value;
  const title = document.getElementById('goal-title').value.trim();
  const description = document.getElementById('goal-desc').value.trim();
  const deadline = document.getElementById('goal-deadline').value;
  const maxPoints = parseInt(document.getElementById('goal-points').value, 10);
  if (!assigneeId || !title || !deadline || isNaN(maxPoints) || maxPoints < 1) return showMessage('Preencha todos os campos.', 'error');
  const { data: assignee } = await db.from('profiles').select('id, sector, role').eq('id', assigneeId).single();
  if (!assignee) return showMessage('Colaborador não encontrado.', 'error');
  if (!canManageAll && isSupervisor) {
    if (normalizeSector(currentProfile.sector) !== normalizeSector(assignee.sector)) return showMessage('Você só pode criar metas para o seu setor.', 'error');
  }
  const payload = { user_id: assigneeId, title, description: description || null, deadline, max_points: maxPoints, goal_type: 'individual', sector: assignee.sector || null, created_by: currentUser.id };
  let { error } = await db.from('goals').insert(payload);
  if (error && /created_by/i.test(error.message || '')) {
    delete payload.created_by;
    const retry = await db.from('goals').insert(payload);
    error = retry.error;
  }
  if (error) return showMessage('Erro ao criar meta: ' + error.message, 'error');
  showMessage('Meta criada com sucesso! ⚡', 'success');
  document.getElementById('create-goal-form').reset();
  document.getElementById('goal-points').value = 10;
  loadAllGoals();
  loadGoalAssignmentOptions();
}
async function loadAllGoals() {
  const container = document.getElementById('all-goals-list');
  container.innerHTML = '<div class="rank-empty">Carregando metas…</div>';
  const { data, error } = await db.from('goals').select('*, profiles!goals_user_id_fkey(id, full_name, email, sector, role)').eq('goal_type', 'individual').order('deadline', { ascending: true });
  if (error) { container.innerHTML = `<div class="rank-empty" style="color:#C8102E;">Erro: ${escapeHtml(error.message)}</div>`; return; }
  let goals = data || [];
  if (!canManageAll && isSupervisor) goals = goals.filter(g => normalizeSector(g.profiles?.sector) === normalizeSector(currentProfile.sector));
  cachedAllGoals = goals;
  renderAllGoals();
}
function renderAllGoals() {
  const container = document.getElementById('all-goals-list');
  const filterSel = document.getElementById('goals-sector-filter');
  const searchEl = document.getElementById('goals-search');
  let goals = [...cachedAllGoals];
  if (filterSel.value !== 'all') goals = goals.filter(g => normalizeSector(g.profiles?.sector) === filterSel.value);
  const search = (searchEl?.value || '').toLowerCase().trim();
  if (search) goals = goals.filter(g => (g.profiles?.full_name || '').toLowerCase().includes(search) || (g.title || '').toLowerCase().includes(search));
  if (goals.length === 0) { container.innerHTML = '<div class="rank-empty">Nenhuma meta encontrada.</div>'; return; }
  goals.sort((a, b) => {
    const na = a.profiles?.full_name || '', nb = b.profiles?.full_name || '';
    if (na !== nb) return na.localeCompare(nb);
    return new Date(a.deadline) - new Date(b.deadline);
  });
  container.innerHTML = goals.map(g => {
    const isSup = (g.profiles?.role || '').toLowerCase() === 'supervisor';
    const supTag = isSup ? ' <span class="role-badge" style="font-size:0.6rem;">Supervisor</span>' : '';
    const canModify = canEditOrDeleteGoal(g);
    const editBtn = canModify ? `<button class="small secondary" onclick="openEditModal('${g.id}')">✏️ Editar</button>` : `<button class="small secondary" disabled>🔒 Editar</button>`;
    const delBtn = canModify ? `<button class="small danger" onclick="openDeleteModal('${g.id}')">🗑️ Excluir</button>` : `<button class="small secondary" disabled>🔒 Excluir</button>`;
    return `<div class="goal-item">
      <div class="info">
        <div class="title">${escapeHtml(g.profiles?.full_name || 'Colaborador')}${supTag} ${getSectorBadge(g.profiles?.sector)}</div>
        <div class="meta" style="font-weight:600; color:#414042; margin-top:4px;">🎯 ${escapeHtml(g.title)}</div>
        <div class="meta">Prazo: ${formatDate(g.deadline)} | Pontos máx: <strong>${g.max_points}</strong></div>
        ${g.description ? `<div class="meta" style="font-style:italic;">${escapeHtml(g.description)}</div>` : ''}
      </div>
      <div class="goal-actions">${editBtn}${delBtn}</div>
    </div>`;
  }).join('');
}

// ==================== EDITAR META ====================
async function openEditModal(goalId) {
  let goal = cachedAllGoals.find(g => String(g.id) === String(goalId));
  if (!goal) {
    const { data, error } = await db.from('goals').select('*, profiles!goals_user_id_fkey(id, full_name, email, sector, role)').eq('id', goalId).single();
    if (error || !data) return showMessage('Meta não encontrada.', 'error');
    goal = data;
  }
  if (!canEditOrDeleteGoal(goal)) return showMessage('Sem permissão.', 'error');
  pendingEdit = { goalId: goal.id };
  document.getElementById('edit-modal-info').innerHTML = `Editando meta de <strong>${escapeHtml(goal.profiles?.full_name || '')}</strong>`;
  document.getElementById('edit-goal-title').value = goal.title || '';
  document.getElementById('edit-goal-desc').value = goal.description || '';
  document.getElementById('edit-goal-deadline').value = goal.deadline || '';
  document.getElementById('edit-goal-points').value = goal.max_points || 10;
  document.getElementById('edit-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('edit-goal-title').focus(), 60);
}
function closeEditModal() { pendingEdit = null; document.getElementById('edit-modal').classList.add('hidden'); }
async function confirmEditGoal() {
  if (!pendingEdit) return;
  const title = document.getElementById('edit-goal-title').value.trim();
  const description = document.getElementById('edit-goal-desc').value.trim();
  const deadline = document.getElementById('edit-goal-deadline').value;
  const maxPoints = parseInt(document.getElementById('edit-goal-points').value, 10);
  if (!title || !deadline || isNaN(maxPoints) || maxPoints < 1) return showMessage('Preencha todos os campos.', 'error');
  const goalId = pendingEdit.goalId;
  closeEditModal();
  const { error } = await db.from('goals').update({ title, description: description || null, deadline, max_points: maxPoints }).eq('id', goalId);
  if (error) return showMessage('Erro ao editar: ' + error.message, 'error');
  showMessage('Meta atualizada!', 'success');
  loadAllGoals();
  loadSectorComparisonAndRanking();
}

// ==================== EXCLUIR META ====================
async function openDeleteModal(goalId) {
  let goal = cachedAllGoals.find(g => String(g.id) === String(goalId));
  if (!goal) {
    const { data, error } = await db.from('goals').select('*, profiles!goals_user_id_fkey(id, full_name, email, sector, role)').eq('id', goalId).single();
    if (error || !data) return showMessage('Meta não encontrada.', 'error');
    goal = data;
  }
  if (!canEditOrDeleteGoal(goal)) return showMessage('Sem permissão.', 'error');
  pendingDelete = { goalId: goal.id };
  document.getElementById('delete-modal-info').innerHTML = `Excluir a meta <strong>"${escapeHtml(goal.title)}"</strong> de <strong>${escapeHtml(goal.profiles?.full_name || '')}</strong>?`;
  document.getElementById('delete-modal').classList.remove('hidden');
}
function closeDeleteModal() { pendingDelete = null; document.getElementById('delete-modal').classList.add('hidden'); }
async function confirmDeleteGoal() {
  if (!pendingDelete) return;
  const { goalId } = pendingDelete;
  closeDeleteModal();
  const { error } = await db.from('goals').delete().eq('id', goalId);
  if (error) return showMessage('Erro ao excluir: ' + error.message, 'error');
  showMessage('Meta excluída!', 'success');
  loadAllGoals();
  loadGoalAssignmentOptions();
  loadSectorComparisonAndRanking();
}

// ==================== RANKING + COMPARATIVO ====================
async function loadSectorComparisonAndRanking() {
  const rankingContainer = document.getElementById('ranking-container');
  const compareContainer = document.getElementById('sector-compare-container');
  const adhContainer = document.getElementById('adherence-container');
  rankingContainer.innerHTML = '<div class="rank-empty">Carregando…</div>';
  compareContainer.innerHTML = '<div class="rank-empty">Carregando…</div>';
  adhContainer.innerHTML = '<div class="rank-empty">Carregando…</div>';

  const { data: people, error: pErr } = await db.from('profiles').select('id, full_name, email, role, sector, is_master').in('role', ['employee', 'colaborador', 'supervisor']);
  if (pErr || !people || people.length === 0) {
    rankingContainer.innerHTML = '<div class="rank-empty">Nenhum usuário cadastrado.</div>';
    compareContainer.innerHTML = ''; adhContainer.innerHTML = '';
    return;
  }
  const { data: certs, error: cErr } = await db.from('certificates').select('user_id, points_awarded, status');
  if (cErr) { rankingContainer.innerHTML = `<div class="rank-empty" style="color:#C8102E;">Erro</div>`; return; }

  const statsMap = {};
  people.forEach(p => { statsMap[p.id] = { points: 0, certCount: 0, total: 0, approved: 0, rejected: 0, pending: 0 }; });
  (certs || []).forEach(c => {
    const st = statsMap[c.user_id];
    if (!st) return;
    st.total += 1;
    if (c.status === 'approved') { st.points += (c.points_awarded || 0); st.certCount += 1; st.approved += 1; }
    else if (c.status === 'rejected') st.rejected += 1;
    else if (c.status === 'pending') st.pending += 1;
  });
  const ranking = people.map(p => {
    const st = statsMap[p.id];
    const decided = st.approved + st.rejected;
    const adherence = decided > 0 ? Math.round((st.approved / decided) * 100) : null;
    return { id: p.id, full_name: p.full_name || p.email || 'Sem nome', email: p.email || '', role: (p.role || '').toLowerCase(), isMaster: p.is_master === true, sector: p.sector || null, sectorKey: normalizeSector(p.sector), points: st.points, certCount: st.certCount, totalCerts: st.total, approved: st.approved, rejected: st.rejected, pending: st.pending, adherence };
  });
  cachedRankingData = ranking;
  renderRankingTable(ranking);
  renderSectorComparison(ranking);
  renderAdherence(ranking);
}
function adherenceBadge(a) {
  if (a === null || a === undefined) return '<span class="adherence-badge none">—</span>';
  if (a >= 80) return `<span class="adherence-badge high">${a}%</span>`;
  if (a >= 50) return `<span class="adherence-badge mid">${a}%</span>`;
  return `<span class="adherence-badge low">${a}%</span>`;
}
function renderRankingTable(ranking) {
  const container = document.getElementById('ranking-container');
  let filtered = currentSectorFilter === 'all' ? ranking : ranking.filter(r => r.sectorKey === currentSectorFilter);
  if (isSupervisor && !canManageAll) filtered = filtered.filter(r => r.sectorKey === normalizeSector(currentProfile.sector));
  if (filtered.length === 0) { container.innerHTML = '<div class="rank-empty">Nenhum colaborador encontrado.</div>'; return; }
  const sorted = [...filtered].sort((a, b) => b.points - a.points || a.full_name.localeCompare(b.full_name));
  const rows = sorted.map((r, idx) => {
    const pos = idx + 1;
    let medalClass = '', medalLabel = pos;
    if (pos === 1) { medalClass = 'gold'; medalLabel = '🥇'; }
    else if (pos === 2) { medalClass = 'silver'; medalLabel = '🥈'; }
    else if (pos === 3) { medalClass = 'bronze'; medalLabel = '🥉'; }
    const isSup = r.role === 'supervisor';
    const roleTag = isSup ? ' ' + getRoleBadge(r.role, r.isMaster) : '';
    return `<tr class="${isSup ? 'is-supervisor' : ''}">
      <td style="width:60px;"><span class="rank-pos ${medalClass}">${medalLabel}</span></td>
      <td><div class="rank-name">${escapeHtml(r.full_name)}${roleTag}</div>${r.email ? `<div class="rank-email">${escapeHtml(r.email)}</div>` : ''}</td>
      <td style="width:130px;">${getSectorBadge(r.sector)}</td>
      <td style="text-align:center; width:130px;"><span class="rank-cert-count">${r.certCount} aprovado${r.certCount === 1 ? '' : 's'}</span></td>
      <td style="text-align:center; width:110px;">${adherenceBadge(r.adherence)}</td>
      <td style="text-align:right; width:100px;"><span class="rank-points">${r.points} pts</span></td>
    </tr>`;
  }).join('');
  container.innerHTML = `<div class="ranking-table-wrapper"><table class="ranking-table"><thead><tr><th>#</th><th>Colaborador</th><th>Setor</th><th style="text-align:center;">Certificados</th><th style="text-align:center;">Aderência</th><th style="text-align:right;">Pontos</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function applySectorFilter() { currentSectorFilter = document.getElementById('ranking-sector-filter').value; renderRankingTable(cachedRankingData); }
function renderSectorComparison(ranking) {
  const container = document.getElementById('sector-compare-container');
  const sectorData = {};
  SECTORS.forEach(s => { sectorData[s.key] = { total: 0, count: 0, topName: null, topPoints: 0 }; });
  const mySector = isSupervisor ? normalizeSector(currentProfile?.sector) : null;
  ranking.forEach(r => {
    const key = r.sectorKey;
    if (!key || !sectorData[key]) return;
    if (r.role === 'supervisor') { sectorData[key].count += 1; return; }
    sectorData[key].total += r.points;
    sectorData[key].count += 1;
    if (r.points > sectorData[key].topPoints) { sectorData[key].topPoints = r.points; sectorData[key].topName = r.full_name; }
  });
  const ordered = SECTORS.map(s => ({ ...s, total: sectorData[s.key].total, count: sectorData[s.key].count, avg: sectorData[s.key].count > 0 ? (sectorData[s.key].total / sectorData[s.key].count) : 0, topName: sectorData[s.key].topName, topPoints: sectorData[s.key].topPoints })).sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(...ordered.map(s => s.total), 1);
  const rankLabels = ['1º', '2º', '3º'];
  const rankClasses = ['gold', 'silver', 'bronze'];
  const cards = ordered.map((s, idx) => {
    const rankLabel = rankLabels[idx] || `${idx + 1}º`;
    const rankClass = rankClasses[idx] || '';
    const barWidth = (maxTotal > 0) ? (s.total / maxTotal) * 100 : 0;
    const avgFormatted = s.avg.toFixed(1).replace('.', ',');
    const isMine = mySector && s.key === mySector;
    const topHtml = s.topName ? `<span class="top-medal">🥇</span><span class="top-name">${escapeHtml(s.topName)}</span><span class="top-points">${s.topPoints} pts</span>` : `<span>Sem pontuações</span>`;
    return `<div class="sector-compare-card ${s.cls} ${isMine ? 'mine' : ''}">
      <div class="sector-compare-header"><span class="sector-badge ${s.cls}">${s.label}</span><span class="sector-compare-rank ${rankClass}">${rankLabel}</span></div>
      <div class="sector-compare-total">${s.total}<span class="pts-suffix">pts</span></div>
      <div class="sector-compare-label">Total do setor</div>
      <div class="sector-compare-bar"><div class="sector-compare-bar-fill" style="width: ${barWidth}%"></div></div>
      <div class="sector-compare-stats"><div><span class="stat-label">Pessoas</span><span class="stat-value">${s.count}</span></div><div><span class="stat-label">Média</span><span class="stat-value">${avgFormatted}</span></div></div>
      <div class="sector-compare-top ${s.topName ? '' : 'empty'}">${topHtml}</div>
    </div>`;
  }).join('');
  container.innerHTML = `<div class="sector-compare-grid">${cards}</div>`;
}
function renderAdherence(ranking) {
  const container = document.getElementById('adherence-container');
  const totalDecided = ranking.reduce((s, r) => s + (r.approved + r.rejected), 0);
  const totalApproved = ranking.reduce((s, r) => s + r.approved, 0);
  const generalAdh = totalDecided > 0 ? Math.round((totalApproved / totalDecided) * 100) : null;
  const bySetor = {};
  SECTORS.forEach(s => { bySetor[s.key] = { approved: 0, rejected: 0 }; });
  ranking.forEach(r => {
    if (!r.sectorKey || !bySetor[r.sectorKey]) return;
    bySetor[r.sectorKey].approved += r.approved;
    bySetor[r.sectorKey].rejected += r.rejected;
  });
  const setorCards = SECTORS.map(s => {
    const d = bySetor[s.key];
    const dec = d.approved + d.rejected;
    const adh = dec > 0 ? Math.round((d.approved / dec) * 100) : null;
    const color = adh === null ? '#6D6E71' : adh >= 80 ? '#158A49' : adh >= 50 ? '#B35A00' : '#A00D24';
    const width = adh === null ? 0 : adh;
    return `<div class="adherence-card"><div class="ad-sector">${s.label}</div><div class="ad-value" style="color:${color};">${adh === null ? '—' : adh + '%'}</div><div class="ad-sub">${d.approved} aprov. / ${dec} aval.</div><div class="adherence-bar"><div class="adherence-bar-fill" style="width:${width}%; background:${color};"></div></div></div>`;
  }).join('');
  const genColor = generalAdh === null ? '#6D6E71' : generalAdh >= 80 ? '#158A49' : generalAdh >= 50 ? '#B35A00' : '#A00D24';
  container.innerHTML = `<div style="margin-bottom:18px; padding:16px; border-radius:12px; background:linear-gradient(135deg, #FFF9F3, #FFF3E6); border-left:4px solid #E87722;"><div style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.6px; color:#6D6E71; font-weight:700; margin-bottom:4px;">Aderência Geral</div><div style="font-size:2rem; font-weight:800; color:${genColor}; line-height:1;">${generalAdh === null ? '—' : generalAdh + '%'}</div><div style="font-size:0.78rem; color:#6D6E71; margin-top:4px;">${totalApproved} aprovados / ${totalDecided} avaliações</div></div><div class="adherence-grid">${setorCards}</div>`;
}

// ==================== PENDENTES / VALIDADOS ====================
async function loadPendingCertificates() {
  const { data: certs, error } = await db.from('certificates').select('*, profiles!certificates_user_id_fkey(full_name, sector, role, is_master), goals(title, deadline, max_points, goal_type)').eq('status', 'pending').order('submitted_at', { ascending: true });
  const list = document.getElementById('pending-certs-list');
  if (error) { list.innerHTML = `<p style="color:#C8102E;">Erro: ${error.message}</p>`; return; }
  if (!certs || certs.length === 0) { list.innerHTML = '<p style="color:#6D6E71;">Nenhum certificado pendente.</p>'; return; }
  let visible = certs;
  if (isSupervisor && !canManageAll) visible = certs.filter(c => normalizeSector(c.profiles?.sector) === normalizeSector(currentProfile.sector));
  pendingCertsCache = {};
  for (let c of visible) {
    const { data } = await db.storage.from('certificates').createSignedUrl(c.file_url, 60 * 60);
    c.signedUrl = data?.signedUrl || '#';
    pendingCertsCache[c.id] = c;
  }
  if (visible.length === 0) { list.innerHTML = '<p style="color:#6D6E71;">Nenhum pendente no seu escopo.</p>'; return; }
  list.innerHTML = visible.map(c => {
    const isSup = (c.profiles?.role || '').toLowerCase() === 'supervisor';
    const roleTag = isSup ? ' ' + getRoleBadge(c.profiles.role, c.profiles.is_master) : '';
    return `<div class="cert-item">
      <div class="info">
        <div class="title">${escapeHtml(c.profiles?.full_name || 'Colaborador')}${roleTag} ${getSectorBadge(c.profiles?.sector)} — ${escapeHtml(c.goals?.title || 'Meta')}</div>
        <div class="meta">Enviado em ${formatDate(c.submitted_at)}</div>
        <div class="meta"><a href="${c.signedUrl}" target="_blank" style="color: #E87722; font-weight: bold; text-decoration: none;">📄 Ver ${escapeHtml(c.file_name || 'certificado')}</a></div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="small success" onclick="openApproveModal('${c.id}')">✅ Aprovar</button>
        <button class="small danger" onclick="validateCert('${c.id}', 'rejected')">❌ Rejeitar</button>
      </div>
    </div>`;
  }).join('');
}
async function loadValidatedCertificates() {
  const { data: certs } = await db.from('certificates').select('*, profiles!certificates_user_id_fkey(full_name, sector, role, is_master), goals(title)').neq('status', 'pending').order('validated_at', { ascending: false }).limit(30);
  const list = document.getElementById('validated-certs-list');
  if (!certs || certs.length === 0) { list.innerHTML = '<p style="color:#6D6E71;">Nenhuma validação realizada.</p>'; return; }
  let visible = certs;
  if (isSupervisor && !canManageAll) visible = certs.filter(c => normalizeSector(c.profiles?.sector) === normalizeSector(currentProfile.sector));
  if (visible.length === 0) { list.innerHTML = '<p style="color:#6D6E71;">Nenhuma no seu escopo.</p>'; return; }
  list.innerHTML = visible.map(c => {
    const isSup = (c.profiles?.role || '').toLowerCase() === 'supervisor';
    const roleTag = isSup ? ' ' + getRoleBadge(c.profiles.role, c.profiles.is_master) : '';
    return `<div class="cert-item">
      <div class="info">
        <div class="title">${escapeHtml(c.profiles?.full_name || '')}${roleTag} ${getSectorBadge(c.profiles?.sector)} — ${escapeHtml(c.goals?.title || '')}</div>
        <div class="meta">Validado em ${formatDate(c.validated_at)}</div>
      </div>
      <div>
        <span class="badge ${c.status}">${c.status === 'approved' ? 'Aprovado' : 'Rejeitado'}</span>
        ${c.status === 'approved' ? `<strong style="margin-left:8px; color:#158A49;">+${c.points_awarded} pts</strong>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ==================== MODAL APROVAÇÃO ====================
function openApproveModal(certId) {
  const cert = pendingCertsCache[certId];
  if (!cert) return showMessage('Certificado não encontrado.', 'error');
  pendingApproval = { certId };
  const maxPts = cert.goals?.max_points ?? 10;
  const sectorHtml = cert.profiles?.sector ? ` ${getSectorBadge(cert.profiles.sector)}` : '';
  document.getElementById('modal-info').innerHTML = `${escapeHtml(cert.profiles?.full_name || 'Colaborador')}${sectorHtml} — ${escapeHtml(cert.goals?.title || 'Meta')}`;
  const pointsInput = document.getElementById('modal-points');
  pointsInput.value = maxPts;
  pointsInput.max = maxPts;
  document.getElementById('modal-hint').textContent = `Nota máxima: ${maxPts} pontos (ajuste se necessário)`;
  document.getElementById('approve-modal').classList.remove('hidden');
  setTimeout(() => pointsInput.focus(), 60);
}
function closeApproveModal() { pendingApproval = null; document.getElementById('approve-modal').classList.add('hidden'); }
async function confirmApprove() {
  if (!pendingApproval) return;
  const pointsInput = document.getElementById('modal-points');
  const points = parseInt(pointsInput.value, 10);
  const maxPts = parseInt(pointsInput.max, 10);
  if (isNaN(points) || points < 0) return showMessage('Informe uma pontuação válida.', 'error');
  if (!isNaN(maxPts) && points > maxPts) return showMessage(`Máximo: ${maxPts} pontos.`, 'error');
  const certId = pendingApproval.certId;
  closeApproveModal();
  await validateCert(certId, 'approved', points);
}
async function validateCert(certId, status, manualPoints = null) {
  const { data: cert } = await db.from('certificates').select('*, goals(max_points, deadline)').eq('id', certId).single();
  if (!cert) return showMessage('Certificado não encontrado.', 'error');
  let points = 0;
  if (status === 'approved') {
    const maxPts = cert.goals?.max_points ?? 10;
    points = (manualPoints !== null && manualPoints !== undefined && !isNaN(manualPoints)) ? manualPoints : maxPts;
  }
  const { error } = await db.from('certificates').update({ status, validated_at: new Date().toISOString(), validated_by: currentUser.id, points_awarded: points }).eq('id', certId);
  if (error) return showMessage('Erro ao validar: ' + error.message, 'error');
  showMessage(status === 'approved' ? `Aprovado com ${points} ponto(s)!` : 'Rejeitado!', 'success');
  loadSectorComparisonAndRanking();
  loadPendingCertificates();
  loadValidatedCertificates();
}

// ==================== INIT ====================

// ===================== AVATAR DE PERFIL =====================
let selectedAvatarFile = null;

/**
 * Abre o modal de avatar.
 * Pode ser chamado clicando no avatar da sidebar ou da topbar.
 */
function openAvatarModal() {
  if (!currentUser || !currentProfile) return;

  selectedAvatarFile = null;
  document.getElementById('avatar-file-input').value = '';
  document.getElementById('avatar-file-name').textContent = '';
  document.getElementById('avatar-save-btn').disabled = true;

  // Preview inicial — mostra o avatar atual ou as iniciais
  const preview = document.getElementById('avatar-preview');
  if (currentProfile.avatar_url) {
    preview.style.backgroundImage = `url('${currentProfile.avatar_url}')`;
    preview.textContent = '';
  } else {
    preview.style.backgroundImage = '';
    preview.textContent = initials(currentProfile.full_name || currentUser.email);
  }

  document.getElementById('avatar-modal').classList.remove('hidden');
}

function closeAvatarModal() {
  document.getElementById('avatar-modal').classList.add('hidden');
  selectedAvatarFile = null;
}

/**
 * Quando o usuário escolhe o arquivo, valida e mostra preview.
 */
function onAvatarFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Valida tamanho (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showMessage('Imagem muito grande. Máximo 5MB.', 'error');
    event.target.value = '';
    return;
  }

  // Valida tipo
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    showMessage('Formato inválido. Use JPG, PNG ou WEBP.', 'error');
    event.target.value = '';
    return;
  }

  selectedAvatarFile = file;
  document.getElementById('avatar-file-name').textContent = '✓ ' + file.name;
  document.getElementById('avatar-save-btn').disabled = false;

  // Preview usando FileReader
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('avatar-preview');
    preview.style.backgroundImage = `url('${e.target.result}')`;
    preview.textContent = '';
  };
  reader.readAsDataURL(file);
}

/**
 * Faz o upload da foto e salva no banco.
 */
async function saveAvatar() {
  if (!selectedAvatarFile) return;

  const btn = document.getElementById('avatar-save-btn');
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    const ext = selectedAvatarFile.name.split('.').pop().toLowerCase();
    // ⚠️ O nome da pasta PRECISA ser o user_id por causa da policy do Storage
    const filePath = `${currentUser.id}/avatar.${ext}`;

    // 1) Upload pro Supabase Storage (upsert substitui se já existir)
    const { error: upErr } = await db.storage
      .from('avatars')
      .upload(filePath, selectedAvatarFile, {
        upsert: true,
        contentType: selectedAvatarFile.type,
        cacheControl: '3600'
      });

    if (upErr) throw upErr;

    // 2) Pega a URL pública e adiciona timestamp para evitar cache
    const { data: pub } = db.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = pub.publicUrl + '?t=' + Date.now();

    // 3) Salva no perfil do usuário
    const { error: dbErr } = await db
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', currentUser.id);

    if (dbErr) throw dbErr;

    // 4) Atualiza o estado local e a UI
    currentProfile.avatar_url = publicUrl;
    applyAvatarToUI(currentProfile.full_name || currentUser.email, publicUrl);

    showMessage('Foto atualizada! ✅', 'success');
    closeAvatarModal();

  } catch (e) {
    console.error('Erro ao salvar avatar:', e);
    showMessage('Erro: ' + (e.message || 'falha no upload'), 'error');
    btn.disabled = false;
    btn.textContent = 'Salvar Foto';
  }
}

/**
 * Aplica a foto (ou iniciais) nos avatares da sidebar e topbar.
 */
function applyAvatarToUI(name, url) {
  const sidebarAvatar = document.getElementById('user-avatar');
  const topbarAvatar = document.getElementById('topbar-avatar');
  const ini = initials(name);

  [sidebarAvatar, topbarAvatar].forEach(el => {
    if (!el) return;
    if (url) {
      el.style.backgroundImage = `url('${url}')`;
      el.textContent = '';
    } else {
      el.style.backgroundImage = '';
      el.textContent = ini;
    }
  });
}
db.auth.onAuthStateChange((event, session) => { if (event === 'SIGNED_IN' && session) loadUser(); });
loadUser();
