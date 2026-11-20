/* Ícones locais da CDE Academy. Não altera ações, dados ou permissões. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const SELECTOR = 'button, a.btn-primary, a.btn-secondary, a.btn-success, a.btn-danger, .nav-icon, #theme-icon, #main-content h1, #main-content h2, #main-content h3, #main-content .stat-icon, #main-content .dash-setor-icon, #main-content .dash-alert-icon, #main-content .dash-top-medal, #main-content .dash-periodo, #main-content .dash-insight, #liblog-results div[style*="font-size: 1.4rem"], #liblog-results > div > div:first-child, #liblog-action-filter option';
  const DRAWINGS = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 21v-4h6v4M8 7h1m6 0h1M8 11h1m6 0h1"/>',
    trophy: '<path d="M8 3h8v5a4 4 0 0 1-8 0V3Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v6m-4 3h8m-6-3h4v3"/>',
    laptop: '<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M2 20h20l-2-4H4Z"/>',
    books: '<rect x="3" y="4" width="5" height="17" rx="1"/><rect x="9" y="4" width="5" height="17" rx="1"/><path d="m15 5 4-1 4 16-4 1ZM4 8h3m3 0h3"/>',
    book: '<path d="M12 5c-3-2-7-2-10-1v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v16"/>',
    chart: '<path d="M4 4v16h16M8 15v-4m5 4V7m5 8v-6"/>',
    trend: '<path d="M3 20V4m0 16h18M6 15l5-5 4 3 6-8m-5 0h5v5"/>',
    graduation: '<path d="m2 8 10-5 10 5-10 5Zm4 2v7c4 3 8 3 12 0v-7m4-2v9"/>',
    settings: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6m-6 5h6"/>',
    star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
    logout: '<path d="M10 3H4v18h6m4-5 5-4-5-4m-6 4h13"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    left: '<path d="m11 4-8 8 8 8M3 12h18"/>',
    right: '<path d="m13 4 8 8-8 8M3 12h18"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    checked: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M17 4a4 4 0 0 1 0 8m2 3a5 5 0 0 1 3 5v1"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    quiz: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 8 1 1 2-2m3 1h3m-9 6h3m3 0h3"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9m-7-4v13M12 8C3 8 5 1 9 3c2 1 3 5 3 5Zm0 0c9 0 7-7 3-5-2 1-3 5-3 5Z"/>',
    close: '<path d="m5 5 14 14M5 19 19 5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2M9 2h6M12 2v3m6 2 2-2"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3v4l10 10v4M17 3v4 0L7 17v4"/>',
    flame: '<path d="M12 3c2 5 8 7 8 12a8 8 0 0 1-16 0c0-3 2-5 4-7 0 3 1 4 2 4 3-2 3-5 2-9Z"/>',
    briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12c5 3 13 3 18 0m-9 0v4"/>',
    factory: '<path d="M3 21V10l6 3V7l6 4V3h5v18ZM7 17h2m3 0h2m3 0h1"/>',
    warning: '<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3v1"/>',
    bulb: '<path d="M8 16c0-3-3-3-3-7a7 7 0 0 1 14 0c0 4-3 4-3 7ZM9 20h6m-5 3h4"/>',
    falling: '<path d="M3 4v16h18M6 7l5 5 4-3 6 8m-5 0h5v-5"/>',
    medal: '<circle cx="12" cy="15" r="6"/><path d="M7 10 3 2h6l3 7 3-7h6l-4 8m-8 6 2-2 2 2 2-2"/>'

  };
  const TOKENS = {
    '🏠':['home','Página inicial'], '🏢':['building','Nossa empresa'],
    '🏆':['trophy','Prêmios'], '💻':['laptop','Meus cursos'],
    '📚':['books','Catálogo de cursos'], '📖':['book','Biblioteca'],
    '📊':['chart','Desempenho'], '📈':['trend','Analytics'],
    '🎓':['graduation','Certificados'], '⚙':['settings','Gerenciar'],
    '📋':['clipboard','Registros'], '⭐':['star','Pontos'],
    '🚪':['logout','Sair da conta'], '☰':['menu','Abrir menu'],
    '➕':['plus','Adicionar'], '🔔':['bell','Notificações'],
    '🌙':['moon','Ativar tema escuro'], '☀':['sun','Ativar tema claro'],
    '←':['left','Voltar'], '→':['right','Avançar'],
    '✓':['check','Concluir'], '✅':['checked','Concluído'],
    '📥':['download','Baixar'], '✏':['edit','Editar'],
    '👥':['users','Matrículas'], '🗑':['trash','Excluir'],
    '📝':['quiz','Questionário'], '👁':['eye','Visualizar'],
    '🎁':['gift','Prêmios'], '✕':['close','Fechar'], '+':['plus','Adicionar'],
    '🎯':['target','Metas'], '📅':['calendar','Calendário'],
    '⏱':['clock','Tempo'], '⏰':['clock','Prazo'], '⏳':['hourglass','Em andamento'],
    '🔥':['flame','Aulas mais acessadas'], '💼':['briefcase','Comercial'],
    '🏭':['factory','Produção'], '⚠':['warning','Atenção'], '💡':['bulb','Destaque'],
    '📉':['falling','Queda'], '📜':['clipboard','Histórico'],
    '🥇':['medal','1º lugar'], '🥈':['medal','2º lugar'], '🥉':['medal','3º lugar']
  };

  function matchIcon(text) {
    const start = text.length - text.trimStart().length;
    const trimmed = text.trim();
    for (const [token, item] of Object.entries(TOKENS)) {
      if (trimmed.startsWith(token)) {
        let length = token.length;
        if (trimmed[length] === '\uFE0F') length++;
        if (token === '+' && trimmed.length > 1 && !/\s/.test(trimmed[1])) continue;
        return { start, length, token, name:item[0], label:item[1] };
      }
    }
    for (const token of ['←', '→']) {
      if (trimmed.endsWith(token)) return { start:text.trimEnd().length-token.length, length:token.length, name:TOKENS[token][0], label:TOKENS[token][1] };
    }
    return null;
  }

  function labelControl(control, label) {
    if (!control || control.hasAttribute('aria-labelledby')) return;
    if (control.hasAttribute('aria-label') && !control.hasAttribute('data-cde-auto-label')) return;
    if (control.matches('.icon-btn, .hamburger') || !control.textContent.trim()) {
      control.setAttribute('aria-label', control.getAttribute('title') || label);
      control.setAttribute('data-cde-auto-label', 'true');
    }
  }

  // Somente títulos do sistema; títulos de cursos/livros/prêmios não são reescritos.
  const SYSTEM_HEADINGS = new Set([
    'Gerenciar Pontos', 'Log da Biblioteca', 'Gerenciar Cursos', 'Dashboard Executivo',
    'Analytics', 'Meu Desempenho', 'Ranking completo', 'Histórico de ajustes manuais',
    'Por curso', 'Alunos mais engajados', 'Aulas mais acessadas', 'Evolução mensal',
    'Comparativo de setores', 'Top 5 colaboradores', 'Top cursos da Academy',
    'Pontos de atenção', 'Destaques positivos', 'Progresso por curso',
    'Loja de Prêmios', 'Prêmios disponíveis', 'Meus resgates', 'Biblioteca'
  ]);
  function decorate(control) {
    // Opções de select nativo recebem apenas o texto; SVG não é confiável nelas.
    if (control.matches('#liblog-action-filter option')) {
      if (!['page_view','book_open','book_download'].includes(control.getAttribute('value'))) return;
      const match = matchIcon(control.textContent);
      if (match) control.textContent = control.textContent.slice(match.start + match.length).trimStart();
      return;
    }
    if (!control.isConnected || control.closest('svg, script, style, textarea, [contenteditable="true"]')) return;
    if (control.matches('h1, h2, h3') && control.closest('.course-card, .cert-card, .prize-card, .book-card')) return;
    const walker = document.createTreeWalker(control, 4); // SHOW_TEXT
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    for (const node of texts) {
      if (!node.parentElement || node.parentElement.closest('svg, script, style, textarea, [contenteditable="true"]')) continue;
      const match = matchIcon(node.textContent);
      if (!match) continue;
      if (control.matches('h1, h2, h3')) {
        if (node.parentElement !== control) continue;
        const title = node.textContent.slice(match.start + match.length).trim();
        if (!SYSTEM_HEADINGS.has(title)) continue;
      }
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'cde-academy-icon');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.setAttribute('data-cde-icon', match.name);
      // Apenas desenhos constantes locais; nenhuma informação do usuário vira HTML.
      svg.innerHTML = DRAWINGS[match.name];
      const value = node.textContent;
      const parts = [document.createTextNode(value.slice(0,match.start)), svg];
      if (control.matches('.dash-top-medal') && match.name === 'medal') {
        const position = document.createElement('span');
        position.className = 'cde-medal-position';
        position.textContent = match.label;
        parts.push(position);
      }
      parts.push(document.createTextNode(value.slice(match.start+match.length)));
      node.replaceWith(...parts);
      const button = control.closest('button, a');
      if (button) button.classList.add('cde-has-icon');
      labelControl(button, match.label);
    }
  }

  function scan(root) {
    if (!root || root.nodeType !== 1 || root.closest('svg, script, style, textarea')) return;
    const owner = root.closest(SELECTOR);
    if (owner) decorate(owner);
    root.querySelectorAll(SELECTOR).forEach(decorate);
  }

  function start() {
    if (document.body.dataset.cdeIconsReady === 'true') return;
    document.body.dataset.cdeIconsReady = 'true';
    scan(document.body);
    const options = { childList:true, subtree:true, characterData:true };
    const observer = new MutationObserver(records => {
      const roots = new Set();
      for (const record of records) {
        if (record.type === 'characterData') roots.add(record.target.parentElement);
        else for (const node of record.addedNodes) roots.add(node.nodeType === 1 ? node : node.parentElement);
      }
      observer.disconnect(); // As substituições não realimentam o observador.
      try { roots.forEach(scan); }
      finally { observer.observe(document.body, options); }
    });
    observer.observe(document.body, options);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
