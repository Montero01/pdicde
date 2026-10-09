// ==================== CONFIG ====================
const SUPABASE_URL = 'https://whjyvphamkbjcrdzhzoc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EyZgqDQTSV-M-O3_l63V7Q_LFcFDl69';
const PDI_URL = 'https://montero01.github.io/pdicde/';  // ajuste se necessário
const BUCKET = 'academy';

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
let currentView = 'home';
let allCourses = [];
let myEnrollments = [];
let completions = [];
let searchTerm = '';
let selectedCourse = null;
let isProfessor = false;
let canManage = false;

let editingCourseId = null;
let editingModuleId = null;
let editingModuleCourseId = null;
let editingLessonId = null;
let editingLessonModuleId = null;
let editingQuizLessonId = null;
let quizQuestions = [];
let currentEditorCourseId = null;
let currentEditorModules = [];
let editingCourseCoverUrl = null;

let playerCourse = null;
let playerLessons = [];
let playerIndex = -1;
let playerStartedAt = null;
let playerTickInterval = null;

let certificateData = null;

// ===================== AVATAR DE PERFIL =====================
let selectedAvatarFile = null;

function openAvatarModal() {
  if (!currentUser || !currentProfile) return;

  selectedAvatarFile = null;
  document.getElementById('avatar-file-input').value = '';
  document.getElementById('avatar-file-name').textContent = '';
  document.getElementById('avatar-save-btn').disabled = true;

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

function onAvatarFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showMessage('Imagem muito grande. Máximo 5MB.', 'error');
    event.target.value = '';
    return;
  }

  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    showMessage('Formato inválido. Use JPG, PNG ou WEBP.', 'error');
    event.target.value = '';
    return;
  }

  selectedAvatarFile = file;
  document.getElementById('avatar-file-name').textContent = '✓ ' + file.name;
  document.getElementById('avatar-save-btn').disabled = false;

  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('avatar-preview');
    preview.style.backgroundImage = `url('${e.target.result}')`;
    preview.textContent = '';
  };
  reader.readAsDataURL(file);
}

async function saveAvatar() {
  if (!selectedAvatarFile) return;

  const btn = document.getElementById('avatar-save-btn');
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    const ext = selectedAvatarFile.name.split('.').pop().toLowerCase();
    const filePath = `${currentUser.id}/avatar.${ext}`;

    const { error: upErr } = await db.storage
      .from('avatars')
      .upload(filePath, selectedAvatarFile, {
        upsert: true,
        contentType: selectedAvatarFile.type,
        cacheControl: '3600'
      });

    if (upErr) throw upErr;

    const { data: pub } = db.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = pub.publicUrl + '?t=' + Date.now();

    const { error: dbErr } = await db
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', currentUser.id);

    if (dbErr) throw dbErr;

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

// ==================== TEMA (DARK / LIGHT) ====================
function initTheme() {
  const saved = localStorage.getItem('cde-academy-theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  updateThemeIcon();
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('cde-academy-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('cde-academy-theme', 'dark');
  }
  updateThemeIcon();
}

function updateThemeIcon() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const icon = document.getElementById('theme-icon');
  const btn = document.getElementById('theme-toggle');
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
  if (btn) btn.title = isDark ? 'Ativar tema claro' : 'Ativar tema escuro';
}

// ==================== HELPERS ====================
function showMessage(text, type = 'success') {
  const box = document.getElementById('message-box');
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  div.textContent = text;
  box.appendChild(div);
  setTimeout(() => div.remove(), 4500);
}
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function initials(name) {
  if (!name) return 'CD';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function roleLabel(role) {
  const r = (role || '').toLowerCase();
  if (r === 'supervisor') return 'Supervisor';
  if (r.includes('diretor') || r.includes('director') || r === 'diretoria') return 'Diretoria';
  if (r === 'master') return 'Master';
  return 'Colaborador';
}
function goToPDI() { window.location.href = PDI_URL; }

/**
 * Converte qualquer URL de vídeo (YouTube, Vimeo, Google Drive) para o formato de embed.
 */
function getVideoEmbedUrl(url) {
  if (!url) return null;
  url = url.trim();
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  if (url.includes('/embed/') || url.includes('/preview') || url.includes('player.vimeo.com')) return url;
  return null;
}

// ==================== NAVEGAÇÃO ====================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
  window.scrollTo(0, 0);
  renderView(view);
}
function renderView(view) {
  const main = document.getElementById('main-content');
  switch (view) {
    case 'home':         main.innerHTML = renderHome(); break;
    case 'empresa':      main.innerHTML = renderEmpresa(); break;
    case 'mycourses':    main.innerHTML = renderMyCourses(); break;
    case 'catalog':      main.innerHTML = renderCatalog(); break;
    case 'certificates': main.innerHTML = renderCertificates(); break;
    case 'report':       main.innerHTML = renderReport(); break;
    case 'manage':       main.innerHTML = renderManageCourses(); break;
    case 'analytics':    renderAnalyticsView(); break;
    default:             main.innerHTML = renderHome();
  }
}
function onSearchInput() {
  searchTerm = (document.getElementById('global-search').value || '').toLowerCase().trim();
  if (['home', 'catalog', 'mycourses'].includes(currentView)) renderView(currentView);
}

// ==================== AUTH ====================
async function boot() {
  const { data: { session }, error } = await db.auth.getSession();
  if (error || !session) {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('redirect-view').classList.remove('hidden');
    setTimeout(() => { window.location.href = PDI_URL; }, 5000);
    return;
  }
  currentUser = session.user;
  await loadUser();
}
async function loadUser() {
  const { data: profile, error } = await db.from('profiles').select('*').eq('id', currentUser.id).single();
  if (error || !profile) {
    showMessage('Perfil não encontrado. Redirecionando…', 'error');
    setTimeout(() => { window.location.href = PDI_URL; }, 2500);
    return;
  }
  currentProfile = profile;

  const roleLower = (profile.role || '').toLowerCase();
  const isMaster = profile.is_master === true || roleLower === 'master';
  const isDiretor = roleLower.includes('diretor') || roleLower.includes('director') || roleLower === 'diretoria';
  isProfessor = profile.is_professor === true;
  canManage = isProfessor || isMaster || isDiretor;

  document.getElementById('splash').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');

  const name = profile.full_name || currentUser.email;
  const ini = initials(name);
  document.getElementById('user-avatar').textContent = ini;
  document.getElementById('topbar-avatar').textContent = ini;
  document.getElementById('user-name').textContent = name;
  const posEl = document.getElementById('user-position');
  if (posEl) posEl.textContent = profile.position || '';

  applyAvatarToUI(name, profile.avatar_url || null);
  document.getElementById('user-role').textContent = isProfessor ? 'Professor Master' : roleLabel(profile.role);

  const sectorEl = document.getElementById('user-sector');
  if (profile.sector) { sectorEl.textContent = profile.sector; sectorEl.classList.remove('hidden'); }

  if (canManage) {
    document.getElementById('nav-manage').classList.remove('hidden');
    document.getElementById('nav-analytics').classList.remove('hidden');
  }

  await loadTopbarPoints();
  await loadCourses();
  await loadMyEnrollments();
  await loadCompletions();

  renderView('home');
}
async function logout() {
  if (!confirm('Sair da CDE Academy? Você será redirecionado para o PDI.')) return;
  await db.auth.signOut();
  window.location.href = PDI_URL;
}

// ==================== DATA LOADING ====================
async function loadTopbarPoints() {
  try {
    const { data } = await db.from('certificates').select('points_awarded').eq('user_id', currentUser.id).eq('status', 'approved');
    const total = (data || []).reduce((s, c) => s + (c.points_awarded || 0), 0);
    document.getElementById('topbar-points').textContent = `${total} pts`;
  } catch (e) { document.getElementById('topbar-points').textContent = '0 pts'; }
}
async function loadCourses() {
  try {
    const { data, error } = await db.from('academy_courses').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allCourses = data || [];
  } catch (e) { allCourses = []; }
}
async function loadMyEnrollments() {
  try {
    const { data, error } = await db.from('academy_enrollments').select('*, academy_courses(*)').eq('user_id', currentUser.id);
    if (error) throw error;
    const enrolls = data || [];
    myEnrollments = await Promise.all(enrolls.map(async (e) => {
      const course = e.academy_courses;
      if (!course) return null;
      const progress = await calcCourseProgress(currentUser.id, course.id);
      return { course, progress, status: e.status };
    }));
    myEnrollments = myEnrollments.filter(Boolean);
  } catch (e) { myEnrollments = []; }
}
async function loadCompletions() {
  try {
    const { data, error } = await db.from('academy_completions').select('*, academy_courses(title)').eq('user_id', currentUser.id).order('completed_at', { ascending: false });
    if (error) throw error;
    completions = data || [];
  } catch (e) { completions = []; }
}
async function calcCourseProgress(userId, courseId) {
  try {
    const { data: mods } = await db.from('academy_modules').select('id').eq('course_id', courseId);
    const modIds = (mods || []).map(m => m.id);
    if (modIds.length === 0) return { done: 0, total: 0, pct: 0 };
    const { data: lessons } = await db.from('academy_lessons').select('id').in('module_id', modIds);
    const lessonIds = (lessons || []).map(l => l.id);
    const total = lessonIds.length;
    if (total === 0) return { done: 0, total: 0, pct: 0 };
    const { data: done } = await db.from('academy_progress').select('lesson_id').eq('user_id', userId).in('lesson_id', lessonIds);
    const doneCount = (done || []).length;
    return { done: doneCount, total, pct: Math.round((doneCount / total) * 100) };
  } catch (e) { return { done: 0, total: 0, pct: 0 }; }
}

// ==================== VIEWS DO ALUNO ====================
function renderHome() {
  const enrolled = filterCourses(myEnrollments);
  const heroCourse = allCourses[0] || { title: 'Bem-vindo à CDE Academy', description: 'Explore os cursos e desenvolva suas habilidades.' };
  return `
    <section class="hero-banner">
      <div class="hero-content">
        <span class="hero-tag">✨ Destaque</span>
        <h1>${escapeHtml(heroCourse.title)}</h1>
        <p>${escapeHtml(heroCourse.description)}</p>
        <button class="hero-btn" onclick="switchView('catalog')">Explorar cursos →</button>
      </div>
    </section>
    <div class="section-header">
      <h2>Cursos para você fazer</h2>
      <span class="section-sub">Treinamentos liberados para você</span>
    </div>
    ${enrolled.length === 0 ? renderEmpty('📭', 'Nenhum curso liberado ainda. Aguarde seu supervisor.') : `<div class="courses-grid">${enrolled.map(renderCourseCard).join('')}</div>`}
    ${allCourses.length > 0 && enrolled.length < allCourses.length ? `
      <div class="section-header">
        <h2>Catálogo completo</h2>
        <span class="section-sub">${allCourses.length} curso${allCourses.length === 1 ? '' : 's'}</span>
      </div>
      <div class="courses-grid">${allCourses.filter(c => !myEnrollments.some(e => e.course.id === c.id)).slice(0, 6).map(c => renderCatalogCard(c)).join('')}</div>
    ` : ''}
  `;
}
function renderMyCourses() {
  const enrolled = filterCourses(myEnrollments);
  if (enrolled.length === 0) return `<div class="section-header"><h2>Meus Cursos</h2></div>${renderEmpty('📚', 'Você ainda não está matriculado em nenhum curso.')}`;
  return `<div class="section-header"><h2>Meus Cursos</h2><span class="section-sub">${enrolled.length} curso${enrolled.length === 1 ? '' : 's'}</span></div><div class="courses-grid">${enrolled.map(renderCourseCard).join('')}</div>`;
}
function renderCatalog() {
  let courses = allCourses.filter(c => c.is_published !== false);
  if (searchTerm) courses = courses.filter(c => (c.title || '').toLowerCase().includes(searchTerm) || (c.description || '').toLowerCase().includes(searchTerm));
  if (courses.length === 0) return `<div class="section-header"><h2>Catálogo de Cursos</h2></div>${renderEmpty('🔍', searchTerm ? 'Nenhum curso encontrado.' : 'Nenhum curso publicado ainda.')}`;
  return `<div class="section-header"><h2>Catálogo de Cursos</h2><span class="section-sub">${courses.length} disponíve${courses.length === 1 ? 'l' : 'is'}</span></div><div class="courses-grid">${courses.map(c => renderCatalogCard(c)).join('')}</div>`;
}
function renderCertificates() {
  if (completions.length === 0) return `<div class="section-header"><h2>Certificados</h2></div>${renderEmpty('🎓', 'Você ainda não concluiu nenhum curso.')}`;
  return `<div class="section-header"><h2>Certificados</h2><span class="section-sub">${completions.length} conquistado${completions.length === 1 ? '' : 's'}</span></div>
    <div class="courses-grid">${completions.map(c => `
      <div class="course-card" style="cursor:default;">
        <div class="course-cover" style="background: linear-gradient(135deg, #158A49 0%, #0E6B39 100%);">🎓<span class="course-badge concluido">Concluído</span></div>
        <div class="course-body">
          <h3>${escapeHtml(c.academy_courses?.title || 'Curso')}</h3>
          <p>Emitido em ${new Date(c.completed_at).toLocaleDateString('pt-BR')}.</p>
          <div class="course-meta"><span class="tag">🔑 ${escapeHtml(c.certificate_code || '—')}</span></div>
          <button class="btn-success" style="margin-top: 12px; padding: 10px;" onclick="openCertificateModal('${c.course_id}')">📥 Baixar Certificado</button>
        </div>
      </div>
    `).join('')}</div>`;
}
function renderReport() {
  const totalEnrolled = myEnrollments.length;
  const completed = myEnrollments.filter(e => e.progress.pct >= 100).length;
  const inProgress = myEnrollments.filter(e => e.progress.pct > 0 && e.progress.pct < 100).length;
  const completionRate = totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0;
  const statCard = (label, value, color, emoji) => `
    <div class="stat-card">
      <div class="stat-icon">${emoji}</div>
      <div class="stat-value" style="color: ${color};">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
  return `
    <div class="section-header"><h2>Meu Desempenho</h2></div>
    <div class="stats-grid">
      ${statCard('Cursos matriculados', totalEnrolled, 'var(--roxo-medio)', '📚')}
      ${statCard('Concluídos', completed, 'var(--verde)', '✅')}
      ${statCard('Em andamento', inProgress, 'var(--cde-laranja)', '⏳')}
      ${statCard('Taxa de conclusão', completionRate + '%', 'var(--cde-vermelho)', '📈')}
    </div>
    <div style="background: var(--branco); border-radius:14px; padding:22px; border:1px solid var(--cinza-borda);">
      <h3 style="font-size: 1rem; margin-bottom: 14px;">📊 Progresso por curso</h3>
      ${totalEnrolled === 0 ? '<p style="color: var(--texto-soft);">Sem cursos.</p>' :
        myEnrollments.map(e => `
          <div style="padding: 12px 0; border-bottom: 1px solid var(--cinza-borda); display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
              <div style="font-weight: 700; font-size: 0.9rem;">${escapeHtml(e.course.title)}</div>
              <div style="font-size: 0.78rem; color: var(--texto-soft); margin-top: 3px;">${e.progress.done} de ${e.progress.total} aulas</div>
            </div>
            <div style="font-weight: 800; color: ${e.progress.pct >= 100 ? 'var(--verde)' : 'var(--cde-laranja-escuro)'};">${e.progress.pct}%</div>
          </div>`).join('')}
    </div>`;
}

// ==================== NOSSA EMPRESA ====================
function renderEmpresa() {
  const IMG_1 = 'https://casadosespelhos.com.br/wp-content/uploads/2020/03/WhatsApp-Image-2025-09-03-at-20.22.26.jpeg';
  const IMG_2 = 'https://casadosespelhos.com.br/wp-content/uploads/2020/03/WhatsApp-Image-2025-09-03-at-20.22.25.jpeg';

  return `
    <section class="hero-banner" style="min-height:200px;">
      <div class="hero-content">
        <span class="hero-tag">🏢 Sobre nós</span>
        <h1>Nossa Empresa</h1>
        <p>Conheça um pouco da história, dos valores e da trajetória da CDE Blindex AM.</p>
      </div>
    </section>

    <div class="section-header">
      <h2>Nossa História</h2>
      <span class="section-sub">Conheça nossa diretora Kilze Krauss</span>
    </div>

    <div style="background: var(--branco); border-radius:14px; padding:26px; border:1px solid var(--cinza-borda); box-shadow: var(--sombra-sm); margin-bottom:26px;">
      <p style="font-size:0.95rem; color:var(--texto-soft); line-height:1.75; margin-bottom:16px;">
        Sua trajetória se confunde com a própria história da CDE Blindex®, que completa quase 50 anos de mercado e se consolidou como referência em soluções de vidros modernos para a região.
      </p>
      <p style="font-size:0.95rem; color:var(--texto-soft); line-height:1.75; margin-bottom:16px;">
        Kilze ocupa um lugar singular: é a única mulher no comando de uma linha de têmpera de vidros no estado do Amazonas, o que a torna não apenas uma gestora de destaque, mas também uma referência para outras mulheres que sonham em ocupar espaços de liderança em setores tradicionalmente masculinos. Sua atuação firme, visionária e inspiradora mostra que competência e sensibilidade podem caminhar juntas na construção de resultados sólidos.
      </p>
      <p style="font-size:0.95rem; color:var(--texto-soft); line-height:1.75;">
        Durante seus mais de 10 anos de liderança, Kilze Krauss foi responsável por transformar a CDE Blindex® em um verdadeiro polo de excelência. Uma de suas principais conquistas foi a associação da empresa à marca Blindex®, líder mundial em soluções em vidros de segurança e design, o que elevou ainda mais o padrão de qualidade e credibilidade da companhia perante clientes e parceiros. Além disso, investiu fortemente em marketing, comunicação e educação do mercado, posicionando a CDE Blindex® como uma empresa próxima, transparente e comprometida com a inovação.
      </p>
    </div>

    <div class="section-header">
      <h2>Nossa Trajetória em Imagens</h2>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:18px; margin-bottom:26px;">
      <figure style="background: var(--branco); border-radius:14px; overflow:hidden; border:1px solid var(--cinza-borda); box-shadow:var(--sombra-sm);">
        <img src="${IMG_1}" alt="Marca CDE" style="width:100%; height:240px; object-fit:cover; display:block; background: var(--branco);">
        <figcaption style="padding:14px 16px; font-size:0.85rem; color:var(--texto-soft); font-weight:600;">
          À frente da CDE Blindex® há mais de uma década, Kilze Krauss tem conduzido a empresa por um caminho de inovação, qualidade e liderança no setor de vidros no Amazonas.
        </figcaption>
      </figure>

      <figure style="background: var(--branco); border-radius:14px; overflow:hidden; border:1px solid var(--cinza-borda); box-shadow:var(--sombra-sm);">
        <img src="${IMG_2}" alt="Nossa equipe" style="width:100%; height:240px; object-fit:cover; display:block;">
        <figcaption style="padding:14px 16px; font-size:0.85rem; color:var(--texto-soft); font-weight:600;">
          Kilze acredita que o maior patrimônio da CDE Blindex® são as pessoas. Por isso, dedica atenção especial à valorização da equipe, investindo em treinamentos, integração e no desenvolvimento contínuo de seus colaboradores. Para ela, qualidade começa dentro de casa, com profissionais motivados, engajados e orgulhosos de fazer parte da história da empresa. Essa visão humanizada é um dos diferenciais de sua gestão e uma das razões pelas quais a CDE Blindex® mantém uma posição de destaque no mercado.
        </figcaption>
      </figure>
    </div>

    <div class="section-header">
      <h2>Nossos Valores</h2>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px;">
      ${renderValoresCards()}
    </div>
  `;
}

function renderValoresCards() {
  const valores = [
    { emoji: '🤝', titulo: 'Missão',      desc: 'Fabricar vidros BLINDEX® com qualidade, proporcionando segurança às pessoas.' },
    { emoji: '🎯', titulo: 'Visão',       desc: 'Ser referência em vidros de qualidade no AMAZONAS' },
    { emoji: '🌱', titulo: 'Valores',     desc: 'Excelência e Qualidade | Respeito aos clientes, parceiros e colaboradores | Integridade | Segurança.' }
  ];
  let html = '';
  for (const v of valores) {
    html += '<div style="background: var(--branco); border-radius:14px; padding:20px; border:1px solid var(--cinza-borda); box-shadow:var(--sombra-sm);">';
    html += '<div style="font-size:1.8rem; margin-bottom:8px;">' + v.emoji + '</div>';
    html += '<div style="font-weight:800; font-size:0.95rem; margin-bottom:6px;">' + v.titulo + '</div>';
    html += '<div style="font-size:0.82rem; color:var(--texto-soft); line-height:1.5;">' + v.desc + '</div>';
    html += '</div>';
  }
  return html;
}

// ==================== HELPERS DE RENDER ====================
function renderEmpty(emoji, msg) { return `<div class="state-box"><span class="emoji">${emoji}</span>${escapeHtml(msg)}</div>`; }
function filterCourses(list) {
  if (!searchTerm) return list;
  return list.filter(e => (e.course.title || '').toLowerCase().includes(searchTerm) || (e.course.description || '').toLowerCase().includes(searchTerm));
}
function renderCourseCard(enrollment) {
  const c = enrollment.course; const p = enrollment.progress;
  let badgeClass = 'novo', badgeText = 'Novo';
  if (p.pct >= 100) { badgeClass = 'concluido'; badgeText = 'Concluído'; }
  else if (p.pct > 0) { badgeClass = 'progresso'; badgeText = p.pct + '%'; }
  const coverStyle = c.cover_url ? `background-image: url('${escapeHtml(c.cover_url)}'); background-size: cover; background-position: center;` : '';
  const coverContent = c.cover_url ? '' : '📘';
  return `
    <div class="course-card" onclick="openCourseModal('${c.id}')">
      <div class="course-cover" style="${coverStyle}"><span class="course-badge ${badgeClass}">${badgeText}</span>${coverContent}</div>
      <div class="course-body">
        <h3>${escapeHtml(c.title)}</h3>
        <p>${escapeHtml(c.description || 'Sem descrição.')}</p>
        <div class="course-meta">
          <span class="tag">⏱ ${c.workload_hours || 1}h</span>
          ${c.sector ? `<span class="tag">🏷 ${escapeHtml(c.sector)}</span>` : ''}
        </div>
        <div class="course-progress"><div class="course-progress-fill" style="width:${p.pct}%"></div></div>
      </div>
    </div>`;
}
function renderCatalogCard(course) {
  const coverStyle = course.cover_url ? `background-image: url('${escapeHtml(course.cover_url)}'); background-size: cover; background-position: center;` : '';
  const coverContent = course.cover_url ? '' : '📘';
  return `
    <div class="course-card" onclick="openCourseModal('${course.id}')">
      <div class="course-cover" style="${coverStyle}"><span class="course-badge">Catálogo</span>${coverContent}</div>
      <div class="course-body">
        <h3>${escapeHtml(course.title)}</h3>
        <p>${escapeHtml(course.description || 'Sem descrição.')}</p>
        <div class="course-meta">
          <span class="tag">⏱ ${course.workload_hours || 1}h</span>
          ${course.sector ? `<span class="tag">🏷 ${escapeHtml(course.sector)}</span>` : ''}
        </div>
      </div>
    </div>`;
}

// ==================== MODAL DE CURSO ====================
async function openCourseModal(courseId) {
  let course = null;
  const enrollment = myEnrollments.find(e => e.course.id === courseId);
  if (enrollment) course = enrollment.course;
  else course = allCourses.find(c => c.id === courseId);
  if (!course) return showMessage('Curso não encontrado.', 'error');
  selectedCourse = { course, enrollment };

  document.getElementById('cm-title').textContent = course.title;
  document.getElementById('cm-subtitle').textContent = `${course.workload_hours || 1}h${course.sector ? ' • ' + course.sector : ''}`;

  let modules = [];
  try {
    const { data: mods } = await db.from('academy_modules').select('*').eq('course_id', course.id).order('order_index');
    modules = mods || [];
  } catch (e) { /* silent */ }

  const body = document.getElementById('cm-body');
  if (modules.length === 0) {
    body.innerHTML = `<p style="color: var(--texto-soft); font-size: 0.9rem;">${escapeHtml(course.description || 'Conteúdo em preparação.')}</p>`;
  } else {
    let html = `<p style="color: var(--texto-soft); font-size: 0.9rem; margin-bottom: 16px;">${escapeHtml(course.description || '')}</p>`;
    if (enrollment) {
      const { data: prog } = await db.from('academy_progress').select('lesson_id').eq('user_id', currentUser.id);
      const doneSet = new Set((prog || []).map(p => p.lesson_id));
      html += `<div style="font-size: 0.8rem; font-weight: 700; color: var(--texto-soft); text-transform: uppercase; margin-bottom: 10px;">Conteúdo do curso</div>`;
      for (const m of modules) {
        html += `<div style="font-weight: 700; font-size: 0.85rem; margin: 14px 0 8px;">📦 ${escapeHtml(m.title)}</div>`;
        const { data: lessons } = await db.from('academy_lessons').select('*').eq('module_id', m.id).order('order_index');
        (lessons || []).forEach(l => {
          const done = doneSet.has(l.id);
          const icons = { pdf: '📄', video: '🎬', slides: '📊', image: '🖼️', text: '📝' };
          html += `
            <div style="padding: 10px 12px; background: ${done ? 'var(--verde-bg)' : 'var(--cinza-bg)'}; border-radius: 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; gap: 10px; cursor: pointer;" onclick="closeCourseModal(); openLessonPlayer('${course.id}','${l.id}')">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.1rem;">${done ? '✅' : (icons[l.content_type] || '📄')}</span>
                <div>
                  <div style="font-weight: 600; font-size: 0.88rem;">${escapeHtml(l.title)}</div>
                  ${l.has_quiz ? '<div style="font-size: 0.7rem; color: var(--cde-laranja-escuro); font-weight: 700;">📝 COM QUIZ</div>' : ''}
                </div>
              </div>
              <span style="color: var(--cde-laranja-escuro); font-weight: 700; font-size: 0.85rem;">${done ? 'Rever' : 'Abrir'} →</span>
            </div>`;
        });
      }
    } else {
      html += modules.map((m, i) => `<div style="padding: 10px 12px; background: var(--cinza-bg); border-radius: 10px; margin-bottom: 8px; display: flex; gap: 10px; align-items: center;"><span style="font-weight: 800; color: var(--cde-laranja);">M${i + 1}</span><span style="font-weight: 600; font-size: 0.88rem;">${escapeHtml(m.title)}</span></div>`).join('');
    }
    body.innerHTML = html;
  }

  const btn = document.getElementById('cm-action');
  if (enrollment) {
    btn.textContent = 'Ver primeira aula →';
    btn.onclick = async () => {
      closeCourseModal();
      const allLessons = await getAllLessonsOfCourse(course.id);
      const { data: prog } = await db.from('academy_progress').select('lesson_id').eq('user_id', currentUser.id);
      const doneSet = new Set((prog || []).map(p => p.lesson_id));
      const next = allLessons.find(l => !doneSet.has(l.id)) || allLessons[0];
      if (next) openLessonPlayer(course.id, next.id);
    };
  } else {
    btn.textContent = 'Ver detalhes →';
    btn.onclick = () => showMessage('Peça ao seu supervisor para matricular você neste curso.', 'info');
  }
  document.getElementById('course-modal').classList.remove('hidden');
}
function closeCourseModal() { document.getElementById('course-modal').classList.add('hidden'); selectedCourse = null; }

async function getAllLessonsOfCourse(courseId) {
  const { data: mods } = await db.from('academy_modules').select('id').eq('course_id', courseId).order('order_index');
  const modIds = (mods || []).map(m => m.id);
  if (modIds.length === 0) return [];
  const { data: lessons } = await db.from('academy_lessons').select('*').in('module_id', modIds).order('order_index');
  const orderMap = {};
  (mods || []).forEach((m, i) => orderMap[m.id] = i);
  return (lessons || []).sort((a, b) => {
    if (orderMap[a.module_id] !== orderMap[b.module_id]) return orderMap[a.module_id] - orderMap[b.module_id];
    return (a.order_index || 0) - (b.order_index || 0);
  });
}

// ==================== PLAYER DE AULA ====================
async function openLessonPlayer(courseId, lessonId) {
  const course = allCourses.find(c => c.id === courseId) || (myEnrollments.find(e => e.course.id === courseId)?.course);
  if (!course) return showMessage('Curso não encontrado.', 'error');
  playerCourse = course;
  playerLessons = await getAllLessonsOfCourse(courseId);
  playerIndex = playerLessons.findIndex(l => l.id === lessonId);
  if (playerIndex < 0) playerIndex = 0;
  document.getElementById('lesson-player').classList.remove('hidden');
  await renderLessonInPlayer();
}

async function renderLessonInPlayer() {
  const lesson = playerLessons[playerIndex];
  if (!lesson) return;

  document.getElementById('player-lesson-title').textContent = lesson.title;
  document.getElementById('player-course-title').textContent = playerCourse.title;
  const typeLabel = { pdf: 'PDF', video: 'Vídeo', slides: 'Slides', image: 'Imagem', text: 'Texto' }[lesson.content_type] || 'Aula';
  document.getElementById('player-lesson-badge').textContent = typeLabel;

  const pct = playerLessons.length > 0 ? Math.round(((playerIndex + 1) / playerLessons.length) * 100) : 0;
  document.getElementById('player-progress-fill').style.width = pct + '%';

  document.getElementById('btn-prev-lesson').disabled = (playerIndex <= 0);
  document.getElementById('btn-next-lesson').disabled = (playerIndex >= playerLessons.length - 1);

  const { data: existing } = await db.from('academy_progress').select('*').eq('user_id', currentUser.id).eq('lesson_id', lesson.id).maybeSingle();
  const btnComplete = document.getElementById('btn-complete-lesson');
  if (existing) {
    btnComplete.textContent = '✅ Aula concluída';
    btnComplete.classList.add('done');
    btnComplete.disabled = true;
  } else {
    btnComplete.textContent = '✓ Marcar como concluída';
    btnComplete.classList.remove('done');
    btnComplete.disabled = false;
  }

  playerStartedAt = Date.now();
  await upsertLessonView(lesson.id, false);

  if (playerTickInterval) clearInterval(playerTickInterval);
  playerTickInterval = setInterval(async () => {
    const elapsed = Math.floor((Date.now() - playerStartedAt) / 1000);
    await upsertLessonView(lesson.id, false, elapsed);
  }, 15000);

  const body = document.getElementById('player-body');
  const type = lesson.content_type || 'text';
  let contentHtml = '';

  if (type === 'video' && lesson.content_url) {
    const embedUrl = getVideoEmbedUrl(lesson.content_url);
    contentHtml = `
      <div class="content-viewer" style="background: #000; padding: 0;">
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
          <iframe src="${escapeHtml(embedUrl)}"
                  style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen></iframe>
        </div>
      </div>
    `;
  } else if (type === 'pdf' && lesson.content_url) {
    contentHtml = `<div class="content-viewer"><iframe class="pdf-frame" src="${escapeHtml(lesson.content_url)}"></iframe></div>`;
  } else if (type === 'slides' && lesson.content_url) {
    contentHtml = `<div class="content-viewer"><iframe class="slides-frame" src="${escapeHtml(lesson.content_url)}" allowfullscreen></iframe></div>`;
  } else if (type === 'image' && lesson.content_url) {
    contentHtml = `<div class="content-viewer"><img src="${escapeHtml(lesson.content_url)}" alt="${escapeHtml(lesson.title)}"></div>`;
  } else {
    contentHtml = `<div class="content-viewer"><div class="text-content">${lesson.content_text || '<p>Sem conteúdo.</p>'}</div></div>`;
  }

  let quizHtml = '';
  if (lesson.has_quiz) {
    const { data: questions } = await db.from('academy_quizzes').select('*').eq('lesson_id', lesson.id).order('order_index');
    if (questions && questions.length > 0) {
      const qParts = [];
      for (const q of questions) {
        const { data: opts } = await db.from('academy_quiz_options').select('*').eq('quiz_id', q.id).order('order_index');
        const optHtml = (opts || []).map(o => `
          <label class="player-quiz-option" data-quiz="${q.id}" data-opt="${o.id}">
            <input type="radio" name="pq-${q.id}" value="${o.id}">
            <span>${escapeHtml(o.option_text)}</span>
          </label>
        `).join('');
        qParts.push(`
          <div class="player-quiz-question">
            <div class="q-text">${escapeHtml(q.question)}</div>
            ${optHtml}
          </div>
        `);
      }
      quizHtml = `
        <div class="quiz-block">
          <h3>📝 Quiz de Fixação</h3>
          <div class="quiz-sub">Responda todas as perguntas. A nota mínima é 70%.</div>
          ${qParts.join('')}
          <button class="btn-primary" style="margin-top: 12px; width: 100%; padding: 12px;" onclick="submitPlayerQuiz()">Enviar Respostas</button>
          <div id="player-quiz-result"></div>
        </div>
      `;
    }
  }

  body.innerHTML = contentHtml + quizHtml;
  body.scrollTop = 0;
}

async function upsertLessonView(lessonId, completed, timeSpent) {
  try {
    const { data: existing } = await db.from('academy_lesson_views').select('*').eq('user_id', currentUser.id).eq('lesson_id', lessonId).maybeSingle();
    if (existing) {
      await db.from('academy_lesson_views').update({
        last_seen_at: new Date().toISOString(),
        time_spent_seconds: (existing.time_spent_seconds || 0) + (timeSpent || 0),
        completed: completed || existing.completed
      }).eq('id', existing.id);
    } else {
      await db.from('academy_lesson_views').insert({
        user_id: currentUser.id,
        lesson_id: lessonId,
        course_id: playerCourse.id,
        time_spent_seconds: timeSpent || 0,
        completed: completed || false
      });
    }
  } catch (e) { /* silent */ }
}

function gotoPrevLesson() { if (playerIndex > 0) { playerIndex--; renderLessonInPlayer(); } }
function gotoNextLesson() { if (playerIndex < playerLessons.length - 1) { playerIndex++; renderLessonInPlayer(); } }
async function closeLessonPlayer() {
  if (playerLessons[playerIndex]) {
    const elapsed = Math.floor((Date.now() - playerStartedAt) / 1000);
    await upsertLessonView(playerLessons[playerIndex].id, false, elapsed);
  }
  if (playerTickInterval) { clearInterval(playerTickInterval); playerTickInterval = null; }
  document.getElementById('lesson-player').classList.add('hidden');
  playerCourse = null; playerLessons = []; playerIndex = -1; playerStartedAt = null;
  await loadMyEnrollments();
  await loadCompletions();
  renderView(currentView);
}

async function completeCurrentLesson() {
  const lesson = playerLessons[playerIndex];
  if (!lesson) return;
  if (lesson.has_quiz) return showMessage('Responda o quiz e clique em "Enviar Respostas" para concluir.', 'info');

  await db.from('academy_progress').upsert({
    user_id: currentUser.id,
    lesson_id: lesson.id,
    completed_at: new Date().toISOString()
  }, { onConflict: 'user_id,lesson_id' });

  await upsertLessonView(lesson.id, true);
  showMessage('Aula concluída! ✅', 'success');

  const hasNext = playerIndex < playerLessons.length - 1;
  if (hasNext) {
    setTimeout(() => gotoNextLesson(), 600);
  } else {
    await renderLessonInPlayer();
    await checkCourseCompletion();
  }
}

async function submitPlayerQuiz() {
  const lesson = playerLessons[playerIndex];
  if (!lesson) return;
  const { data: questions } = await db.from('academy_quizzes').select('*').eq('lesson_id', lesson.id).order('order_index');
  if (!questions || questions.length === 0) return;

  let correct = 0;
  for (const q of questions) {
    const sel = document.querySelector(`input[name="pq-${q.id}"]:checked`);
    const { data: opts } = await db.from('academy_quiz_options').select('*').eq('quiz_id', q.id);
    const correctId = (opts || []).find(o => o.is_correct)?.id;
    document.querySelectorAll(`.player-quiz-option[data-quiz="${q.id}"]`).forEach(el => {
      const optId = el.dataset.opt;
      if (optId === correctId) el.classList.add('correct');
      else if (sel && sel.value === optId && optId !== correctId) el.classList.add('wrong');
    });
    if (sel && sel.value === correctId) correct++;
  }

  const pct = Math.round((correct / questions.length) * 100);
  const passed = pct >= 70;
  const resultArea = document.getElementById('player-quiz-result');
  resultArea.innerHTML = `<div class="player-result ${passed ? 'pass' : 'fail'}">
    ${passed ? '🎉' : '😕'} Você acertou ${correct}/${questions.length} (${pct}%). ${passed ? 'Aula concluída!' : 'Nota mínima: 70%. Tente novamente.'}
  </div>`;

  if (passed) {
    await db.from('academy_progress').upsert({
      user_id: currentUser.id,
      lesson_id: lesson.id,
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,lesson_id' });
    await upsertLessonView(lesson.id, true);
    const btnComplete = document.getElementById('btn-complete-lesson');
    btnComplete.textContent = '✅ Aula concluída';
    btnComplete.classList.add('done');
    btnComplete.disabled = true;
    await checkCourseCompletion();
  }
}

async function checkCourseCompletion() {
  if (!playerCourse) return;
  const progress = await calcCourseProgress(currentUser.id, playerCourse.id);
  if (progress.done >= progress.total && progress.total > 0) {
    const { data: existing } = await db.from('academy_completions').select('*').eq('user_id', currentUser.id).eq('course_id', playerCourse.id).maybeSingle();
    if (!existing) {
      const code = 'CDE-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      await db.from('academy_completions').insert({ user_id: currentUser.id, course_id: playerCourse.id, certificate_code: code });
      await db.from('academy_enrollments').update({ status: 'completed' }).eq('user_id', currentUser.id).eq('course_id', playerCourse.id);
      await loadCompletions();
      setTimeout(() => openCertificateModal(playerCourse.id), 700);
    }
  }
}

// ==================== CERTIFICADO ====================
async function openCertificateModal(courseId) {
  const course = allCourses.find(c => c.id === courseId) || (myEnrollments.find(e => e.course.id === courseId)?.course);
  if (!course) return showMessage('Curso não encontrado.', 'error');
  const { data: completion } = await db.from('academy_completions').select('*').eq('user_id', currentUser.id).eq('course_id', courseId).maybeSingle();
  if (!completion) return showMessage('Certificado não disponível ainda.', 'error');
  certificateData = { completion, course };
  document.getElementById('cert-course-title').textContent = course.title;
  document.getElementById('cert-student-name').textContent = currentProfile.full_name || currentUser.email;
  document.getElementById('certificate-modal').classList.remove('hidden');
}
function closeCertificateModal() { document.getElementById('certificate-modal').classList.add('hidden'); certificateData = null; }

async function fetchImageAsDataURL(url) {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error('Falha ao carregar logo');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ==================== HELPER: SVG → PNG ====================
async function svgToPngDataURL(svgUrl, targetWidth = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ratio = (img.height / img.width) || 1;
        canvas.width = targetWidth;
        canvas.height = Math.round(targetWidth * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Falha ao carregar SVG'));
    img.src = svgUrl;
  });
}

// ==================== HELPER: LOGO BLINDEX VETORIAL ====================
function drawBlindexVector(doc, x, y, size) {
  const RED = [230, 30, 37];     // vermelho Blindex
  const WHITE = [255, 255, 255];

  // Retângulo vermelho (quadrado)
  doc.setFillColor(...RED);
  doc.rect(x, y, size, size, 'F');

  // Texto "BLINDEX" rotacionado 45°
  doc.saveGraphicsState();
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size * 0.75);
  const cx = x + size / 2;
  const cy = y + size / 2 + size * 0.02;
  doc.text('BLINDEX', cx, cy, { align: 'center', angle: 45 });

  // ® no canto superior direito
  doc.setFontSize(size * 0.14);
  doc.setTextColor(...WHITE);
  doc.text('®', x + size * 0.88, y + size * 0.18, { align: 'center' });
  doc.restoreGraphicsState();
}

// ==================== CERTIFICADO ====================
// ==================== HELPER: CARREGA IMAGEM COMO DATA URL ====================
async function imageToDataURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 400;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = url;
  });
}

// ==================== HELPER: CARREGA COM PROXY FALLBACK ====================
async function loadImageWithFallback(primaryUrl, proxyUrl) {
  try {
    return await imageToDataURL(primaryUrl);
  } catch (e) {
    if (proxyUrl) {
      try {
        return await imageToDataURL(proxyUrl);
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

// ==================== HELPER: LOGO BLINDEX VETORIAL ====================
function drawBlindexVector(doc, x, y, size) {
  const RED = [230, 30, 37];
  const WHITE = [255, 255, 255];

  // Quadrado vermelho
  doc.setFillColor(...RED);
  doc.rect(x, y, size, size, 'F');

  // Texto "BLINDEX" rotacionado 45° — maior
  doc.saveGraphicsState();
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size * 0.42);   // 👈 aumentado de 0.32 para 0.42
  const cx = x + size / 2;
  const cy = y + size / 2 + size * 0.06;
  doc.text('BLINDEX', cx, cy, { align: 'center', angle: 45 });

  // ® no canto superior direito
  doc.setFontSize(size * 0.14);
  doc.text('®', x + size * 0.82, y + size * 0.22, { align: 'center' });
  doc.restoreGraphicsState();
}

// ==================== CERTIFICADO ====================
async function downloadCertificate() {
  if (!certificateData) return;
  const { completion, course } = certificateData;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210;

  // Paleta
  const LARANJA = [232, 119, 34];
  const VERMELHO = [200, 16, 46];
  const GRAFITE = [65, 64, 66];
  const CINZA = [109, 110, 113];
  const CINZA_CLARO = [160, 160, 160];

  // ===================== CARREGA LOGO CDE =====================
  const logoCdeUrl = 'https://casadosespelhos.com.br/wp-content/uploads/2018/05/marca_cde_cores_horizontal_tag_bl-2048x713.png';
  const logoCdeProxy = 'https://images.weserv.nl/?url=' + encodeURIComponent('casadosespelhos.com.br/wp-content/uploads/2018/05/marca_cde_cores_horizontal_tag_bl-2048x713.png');
  const logoDataUrl = await loadImageWithFallback(logoCdeUrl, logoCdeProxy);

  const nome = currentProfile.full_name || currentUser.email;

  // ==========================================================
  // PÁGINA 1 — CERTIFICADO
  // ==========================================================
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');

  // Marca d'água
  if (logoDataUrl) {
    try {
      if (doc.setGState && doc.GState) {
        doc.setGState(new doc.GState({ opacity: 0.05 }));
        const wmW = 200;
        const wmH = wmW * (713 / 2048);
        doc.addImage(logoDataUrl, 'PNG', (W - wmW) / 2, (H - wmH) / 2 + 10, wmW, wmH);
        doc.setGState(new doc.GState({ opacity: 1 }));
      }
    } catch (e) { /* sem marca d'água */ }
  }

  // Faixas
  doc.setFillColor(...LARANJA); doc.rect(0, 0, W / 2, 8, 'F');
  doc.setFillColor(...VERMELHO); doc.rect(W / 2, 0, W / 2, 8, 'F');
  doc.setFillColor(...LARANJA); doc.rect(0, H - 8, W / 2, 8, 'F');
  doc.setFillColor(...VERMELHO); doc.rect(W / 2, H - 8, W / 2, 8, 'F');

  // Bordas
  doc.setDrawColor(...LARANJA); doc.setLineWidth(0.8);
  doc.rect(12, 12, W - 24, H - 24);
  doc.setDrawColor(...VERMELHO); doc.setLineWidth(0.3);
  doc.rect(14, 14, W - 28, H - 28);

  // Logo topo
  if (logoDataUrl) {
    const logoW = 90;
    const logoH = logoW * (713 / 2048);
    doc.addImage(logoDataUrl, 'PNG', (W - logoW) / 2, 19, logoW, logoH);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...GRAFITE);
    doc.text('CDE | CASA DOS ESPELHOS', W / 2, 32, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CINZA);
    doc.text('desde 1978', W / 2, 38, { align: 'center' });
  }

  // Etiqueta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...CINZA);
  doc.text('C D E   A C A D E M Y', W / 2, 60, { align: 'center' });

  // Título
  doc.setFontSize(28);
  doc.setTextColor(...VERMELHO);
  doc.text('CERTIFICADO', W / 2, 73, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...CINZA);
  doc.text('DE CONCLUSÃO', W / 2, 80, { align: 'center' });

  // Certificamos que
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...GRAFITE);
  doc.text('Certificamos que', W / 2, 94, { align: 'center' });

  // Nome
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...GRAFITE);
  doc.text(nome, W / 2, 106, { align: 'center' });

  // Cargo + Setor
  const cargo = currentProfile.position || '';
  const setor = currentProfile.sector || '';
  const partes = [];
  if (cargo) partes.push(cargo);
  if (setor) partes.push(setor);
  if (partes.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...CINZA);
    doc.text(partes.join('  •  '), W / 2, 113, { align: 'center' });
  }

  // Concluiu
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...GRAFITE);
  doc.text('concluiu com êxito o curso de', W / 2, 123, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...LARANJA);
  const courseTitle = course.title.length > 70 ? course.title.substring(0, 67) + '...' : course.title;
  doc.text(courseTitle, W / 2, 134, { align: 'center' });

  // Parágrafo padrão
  const dateStr = new Date(completion.completed_at).toLocaleDateString('pt-BR');
  const hours = course.workload_hours || 1;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...CINZA);
  doc.text('Realizado através da nossa plataforma CDE ACADEMY,', W / 2, 144, { align: 'center' });
  doc.text('na modalidade ONLINE, no período de ' + dateStr + ',', W / 2, 150, { align: 'center' });
  doc.text('com carga horária total de ' + hours + ' horas.', W / 2, 156, { align: 'center' });

  // ID único
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...VERMELHO);
  doc.text('Certificado nº: ' + completion.certificate_code, W / 2, 168, { align: 'center' });

  // Assinatura
  const sigY = 180;
  doc.setDrawColor(...GRAFITE);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 55, sigY, W / 2 + 55, sigY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...CINZA);
  doc.text('K K KRAUSS ARAUJO INDUSTRIA E COMERCIO DE VIDROS LTDA - ME', W / 2, sigY + 6, { align: 'center' });
  doc.setTextColor(...CINZA_CLARO);
  doc.text('CDE Indústria de Vidros  •  CNPJ 84.544.246/0001-14', W / 2, sigY + 10, { align: 'center' });

  // QR Code
  try {
    const qrContent = [
      'CDE ACADEMY',
      'Certificado: ' + completion.certificate_code,
      'Curso: ' + course.title,
      'Aluno: ' + nome,
      'Data: ' + dateStr
    ].join(' | ');
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=' + encodeURIComponent(qrContent);
    const qrDataUrl = await imageToDataURL(qrUrl);
    if (qrDataUrl) {
      const qrSize = 24;
      const qrX = 28;
      const qrY = H - 52;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      doc.setFontSize(6);
      doc.setTextColor(...CINZA_CLARO);
      doc.text('Verifique autenticidade', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
    }
  } catch (e) { /* sem QR */ }

  // Blindex vetorial
  const blindexSize = 24;
  const blindexX = W - 28 - blindexSize;
  const blindexY = H - 52;
  drawBlindexVector(doc, blindexX, blindexY, blindexSize);

  // ==========================================================
  // PÁGINA 2 — CONTEÚDO PROGRAMÁTICO
  // ==========================================================

  // Busca módulos e aulas
  const { data: modsRaw } = await db
    .from('academy_modules')
    .select('*')
    .eq('course_id', course.id)
    .order('order_index');

  const modulesData = [];
  for (const m of (modsRaw || [])) {
    const { data: lessonsRaw } = await db
      .from('academy_lessons')
      .select('title, content_type, has_quiz, order_index')
      .eq('module_id', m.id)
      .order('order_index');
    modulesData.push({ title: m.title || '', lessons: lessonsRaw || [] });
  }

  // Helper: desenha a moldura + cabeçalho de uma página de conteúdo
  function drawContentFrame(pageNum) {
    // Fundo
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');

    // Marca d'água
    if (logoDataUrl) {
      try {
        if (doc.setGState && doc.GState) {
          doc.setGState(new doc.GState({ opacity: 0.04 }));
          const wmW = 180;
          const wmH = wmW * (713 / 2048);
          doc.addImage(logoDataUrl, 'PNG', (W - wmW) / 2, (H - wmH) / 2 + 10, wmW, wmH);
          doc.setGState(new doc.GState({ opacity: 1 }));
        }
      } catch (e) { /* silent */ }
    }

    // Faixas
    doc.setFillColor(...LARANJA); doc.rect(0, 0, W / 2, 8, 'F');
    doc.setFillColor(...VERMELHO); doc.rect(W / 2, 0, W / 2, 8, 'F');
    doc.setFillColor(...LARANJA); doc.rect(0, H - 8, W / 2, 8, 'F');
    doc.setFillColor(...VERMELHO); doc.rect(W / 2, H - 8, W / 2, 8, 'F');

    // Bordas
    doc.setDrawColor(...LARANJA); doc.setLineWidth(0.8);
    doc.rect(12, 12, W - 24, H - 24);
    doc.setDrawColor(...VERMELHO); doc.setLineWidth(0.3);
    doc.rect(14, 14, W - 28, H - 28);

    // Logo topo (menor)
    if (logoDataUrl) {
      const logoW = 60;
      const logoH = logoW * (713 / 2048);
      doc.addImage(logoDataUrl, 'PNG', (W - logoW) / 2, 18, logoW, logoH);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...GRAFITE);
      doc.text('CDE | CASA DOS ESPELHOS', W / 2, 28, { align: 'center' });
    }

    // Etiqueta CDE ACADEMY
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...CINZA);
    doc.text('C D E   A C A D E M Y', W / 2, 42, { align: 'center' });

    // Título
    doc.setFontSize(20);
    doc.setTextColor(...VERMELHO);
    doc.text('CONTEÚDO PROGRAMÁTICO', W / 2, 54, { align: 'center' });

    // Nome do curso
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...CINZA);
    const ct = course.title.length > 90 ? course.title.substring(0, 87) + '...' : course.title;
    doc.text(ct, W / 2, 61, { align: 'center' });

    // Linha decorativa
    doc.setDrawColor(...LARANJA);
    doc.setLineWidth(0.5);
    doc.line(W / 2 - 50, 65, W / 2 + 50, 65);

    // Rodapé
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...CINZA_CLARO);
    doc.text('Certificado nº: ' + completion.certificate_code, 22, H - 18, { align: 'left' });
    doc.text('Página ' + pageNum, W - 22, H - 18, { align: 'right' });
    doc.text('Emitido em ' + new Date().toLocaleDateString('pt-BR'), W / 2, H - 18, { align: 'center' });

    return 78;
  }

  let currentPageNum = 1;
  let y = 0;

  function newContentPage() {
    currentPageNum++;
    doc.addPage('a4', 'landscape');
    return drawContentFrame(currentPageNum);
  }

  // Se há módulos, adiciona a página 2
  if (modulesData.length > 0) {
    y = newContentPage();

    const contentBottom = H - 25;

    for (let mi = 0; mi < modulesData.length; mi++) {
      const mod = modulesData[mi];

      // Cabeçalho do módulo precisa caber
      if (y + 11 > contentBottom) {
        y = newContentPage();
      }

      // Cabeçalho do módulo
      doc.setFillColor(255, 245, 235);
      doc.roundedRect(25, y - 5, W - 50, 9, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...VERMELHO);
      doc.text('MÓDULO ' + (mi + 1), 28, y + 1);

      doc.setFontSize(10);
      doc.setTextColor(...GRAFITE);
      const modTitle = mod.title.length > 70 ? mod.title.substring(0, 67) + '...' : mod.title;
      doc.text(modTitle, 55, y + 1);
      y += 11;

      // Aulas
      for (let li = 0; li < mod.lessons.length; li++) {
        if (y > contentBottom) {
          y = newContentPage();
        }

        const lesson = mod.lessons[li];
        const lessonNum = (mi + 1) + '.' + (li + 1);
        const typeLabel = { pdf: 'PDF', video: 'Vídeo', slides: 'Slides', image: 'Imagem', text: 'Texto' }[lesson.content_type] || '';

        // Bullet
        doc.setFillColor(...CINZA_CLARO);
        doc.circle(35, y - 1, 0.8, 'F');

        // Número
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...CINZA);
        doc.text(lessonNum, 40, y);

        // Título
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...GRAFITE);
        const lessonTitle = lesson.title.length > 80 ? lesson.title.substring(0, 77) + '...' : lesson.title;
        doc.text(lessonTitle, 52, y);

        // Tipo à direita
        doc.setFontSize(7);
        if (lesson.has_quiz) {
          doc.setTextColor(...LARANJA);
          doc.text(typeLabel + ' • Questionário', W - 28, y, { align: 'right' });
        } else {
          doc.setTextColor(...CINZA_CLARO);
          doc.text(typeLabel, W - 28, y, { align: 'right' });
        }

        y += 7;
      }

      y += 4; // espaçamento entre módulos
    }
  }

  // ===================== SALVAR =====================
  const safeTitle = course.title.replace(/[^a-zA-Z0-9]/g, '_');
  const safeName = nome.replace(/[^a-zA-Z0-9]/g, '_');
  const fn = 'Certificado_' + safeTitle + '_' + safeName + '.pdf';
  doc.save(fn);
  showMessage('Certificado gerado! 📥', 'success');
}
// ==================== PAINEL DE GESTÃO ====================
function renderManageCourses() {
  const courses = allCourses;
  return `
    <div class="section-header">
      <h2>⚙️ Gerenciar Cursos</h2>
      <span class="section-sub">${courses.length} curso${courses.length === 1 ? '' : 's'} no total</span>
      <div class="header-actions">
        <button class="btn-primary" onclick="openCourseForm()">+ Novo Curso</button>
      </div>
    </div>
    ${courses.length === 0 ? renderEmpty('📚', 'Nenhum curso criado ainda. Clique em "+ Novo Curso".') :
      `<div class="courses-grid">
        ${courses.map(c => {
          const coverStyle = c.cover_url ? `background-image: url('${escapeHtml(c.cover_url)}'); background-size: cover; background-position: center;` : '';
          const coverContent = c.cover_url ? '' : '📘';
          const pubBadge = c.is_published === false
            ? '<span class="course-badge" style="background: #FDE8EB; color: var(--cde-vermelho);">Rascunho</span>'
            : '<span class="course-badge concluido">Publicado</span>';
          return `
            <div class="course-card" onclick="openCourseEditor('${c.id}')">
              <div class="course-cover" style="${coverStyle}">${pubBadge}${coverContent}</div>
              <div class="course-body">
                <h3>${escapeHtml(c.title)}</h3>
                <p>${escapeHtml(c.description || 'Sem descrição.')}</p>
                <div class="course-meta">
                  <span class="tag">⏱ ${c.workload_hours || 1}h</span>
                  ${c.sector ? `<span class="tag">🏷 ${escapeHtml(c.sector)}</span>` : ''}
                </div>
                <div style="display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap;">
                  <button class="btn-secondary btn-small" onclick="event.stopPropagation();openCourseForm('${c.id}')">✏️ Editar</button>
                  <button class="btn-secondary btn-small" onclick="event.stopPropagation();openEnrollModal('${c.id}')">👥 Matrículas</button>
                  <button class="btn-danger btn-small" onclick="event.stopPropagation();deleteCourse('${c.id}')">🗑</button>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>`}
  `;
}

// CRUD CURSOS
function openCourseForm(courseId = null) {
  editingCourseId = courseId;
  editingCourseCoverUrl = null;
  document.getElementById('cf-title-h').textContent = courseId ? 'Editar Curso' : 'Novo Curso';
  document.getElementById('cf-subtitle').textContent = courseId ? 'Atualize as informações.' : 'Preencha os dados.';
  const t = document.getElementById('cf-title'), d = document.getElementById('cf-desc'), h = document.getElementById('cf-hours'),
        s = document.getElementById('cf-sector'), p = document.getElementById('cf-published'), c = document.getElementById('cf-cover');
  t.value = ''; d.value = ''; h.value = 2; s.value = ''; p.checked = true; c.value = '';
  document.getElementById('cf-cover-name').textContent = '';
  if (courseId) {
    const course = allCourses.find(x => x.id === courseId);
    if (course) {
      t.value = course.title || ''; d.value = course.description || '';
      h.value = course.workload_hours || 2; s.value = course.sector || '';
      p.checked = course.is_published !== false;
      editingCourseCoverUrl = course.cover_url || null;
      if (course.cover_url) document.getElementById('cf-cover-name').textContent = '✓ Capa atual mantida';
    }
  }
  document.getElementById('course-form-modal').classList.remove('hidden');
}
function closeCourseForm() { document.getElementById('course-form-modal').classList.add('hidden'); editingCourseId = null; editingCourseCoverUrl = null; }
function onCoverChange(e) { const f = e.target.files[0]; document.getElementById('cf-cover-name').textContent = f ? `✓ ${f.name}` : ''; }
async function saveCourse() {
  const title = document.getElementById('cf-title').value.trim();
  if (!title) return showMessage('O título é obrigatório.', 'error');
  const description = document.getElementById('cf-desc').value.trim();
  const hours = parseInt(document.getElementById('cf-hours').value, 10) || 2;
  const sector = document.getElementById('cf-sector').value || null;
  const isPublished = document.getElementById('cf-published').checked;
  const coverFile = document.getElementById('cf-cover').files[0];
  const btn = document.getElementById('cf-save-btn');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    let coverUrl = editingCourseCoverUrl;
    if (coverFile) {
      const path = `covers/${Date.now()}_${coverFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { error: upErr } = await db.storage.from(BUCKET).upload(path, coverFile, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);
      coverUrl = pub.publicUrl;
    }
    const payload = { title, description: description || null, workload_hours: hours, sector, is_published: isPublished, cover_url: coverUrl };
    if (editingCourseId) {
      const { error } = await db.from('academy_courses').update(payload).eq('id', editingCourseId);
      if (error) throw error;
      showMessage('Curso atualizado!', 'success');
    } else {
      payload.created_by = currentUser.id;
      const { error } = await db.from('academy_courses').insert(payload);
      if (error) throw error;
      showMessage('Curso criado!', 'success');
    }
    closeCourseForm();
    await loadCourses();
    if (currentView === 'manage') renderView('manage');
  } catch (e) { showMessage('Erro ao salvar: ' + e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Salvar Curso'; }
}
async function deleteCourse(courseId) {
  const course = allCourses.find(c => c.id === courseId);
  if (!course) return;
  if (!confirm(`Excluir o curso "${course.title}"?\n\nIsso removerá módulos, aulas e quizzes.`)) return;
  try {
    const { error } = await db.from('academy_courses').delete().eq('id', courseId);
    if (error) throw error;
    showMessage('Curso excluído.', 'success');
    await loadCourses();
    renderView('manage');
  } catch (e) { showMessage('Erro: ' + e.message, 'error'); }
}

// COURSE EDITOR
async function openCourseEditor(courseId) {
  const course = allCourses.find(c => c.id === courseId);
  if (!course) return showMessage('Curso não encontrado.', 'error');
  currentEditorCourseId = courseId;
  document.getElementById('ce-course-title').textContent = course.title;
  document.getElementById('ce-course-sub').textContent = `${course.workload_hours || 1}h${course.sector ? ' • ' + course.sector : ''}${course.is_published === false ? ' • Rascunho' : ''}`;
  await loadEditorModules();
  document.getElementById('course-editor-view').classList.remove('hidden');
  window.scrollTo(0, 0);
}
function closeCourseEditor() {
  document.getElementById('course-editor-view').classList.add('hidden');
  currentEditorCourseId = null;
  renderView('manage');
}
async function loadEditorModules() {
  const container = document.getElementById('ce-modules-tree');
  container.innerHTML = '<div class="state-box">Carregando…</div>';
  try {
    const { data: mods, error } = await db.from('academy_modules').select('*').eq('course_id', currentEditorCourseId).order('order_index');
    if (error) throw error;
    currentEditorModules = mods || [];
    if (currentEditorModules.length === 0) {
      container.innerHTML = `<div class="state-box"><span class="emoji">📦</span>Nenhum módulo criado.<br><button class="btn-primary" style="margin-top: 14px;" onclick="openModuleForm()">+ Criar primeiro módulo</button></div>`;
      return;
    }
    const html = await Promise.all(currentEditorModules.map(async (mod) => {
      const { data: lessons } = await db.from('academy_lessons').select('*').eq('module_id', mod.id).order('order_index');
      const lessonList = lessons || [];
      const lessonsHtml = lessonList.map(l => {
        const icons = { pdf: '📄', video: '🎬', slides: '📊', image: '🖼️', text: '📝' };
        const icon = icons[l.content_type] || '📄';
        const quizBadge = l.has_quiz ? ' <span style="background: var(--amarelo-bg); color: var(--amarelo); padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; font-weight: 800;">QUIZ</span>' : '';
        const typeLabel = { pdf: 'PDF', video: 'Vídeo', slides: 'Slides externos', image: 'Imagem', text: 'Texto' }[l.content_type] || l.content_type;
        return `
          <div class="tree-lesson">
            <div class="info">
              <div class="icon-box">${icon}</div>
              <div>
                <div class="title">${escapeHtml(l.title)}${quizBadge}</div>
                <div class="subtitle">${typeLabel}</div>
              </div>
            </div>
            <div class="actions">
              <button class="btn-secondary btn-small" onclick="previewLesson('${l.id}')">👁 Prévia</button>
              <button class="btn-secondary btn-small" onclick="openLessonForm('${mod.id}','${l.id}')">✏️ Editar</button>
              ${l.has_quiz ? `<button class="btn-secondary btn-small" onclick="openQuizEditor('${l.id}')">📝 Quiz</button>` : ''}
              <button class="btn-danger btn-small" onclick="deleteLesson('${l.id}')">🗑</button>
            </div>
          </div>`;
      }).join('');
      return `
        <div class="tree-module">
          <div class="tree-module-header">
            <h4>📦 ${escapeHtml(mod.title)} <span style="font-size: 0.75rem; color: var(--texto-soft); font-weight: 600;">(${lessonList.length} aula${lessonList.length === 1 ? '' : 's'})</span></h4>
            <div class="actions">
              <button class="btn-primary btn-small" onclick="openLessonForm('${mod.id}')">+ Aula</button>
              <button class="btn-secondary btn-small" onclick="openModuleForm('${mod.id}')">✏️</button>
              <button class="btn-danger btn-small" onclick="deleteModule('${mod.id}')">🗑</button>
            </div>
          </div>
          <div class="tree-lessons">
            ${lessonList.length === 0 ? '<div style="padding: 16px; color: var(--texto-soft); font-size: 0.85rem; text-align: center;">Nenhuma aula criada.</div>' : lessonsHtml}
          </div>
        </div>`;
    }));
    container.innerHTML = html.join('');
  } catch (e) {
    container.innerHTML = `<div class="state-box" style="color: var(--cde-vermelho);">Erro: ${escapeHtml(e.message)}</div>`;
  }
}

async function previewLesson(lessonId) {
  const { data: l } = await db.from('academy_lessons').select('*').eq('id', lessonId).single();
  if (!l) return;
  document.getElementById('player-lesson-title').textContent = l.title;
  document.getElementById('player-course-title').textContent = '👁 Modo prévia';
  document.getElementById('player-lesson-badge').textContent = 'PREVIEW';
  document.getElementById('player-progress-fill').style.width = '100%';
  document.getElementById('btn-prev-lesson').disabled = true;
  document.getElementById('btn-next-lesson').disabled = true;
  document.getElementById('btn-complete-lesson').textContent = '✓ Modo prévia';
  document.getElementById('btn-complete-lesson').classList.add('done');
  document.getElementById('btn-complete-lesson').disabled = true;

  playerCourse = null;
  playerLessons = [{ ...l, _preview: true }];
  playerIndex = 0;
  playerStartedAt = Date.now();
  if (playerTickInterval) clearInterval(playerTickInterval);
  playerTickInterval = null;

  const body = document.getElementById('player-body');
  const type = l.content_type || 'text';
  let html = '';
  if (type === 'video' && l.content_url) {
    const embedUrl = getVideoEmbedUrl(l.content_url);
    html = `<div class="content-viewer" style="background: #000; padding: 0;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;"><iframe src="${escapeHtml(embedUrl)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div></div>`;
  } else if (type === 'pdf' && l.content_url) html = `<div class="content-viewer"><iframe class="pdf-frame" src="${escapeHtml(l.content_url)}"></iframe></div>`;
  else if (type === 'slides' && l.content_url) html = `<div class="content-viewer"><iframe class="slides-frame" src="${escapeHtml(l.content_url)}" allowfullscreen></iframe></div>`;
  else if (type === 'image' && l.content_url) html = `<div class="content-viewer"><img src="${escapeHtml(l.content_url)}"></div>`;
  else html = `<div class="content-viewer"><div class="text-content">${l.content_text || '<p>Sem conteúdo.</p>'}</div></div>`;

  if (l.has_quiz) {
    const { data: qs } = await db.from('academy_quizzes').select('*').eq('lesson_id', l.id).order('order_index');
    if (qs && qs.length > 0) {
      let qhtml = '';
      for (const q of qs) {
        const { data: opts } = await db.from('academy_quiz_options').select('*').eq('quiz_id', q.id).order('order_index');
        qhtml += `<div class="player-quiz-question"><div class="q-text">${escapeHtml(q.question)}</div>${(opts || []).map(o => `<div class="player-quiz-option ${o.is_correct ? 'correct' : ''}"><span>${o.is_correct ? '✅' : '⬜'} ${escapeHtml(o.option_text)}</span></div>`).join('')}</div>`;
      }
      html += `<div class="quiz-block"><h3>📝 Questionário (visão do professor)</h3>${qhtml}</div>`;
    }
  }
  body.innerHTML = html;
  document.getElementById('lesson-player').classList.remove('hidden');
  window.scrollTo(0, 0);
}

// CRUD MÓDULOS
function openModuleForm(moduleId = null) {
  editingModuleId = moduleId;
  document.getElementById('mf-title-h').textContent = moduleId ? 'Editar Módulo' : 'Novo Módulo';
  document.getElementById('mf-title').value = '';
  if (moduleId) {
    const mod = currentEditorModules.find(m => m.id === moduleId);
    if (mod) document.getElementById('mf-title').value = mod.title || '';
  }
  document.getElementById('module-form-modal').classList.remove('hidden');
}
function closeModuleForm() { document.getElementById('module-form-modal').classList.add('hidden'); editingModuleId = null; }
async function saveModule() {
  const title = document.getElementById('mf-title').value.trim();
  if (!title) return showMessage('Título obrigatório.', 'error');
  try {
    if (editingModuleId) {
      const { error } = await db.from('academy_modules').update({ title }).eq('id', editingModuleId);
      if (error) throw error;
      showMessage('Módulo atualizado!', 'success');
    } else {
      const { data: existing } = await db.from('academy_modules').select('order_index').eq('course_id', currentEditorCourseId).order('order_index', { ascending: false }).limit(1);
      const nextIdx = (existing?.[0]?.order_index ?? -1) + 1;
      const { error } = await db.from('academy_modules').insert({ course_id: currentEditorCourseId, title, order_index: nextIdx });
      if (error) throw error;
      showMessage('Módulo criado!', 'success');
    }
    closeModuleForm();
    await loadEditorModules();
  } catch (e) { showMessage('Erro: ' + e.message, 'error'); }
}
async function deleteModule(moduleId) {
  if (!confirm('Excluir este módulo e todas as suas aulas?')) return;
  try {
    const { error } = await db.from('academy_modules').delete().eq('id', moduleId);
    if (error) throw error;
    showMessage('Módulo excluído.', 'success');
    await loadEditorModules();
  } catch (e) { showMessage('Erro: ' + e.message, 'error'); }
}

// CRUD AULAS
function openLessonForm(moduleId, lessonId = null) {
  editingLessonModuleId = moduleId;
  editingLessonId = lessonId;
  document.getElementById('lf-title-h').textContent = lessonId ? 'Editar Aula' : 'Nova Aula';
  document.getElementById('lf-title').value = '';
  document.getElementById('lf-type').value = 'pdf';
  document.getElementById('lf-text').value = '';
  document.getElementById('lf-video-url').value = '';
  document.getElementById('lf-slides-url').value = '';
  document.getElementById('lf-pdf').value = '';
  document.getElementById('lf-image').value = '';
  document.getElementById('lf-pdf-name').textContent = '';
  document.getElementById('lf-image-name').textContent = '';
  document.getElementById('lf-has-quiz').checked = false;
  toggleLessonFields();

  if (lessonId) {
    db.from('academy_lessons').select('*').eq('id', lessonId).single().then(({ data: l }) => {
      if (!l) return;
      document.getElementById('lf-title').value = l.title || '';
      document.getElementById('lf-type').value = l.content_type || 'pdf';
      if (l.content_type === 'text') document.getElementById('lf-text').value = l.content_text || '';
      if (l.content_type === 'video') document.getElementById('lf-video-url').value = l.content_url || '';
      if (l.content_type === 'slides') document.getElementById('lf-slides-url').value = l.content_url || '';
      if (l.content_type === 'pdf' && l.content_url) document.getElementById('lf-pdf-name').textContent = '✓ PDF atual mantido';
      if (l.content_type === 'image' && l.content_url) document.getElementById('lf-image-name').textContent = '✓ Imagem atual mantida';
      document.getElementById('lf-has-quiz').checked = !!l.has_quiz;
      toggleLessonFields();
    });
  }
  document.getElementById('lesson-form-modal').classList.remove('hidden');
}
function closeLessonForm() { document.getElementById('lesson-form-modal').classList.add('hidden'); editingLessonId = null; editingLessonModuleId = null; }
function toggleLessonFields() {
  const t = document.getElementById('lf-type').value;
  document.getElementById('lf-field-pdf').classList.toggle('hidden', t !== 'pdf');
  document.getElementById('lf-field-video').classList.toggle('hidden', t !== 'video');
  document.getElementById('lf-field-slides').classList.toggle('hidden', t !== 'slides');
  document.getElementById('lf-field-image').classList.toggle('hidden', t !== 'image');
  document.getElementById('lf-field-text').classList.toggle('hidden', t !== 'text');
}
function onPdfChange(e) { const f = e.target.files[0]; document.getElementById('lf-pdf-name').textContent = f ? `✓ ${f.name}` : ''; }
function onImageChange(e) { const f = e.target.files[0]; document.getElementById('lf-image-name').textContent = f ? `✓ ${f.name}` : ''; }

async function saveLesson() {
  const title = document.getElementById('lf-title').value.trim();
  const type = document.getElementById('lf-type').value;
  const hasQuiz = document.getElementById('lf-has-quiz').checked;
  if (!title) return showMessage('Título obrigatório.', 'error');

  let contentUrl = null, contentText = null;
  try {
    if (type === 'pdf') {
      const f = document.getElementById('lf-pdf').files[0];
      if (f) {
        const path = `pdfs/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { error: upErr } = await db.storage.from(BUCKET).upload(path, f, { upsert: true });
        if (upErr) throw upErr;
        contentUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      } else if (editingLessonId) {
        const { data: cur } = await db.from('academy_lessons').select('content_url').eq('id', editingLessonId).single();
        contentUrl = cur?.content_url;
      } else return showMessage('Selecione um PDF.', 'error');
    } else if (type === 'image') {
      const f = document.getElementById('lf-image').files[0];
      if (f) {
        const path = `images/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { error: upErr } = await db.storage.from(BUCKET).upload(path, f, { upsert: true });
        if (upErr) throw upErr;
        contentUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      } else if (editingLessonId) {
        const { data: cur } = await db.from('academy_lessons').select('content_url').eq('id', editingLessonId).single();
        contentUrl = cur?.content_url;
      } else return showMessage('Selecione uma imagem.', 'error');
    } else if (type === 'video') {
      contentUrl = document.getElementById('lf-video-url').value.trim();
      if (!contentUrl) return showMessage('Informe a URL do vídeo.', 'error');
      if (!getVideoEmbedUrl(contentUrl)) return showMessage('URL não reconhecida. Aceito YouTube, Vimeo e Google Drive.', 'error');
    } else if (type === 'slides') {
      contentUrl = document.getElementById('lf-slides-url').value.trim();
      if (!contentUrl) return showMessage('Informe a URL de incorporação.', 'error');
    } else if (type === 'text') {
      contentText = document.getElementById('lf-text').value;
      if (!contentText.trim()) return showMessage('Digite o conteúdo.', 'error');
    }

    const payload = { title, content_type: type, content_url: contentUrl, content_text: contentText, has_quiz: hasQuiz };
    if (editingLessonId) {
      const { error } = await db.from('academy_lessons').update(payload).eq('id', editingLessonId);
      if (error) throw error;
      showMessage('Aula atualizada!', 'success');
    } else {
      const { data: existing } = await db.from('academy_lessons').select('order_index').eq('module_id', editingLessonModuleId).order('order_index', { ascending: false }).limit(1);
      payload.module_id = editingLessonModuleId;
      payload.order_index = (existing?.[0]?.order_index ?? -1) + 1;
      const { data: created, error } = await db.from('academy_lessons').insert(payload).select().single();
      if (error) throw error;
      showMessage('Aula criada!', 'success');
      if (hasQuiz) {
        const lessonId = created.id;
        closeLessonForm();
        await loadEditorModules();
        setTimeout(() => openQuizEditor(lessonId), 400);
        return;
      }
    }
    closeLessonForm();
    await loadEditorModules();
  } catch (e) { showMessage('Erro: ' + e.message, 'error'); }
}
async function deleteLesson(lessonId) {
  if (!confirm('Excluir esta aula?')) return;
  try {
    const { error } = await db.from('academy_lessons').delete().eq('id', lessonId);
    if (error) throw error;
    showMessage('Aula excluída.', 'success');
    await loadEditorModules();
  } catch (e) { showMessage('Erro: ' + e.message, 'error'); }
}

// QUIZ EDITOR
async function openQuizEditor(lessonId) {
  editingQuizLessonId = lessonId;
  quizQuestions = [];
  try {
    const { data: qs } = await db.from('academy_quizzes').select('*').eq('lesson_id', lessonId).order('order_index');
    if (qs && qs.length > 0) {
      for (const q of qs) {
        const { data: opts } = await db.from('academy_quiz_options').select('*').eq('quiz_id', q.id).order('order_index');
        quizQuestions.push({ question: q.question, options: (opts || []).map(o => ({ text: o.option_text, is_correct: o.is_correct })) });
      }
    }
  } catch (e) { /* silent */ }
  if (quizQuestions.length === 0) quizQuestions.push({
    question: '', options: [
      { text: '', is_correct: true }, { text: '', is_correct: false },
      { text: '', is_correct: false }, { text: '', is_correct: false }
    ]
  });
  renderQuizEditor();
  document.getElementById('quiz-modal').classList.remove('hidden');
}
function closeQuizEditor() { document.getElementById('quiz-modal').classList.add('hidden'); editingQuizLessonId = null; quizQuestions = []; }
function addQuizQuestion() {
  quizQuestions.push({ question: '', options: [
    { text: '', is_correct: true }, { text: '', is_correct: false },
    { text: '', is_correct: false }, { text: '', is_correct: false }
  ]});
  renderQuizEditor();
}
function renderQuizEditor() {
  const c = document.getElementById('quiz-questions-container');
  c.innerHTML = quizQuestions.map((q, qi) => `
    <div class="quiz-question-card">
      <div class="q-header">
        <strong style="font-size: 0.9rem;">Pergunta ${qi + 1}</strong>
        ${quizQuestions.length > 1 ? `<button class="btn-danger btn-small" onclick="removeQuizQuestion(${qi})">🗑 Remover</button>` : ''}
      </div>
      <input type="text" placeholder="Digite a pergunta..." value="${escapeHtml(q.question)}" oninput="quizQuestions[${qi}].question = this.value" style="width: 100%; padding: 10px; border: 1.5px solid var(--cinza-borda); border-radius: 8px; margin-bottom: 12px; font-size: 0.9rem;">
      <div style="font-size: 0.75rem; font-weight: 700; color: var(--texto-soft); text-transform: uppercase; margin-bottom: 8px;">Opções (marque a correta)</div>
      ${q.options.map((o, oi) => `
        <div class="quiz-option-row">
          <input type="radio" name="correct-${qi}" ${o.is_correct ? 'checked' : ''} onchange="setCorrect(${qi}, ${oi})">
          <input type="text" placeholder="Opção ${oi + 1}" value="${escapeHtml(o.text)}" oninput="quizQuestions[${qi}].options[${oi}].text = this.value">
          ${q.options.length > 2 ? `<button class="remove-opt" onclick="removeOption(${qi},${oi})">✕</button>` : ''}
        </div>
      `).join('')}
      <button class="btn-secondary btn-small" style="margin-top: 6px;" onclick="addOption(${qi})">+ Opção</button>
    </div>
  `).join('');
}
function setCorrect(qi, oi) { quizQuestions[qi].options.forEach((o, i) => o.is_correct = (i === oi)); }
function removeQuizQuestion(qi) { quizQuestions.splice(qi, 1); renderQuizEditor(); }
function addOption(qi) { quizQuestions[qi].options.push({ text: '', is_correct: false }); renderQuizEditor(); }
function removeOption(qi, oi) {
  const q = quizQuestions[qi];
  if (q.options.length <= 2) return;
  const wasCorrect = q.options[oi].is_correct;
  q.options.splice(oi, 1);
  if (wasCorrect && q.options.length > 0) q.options[0].is_correct = true;
  renderQuizEditor();
}
async function saveQuiz() {
  if (!editingQuizLessonId) return;
  for (let i = 0; i < quizQuestions.length; i++) {
    const q = quizQuestions[i];
    if (!q.question.trim()) return showMessage(`Pergunta ${i + 1} está vazia.`, 'error');
    if (q.options.some(o => !o.text.trim())) return showMessage(`Todas as opções da pergunta ${i + 1} precisam de texto.`, 'error');
    if (!q.options.some(o => o.is_correct)) return showMessage(`Marque a correta da pergunta ${i + 1}.`, 'error');
  }
  try {
    await db.from('academy_quizzes').delete().eq('lesson_id', editingQuizLessonId);
    for (let i = 0; i < quizQuestions.length; i++) {
      const q = quizQuestions[i];
      const { data: created, error } = await db.from('academy_quizzes').insert({ lesson_id: editingQuizLessonId, question: q.question.trim(), order_index: i }).select().single();
      if (error) throw error;
      for (let j = 0; j < q.options.length; j++) {
        const o = q.options[j];
        const { error: oErr } = await db.from('academy_quiz_options').insert({ quiz_id: created.id, option_text: o.text.trim(), is_correct: !!o.is_correct, order_index: j });
        if (oErr) throw oErr;
      }
    }
    showMessage('Quiz salvo!', 'success');
    closeQuizEditor();
    await loadEditorModules();
  } catch (e) { showMessage('Erro: ' + e.message, 'error'); }
}

// MATRÍCULAS
let enrollTargetCourseId = null;
async function openEnrollModal(courseId) {
  enrollTargetCourseId = courseId;
  const course = allCourses.find(c => c.id === courseId);
  document.getElementById('enroll-subtitle').textContent = course ? course.title : '';
  await loadEnrollUserSelect();
  await loadEnrollList();
  document.getElementById('enroll-modal').classList.remove('hidden');
}
function openEnrollModalFromEditor() { openEnrollModal(currentEditorCourseId); }
function closeEnrollModal() { document.getElementById('enroll-modal').classList.add('hidden'); enrollTargetCourseId = null; }
async function loadEnrollUserSelect() {
  const sel = document.getElementById('enroll-user-select');
  sel.innerHTML = '<option>Carregando…</option>';
  try {
    const { data, error } = await db.from('profiles')
      .select('id, full_name, email, sector, role')
      .order('full_name');

    if (error) {
      console.error('Erro ao carregar perfis:', error);
      sel.innerHTML = `<option value="">Erro: ${error.message}</option>`;
      return;
    }

    const allowedRoles = ['employee', 'colaborador', 'supervisor'];
    const filtered = (data || []).filter(p =>
      allowedRoles.includes((p.role || '').toLowerCase())
    );

    if (filtered.length === 0) {
      sel.innerHTML = '<option value="">Nenhum colaborador cadastrado</option>';
      return;
    }

    sel.innerHTML = '<option value="">— Selecione —</option>' +
      filtered.map(p =>
        `<option value="${p.id}">${escapeHtml(p.full_name || p.email)}${p.sector ? ' — ' + escapeHtml(p.sector) : ''}</option>`
      ).join('');
  } catch (e) {
    console.error('Erro loadEnrollUserSelect:', e);
    sel.innerHTML = `<option value="">Erro: ${e.message}</option>`;
  }
}
async function loadEnrollList() {
  const container = document.getElementById('enroll-list');
  container.innerHTML = 'Carregando…';

  try {
    const { data: enrolls, error } = await db
      .from('academy_enrollments')
      .select('*')
      .eq('course_id', enrollTargetCourseId);

    if (error) throw error;
    const list = enrolls || [];

    if (list.length === 0) {
      container.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--texto-soft); font-size: 0.85rem;">Nenhum aluno matriculado.</div>';
      return;
    }

    const userIds = list.map(e => e.user_id);
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name, email, sector')
      .in('id', userIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    container.innerHTML = list.map(e => {
      const profile = profileMap[e.user_id];
      const statusTag = e.status === 'completed'
        ? '✅ Concluído'
        : '⏳ Em andamento';
      return `
        <div style="padding: 12px; border-bottom: 1px solid var(--cinza-borda); display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div style="min-width: 0; flex: 1;">
            <div style="font-weight: 700; font-size: 0.9rem;">${escapeHtml(profile?.full_name || profile?.email || 'Aluno')}</div>
            <div style="font-size: 0.75rem; color: var(--texto-soft);">
              ${profile?.sector ? escapeHtml(profile.sector) + ' • ' : ''}
              Desde ${new Date(e.assigned_at).toLocaleDateString('pt-BR')} • ${statusTag}
            </div>
          </div>
          <button class="btn-danger btn-small" onclick="unenrollUser('${e.id}')">Remover</button>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error('Erro loadEnrollList:', e);
    container.innerHTML = `<div style="padding: 16px; color: var(--cde-vermelho);">Erro: ${escapeHtml(e.message)}</div>`;
  }
}
async function enrollUser() {
  const userId = document.getElementById('enroll-user-select').value;
  if (!userId) return showMessage('Selecione um colaborador.', 'error');
  try {
    const { error } = await db.from('academy_enrollments').upsert({ user_id: userId, course_id: enrollTargetCourseId, assigned_by: currentUser.id, status: 'active' }, { onConflict: 'user_id,course_id' });
    if (error) throw error;
    showMessage('Colaborador matriculado!', 'success');
    await loadEnrollList();
  } catch (e) { showMessage('Erro: ' + e.message, 'error'); }
}
async function unenrollUser(enrollId) {
  if (!confirm('Remover a matrícula?')) return;
  try {
    const { error } = await db.from('academy_enrollments').delete().eq('id', enrollId);
    if (error) throw error;
    showMessage('Matrícula removida.', 'success');
    await loadEnrollList();
  } catch (e) { showMessage('Erro: ' + e.message, 'error'); }
}

// ==================== ANALYTICS ====================
async function renderAnalyticsView() {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="state-box">Carregando analytics…</div>';

  try {
    const [coursesRes, enrollsRes, completionsRes, viewsRes, profilesRes, lessonsRes] = await Promise.all([
      db.from('academy_courses').select('*'),
      db.from('academy_enrollments').select('*'),
      db.from('academy_completions').select('*'),
      db.from('academy_lesson_views').select('*'),
      db.from('profiles').select('id, full_name, role, sector'),
      db.from('academy_lessons').select('id, title, module_id')
    ]);

    const courses = coursesRes.data || [];
    const enrolls = enrollsRes.data || [];
    const completions = completionsRes.data || [];
    const views = viewsRes.data || [];
    const profiles = profilesRes.data || [];
    const lessons = lessonsRes.data || [];

    const profileMap = {};
    profiles.forEach(p => { profileMap[p.id] = p; });

    const courseMap = {};
    courses.forEach(c => { courseMap[c.id] = c; });

    const lessonMap = {};
    lessons.forEach(l => { lessonMap[l.id] = l; });

    const totalAlunos = new Set(enrolls.map(e => e.user_id)).size;
    const totalMatriculas = enrolls.length;
    const totalConclusoes = completions.length;
    const taxaGlobal = totalMatriculas > 0 ? Math.round((totalConclusoes / totalMatriculas) * 100) : 0;
    const totalTempoSegundos = views.reduce((s, v) => s + (v.time_spent_seconds || 0), 0);

    const cursoStats = courses.map(c => {
      const enr = enrolls.filter(e => e.course_id === c.id);
      const comp = completions.filter(x => x.course_id === c.id);
      const viewsCurso = views.filter(v => v.course_id === c.id);
      const tempoTotal = viewsCurso.reduce((s, v) => s + (v.time_spent_seconds || 0), 0);
      const taxa = enr.length > 0 ? Math.round((comp.length / enr.length) * 100) : 0;
      return { course: c, alunos: enr.length, conclusoes: comp.length, taxa, tempoTotal };
    }).sort((a, b) => b.alunos - a.alunos);

    const alunoStats = {};
    views.forEach(v => {
      if (!alunoStats[v.user_id]) {
        alunoStats[v.user_id] = {
          name: profileMap[v.user_id]?.full_name || '—',
          lessons: new Set(),
          time: 0
        };
      }
      alunoStats[v.user_id].lessons.add(v.lesson_id);
      alunoStats[v.user_id].time += (v.time_spent_seconds || 0);
    });
    const topAlunos = Object.values(alunoStats).sort((a, b) => b.time - a.time).slice(0, 10);

    const aulaStats = {};
    views.forEach(v => {
      const key = v.lesson_id;
      if (!aulaStats[key]) {
        aulaStats[key] = {
          title: lessonMap[key]?.title || '—',
          course: courseMap[v.course_id]?.title || '—',
          views: 0,
          time: 0
        };
      }
      aulaStats[key].views++;
      aulaStats[key].time += (v.time_spent_seconds || 0);
    });
    const topAulas = Object.values(aulaStats).sort((a, b) => b.views - a.views).slice(0, 10);

    const badgeTaxa = (t) => {
      if (t >= 80) return `<span class="badge-pill alta">${t}%</span>`;
      if (t >= 50) return `<span class="badge-pill media">${t}%</span>`;
      if (t > 0) return `<span class="badge-pill baixa">${t}%</span>`;
      return `<span class="badge-pill none">—</span>`;
    };

    main.innerHTML = `
      <div class="section-header">
        <h2>📈 Analytics</h2>
        <span class="section-sub">Visão geral do engajamento na Academy</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-value">${totalAlunos}</div>
          <div class="stat-label">Alunos ativos</div>
          <div class="stat-hint">${totalMatriculas} matrículas no total</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎓</div>
          <div class="stat-value" style="color: var(--verde);">${totalConclusoes}</div>
          <div class="stat-label">Conclusões</div>
          <div class="stat-hint">Certificados emitidos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-value" style="color: var(--cde-laranja-escuro);">${taxaGlobal}%</div>
          <div class="stat-label">Taxa de conclusão</div>
          <div class="stat-hint">Conclusões / matrículas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏱</div>
          <div class="stat-value" style="color: var(--roxo-medio);">${Math.round(totalTempoSegundos / 60)}min</div>
          <div class="stat-label">Tempo total assistido</div>
          <div class="stat-hint">Somando todas as aulas</div>
        </div>
      </div>

      <div style="background: var(--branco); border-radius:14px; padding:22px; border:1px solid var(--cinza-borda); margin-bottom: 20px; overflow-x: auto;">
        <h3 style="font-size: 1rem; margin-bottom: 14px;">📚 Por curso</h3>
        ${cursoStats.length === 0 ? '<p style="color: var(--texto-soft);">Sem cursos.</p>' : `
          <table class="analytics-table">
            <thead><tr>
              <th>Curso</th>
              <th style="text-align:center;">Alunos</th>
              <th style="text-align:center;">Conclusões</th>
              <th style="text-align:center;">Taxa</th>
              <th style="text-align:right;">Tempo total</th>
            </tr></thead>
            <tbody>
              ${cursoStats.map(s => `
                <tr>
                  <td style="font-weight: 600;">${escapeHtml(s.course.title)}</td>
                  <td style="text-align:center;">${s.alunos}</td>
                  <td style="text-align:center;">${s.conclusoes}</td>
                  <td style="text-align:center;">${badgeTaxa(s.taxa)}</td>
                  <td style="text-align:right; font-weight: 600;">${Math.round(s.tempoTotal / 60)}min</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px; margin-bottom: 20px;">
        <div style="background: var(--branco); border-radius:14px; padding:22px; border:1px solid var(--cinza-borda);">
          <h3 style="font-size: 1rem; margin-bottom: 14px;">🏆 Alunos mais engajados</h3>
          ${topAlunos.length === 0 ? '<p style="color: var(--texto-soft); font-size: 0.88rem;">Sem dados ainda.</p>' : topAlunos.map((a, i) => `
            <div style="padding: 10px 0; border-bottom: 1px solid var(--cinza-borda); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                <span style="font-weight: 800; color: ${i === 0 ? 'var(--amarelo)' : i === 1 ? 'var(--texto-soft)' : i === 2 ? 'var(--cde-laranja-escuro)' : 'var(--texto-mute)'};">${i + 1}º</span>
                <span style="font-weight: 600; font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(a.name)}</span>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <div style="font-weight: 700; font-size: 0.85rem; color: var(--cde-laranja-escuro);">${Math.round(a.time / 60)}min</div>
                <div style="font-size: 0.72rem; color: var(--texto-soft);">${a.lessons.size} aula${a.lessons.size === 1 ? '' : 's'}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="background: var(--branco); border-radius:14px; padding:22px; border:1px solid var(--cinza-borda);">
          <h3 style="font-size: 1rem; margin-bottom: 14px;">🔥 Aulas mais acessadas</h3>
          ${topAulas.length === 0 ? '<p style="color: var(--texto-soft); font-size: 0.88rem;">Sem dados ainda.</p>' : topAulas.map((a, i) => `
            <div style="padding: 10px 0; border-bottom: 1px solid var(--cinza-borda); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
              <div style="min-width: 0; flex: 1;">
                <div style="font-weight: 600; font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(a.title)}</div>
                <div style="font-size: 0.72rem; color: var(--texto-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(a.course)}</div>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <div style="font-weight: 700; font-size: 0.85rem; color: var(--azul);">${a.views} view${a.views === 1 ? '' : 's'}</div>
                <div style="font-size: 0.72rem; color: var(--texto-soft);">${Math.round(a.time / 60)}min</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    console.error('Erro renderAnalyticsView:', e);
    main.innerHTML = `<div class="state-box" style="color: var(--cde-vermelho);">Erro ao carregar analytics: ${escapeHtml(e.message)}</div>`;
  }
}

// ==================== INIT ====================
db.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') window.location.href = PDI_URL; });

document.getElementById('course-modal')?.addEventListener('click', e => { if (e.target.id === 'course-modal') closeCourseModal(); });
document.getElementById('course-form-modal')?.addEventListener('click', e => { if (e.target.id === 'course-form-modal') closeCourseForm(); });
document.getElementById('module-form-modal')?.addEventListener('click', e => { if (e.target.id === 'module-form-modal') closeModuleForm(); });
document.getElementById('lesson-form-modal')?.addEventListener('click', e => { if (e.target.id === 'lesson-form-modal') closeLessonForm(); });
document.getElementById('quiz-modal')?.addEventListener('click', e => { if (e.target.id === 'quiz-modal') closeQuizEditor(); });
document.getElementById('enroll-modal')?.addEventListener('click', e => { if (e.target.id === 'enroll-modal') closeEnrollModal(); });
document.getElementById('certificate-modal')?.addEventListener('click', e => { if (e.target.id === 'certificate-modal') closeCertificateModal(); });

initTheme();

boot();
