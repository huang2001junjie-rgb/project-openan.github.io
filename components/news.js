/* ============================================================
   News Module - data-driven renderer + client-side routing.

   Reads news/news.json and renders either the list view or the
   detail view based on the ?id= query parameter. Browser
   back/forward is handled via popstate.

   View switching (see docs/adr/ADR-013):
   - List view: shows #navbar (injected by components/navbar.js)
     and the .page list view (page-head + news list); hides
     .news-detail-wrap and the breadcrumb.
   - Detail view: keeps #navbar, hides .page, shows
     .news-detail-wrap and renders the #news-breadcrumb path.

   Requires fetch (use an HTTP server for local preview, e.g.
   `python -m http.server`). Depends on the containers/classes
   declared in news.html and styled by components/news.css.
   ============================================================ */
(function () {
  'use strict';

  var listEl = document.getElementById('news-list');
  var detailEl = document.getElementById('news-detail');
  var listWrap = document.querySelector('.page');
  var detailWrap = document.querySelector('.news-detail-wrap');
  var breadcrumbEl = document.getElementById('news-breadcrumb');
  var newsData = [];

  function fmtDateISO(dateStr) { return dateStr; }

  function fmtDateBadge(dateStr) {
    var d = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(d.getTime())) return { day: '??', rest: dateStr };
    var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    var day = d.getUTCDate();
    var month = months[d.getUTCMonth()];
    var year = d.getUTCFullYear();
    return {
      day: (day < 10 ? '0' : '') + day,
      rest: month + ' ' + year
    };
  }

  function fmtDateLong(dateStr) {
    var d = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }

  function categoryClass(cat) {
    if (!cat) return '';
    var c = cat.toLowerCase();
    if (c === 'release') return 'release';
    if (c === 'announcement') return 'announcement';
    if (c === 'event') return 'event';
    if (c === 'community') return 'community';
    return '';
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderList(items) {
    listEl.innerHTML = '';
    if (!items || !items.length) {
      listEl.innerHTML =
        '<div class="news-state">' +
          '<h3>No news yet</h3>' +
          '<p>Check back soon for announcements. Meanwhile, explore the <a href="index.html">home page</a> or <a href="https://github.com/project-openan">GitHub</a>.</p>' +
        '</div>';
      return;
    }
    var sorted = items.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    var frag = document.createDocumentFragment();
    sorted.forEach(function (item) {
      var date = fmtDateBadge(item.date);
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'news-card';
      card.setAttribute('data-id', item.id);
      card.setAttribute('aria-label', item.title);
      var tagsHTML = '';
      if (item.tags && item.tags.length) {
        tagsHTML = '<div class="news-tags">' + item.tags.map(function (t) {
          return '<span>' + escapeHtml(t) + '</span>';
        }).join('') + '</div>';
      }
      var metaHTML = '';
      if (item.category || item.author) {
        metaHTML = '<div class="news-meta">';
        if (item.category) {
          metaHTML += '<span class="category-pill ' + categoryClass(item.category) + '">' + escapeHtml(item.category) + '</span>';
        }
        if (item.author) {
          metaHTML += '<span class="news-author">' + escapeHtml(item.author) + '</span>';
        }
        metaHTML += '</div>';
      }
      var arrowIcon = item.link
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M7 17L17 7M9 7h8v8"/>' +
          '</svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M5 12h14M13 5l7 7-7 7"/>' +
          '</svg>';
      card.innerHTML =
        '<div class="news-date">' +
          '<strong>' + date.day + '</strong>' +
          date.rest +
        '</div>' +
        '<div class="news-body">' +
          metaHTML +
          '<h3>' + escapeHtml(item.title) + '</h3>' +
          '<p class="news-summary">' + escapeHtml(item.summary) + '</p>' +
          tagsHTML +
        '</div>' +
        '<div class="news-arrow" aria-hidden="true">' + arrowIcon + '</div>';
      card.addEventListener('click', function () {
        if (item.link) {
          window.open(item.link, '_blank', 'noopener');
        } else {
          navigateToDetail(item.id);
        }
      });
      frag.appendChild(card);
    });
    listEl.appendChild(frag);
  }

  function renderDetail(item) {
    detailEl.innerHTML = '';
    if (!item) {
      detailEl.innerHTML =
        '<div class="news-state">' +
          '<h3>News item not found</h3>' +
          '<p>This announcement may have been removed or the URL is incorrect. <a href="news.html">Return to the news list</a>.</p>' +
        '</div>';
      return;
    }
    var meta = '<div class="detail-meta-row">';
    if (item.category) {
      meta += '<span class="category-pill ' + categoryClass(item.category) + '">' + escapeHtml(item.category) + '</span>';
    }
    meta += '<time datetime="' + fmtDateISO(item.date) + '">' + fmtDateLong(item.date) + '</time>';
    if (item.author) {
      meta += '<span class="detail-author">by ' + escapeHtml(item.author) + '</span>';
    }
    meta += '</div>';
    var tags = '';
    if (item.tags && item.tags.length) {
      tags = '<div class="detail-tags">' + item.tags.map(function (t) {
        return '<span>' + escapeHtml(t) + '</span>';
      }).join('') + '</div>';
    }
    var body;
    if (item.content) {
      body = '<div class="detail-body">' + item.content + '</div>';
    } else if (item.link) {
      body =
        '<div class="detail-body">' +
          '<p>This announcement is hosted on an external site. Click below to read the full article.</p>' +
          '<a class="btn btn-primary" href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener">Read on External Site&nbsp;&nbsp;&#8599;</a>' +
        '</div>';
    } else {
      body = '';
    }
    detailEl.innerHTML =
      '<article class="detail-header">' +
        meta +
        '<h1>' + escapeHtml(item.title) + '</h1>' +
        tags +
      '</article>' +
      body;
  }

  function renderBreadcrumb(item) {
    if (!breadcrumbEl) return;
    breadcrumbEl.innerHTML =
      '<a href="index.html">Home</a>' +
      '<span class="breadcrumb-sep" aria-hidden="true">/</span>' +
      '<a href="news.html">News</a>';
    if (item && item.title) {
      breadcrumbEl.innerHTML +=
        '<span class="breadcrumb-sep" aria-hidden="true">/</span>' +
        '<span class="breadcrumb-current" aria-current="page">' + escapeHtml(item.title) + '</span>';
    }
  }

  function clearBreadcrumb() {
    if (breadcrumbEl) breadcrumbEl.innerHTML = '';
  }

  function getQueryId() {
    var s = window.location.search || '';
    var m = s.match(/[?&]id=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function navigateToDetail(id) {
    var url = 'news.html?id=' + encodeURIComponent(id);
    if (window.history && window.history.pushState) {
      window.history.pushState({ id: id }, '', url);
    }
    showDetail(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showDetail(id) {
    var item = newsData.find(function (x) { return x.id === id; });
    if (listWrap) listWrap.classList.add('hidden');
    if (detailWrap) detailWrap.classList.add('active');
    renderDetail(item || null);
    renderBreadcrumb(item || null);
  }

  function showList() {
    if (detailWrap) detailWrap.classList.remove('active');
    if (listWrap) listWrap.classList.remove('hidden');
    clearBreadcrumb();
  }

  function showLoading() {
    listEl.innerHTML =
      '<div class="news-state">' +
        '<div class="spinner" aria-hidden="true"></div>' +
        '<p style="font-family: var(--mono); font-size: 0.8rem; color: var(--text-dim); letter-spacing: 0.08em;">LOADING NEWS…</p>' +
      '</div>';
  }

  function showError(err) {
    listEl.innerHTML =
      '<div class="news-state">' +
        '<h3>Could not load news</h3>' +
        '<p>There was an error loading the news feed. Please try again later or visit the <a href="https://github.com/project-openan">OpenAN GitHub</a> for the latest updates.</p>' +
        '<p style="font-family: var(--mono); font-size: 0.75rem; color: var(--text-dim); margin-top: 16px;">' +
          (err && err.message ? escapeHtml(err.message) : 'Unknown error') +
        '</p>' +
      '</div>';
  }

  window.addEventListener('popstate', function () {
    var id = getQueryId();
    if (id) showDetail(id); else showList();
  });

  function init() {
    showLoading();
    fetch('news/news.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        newsData = Array.isArray(data) ? data : [];
        renderList(newsData);
        var id = getQueryId();
        if (id) showDetail(id); else showList();
      })
      .catch(function (err) {
        console.error('[news] failed to load news.json:', err);
        showError(err);
      });
  }

  init();
})();