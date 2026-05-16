import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactPlayer from "react-player/youtube";

import api from "../api";
import useMathJax from "../hooks/useMathJax";
import styles from "./SinglePostPage.module.css";

import {
  FaWhatsapp,
  FaTelegram,
  FaFacebook,
  FaLinkedin,
  FaXTwitter,
  FaLink,
} from "react-icons/fa6";

/* ---------- small helpers (safe & deterministic) ---------- */
const stripHtml = (s = "") =>
  s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const truncate = (s = "", n = 160) =>
  s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;

const esc = (s = "") =>
  s.replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c])
  );

const baseSlug = (s = "") =>
  s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);

/** Slugify with guaranteed non-empty + uniqueness */
function slugifyUnique(text, used) {
  const raw = (text || "").trim();
  if (!raw) return null;
  const base = baseSlug(raw) || "section";
  const seen = used.get(base) || 0;
  used.set(base, seen + 1);
  return seen > 0 ? `${base}-${seen + 1}` : base;
}

/* ===========================================================
   Component
   =========================================================== */
export default function SinglePostPage() {
  const { slug } = useParams();

  // Hooks in fixed order
  const initialPost = typeof window !== 'undefined' && window.__INITIAL_POST_DATA__ && window.__INITIAL_POST_DATA__.slug === slug 
    ? window.__INITIAL_POST_DATA__ 
    : null;

  const [post, setPost] = useState(initialPost);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(!initialPost);
  const [toc, setToc] = useState([]);
  const contentRef = useRef(null);

  // Always fire MathJax on content change
  useMathJax([post, recentPosts]);

  // Reading time (before any early returns)
  const readingTime = useMemo(() => {
    const words = stripHtml(post?.content || "")
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.round((words || 200) / 200)); // ~200 wpm
  }, [post?.content]);

  // Fetch data for the page
  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        setLoading(true);
        // Scroll to top on navigation if not initial load
        if (!initialPost) {
          window.scrollTo({ top: 0, behavior: "instant" });
        }

        const fetchPost = !initialPost ? api.get(`/posts/${slug}`) : Promise.resolve({ data: initialPost });
        const fetchRecent = api.get(`/posts?limit=6`);

        const [pRes, rRes] = await Promise.all([fetchPost, fetchRecent]);

        if (!ok) return;

        setPost(pRes.data);
        if (typeof window !== 'undefined') window.__INITIAL_POST_DATA__ = null; // Clear it

        const arr = Array.isArray(rRes.data)
          ? rRes.data
          : rRes.data?.posts || [];
        setRecentPosts(arr.filter((p) => p.slug !== slug).slice(0, 5));
      } catch (e) {
        console.error("Failed to fetch post data", e);
      } finally {
        ok && setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [slug]);

  // Enhance rendered HTML & build TOC safely
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    // External links → new tab
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      try {
        const u = new URL(href, window.location.origin);
        if (u.origin !== window.location.origin) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
      } catch {
        // ignore relative or malformed
      }
    });

    // Images → responsive figure with optional caption
    root.querySelectorAll("img").forEach((img) => {
      img.loading = img.loading || "lazy";
      img.decoding = img.decoding || "async";
      img.classList.add(styles.responsiveImage);

      if (!img.closest("figure")) {
        const fig = document.createElement("figure");
        fig.className = styles.figure;
        img.replaceWith(fig);
        fig.appendChild(img);
        if (img.alt) {
          const cap = document.createElement("figcaption");
          cap.className = styles.figcaption;
          cap.textContent = img.alt;
          fig.appendChild(cap);
        }
      }
    });

    // Tables → horizontal scroll on mobile
    root.querySelectorAll("table").forEach((tbl) => {
      if (!tbl.closest(`.${styles.tableWrap}`)) {
        const wrap = document.createElement("div");
        wrap.className = styles.tableWrap;
        tbl.parentNode.insertBefore(wrap, tbl);
        wrap.appendChild(tbl);
      }
      tbl.setAttribute("role", "table");
    });

    // Iframes → 16:9 responsive
    root.querySelectorAll("iframe").forEach((ifr) => {
      if (!ifr.closest(`.${styles.embed}`)) {
        const wrap = document.createElement("div");
        wrap.className = styles.embed;
        ifr.parentNode.insertBefore(wrap, ifr);
        wrap.appendChild(ifr);
      }
      ifr.setAttribute("loading", "lazy");
    });

    // Build TOC from h2/h3 — unique, non-empty IDs only
    const used = new Map();
    const headers = Array.from(root.querySelectorAll("h2, h3"));
    const list = [];
    headers.forEach((h) => {
      const text = (h.textContent || "").trim();
      if (!text) return; // skip empty headings
      let id = (h.id || "").trim();
      if (!id) {
        id = slugifyUnique(text, used);
        if (!id) return; // safety
        h.id = id;
      }
      list.push({ id, text, level: h.tagName === "H2" ? 2 : 3 });
    });

    setToc(list);
  }, [post]);

  if (loading) return <div className={styles.loading}>Loading article…</div>;
  if (!post) return <div className={styles.loading}>Article not found.</div>;

  /* ---------- SEO ---------- */
  const pageUrl = `https://question.maarula.in/articles/${post.slug}`;
  const rawDesc = post.metaDescription || stripHtml(post.content || "");
  const pageDescription = truncate(rawDesc, 160);
  const pageTitle = `${post.title} | Maarula Classes`;
  const imageUrl =
    post.featuredImage ||
    "https://res.cloudinary.com/dwmj6up6j/image/upload/v1752687380/rqtljy0wi1uzq3itqxoe.png";

  const publishedISO = post.createdAt
    ? new Date(post.createdAt).toISOString()
    : undefined;
  const modifiedISO = post.updatedAt
    ? new Date(post.updatedAt).toISOString()
    : publishedISO;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: pageDescription,
    image: imageUrl ? [imageUrl] : undefined,
    datePublished: publishedISO,
    dateModified: modifiedISO,
    author: post.author
      ? { "@type": "Person", name: post.author }
      : { "@type": "Organization", name: "Maarula Classes" },
    publisher: {
      "@type": "Organization",
      name: "Maarula Classes",
      logo: {
        "@type": "ImageObject",
        url: "https://res.cloudinary.com/dwmj6up6j/image/upload/v1752687380/rqtljy0wi1uzq3itqxoe.png",
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://question.maarula.in/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Articles",
        item: "https://question.maarula.in/articles",
      },
      { "@type": "ListItem", position: 3, name: post.title, item: pageUrl },
    ],
  };

  /* ---------- UI ---------- */
  const shareText = `${post.title} - ${pageUrl}`;

  return (
    <>
      <Helmet>
        <html lang="en" />
        <title>{esc(pageTitle)}</title>
        <meta name="description" content={esc(pageDescription)} />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph / Twitter */}
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Maarula Classes" />
        <meta property="og:title" content={esc(pageTitle)} />
        <meta property="og:description" content={esc(pageDescription)} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={imageUrl} />
        {publishedISO && (
          <meta property="article:published_time" content={publishedISO} />
        )}
        {modifiedISO && (
          <meta property="article:modified_time" content={modifiedISO} />
        )}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={esc(pageTitle)} />
        <meta name="twitter:description" content={esc(pageDescription)} />
        <meta name="twitter:image" content={imageUrl} />

        {/* JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      <div className={styles.page}>
        {/* Header */}
        <header className={styles.header}>
          {post.category && <p className={styles.category}>{post.category}</p>}
          <h1 className={styles.title}>{post.title}</h1>
          <p className={styles.meta}>
            <span>By {post.author || "Maarula Classes"}</span>
            <span className={styles.dot}>•</span>
            <span>
              {new Date(post.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className={styles.dot}>•</span>
            <span>{readingTime} min read</span>
          </p>
        </header>

        {post.featuredImage && (
          <figure className={styles.heroFigure}>
            <img
              src={post.featuredImage}
              alt={post.title}
              loading="lazy"
              decoding="async"
            />
            {post.imageCaption && <figcaption>{post.imageCaption}</figcaption>}
          </figure>
        )}

        {/* Content + Sidebar */}
        <div className={styles.container}>
          <article className={styles.article}>
            {/* Mobile TOC */}
            {toc.length > 0 && (
              <details className={styles.tocMobile}>
                <summary>On this page</summary>
                <nav aria-label="Table of contents">
                  <ul>
                    {toc.map((h) => (
                      <li
                        key={h.id}
                        className={h.level === 3 ? styles.tocH3 : styles.tocH2}
                      >
                        <a href={`#${h.id}`}>{h.text}</a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </details>
            )}

            <div
              ref={contentRef}
              className={styles.postContent}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {post.videoURL && (
              <section className={styles.videoBlock}>
                <h3 className={styles.h3}>Related Video Explanation</h3>
                <div className={styles.playerWrap}>
                  <ReactPlayer
                    url={post.videoURL}
                    className={styles.player}
                    width="100%"
                    height="100%"
                    controls
                  />
                </div>
              </section>
            )}

            <div className={styles.share}>
              <span className={styles.shareLead}>
                This information could help a friend — share:
              </span>

              <a
                className={`${styles.social} ${styles.whatsapp}`}
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on WhatsApp"
              >
                <FaWhatsapp />
              </a>

              <a
                className={`${styles.social} ${styles.telegram}`}
                href={`https://t.me/share/url?url=${encodeURIComponent(
                  pageUrl
                )}&text=${encodeURIComponent(post.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on Telegram"
              >
                <FaTelegram />
              </a>

              <a
                className={`${styles.social} ${styles.facebook}`}
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  pageUrl
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on Facebook"
              >
                <FaFacebook />
              </a>

              <a
                className={`${styles.social} ${styles.twitter}`}
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                  pageUrl
                )}&text=${encodeURIComponent(post.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on X"
              >
                <FaXTwitter />
              </a>

              <a
                className={`${styles.social} ${styles.linkedin}`}
                href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
                  pageUrl
                )}&title=${encodeURIComponent(post.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on LinkedIn"
              >
                <FaLinkedin />
              </a>

              <button
                type="button"
                className={`${styles.social} ${styles.copy}`}
                aria-label="Copy link"
                onClick={() => navigator.clipboard.writeText(pageUrl)}
              >
                <FaLink />
              </button>
            </div>
          </article>

          <aside className={`${styles.sidebar} ${styles.sidebarSticky}`}>
            {toc.length > 0 && (
              <div className={styles.widget}>
                <h3 className={styles.widgetTitle}>On this page</h3>
                <nav aria-label="Table of contents">
                  <ul className={styles.tocList}>
                    {toc.map((h) => (
                      <li
                        key={h.id}
                        className={h.level === 3 ? styles.tocH3 : styles.tocH2}
                      >
                        <a href={`#${h.id}`}>{h.text}</a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            )}

            <div className={styles.widget}>
              <h3 className={styles.widgetTitle}>Recent posts</h3>
              <ul className={styles.recentList}>
                {recentPosts.map((r) => (
                  <li key={r._id}>
                    <Link
                      to={`/articles/${r.slug}`}
                      className={styles.recentItem}
                    >
                      <span className={styles.recentTitle}>{r.title}</span>
                      <time className={styles.recentDate}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
