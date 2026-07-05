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
