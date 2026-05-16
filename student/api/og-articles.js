export const config = { runtime: 'edge' };

const BACKEND = process.env.BACKEND_URL || 'https://mathemsolvex.onrender.com';
const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || 'https://question.maarula.in';

function stripHtml(s = '') {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function blogJsonLd(p, url) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    "headline": p.title,
    "description": p.metaDescription || stripHtml(p.content || '').slice(0, 160),
    "image": p.featuredImage ? [p.featuredImage] : undefined,
    "datePublished": p.createdAt || p.updatedAt,
    "dateModified": p.updatedAt || p.createdAt,
    "author": { "@type": "Person", "name": p.author || "Maarula Classes" },
    "publisher": {
      "@type": "Organization",
      "name": "Maarula",
      "logo": { "@type": "ImageObject", "url": `${PUBLIC_BASE}/maarulalogo.png` }
    }
  };
}

async function fetchPostBySlug(slug) {
  const urls = [
    `${BACKEND}/api/posts/slug/${encodeURIComponent(slug)}`,
    `${BACKEND}/api/posts/${encodeURIComponent(slug)}`
  ];
  for (const u of urls) {
    const r = await fetch(u, { headers: { 'Accept': 'application/json' } });
    if (r.ok) return r.json();
    if (r.status === 404) continue;
  }
  return null;
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) return new Response('Missing slug', { status: 400 });

    const p = await fetchPostBySlug(slug);
    const url = `${PUBLIC_BASE}/articles/${slug}`;

    if (!p) {
      const nf = `<!doctype html><html><head>
<meta name="robots" content="noindex">
<title>Article not found | Maarula</title>
<link rel="canonical" href="${url}">
</head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`;
      return new Response(nf, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }});
    }

    const title = `${p.title} | Maarula Classes`;
    const desc = p.metaDescription || stripHtml(p.content || '').slice(0, 160);
    const image = p.featuredImage || `${PUBLIC_BASE}/maarulalogo.png`;
    const jsonLd = blogJsonLd(p, url);

    const gaId = process.env.GA_MEASUREMENT_ID;
    const gaScript = gaId ? `
<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${gaId}');
</script>` : '';

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<link rel="canonical" href="${url}">
${gaScript}

<meta property="og:type" content="article">
<meta property="og:site_name" content="Maarula Classes">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="article:published_time" content="${p.createdAt}">
<meta property="article:modified_time" content="${p.updatedAt}">
<meta property="article:author" content="${escapeHtml(p.author || 'Maarula Classes')}">
<meta property="article:section" content="${escapeHtml(p.category || 'Blog')}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${image}">

<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<div id="root">
  <article class="ssr-article-content" style="padding: 2rem; max-width: 800px; margin: 0 auto;">
    <header>
      <h1>${escapeHtml(p.title)}</h1>
      <time datetime="${p.createdAt}">${new Date(p.createdAt).toLocaleDateString()}</time>
    </header>
    ${p.featuredImage ? `<img src="${p.featuredImage}" alt="${escapeHtml(p.title)}" style="max-width:100%;height:auto;display:block;margin:1rem 0;" />` : ''}
    <div class="article-body">
      ${p.content}
    </div>
  </article>
</div>
<script>
  window.__INITIAL_POST_DATA__ = ${JSON.stringify(p)};
</script>
<script type="module" src="/src/main.jsx"></script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300'
      }
    });
  } catch (e) {
    return new Response('Edge error', { status: 500 });
  }
}
