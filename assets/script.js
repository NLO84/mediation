(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const header = document.getElementById("site-header");
  const progress = document.querySelector(".header__progress span");
  const page = document.documentElement;
  const hero = document.querySelector(".hero");
  const orbit = document.querySelector(".orbit");
  const navLinks = Array.from(document.querySelectorAll(".nav__link"));

  /* Header state + scroll progress + active navigation */
  const navSections = navLinks
    .map((link) => {
      const id = link.getAttribute("href");
      const section = id ? document.querySelector(id) : null;
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  let frame = 0;

  function updatePage() {
    frame = 0;
    const scrollTop = window.scrollY || page.scrollTop;
    const scrollMax = page.scrollHeight - window.innerHeight;

    header.classList.toggle("is-scrolled", scrollTop > 22);

    if (progress) {
      const ratio = scrollMax > 0 ? Math.min(Math.max(scrollTop / scrollMax, 0), 1) : 0;
      progress.style.width = `${(ratio * 100).toFixed(2)}%`;
    }

    const marker = scrollTop + window.innerHeight * 0.34;
    let activeIndex = -1;

    navSections.forEach(({ section }, index) => {
      if (section.offsetTop <= marker) activeIndex = index;
    });

    navLinks.forEach((link, index) => {
      const isActive = index === activeIndex;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function requestPageUpdate() {
    if (!frame) frame = window.requestAnimationFrame(updatePage);
  }

  window.addEventListener("scroll", requestPageUpdate, { passive: true });
  window.addEventListener("resize", requestPageUpdate);
  updatePage();

  /* Mobile menu */
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileLinks = mobileMenu ? Array.from(mobileMenu.querySelectorAll("a")) : [];
  let menuOpen = false;

  function setMenu(open, restoreFocus = false) {
    if (!menuToggle || !mobileMenu) return;

    menuOpen = open;
    document.body.classList.toggle("menu-open", open);
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.setAttribute("aria-hidden", String(!open));

    if (open) {
      mobileMenu.removeAttribute("inert");
    } else {
      mobileMenu.setAttribute("inert", "");
    }

    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");

    if (open) {
      window.requestAnimationFrame(() => {
        mobileLinks[0]?.focus({ preventScroll: true });
      });
    } else if (restoreFocus) {
      menuToggle.focus({ preventScroll: true });
    }
  }

  menuToggle?.addEventListener("click", () => setMenu(!menuOpen));
  mobileLinks.forEach((link) => link.addEventListener("click", () => setMenu(false)));

  document.addEventListener("keydown", (event) => {
    if (!menuOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setMenu(false, true);
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = [menuToggle, ...mobileLinks];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const desktopQuery = window.matchMedia("(min-width: 1001px)");
  desktopQuery.addEventListener?.("change", (event) => {
    if (event.matches && menuOpen) setMenu(false);
  });

  /* Scroll reveal */
  const revealItems = Array.from(document.querySelectorAll(".reveal"));

  if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* Soft pointer parallax in the hero */
  if (hero && orbit && window.matchMedia("(pointer: fine)").matches && !reduceMotion.matches) {
    let pointerFrame = 0;
    let pointerX = 0.62;
    let pointerY = 0.44;

    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width;
      pointerY = (event.clientY - rect.top) / rect.height;

      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        orbit.style.setProperty("--tilt-x", ((pointerX - 0.5) * 4.4).toFixed(2));
        orbit.style.setProperty("--tilt-y", ((pointerY - 0.5) * 4.4).toFixed(2));
        pointerFrame = 0;
      });
    });

    hero.addEventListener("pointerleave", () => {
      orbit.style.setProperty("--tilt-x", "0");
      orbit.style.setProperty("--tilt-y", "0");
    });
  }

  /* Horizontal gallery carousel */
  const carousel = document.querySelector("[data-carousel]");

  if (carousel) {
    const track = carousel.querySelector("[data-carousel-track]");
    const prevButton = carousel.querySelector("[data-carousel-prev]");
    const nextButton = carousel.querySelector("[data-carousel-next]");
    const progressBar = carousel.querySelector("[data-carousel-progress]");
    let carouselFrame = 0;

    const getStep = () => {
      const card = track?.querySelector(".gallery-post");
      if (!track || !card) return 320;

      const gap = parseFloat(window.getComputedStyle(track).columnGap) || 16;
      return card.getBoundingClientRect().width + gap;
    };

    const updateCarousel = () => {
      carouselFrame = 0;
      if (!track) return;

      const maxScroll = track.scrollWidth - track.clientWidth;
      const position = track.scrollLeft;

      if (prevButton) prevButton.disabled = position <= 2;
      if (nextButton) nextButton.disabled = position >= maxScroll - 2;

      if (progressBar) {
        const ratio = maxScroll > 0 ? Math.min(Math.max(position / maxScroll, 0), 1) : 0;
        progressBar.style.width = `${(ratio * 100).toFixed(1)}%`;
      }
    };

    const requestCarouselUpdate = () => {
      if (!carouselFrame) carouselFrame = window.requestAnimationFrame(updateCarousel);
    };

    const scrollCarousel = (direction) => {
      track?.scrollBy({
        left: direction * getStep(),
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });
    };

    prevButton?.addEventListener("click", () => scrollCarousel(-1));
    nextButton?.addEventListener("click", () => scrollCarousel(1));

    track?.addEventListener("scroll", requestCarouselUpdate, { passive: true });
    track?.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollCarousel(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollCarousel(1);
      }
    });

    window.addEventListener("resize", requestCarouselUpdate);
    document.fonts?.ready?.then(requestCarouselUpdate);
    updateCarousel();
  }
})();
