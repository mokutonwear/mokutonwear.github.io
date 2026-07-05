const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
  if (!header) return;

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

/* === MOKUTON HOME PRODUCTS FROM CATALOG === */

const HOME_PRODUCTS_URL = "https://script.google.com/macros/s/AKfycbxPV7NyBzIXVTxyL8V23_7Kbi74EQjrac-ltPJ0w-sDJvaZZV2VsdVGNssxjC1XToFODQ/exec";
const HOME_PRODUCTS_LIMIT = 3;

function homeEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function homeParseList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function homeParseBool(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).trim().toLowerCase() === "true"
  );
}

function homeFormatPrice(price) {
  const numberPrice = Number(price || 0);

  if (!numberPrice) return "Цена по запросу";

  return `${numberPrice.toLocaleString("ru-RU")} ₽`;
}

function homeMakeProductId(item) {
  return String(
    item.id ||
    `${item.anime_id || ""}-${item.design_id || ""}-${item.clothing_type || ""}`
  ).trim();
}

function homeMakeProductName(item) {
  const productName = String(item.product_name || "").trim();

  if (productName) {
    return productName.replace(/\s+—\s+.+$/u, "");
  }

  const clothingTitle = String(item.clothing_title || item.clothing_type || "Вещь").trim();
  const designTitle = String(item.design_title || "Design").trim();

  return `${clothingTitle} ${designTitle}`;
}

function homeNormalizeProduct(item) {
  const tags = homeParseList(item.visible_tags || item.tags).slice(0, 1);

  return {
    id: homeMakeProductId(item),
    name: homeMakeProductName(item),
    price: Number(item.price || 0),
    image: String(item.image_main || item.image || "img/hoodie-white.png").trim(),
    tag: tags[0] || "Лимитированный дроп",
    homeOrder: Number(item.home_order || 999),
    showOnHome: homeParseBool(item.show_on_home)
  };
}

function renderHomeProductsSkeleton(grid) {
  grid.innerHTML = Array.from({ length: HOME_PRODUCTS_LIMIT }, () => `
    <article class="product-card home-product-skeleton" aria-hidden="true">
      <div class="home-product-skeleton-image"></div>

      <div class="product-row">
        <div class="home-product-skeleton-line title"></div>
        <div class="home-product-skeleton-line price"></div>
      </div>

      <div class="product-row small">
        <div class="home-product-skeleton-line tag"></div>
        <div class="home-product-skeleton-line link"></div>
      </div>
    </article>
  `).join("");
}

function renderHomeProductsEmpty(grid) {
  grid.innerHTML = `
    <div class="home-products-empty">
      <h3>Товары для главной не выбраны</h3>
      <p>В таблице Products поставь show_on_home = TRUE у нужных товаров.</p>
    </div>
  `;
}

function renderHomeProducts(grid, products) {
  grid.innerHTML = products.map((product) => {
    const productUrl = `catalog.html?product=${encodeURIComponent(product.id)}`;

    return `
      <article class="product-card home-product-card">
        <a href="${productUrl}" class="home-product-image-link" aria-label="${homeEscapeHtml(product.name)}">
          <img src="${homeEscapeHtml(product.image)}" alt="${homeEscapeHtml(product.name)}">
        </a>

        <div class="product-row">
          <h3>${homeEscapeHtml(product.name)}</h3>
          <strong>${homeEscapeHtml(homeFormatPrice(product.price))}</strong>
        </div>

        <div class="product-row small">
          <span>◆ ${homeEscapeHtml(product.tag)}</span>
          <a href="${productUrl}" class="product-view-link">
            Смотреть <span class="link-arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </article>
    `;
  }).join("");
}

async function initHomeProducts() {
  const grid = document.querySelector("#homeProductGrid");

  if (!grid) return;

  renderHomeProductsSkeleton(grid);

  try {
    const response = await fetch(HOME_PRODUCTS_URL);

    if (!response.ok) {
      throw new Error(`Не удалось загрузить товары. HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Таблица вернула не массив товаров");
    }

    const homeProducts = data
      .map(homeNormalizeProduct)
      .filter((product) => product.showOnHome)
      .sort((a, b) => a.homeOrder - b.homeOrder)
      .slice(0, HOME_PRODUCTS_LIMIT);

    if (!homeProducts.length) {
      renderHomeProductsEmpty(grid);
      return;
    }

    renderHomeProducts(grid, homeProducts);
  } catch (error) {
    console.error(error);

    grid.innerHTML = `
      <div class="home-products-empty">
        <h3>Не удалось загрузить товары</h3>
        <p>Проверь Apps Script, доступ Anyone и таблицу Products.</p>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", initHomeProducts);

/* === MOKUTON MOBILE DROPDOWN TOGGLE FINAL === */
/* На телефоне: тап по "Магазин" открывает меню, второй тап закрывает. */

(() => {
  const mobileDropdownQuery = window.matchMedia("(max-width: 900px)");

  function closeAllDropdowns() {
    document.querySelectorAll(".nav-dropdown.is-open").forEach((dropdown) => {
      dropdown.classList.remove("is-open");

      const trigger = dropdown.querySelector(".nav-dropdown-trigger");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function initMobileDropdowns() {
    const dropdowns = Array.from(document.querySelectorAll(".nav-dropdown"));

    dropdowns.forEach((dropdown) => {
      const trigger = dropdown.querySelector(".nav-dropdown-trigger");
      const menu = dropdown.querySelector(".nav-dropdown-menu");

      if (!trigger || !menu || trigger.dataset.mobileDropdownReady === "true") return;

      trigger.dataset.mobileDropdownReady = "true";
      trigger.setAttribute("aria-expanded", "false");

      trigger.addEventListener("click", (event) => {
        if (!mobileDropdownQuery.matches) return;

        event.preventDefault();
        event.stopPropagation();

        const shouldOpen = !dropdown.classList.contains("is-open");

        closeAllDropdowns();

        if (shouldOpen) {
          dropdown.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });

      menu.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeAllDropdowns);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", initMobileDropdowns);

  document.addEventListener("click", (event) => {
    if (!mobileDropdownQuery.matches) return;
    if (!event.target.closest(".nav-dropdown")) closeAllDropdowns();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAllDropdowns();
  });

  const handleModeChange = () => {
    if (!mobileDropdownQuery.matches) closeAllDropdowns();
  };

  if (mobileDropdownQuery.addEventListener) {
    mobileDropdownQuery.addEventListener("change", handleModeChange);
  } else if (mobileDropdownQuery.addListener) {
    mobileDropdownQuery.addListener(handleModeChange);
  }
})();

/* === MOKUTON SIZE GUIDE RETURN TO ORDER === */
/* Если размерная сетка открыта из карточки товара, показываем кнопку возврата к выбранному заказу. */

(() => {
  function buildReturnToOrderHref(params) {
    const productId = String(params.get("product") || "").trim();

    if (!productId) return "";

    const catalogParams = new URLSearchParams();
    catalogParams.set("product", productId);

    const size = String(params.get("size") || "").trim();
    const printPosition = String(params.get("print") || "").trim();

    if (size) {
      catalogParams.set("size", size);
    }

    if (printPosition) {
      catalogParams.set("print", printPosition);
    }

    return `catalog.html?${catalogParams.toString()}#productResult`;
  }

  function initSizeGuideReturnToOrder() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("from") !== "order") return;

    const returnHref = buildReturnToOrderHref(params);

    if (!returnHref) return;
    if (document.querySelector(".size-guide-return")) return;

    const returnBlock = document.createElement("div");
    returnBlock.className = "size-guide-return";
    returnBlock.innerHTML = `
      <span>Товар уже выбран</span>
      <a href="${returnHref}" class="size-guide-return-btn">
        ← Вернуться к заказу
      </a>
    `;

    const sideMenu = document.querySelector(".info-side");

    if (sideMenu) {
      const firstLink = sideMenu.querySelector("a");
      sideMenu.insertBefore(returnBlock, firstLink || null);
      return;
    }

    const infoContent = document.querySelector(".info-content");
    if (infoContent) {
      infoContent.prepend(returnBlock);
    }
  }

  document.addEventListener("DOMContentLoaded", initSizeGuideReturnToOrder);
})();

