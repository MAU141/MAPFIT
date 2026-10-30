const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');
const floatBtn = document.getElementById('floatBtn');
const nav = document.getElementById('mainNav');

function toggleSidebar() {
  const isMobile = window.innerWidth <= 900;
  if (isMobile) {
    const isOpen = document.body.classList.contains('sidebar-overlay');
    if (isOpen) {
      document.body.classList.remove('sidebar-overlay');
    } else {
      document.body.classList.add('sidebar-overlay');
      sidebar.classList.remove('collapsed');
      document.body.classList.remove('sidebar-collapsed');
    }
  } else {
    const isCollapsed = sidebar.classList.contains('collapsed');
    if (isCollapsed) {
      sidebar.classList.remove('collapsed');
      document.body.classList.remove('sidebar-collapsed');
    } else {
      sidebar.classList.add('collapsed');
      document.body.classList.add('sidebar-collapsed');
    }
  }
}

if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);

if (floatBtn) {
  floatBtn.addEventListener('click', () => {
    const isMobile = window.innerWidth <= 900;
    if (isMobile) {
      document.body.classList.add('sidebar-overlay');
      sidebar.classList.remove('collapsed');
      document.body.classList.remove('sidebar-collapsed');
    } else {
      sidebar.classList.remove('collapsed');
      document.body.classList.remove('sidebar-collapsed');
    }
  });
}

document.body.addEventListener('click', (e) => {
  if (window.innerWidth <= 900 && document.body.classList.contains('sidebar-overlay')) {
    if (!sidebar.contains(e.target) && !floatBtn.contains(e.target) && !toggleBtn.contains(e.target)) {
      document.body.classList.remove('sidebar-overlay');
    }
  }
});

let wasMobile = window.innerWidth <= 900;
window.addEventListener('resize', () => {
  const isMobile = window.innerWidth <= 900;
  if (isMobile !== wasMobile) {
    document.body.classList.remove('sidebar-overlay');
    sidebar.classList.remove('collapsed');
    document.body.classList.remove('sidebar-collapsed');
    wasMobile = isMobile;
  }
});

if (nav) {
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
      document.body.classList.remove('sidebar-overlay');
    }
  }));
}

document.querySelectorAll('.pv-item-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.pv-item');
    const body = item.querySelector('.pv-item-body');
    const isOpen = item.classList.contains('open');
    if (isOpen) {
      body.style.maxHeight = '0px';
      item.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    } else {
      body.style.maxHeight = body.scrollHeight + 'px';
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});
const backToTopBtn = document.getElementById('backToTop');
if (backToTopBtn) {
  window.addEventListener('scroll', function () {
    if (window.scrollY > 400) { backToTopBtn.classList.add('visible') } else { backToTopBtn.classList.remove('visible') }
  });
  backToTopBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }) });
}

var revealEls = document.querySelectorAll('.reveal');
var revealObs = new IntersectionObserver(function (entries) {
  entries.forEach(function (e) {
    if (e.isIntersecting) { e.target.classList.add('revealed'); revealObs.unobserve(e.target) }
  })
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(function (el) { revealObs.observe(el) });

const fichaForm = document.getElementById('fichaForm');
if (fichaForm) {
  const fichaSummary = document.getElementById('fichaSummary');
  const fichaSummaryList = document.getElementById('fichaSummaryList');

  fichaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(fichaForm);
    const peso = parseFloat(data.get('peso'));
    const alturaM = parseFloat(data.get('altura')) / 100;
    const imc = (peso && alturaM) ? (peso / (alturaM * alturaM)).toFixed(1) : '—';

    const rows = [
      ['Nombre', data.get('nombre')],
      ['Edad', data.get('edad') + ' años'],
      ['Peso', peso + ' kg'],
      ['Estatura', data.get('altura') + ' cm'],
      ['IMC estimado', imc],
      ['Condición principal', data.get('condicion')],
      ['Actividad actual', data.get('actividad')],
      ['Objetivo', data.get('objetivo')],
    ];
    if (data.get('notas')) rows.push(['Notas', data.get('notas')]);

    const esc = (t) => String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    fichaSummaryList.innerHTML = rows.map(([k, v]) =>
      `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`
    ).join('');

    fichaSummary.classList.add('show');
    fichaSummary.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
