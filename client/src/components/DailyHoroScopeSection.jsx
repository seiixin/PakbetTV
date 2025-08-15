import React, { useEffect, useMemo, useRef, useState } from "react";
import "./DailyHoroScopeSection.css";
import { Link } from "react-router-dom";
import axios from "axios";

// --- Fallback product IDs if products API doesn't list reviewed items ---
// Set via Vite env: VITE_FALLBACK_PIDS="5,6,7"
const FALLBACK_PIDS = (import.meta?.env?.VITE_FALLBACK_PIDS || "5")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);

const HERO_SLIDES = [
  { src: "/HoroscopeBackground.jpg", link: "/horoscope", title: <>Daily Horoscope by<br /><span className="highlight">Michael De Mesa</span></> },
  { src: "/blogsBackground.jpg", link: "/blog", title: <>Feng Shui<span className="highlight"> Blogs</span></> },
  { src: "/reviewsBackground.jpg", link: "/shop", title: <>Feng Shui <span className="highlight">Reviews</span></> },
];

const ZODIAC_SIGNS = ["rat","ox","tiger","rabbit","dragon","snake","horse","goat","monkey","rooster","dog","pig"];

const getPid = (obj) => (obj && (obj.product_id ?? obj.id)) || null;
const safeTrim = (s, n = 80) => (s || "").replace(/\s+/g, " ").trim().slice(0, n) + ((s || "").length > n ? "..." : "");
const chooseRandom = (arr, count) => [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(); } catch { return ""; } };

// Build a homepage card from a backend review row
const buildReviewCard = (r, pidFallback) => {
  if (!r) return null;
  const text = r.review_text ?? r.comment ?? r.text ?? "";
  if (!text) return null;

  const product_id = r.product_id ?? pidFallback;
  if (!product_id || Number(product_id) === 0) return null;

  const rating = Number(r.rating) || 0;
  const reviewer = r.user_name || r.username || "Customer";
  const left = reviewer ? `by ${reviewer}` : (r.created_at ? fmtDate(r.created_at) : "Review");
  const subtitle = `${left} • ${rating ? `${rating}/5` : "No rating"}`;

  return { title: "Customer Review", subtitle, content: safeTrim(text, 100), link: `/product/${product_id}` };
};

const DailyHoroScopeSection = () => {
  const [slideGroups, setSlideGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(0);
  const [nextGroup, setNextGroup] = useState(0);
  const [animating, setAnimating] = useState(false);
  const intervalRef = useRef(null);

  // IMPORTANT: same-origin axios so Vite dev proxy handles /api/*
  const client = useMemo(() => axios.create(), []);

  useEffect(() => {
    const abort = new AbortController();

    const fetchReviewsByPids = async (pids) => {
      const settled = await Promise.allSettled(
        pids.map((pid) => client.get(`/api/reviews/product/${pid}`, { signal: abort.signal }))
      );

      const allReviews = settled.flatMap((res, i) => {
        if (res.status !== "fulfilled") return [];
        const pid = pids[i];
        const arr = Array.isArray(res.value.data) ? res.value.data : [];
        return arr.map((r) => ({ ...r, product_id: r.product_id ?? pid }));
      });

      allReviews.sort(
        (a, b) =>
          new Date(b.created_at || b.updated_at || 0) -
          new Date(a.created_at || a.updated_at || 0)
      );

      const cards = allReviews
        .map((r) => buildReviewCard(r, r.product_id))
        .filter(Boolean)
        .slice(0, 3);

      return cards;
    };

    const fetchHomepageReviews = async () => {
      try {
        // Try products → derive PIDs → fetch reviews
        let pids = [];
        try {
          const primary = await client.get(`/api/products?limit=50`, { signal: abort.signal });
          const list = Array.isArray(primary.data) ? primary.data : primary.data?.items || [];
          pids = list.map(getPid).filter((x) => x && Number(x) !== 0);
        } catch {
          const fallback = await client.get(`/api/shop/products?limit=50`, { signal: abort.signal });
          const list = Array.isArray(fallback.data) ? fallback.data : fallback.data?.items || [];
          pids = list.map(getPid).filter((x) => x && Number(x) !== 0);
        }

        // First attempt: products-derived PIDs
        let cards = [];
        if (pids.length) {
          // Limit to 50 to keep it snappy
          cards = await fetchReviewsByPids(pids.slice(0, 50));
        }

        // Fallback: explicit PIDs (e.g., 5) if nothing surfaced
        if (!cards.length && FALLBACK_PIDS.length) {
          console.debug("[DailyHoroScopeSection] Using fallback PIDs:", FALLBACK_PIDS);
          cards = await fetchReviewsByPids(FALLBACK_PIDS);
        }

        return cards;
      } catch (err) {
        if (abort.signal.aborted) return [];
        console.error("fetchHomepageReviews error:", err);
        return [];
      }
    };

    const fetchData = async () => {
      try {
        // 1) Monthly zodiacs (3 random)
        const selected = chooseRandom(ZODIAC_SIGNS, 3);
        const monthlySlides = await Promise.all(
          selected.map(async (signId) => {
            const { data } = await client.get(`/api/cms/zodiacs/${signId}`, { signal: abort.signal });
            return {
              title: data?.name ? data.name.charAt(0).toUpperCase() + data.name.slice(1) : signId,
              subtitle: "Monthly Horoscope",
              content: data?.overview || "Overview not available.",
              link: `/prosper-guide/${signId}`,
            };
          })
        );

        // 2) Blogs (first 3)
        const blogsRes = await client.get(`/api/cms/blogs`, { signal: abort.signal });
        const blogSlides = (blogsRes.data || []).slice(0, 3).map((blog) => ({
          title: blog.title,
          subtitle: blog.category,
          content: safeTrim(blog.content, 80),
          link: `/blog/${blog.blogID}`,
        }));

        // 3) Reviews group
        const reviewSlides = await fetchHomepageReviews();
        const reviewsGroup =
          reviewSlides && reviewSlides.length
            ? reviewSlides
            : [
                {
                  title: "Reviews",
                  subtitle: "What customers are saying",
                  content: "No reviews yet — check back soon!",
                  link: "/shop",
                },
              ];

        setSlideGroups([monthlySlides, blogSlides, reviewsGroup]);
      } catch (err) {
        if (abort.signal.aborted) return;
        console.error("Error fetching homepage groups:", err);
        setSlideGroups([
          [
            { title: "Rat", subtitle: "Monthly Horoscope", content: "Sample overview...", link: "/prosper-guide/rat" },
            { title: "Horse", subtitle: "Monthly Horoscope", content: "Sample overview...", link: "/prosper-guide/horse" },
            { title: "Dragon", subtitle: "Monthly Horoscope", content: "Sample overview...", link: "/prosper-guide/dragon" },
          ],
          [
            { title: "Master Michael", subtitle: "Feng Shui Blogs", content: "Tips and advice...", link: "/blog/0" },
            { title: "Feng Shui Tips", subtitle: "Main Door Energy", content: "Keep your entrance clean...", link: "/blog/1" },
            { title: "Crystal of the Day", subtitle: "Citrine", content: "Boosts wealth and confidence...", link: "/blog/2" },
          ],
          [
            { title: "Reviews", subtitle: "What customers are saying", content: "No reviews yet — check back soon!", link: "/shop" },
          ],
        ]);
      }
    };

    fetchData();
    return () => abort.abort();
  }, [client]);

  // Auto-rotate hero every 5s
  useEffect(() => {
    if (!slideGroups.length) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => { startSlide((activeGroup + 1) % (slideGroups.length || 1)); }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeGroup, slideGroups.length]);

  const startSlide = (index) => {
    if (animating || index === activeGroup) return;
    setNextGroup(index);
    setAnimating(true);
    setTimeout(() => { setActiveGroup(index); setAnimating(false); }, 800);
  };

  if (!slideGroups.length) return <div>Loading...</div>;

  return (
    <div>
      <section className="herosection" aria-label="Daily horoscope banner">
        <div className="hero-image-wrapper">
          <a href={HERO_SLIDES[activeGroup].link} aria-label="Open featured section">
            <img src={HERO_SLIDES[activeGroup].src} alt="" className={`hero-image current ${animating ? "slide-out" : ""}`} />
          </a>
          {animating && (
            <a href={HERO_SLIDES[nextGroup].link} aria-label="Open next featured section">
              <img src={HERO_SLIDES[nextGroup].src} alt="" className="hero-image next slide-in" />
            </a>
          )}
        </div>
        <div className="hero-content">
          <h1 className={`hero-title current ${animating ? "slide-out" : ""}`}>{HERO_SLIDES[activeGroup].title}</h1>
          {animating && (<h1 className="hero-title next slide-in">{HERO_SLIDES[nextGroup].title}</h1>)}
        </div>
        <div className="carousel-dots" aria-label="Carousel navigation dots">
          {slideGroups.map((_, i) => (
            <button key={i} className={`carousel-dot ${i === activeGroup ? "active" : ""}`} onClick={() => startSlide(i)} aria-label={`Group ${i + 1}`} />
          ))}
        </div>
      </section>
      <section className="content-section" aria-label="Daily horoscope cards">
        {slideGroups[activeGroup].map((slide, i) => (
          <Link key={`${activeGroup}-${i}`} to={slide.link} className="content-box">
            <div className="content-header active">
              <span className="plus">+</span>
              <span><strong>{slide.title}<br />{slide.subtitle}</strong></span>
            </div>
            <p className="content-text open">{slide.content}</p>
          </Link>
        ))}
      </section>
    </div>
  );
};

export default DailyHoroScopeSection;
