/* Rodrigo Vasconcellos · interações do site
   Sem dependências. Nada aqui é necessário para o conteúdo aparecer. */
(function () {
  'use strict';

  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 0. Rolagem suave (Lenis) ---- */
  // Desligada para quem pediu menos movimento no sistema.
  var lenis = null;
  if (!reduzir && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    var quadro = function (tempo) { lenis.raf(tempo); requestAnimationFrame(quadro); };
    requestAnimationFrame(quadro);

    // Links para outra parte da mesma página (#como-funciona, #perguntas...)
    // usam a mesma rolagem suave e param logo abaixo do cabeçalho fixo.
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href*="#"]') : null;
      if (!a || a.target === '_blank' || a.classList.contains('pular-conteudo')) return;
      var url = new URL(a.getAttribute('href'), location.href);
      if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
      var alvo = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!alvo) return;
      e.preventDefault();
      // O Lenis já respeita o scroll-margin-top do CSS (altura do cabeçalho + 16px),
      // então não precisa de deslocamento extra aqui.
      lenis.scrollTo(alvo);
      if (history.pushState) history.pushState(null, '', url.hash);
    });
  }

  /* ---- 1. Barra de aviso ---- */
  // A barra é fixa e não pode ser fechada: ela avisa que o Rodrigo está
  // aceitando novos pacientes, e isso precisa aparecer em toda visita.
  var aviso = document.getElementById('barra-aviso');

  /* ---- 2. Cabeçalho ---- */
  var header = document.getElementById('header');
  if (header) {
    // Vira barra de ponta a ponta no momento em que a cápsula encosta no
    // topo da tela, ou seja, quando a barra de aviso já saiu de vista.
    var aplicarHeader = function () {
      var limite = (aviso && !aviso.hidden) ? aviso.offsetHeight : 0;
      header.classList.toggle('header--compacto', window.scrollY > limite + 2);
    };
    aplicarHeader();
    window.addEventListener('scroll', aplicarHeader, { passive: true });

    var medir = function () {
      // altura ocupada no fluxo: não muda entre os dois estados (folga vira margem)
      var altura = header.offsetHeight + parseFloat(getComputedStyle(header).marginBottom || 0);
      document.documentElement.style.setProperty('--header-h', altura + 'px');
    };
    medir();
    window.addEventListener('resize', medir);
  }

  /* ---- 3. Menu drawer ---- */
  var drawer = document.getElementById('drawer');
  var abrir = document.querySelector('[data-abrir-menu]');
  var fechar = document.querySelector('[data-fechar-menu]');

  function estadoDrawer(aberto) {
    if (!drawer) return;
    drawer.dataset.aberto = aberto ? 'true' : 'false';
    drawer.setAttribute('aria-hidden', aberto ? 'false' : 'true');
    document.body.dataset.drawer = aberto ? 'true' : 'false';
    if (abrir) abrir.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    // com o menu aberto a página de trás não rola
    if (lenis) { if (aberto) lenis.stop(); else lenis.start(); }
    if (aberto) {
      var primeiro = drawer.querySelector('a, button');
      if (primeiro) primeiro.focus();
    } else if (abrir) {
      abrir.focus();
    }
  }
  if (abrir) abrir.addEventListener('click', function () { estadoDrawer(true); });
  if (fechar) fechar.addEventListener('click', function () { estadoDrawer(false); });
  if (drawer) {
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { estadoDrawer(false); });
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.dataset.aberto === 'true') estadoDrawer(false);
  });

  /* ---- 4. Animações de entrada ---- */
  var alvos = document.querySelectorAll('.anima');
  if (reduzir || !('IntersectionObserver' in window)) {
    alvos.forEach(function (el) { el.classList.add('anima--visivel'); });
  } else {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('anima--visivel');
          obs.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    alvos.forEach(function (el) { obs.observe(el); });
  }

  /* ---- 5. WhatsApp flutuante ---- */
  var flutuante = document.getElementById('whats-flutuante');
  // O botão aparece quando o topo da página sai da tela: .hero na home,
  // .hero-interno nas especialidades, e a primeira seção nas demais.
  var hero = document.querySelector('.hero, .hero-interno, main > section');
  var ctaFinal = document.querySelector('.cta-final');
  if (flutuante && hero && 'IntersectionObserver' in window) {
    var heroVisivel = true, ctaVisivel = false;
    var atualizar = function () {
      flutuante.dataset.visivel = (!heroVisivel && !ctaVisivel) ? 'true' : 'false';
    };
    new IntersectionObserver(function (e) {
      heroVisivel = e[0].isIntersecting; atualizar();
    }, { threshold: 0 }).observe(hero);
    // Some quando o convite final ou o rodapé estão na tela: ali já existe
    // botão de WhatsApp, e a barra índigo sumiria contra o rodapé índigo.
    var finais = [ctaFinal, document.querySelector('.rodape')].filter(Boolean);
    var noFim = new Set();
    finais.forEach(function (alvo) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) noFim.add(alvo); else noFim.delete(alvo);
        ctaVisivel = noFim.size > 0; atualizar();
      }, { threshold: 0 }).observe(alvo);
    });
  }

  /* ---- 6. Cookies ---- */
  var cookies = document.getElementById('cookies');
  if (cookies) {
    var escolha = null;
    try { escolha = localStorage.getItem('cookies'); } catch (e) {}
    if (!escolha) cookies.hidden = false;
    cookies.querySelectorAll('[data-cookies]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        try { localStorage.setItem('cookies', btn.dataset.cookies); } catch (e) {}
        cookies.hidden = true;
      });
    });
  }

  /* ---- 7. FAQ: fecha as outras ao abrir uma ---- */
  var itens = document.querySelectorAll('.faq__item');
  itens.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      itens.forEach(function (outro) { if (outro !== item) outro.open = false; });
    });
  });
})();
