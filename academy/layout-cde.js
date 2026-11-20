/* Interface apenas: preserva autenticação, consultas e permissões do Academy. */
(function(){
  'use strict';
  const sidebar=document.getElementById('sidebar'),overlay=document.getElementById('sidebar-overlay'),button=document.getElementById('mobile-menu'),main=document.querySelector('.main-wrapper');
  const mobile=window.matchMedia('(max-width:960px)');
  const icon=(open)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'+(open?'<path d="m6 6 12 12M18 6 6 18"/>':'<path d="M4 6h16M4 12h16M4 18h16"/>')+'</svg>';
  function set(open,focus){
    open=!!open&&mobile.matches;
    sidebar.classList.toggle('open',open);overlay.classList.toggle('open',open);document.body.classList.toggle('cde-menu-open',open);
    button.setAttribute('aria-expanded',String(open));button.innerHTML=icon(open)+'<span>'+(open?'Fechar':'Menu')+'</span>';
    sidebar.inert=mobile.matches&&!open;main.inert=open;
    if(open){sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');if(focus)sidebar.querySelector('.nav-item:not(.hidden)')?.focus();}
    else{sidebar.removeAttribute('role');sidebar.removeAttribute('aria-modal');if(focus)button.focus();}
  }
  window.CDEAcademyLayout={toggle(){set(!sidebar.classList.contains('open'),true)},close(focus=true){set(false,focus)}};
  document.addEventListener('keydown',e=>{
    if(!sidebar.classList.contains('open'))return;
    if(e.key==='Escape'){e.preventDefault();set(false,true)}
    if(e.key==='Tab'){
      const items=[...sidebar.querySelectorAll('button,a[href],input,select')].filter(n=>!n.disabled&&!n.closest('.hidden'));items.push(button);
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  });
  mobile.addEventListener('change',()=>set(false,false));
  const heading=document.getElementById('management-heading');
  const updateGroups=()=>{const hidden=!['nav-manage','nav-library-logs','nav-points'].some(id=>!document.getElementById(id).classList.contains('hidden'));if(heading.classList.contains('hidden')!==hidden)heading.classList.toggle('hidden',hidden);};
  const groupsObserver=new MutationObserver(updateGroups);
  ['nav-manage','nav-library-logs','nav-points'].forEach(id=>groupsObserver.observe(document.getElementById(id),{attributes:true,attributeFilter:['class']}));
  updateGroups();set(false,false);
})();
