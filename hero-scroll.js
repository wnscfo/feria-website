// feria — scroll-driven rising code stream.
//
// On first load the hero is just the copy — no ledger behind it. The hero
// (.hero) is taller than the viewport and its inner .hero__pin stays pinned
// while you scroll. We map scroll progress through the hero (0 → 1) onto --rise
// (set on .hero): the API-call ledger rises up from the floor and floats into
// view (see .field--fore in styles.css). The point of the page, made literal:
// you don't do anything, and the work keeps flowing on its own.
//
// Desktop only — on narrow screens the hero is a normal static block with no
// rising ledger (see the max-width: 900px rules). Also disabled for
// prefers-reduced-motion, where nothing rises.

(() => {
  "use strict";

  const scene = document.querySelector(".hero");
  if (!scene) return;

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const isDesktop = () =>
    typeof window.matchMedia === "function" &&
    window.matchMedia("(min-width: 901px)").matches;

  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const smooth = (t) => t * t * (3 - 2 * t); // ease-in-out

  // The stream holds off for a beat (the card is seen first), then rises to
  // fully engulf it a little before the scene ends, holding covered for a beat
  // before the next section arrives.
  const RISE_START = 0.06;
  const RISE_END = 0.9;

  let enabled = false;
  let ticking = false;

  const apply = () => {
    ticking = false;
    const rect = scene.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    const progress = travel > 0 ? clamp01(-rect.top / travel) : 0;

    const rise = smooth(clamp01((progress - RISE_START) / (RISE_END - RISE_START)));
    scene.style.setProperty("--rise", rise.toFixed(4));
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(apply);
  };

  const enable = () => {
    if (enabled) return;
    enabled = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    apply();
  };

  const disable = () => {
    if (!enabled) return;
    enabled = false;
    window.removeEventListener("scroll", onScroll);
    scene.style.setProperty("--rise", "0");
  };

  const sync = () => {
    if (isDesktop() && !reduceMotion) enable();
    else disable();
  };

  window.addEventListener("resize", sync, { passive: true });
  sync();
})();
