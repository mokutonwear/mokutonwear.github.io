const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

/* === MOKUTON HOME HERO TWO-LAYER PARALLAX === */
/* Двигается только прозрачный слой .hero-hoodie-cut, фон .hero-img остается неподвижным. */

(() => {
  const hero = document.querySelector(".hero");
  const hoodieCut = document.querySelector(".hero-hoodie-cut");

  if (!hero || !hoodieCut) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  let hasFinePointer = finePointerQuery.matches;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  let targetScroll = 0;
  let currentScroll = 0;

  const updateScroll = () => {
    const rect = hero.getBoundingClientRect();
    const progress = clamp(-rect.top / rect.height, -0.2, 1.2);
    targetScroll = progress * 18;
  };

  const updatePointer = (event) => {
    if (!hasFinePointer) return;

    const rect = hero.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    targetX = clamp((event.clientX - centerX) / (rect.width / 2), -1, 1);
    targetY = clamp((event.clientY - centerY) / (rect.height / 2), -1, 1);
  };

  const resetPointer = () => {
    targetX = 0;
    targetY = 0;
  };

  const updatePointerMode = () => {
    hasFinePointer = finePointerQuery.matches;
    if (!hasFinePointer) resetPointer();
  };

  hero.addEventListener("pointermove", updatePointer, { passive: true });
  hero.addEventListener("pointerleave", resetPointer);

  window.addEventListener("scroll", updateScroll, { passive: true });

  window.addEventListener("resize", () => {
    updatePointerMode();
    updateScroll();
  }, { passive: true });

  if (finePointerQuery.addEventListener) {
    finePointerQuery.addEventListener("change", updatePointerMode);
  }

  const animate = () => {
    currentX += (targetX - currentX) * 0.085;
    currentY += (targetY - currentY) * 0.085;
    currentScroll += (targetScroll - currentScroll) * 0.08;

    const moveX = currentX * 18;
    const moveY = currentY * 12 + currentScroll;
    const rotate = currentX * 0.8;

    hoodieCut.style.transform = `
      translate3d(${moveX}px, ${moveY}px, 0)
      rotate(${rotate}deg)
      scale(var(--hoodie-cut-scale, 1.035))
    `;

    requestAnimationFrame(animate);
  };

  updateScroll();
  animate();
})();