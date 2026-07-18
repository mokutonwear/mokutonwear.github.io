const PRODUCTS_URL = "https://script.google.com/macros/s/AKfycbxPV7NyBzIXVTxyL8V23_7Kbi74EQjrac-ltPJ0w-sDJvaZZV2VsdVGNssxjC1XToFODQ/exec";
const ORDER_URL = PRODUCTS_URL;

const FALLBACK_BG = {
  anime: "radial-gradient(circle at 40% 22%, rgba(232,224,211,.42), transparent 32%), linear-gradient(135deg, #1d1a16, #090807 70%)",
  design: "radial-gradient(circle at 35% 28%, rgba(232,224,211,.38), transparent 34%), linear-gradient(160deg, #201d18, #080807 72%)",
  garment: "linear-gradient(180deg, rgba(8,8,7,0), rgba(8,8,7,.86))"
};

const GARMENT_IMAGES = {
  hoodie: "img/garments/hoodie.png",
  tshirt: "img/garments/tshirt.png",
  sweatshirt: "img/garments/sweatshirt.png"
};

const SIZE_SETS_BY_CLOTHING_TYPE = {
  hoodie: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  "худи": ["XS", "S", "M", "L", "XL", "2XL", "3XL"],

  sweatshirt: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  "свитшот": ["XS", "S", "M", "L", "XL", "2XL", "3XL"],

  tshirt: ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"],
  "t-shirt": ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"],
  "футболка": ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"],

  longsleeve: ["XS", "S", "M", "L", "XL", "2XL"],
  "лонгслив": ["XS", "S", "M", "L", "XL", "2XL"],

  pants: ["XS", "S", "M", "L", "XL"],
  "штаны": ["XS", "S", "M", "L", "XL"],

  bag: ["ONE SIZE"],
  accessory: ["ONE SIZE"],
  accessories: ["ONE SIZE"],
  "аксессуар": ["ONE SIZE"]
};


const QUICK_DESKTOP_INITIAL_LIMIT = 6;
const QUICK_MOBILE_INITIAL_LIMIT = 3;
const quickMobileQuery = window.matchMedia(
  "(max-width: 640px), (max-width: 900px) and (orientation: landscape) and (max-height: 560px)"
);

function getQuickInitialLimit() {
  return quickMobileQuery.matches ? QUICK_MOBILE_INITIAL_LIMIT : QUICK_DESKTOP_INITIAL_LIMIT;
}

let products = [];
let catalogData = [];
let garments = [];

const animeGrid = document.querySelector("#animeGrid");
const designGrid = document.querySelector("#designGrid");
const garmentGrid = document.querySelector("#garmentGrid");
const designStep = document.querySelector("#designStep");
const garmentStep = document.querySelector("#garmentStep");
const productResult = document.querySelector("#productResult");
const quickFilterRow = document.querySelector("#quickFilterRow");
const quickProductGrid = document.querySelector("#quickProductGrid");

let activeQuickFilter = "all";
let quickVisibleCount = getQuickInitialLimit();
let selectedAnime = null;
let selectedDesign = null;
let selectedGarment = null;
let selectedProduct = null;
let selectedImageIndex = 0;
let selectedSize = "M";
let selectedPrintPosition = "На груди";
let isOrderSubmitting = false;

async function loadProductsFromSheet() {
  const response = await fetch(PRODUCTS_URL);

  if (!response.ok) {
    throw new Error(`Не удалось загрузить товары. HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Таблица вернула не массив товаров");
  }

  return data;
}

function parseList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSizeValue(size) {
  return String(size || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function getSizeSetByClothingType(clothingType) {
  const typeKey = String(clothingType || "").trim().toLowerCase();
  return SIZE_SETS_BY_CLOTHING_TYPE[typeKey] || null;
}

function getProductSizeOptions(product) {
  const availableSizes = Array.isArray(product?.sizes) ? product.sizes : [];
  const availableSet = new Set(availableSizes.map(normalizeSizeValue));
  const baseSizeSet = getSizeSetByClothingType(product?.clothing_type) || availableSizes;
  const baseSet = new Set(baseSizeSet.map(normalizeSizeValue));

  const sizeOptions = baseSizeSet.map((size) => ({
    label: size,
    available: availableSet.has(normalizeSizeValue(size))
  }));

  availableSizes.forEach((size) => {
    if (!baseSet.has(normalizeSizeValue(size))) {
      sizeOptions.push({
        label: size,
        available: true
      });
    }
  });

  return sizeOptions;
}

function getFirstAvailableSize(product) {
  const firstAvailableOption = getProductSizeOptions(product).find((option) => option.available);
  return firstAvailableOption?.label || product?.sizes?.[0] || "M";
}

function parseTags(value) {
  return parseList(value).map((tag) => tag.toLowerCase());
}

function buildProductImages(item, imageMain) {
  const galleryImages = parseList(
    item.gallery_images ||
    item.product_images ||
    item.image_gallery ||
    item.images ||
    ""
  );

  const allImages = [imageMain, ...galleryImages]
    .map((image) => String(image || "").trim())
    .filter(Boolean);

  return Array.from(new Set(allImages));
}

function makeShortProductName(item) {
  const productName = String(item.product_name || "").trim();

  if (productName) {
    return productName.replace(/\s+—\s+.+$/u, "");
  }

  const clothingTitle = String(item.clothing_title || item.clothing_type || "Вещь").trim();
  const designTitle = String(item.design_title || "Design").trim();

  return `${clothingTitle} ${designTitle}`;
}

function normalizeProducts(rawProducts) {
  return rawProducts
    .filter((item) => item.active === true || item.active === "TRUE" || item.active === "true" || item.active === 1)
    .map((item) => {
      const tags = parseTags(item.tags);
      const visibleTags = parseTags(item.visible_tags).slice(0, 3);
      const imageMain = String(item.image_main || item.image || "img/hoodie-white.png").trim();
      const productImages = buildProductImages(item, imageMain);
      const clothingType = String(item.clothing_type || "").trim();

      return {
        id: String(item.id || `${item.anime_id}-${item.design_id}-${item.clothing_type}`).trim(),

        anime_id: String(item.anime_id || "").trim(),
        anime_title: String(item.anime_title || "Без названия").trim(),
        anime_subtitle: String(item.anime_subtitle || "Коллекция MOKUTON").trim(),
        anime_image: String(item.anime_image || "").trim(),
        anime_bg: String(item.anime_bg || FALLBACK_BG.anime).trim(),

        design_id: String(item.design_id || "").trim(),
        design_title: String(item.design_title || "Design").trim(),
        design_subtitle: String(item.design_subtitle || item.description || "Авторский дизайн MOKUTON").trim(),
        design_image: String(item.design_image || "").trim(),
        design_bg: String(item.design_bg || FALLBACK_BG.design).trim(),

        clothing_type: clothingType,
        clothing_title: String(item.clothing_title || item.clothing_type || "Вещь").trim(),
        clothing_subtitle: String(item.clothing_subtitle || "Предмет одежды с авторским принтом").trim(),
        clothing_bg: String(item.clothing_bg || FALLBACK_BG.garment).trim(),
        clothing_image: String(item.clothing_image || GARMENT_IMAGES[clothingType] || "").trim(),

        product_name: makeShortProductName(item),
        price: Number(item.price || 0),
        old_price: item.old_price ? Number(item.old_price) : null,

        sizes: parseList(item.sizes || "S,M,L,XL"),
        tags,
        visible_tags: visibleTags.length ? visibleTags : tags.slice(0, 2),

        color: String(item.color || "").trim(),
        material: String(item.material || "").trim(),
        composition: String(item.composition || item.material || "Состав будет уточнён.").trim(),
        care: String(item.care || "Стирать наизнанку при 30°C. Не гладить по принту.").trim(),
        description: String(item.description || "Лимитированная вещь с авторским принтом MOKUTON.").trim(),
        image_main: imageMain,
        images: productImages,
        stock_status: String(item.stock_status || "in_stock").trim(),
        drop: String(item.drop || "").trim(),
        sort_order: Number(item.sort_order || 999)
      };
    })
    .filter((item) => item.anime_id && item.design_id && item.clothing_type)
    .map((item) => ({
      ...item,
      random_order: Math.random()
    }))
    .sort((a, b) => {
      const aPinned = a.sort_order >= 1 && a.sort_order <= 6;
      const bPinned = b.sort_order >= 1 && b.sort_order <= 6;

      if (aPinned && bPinned) {
        return a.sort_order - b.sort_order;
      }

      if (aPinned) return -1;
      if (bPinned) return 1;

      return a.random_order - b.random_order;
    });
}

function buildCatalogData(productList) {
  const animeMap = new Map();

  productList.forEach((product) => {
    if (!animeMap.has(product.anime_id)) {
      animeMap.set(product.anime_id, {
        id: product.anime_id,
        title: product.anime_title,
        subtitle: product.anime_subtitle,
        bg: product.anime_bg,
        image: product.anime_image,
        designs: []
      });
    }

    const anime = animeMap.get(product.anime_id);
    let design = anime.designs.find((item) => item.id === product.design_id);

    if (!design) {
      design = {
        id: product.design_id,
        title: product.design_title,
        subtitle: product.design_subtitle,
        bg: product.design_bg,
        image: product.design_image
      };
      anime.designs.push(design);
    }
  });

  return Array.from(animeMap.values());
}

function buildGarments(productList) {
  const garmentMap = new Map();

  productList.forEach((product) => {
    if (!garmentMap.has(product.clothing_type)) {
      garmentMap.set(product.clothing_type, {
        id: product.clothing_type,
        title: product.clothing_title,
        subtitle: product.clothing_subtitle,
        bg: product.clothing_bg,
        image: product.clothing_image
      });
    }
  });

  const preferredOrder = ["hoodie", "tshirt", "sweatshirt"];

  return Array.from(garmentMap.values()).sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a.id);
    const bIndex = preferredOrder.indexOf(b.id);

    if (aIndex === -1 && bIndex === -1) return a.title.localeCompare(b.title);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function formatPrice(price) {
  if (!price) return "Цена по запросу";
  return `${price.toLocaleString("ru-RU")} ₽`;
}

function formatTag(tag) {
  return `#${tag}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getAvailableSizeLabel(product, requestedSize) {
  const requested = normalizeSizeValue(requestedSize);

  if (!requested) return null;

  const availableOption = getProductSizeOptions(product).find((option) =>
    option.available && normalizeSizeValue(option.label) === requested
  );

  return availableOption?.label || null;
}

function normalizePrintPosition(value) {
  const printPosition = String(value || "").trim();
  const allowedPositions = ["На груди", "На спине"];

  return allowedPositions.includes(printPosition) ? printPosition : "На груди";
}

function getCatalogUrlState() {
  const params = new URLSearchParams(window.location.search);

  return {
    productId: String(params.get("product") || "").trim(),
    size: String(params.get("size") || "").trim(),
    printPosition: String(params.get("print") || "").trim()
  };
}

function buildSizeGuideHref() {
  if (!selectedProduct?.id) return "size-guide.html";

  const params = new URLSearchParams();
  params.set("from", "order");
  params.set("product", selectedProduct.id);

  if (selectedSize) {
    params.set("size", selectedSize);
  }

  if (selectedPrintPosition) {
    params.set("print", selectedPrintPosition);
  }

  return `size-guide.html?${params.toString()}#table`;
}

function getOrderModalElement() {
  let modal = document.querySelector("#orderModal");

  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "orderModal";
  modal.className = "order-modal";
  modal.innerHTML = `
    <div class="order-modal-backdrop" data-order-close></div>

    <div class="order-modal-panel" role="dialog" aria-modal="true" aria-label="Оформление заявки">
      <button type="button" class="order-modal-close" data-order-close aria-label="Закрыть">
        ×
      </button>

      <div class="order-modal-head">
        <p class="eyebrow">Mokuton order</p>
        <h2>Оформить<br>заявку</h2>
        <p>
          Оставь данные для связи. Мы подтвердим наличие, размер, адрес ПВЗ и условия доставки.
        </p>
      </div>

      <div class="order-summary" id="orderSummary"></div>

      <form class="order-form" id="orderForm">
        <label>
          <span>ФИО</span>
          <input type="text" name="customer_name" autocomplete="name" required>
        </label>

        <label>
          <span>Почта</span>
          <input type="email" name="email" autocomplete="email" required>
        </label>

        <label>
          <span>Телефон</span>
          <input type="tel" name="phone" autocomplete="tel" required>
        </label>

        <label>
          <span>Ваш Telegram</span>
          <input
            type="text"
            name="telegram"
            autocomplete="off"
            placeholder="@username"
          >
        </label>

        <label>
          <span>Адрес ПВЗ</span>
          <textarea
            name="address"
            rows="3"
            required
            placeholder="Укажите адрес ближайшего к вам ПВЗ Яндекс Маркета или Почты России"
          ></textarea>
        </label>

        <label>
          <span>Комментарий</span>
          <textarea name="comment" rows="3" placeholder="Например: удобное время связи, пожелания по доставке"></textarea>
        </label>

        <label class="order-consent">
          <input
            type="checkbox"
            name="legal_consent"
            value="accepted"
            required
          >
          <span class="order-consent-text">
            Я принимаю условия
            <a href="offer.html" target="_blank" rel="noopener noreferrer">публичной оферты</a>
            и
            <a href="privacy.html" target="_blank" rel="noopener noreferrer">политики конфиденциальности</a>.
          </span>
        </label>

        <label class="order-consent">
          <input
            type="checkbox"
            name="personal_data_consent"
            value="accepted"
            required
          >
          <span class="order-consent-text">
            Я даю согласие на обработку моих персональных данных в соответствии с
            <a href="personal-data-consent.html" target="_blank" rel="noopener noreferrer">Согласием на обработку персональных данных</a>.
          </span>
        </label>

        <div class="order-modal-message" id="orderModalMessage"></div>

        <button type="submit" class="big-btn order-submit-btn">
          Оформить заявку →
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll("[data-order-close]").forEach((button) => {
    button.addEventListener("click", closeOrderModal);
  });

  modal.querySelector("#orderForm").addEventListener("submit", submitOrderForm);

  const consentFields = [
    {
      name: "legal_consent",
      error: "Подтверди согласие с публичной офертой и политикой конфиденциальности."
    },
    {
      name: "personal_data_consent",
      error: "Подтверди согласие на обработку персональных данных."
    }
  ];

  consentFields.forEach(({ name, error }) => {
    const checkbox = modal.querySelector(`input[name="${name}"]`);

    if (!checkbox) return;

    checkbox.addEventListener("invalid", () => {
      const message = modal.querySelector("#orderModalMessage");
      message.textContent = error;
      message.className = "order-modal-message is-error";
    });

    checkbox.addEventListener("change", () => {
      if (!checkbox.checked) return;

      const message = modal.querySelector("#orderModalMessage");

      if (message.textContent === error) {
        message.textContent = "";
        message.className = "order-modal-message";
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeOrderModal();
    }
  });

  return modal;
}

function openOrderModal() {
  if (!selectedProduct) return;

  const modal = getOrderModalElement();
  const summary = modal.querySelector("#orderSummary");
  const message = modal.querySelector("#orderModalMessage");
  const form = modal.querySelector("#orderForm");

  message.textContent = "";
  message.className = "order-modal-message";

  summary.innerHTML = `
    <div>
      <span>Товар</span>
      <strong>${escapeHtml(selectedProduct.product_name)}</strong>
    </div>
    <div>
      <span>Коллекция</span>
      <strong>${escapeHtml(selectedAnime?.title || "—")}</strong>
    </div>
    <div>
      <span>Дизайн</span>
      <strong>${escapeHtml(selectedDesign?.title || "—")}</strong>
    </div>
    <div>
      <span>Тип</span>
      <strong>${escapeHtml(selectedProduct.clothing_title)}</strong>
    </div>
    <div>
      <span>Принт</span>
      <strong>${escapeHtml(selectedPrintPosition)}</strong>
    </div>
    <div>
      <span>Размер</span>
      <strong>${escapeHtml(selectedSize)}</strong>
    </div>
    <div>
      <span>Цена</span>
      <strong>${escapeHtml(formatPrice(selectedProduct.price))}</strong>
    </div>
  `;

  form.reset();

  modal.classList.add("is-open");
  document.body.classList.add("order-modal-open");

  const firstInput = modal.querySelector('input[name="customer_name"]');
  if (firstInput) firstInput.focus();
}

function closeOrderModal() {
  const modal = document.querySelector("#orderModal");
  if (!modal) return;

  modal.classList.remove("is-open");
  document.body.classList.remove("order-modal-open");
}

function getOrderSuccessPopupElement() {
  let popup = document.querySelector("#orderSuccessPopup");

  if (popup) return popup;

  popup = document.createElement("div");
  popup.id = "orderSuccessPopup";
  popup.className = "order-success-popup";
  popup.innerHTML = `
    <div class="order-success-backdrop"></div>

    <div class="order-success-card" role="dialog" aria-modal="true" aria-label="Заявка отправлена">
      <div class="order-success-icon">✓</div>

      <h2>Заявка отправлена!</h2>

      <p class="order-success-number-label">Ваш номер заявки:</p>

      <button type="button" class="order-success-number" id="orderSuccessNumber">
        —
      </button>

      <p class="order-success-copy-hint" id="orderSuccessCopyHint">
        Нажмите на номер, чтобы скопировать
      </p>

      <p class="order-success-warning">
        Обязательно сохраните его!
      </p>

      <button type="button" class="big-btn order-success-done" id="orderSuccessDone">
        Готово
      </button>
    </div>
  `;

  document.body.appendChild(popup);

  popup.querySelector("#orderSuccessDone").addEventListener("click", closeOrderSuccessPopup);
  popup.querySelector(".order-success-backdrop").addEventListener("click", closeOrderSuccessPopup);

  popup.querySelector("#orderSuccessNumber").addEventListener("click", () => {
    const orderId = popup.querySelector("#orderSuccessNumber").textContent.trim();
    copyTextToClipboard(orderId);

    const hint = popup.querySelector("#orderSuccessCopyHint");
    hint.textContent = "Номер скопирован";
    hint.classList.add("is-copied");

    setTimeout(() => {
      hint.textContent = "Нажмите на номер, чтобы скопировать";
      hint.classList.remove("is-copied");
    }, 1800);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && popup.classList.contains("is-open")) {
      closeOrderSuccessPopup();
    }
  });

  return popup;
}

function showOrderSuccessPopup(orderId) {
  const popup = getOrderSuccessPopupElement();
  const numberButton = popup.querySelector("#orderSuccessNumber");
  const hint = popup.querySelector("#orderSuccessCopyHint");

  numberButton.textContent = orderId;
  hint.textContent = "Нажмите на номер, чтобы скопировать";
  hint.classList.remove("is-copied");

  popup.classList.add("is-open");
  document.body.classList.add("order-modal-open");
}

function closeOrderSuccessPopup() {
  const popup = document.querySelector("#orderSuccessPopup");
  if (!popup) return;

  popup.classList.remove("is-open");
  document.body.classList.remove("order-modal-open");
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    fallbackCopyTextToClipboard(text);
  } catch (error) {
    fallbackCopyTextToClipboard(text);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";

  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

async function submitOrderForm(event) {
  event.preventDefault();

  if (isOrderSubmitting || !selectedProduct) return;

  const form = event.currentTarget;
  const modal = getOrderModalElement();
  const message = modal.querySelector("#orderModalMessage");
  const submitButton = modal.querySelector(".order-submit-btn");

  const formData = new FormData(form);

  const customerName = String(formData.get("customer_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const telegram = String(formData.get("telegram") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const comment = String(formData.get("comment") || "").trim();
  const legalConsentAccepted = formData.get("legal_consent") === "accepted";
  const personalDataConsentAccepted = formData.get("personal_data_consent") === "accepted";

  if (!customerName || !email || !phone || !address) {
    message.textContent = "Заполни ФИО, почту, телефон и адрес.";
    message.className = "order-modal-message is-error";
    return;
  }

  if (!legalConsentAccepted) {
    message.textContent = "Подтверди согласие с публичной офертой и политикой конфиденциальности.";
    message.className = "order-modal-message is-error";
    return;
  }

  if (!personalDataConsentAccepted) {
    message.textContent = "Подтверди согласие на обработку персональных данных.";
    message.className = "order-modal-message is-error";
    return;
  }

  const payload = {
    action: "create_order",

    customer_name: customerName,
    email,
    phone,
    telegram,
    address,
    comment,
    legal_consent: "TRUE",
    personal_data_consent: "TRUE",

    product_id: selectedProduct.id,
    product_name: selectedProduct.product_name,
    anime: selectedAnime?.title || "",
    design: selectedDesign?.title || "",
    clothing_type: selectedProduct.clothing_title,
    print_position: selectedPrintPosition,
    size: selectedSize,
    price: selectedProduct.price
  };

  try {
    isOrderSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = "Отправляем...";

    message.textContent = "";
    message.className = "order-modal-message";

    const response = await fetch(ORDER_URL, {
      method: "POST",
      body: new URLSearchParams(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Не удалось оформить заявку");
    }

    const orderId = result.order_id || "без номера";

    form.reset();
    closeOrderModal();
    showOrderSuccessPopup(orderId);
  } catch (error) {
    console.error(error);

    message.textContent = "Заявка не отправилась. Проверь Apps Script, доступ Anyone и лист Orders.";
    message.className = "order-modal-message is-error";
  } finally {
    isOrderSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = "Оформить заявку →";
  }
}

function getRealDesigns(anime) {
  if (!anime) return [];
  return anime.designs.filter((design) => design.title && design.title.trim() !== "");
}

function getDesignsForConstructor(anime) {
  return getRealDesigns(anime);
}

function findProduct(animeId, designId, garmentId) {
  return products.find((product) =>
    product.anime_id === animeId &&
    product.design_id === designId &&
    product.clothing_type === garmentId
  );
}

function getAvailableGarmentsForSelection() {
  if (!selectedAnime || !selectedDesign) return [];

  return garments.filter((garment) =>
    findProduct(selectedAnime.id, selectedDesign.id, garment.id)
  );
}

function getQuickProducts(filter = "all") {
  if (filter === "all") return products;

  if (filter.startsWith("tag:")) {
    const tag = filter.replace("tag:", "").trim().toLowerCase();
    return products.filter((product) => product.tags.includes(tag));
  }

  if (filter === "drop") {
    return products.filter((product) =>
      product.drop ||
      product.tags.includes("первый-дроп") ||
      product.tags.includes("first-drop")
    );
  }

  return products.filter((product) => product.clothing_type === filter);
}

function getQuickMoreWrap() {
  let quickMoreWrap = document.querySelector("#quickMoreWrap");

  if (!quickMoreWrap && quickProductGrid) {
    quickMoreWrap = document.createElement("div");
    quickMoreWrap.id = "quickMoreWrap";
    quickMoreWrap.className = "quick-more-wrap";
    quickProductGrid.insertAdjacentElement("afterend", quickMoreWrap);
  }

  return quickMoreWrap;
}

function renderQuickSkeletons(count = getQuickInitialLimit()) {
  if (!quickProductGrid) return;

  quickProductGrid.innerHTML = Array.from({ length: count }, () => `
    <article class="quick-product-card quick-skeleton-card" aria-hidden="true">
      <div class="quick-skeleton-image"></div>
      <div class="quick-product-bottom">
        <div class="quick-product-info">
          <div class="quick-skeleton-line quick-skeleton-title"></div>
          <div class="quick-skeleton-line quick-skeleton-subtitle"></div>
        </div>

        <div class="quick-product-price-tags">
          <div class="quick-skeleton-line quick-skeleton-price"></div>
          <div class="quick-skeleton-line quick-skeleton-tag"></div>
          <div class="quick-skeleton-line quick-skeleton-tag short"></div>
        </div>
      </div>
    </article>
  `).join("");

  const quickMoreWrap = getQuickMoreWrap();
  if (quickMoreWrap) quickMoreWrap.innerHTML = "";
}

function createTile({ item, kicker, selectedId, mutedCondition, onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "choice-tile";
  button.style.setProperty("--tile-bg", item.bg || FALLBACK_BG.anime);

  if (selectedId === item.id) {
    button.classList.add("is-selected");
  }

  if (mutedCondition) {
    button.classList.add("is-muted");
  }

  const imageHtml = item.image
    ? `<img class="choice-tile-img" src="${item.image}" alt="${escapeHtml(item.title)}">`
    : "";

  button.innerHTML = `
    ${imageHtml}
    <div class="choice-tile-content">
      <span class="choice-tile-kicker">${escapeHtml(kicker)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.subtitle || "")}</p>
    </div>
  `;

  button.addEventListener("click", onClick);
  return button;
}

function renderAnimeTiles() {
  if (!animeGrid) return;

  animeGrid.innerHTML = "";

  catalogData.forEach((anime) => {
    const tile = createTile({
      item: anime,
      kicker: "Anime",
      selectedId: selectedAnime?.id,
      mutedCondition: selectedAnime && selectedAnime.id !== anime.id,
      onClick: () => selectAnime(anime.id)
    });

    animeGrid.appendChild(tile);
  });
}

function renderDesignTiles() {
  if (!designGrid) return;

  designGrid.innerHTML = "";

  const designs = getDesignsForConstructor(selectedAnime);

  designs.forEach((design) => {
    const tile = createTile({
      item: design,
      kicker: "Design",
      selectedId: selectedDesign?.id,
      mutedCondition: selectedDesign && selectedDesign.id !== design.id,
      onClick: () => selectDesign(design)
    });

    designGrid.appendChild(tile);
  });
}

function renderGarmentTiles() {
  if (!garmentGrid) return;

  garmentGrid.innerHTML = "";

  getAvailableGarmentsForSelection().forEach((garment) => {
    const tile = createTile({
      item: garment,
      kicker: "Garments",
      selectedId: selectedGarment?.id,
      mutedCondition: selectedGarment && selectedGarment.id !== garment.id,
      onClick: () => selectGarment(garment.id)
    });

    garmentGrid.appendChild(tile);
  });
}

function renderProductCard() {
  if (!selectedProduct || !productResult) return;

  const statusText = {
    in_stock: "В наличии",
    preorder: "Предзаказ",
    sold_out: "Sold out"
  }[selectedProduct.stock_status] || selectedProduct.stock_status;

  const tagsHtml = selectedProduct.visible_tags.length
    ? `
      <div class="product-tags">
        ${selectedProduct.visible_tags.map((tag) => `<span>${escapeHtml(formatTag(tag))}</span>`).join("")}
      </div>
    `
    : "";

  const productImages = selectedProduct.images && selectedProduct.images.length
    ? selectedProduct.images
    : [selectedProduct.image_main];

  if (selectedImageIndex < 0 || selectedImageIndex >= productImages.length) {
    selectedImageIndex = 0;
  }

  const activeImage = productImages[selectedImageIndex] || productImages[0];

  const sizeOptions = getProductSizeOptions(selectedProduct);
  const selectedSizeIsAvailable = sizeOptions.some((option) =>
    option.available && option.label === selectedSize
  );

  if (!selectedSizeIsAvailable) {
    selectedSize = getFirstAvailableSize(selectedProduct);
  }

  const selectedSizeIndex = Math.max(
    0,
    sizeOptions.findIndex((option) => option.label === selectedSize)
  );

  const sizeGuideHref = buildSizeGuideHref();

  const galleryDotsHtml = productImages.length > 1
    ? `
      <div class="product-gallery-dots" aria-label="Фотографии товара">
        ${productImages.map((image, index) => `
          <button
            type="button"
            class="product-gallery-dot ${index === selectedImageIndex ? "is-selected" : ""}"
            data-image-index="${index}"
            data-preview="${escapeHtml(image)}"
            aria-label="Показать фото ${index + 1}"
          ></button>
        `).join("")}
      </div>
    `
    : "";

  productResult.innerHTML = `
    <article class="product-detail-card">
      <div class="product-detail-media" data-gallery-count="${productImages.length}">
        <div class="product-main-image-wrap">
          <img class="product-main-image" src="${escapeHtml(activeImage)}" alt="${escapeHtml(selectedProduct.product_name)}">
          ${galleryDotsHtml}
          ${productImages.length > 1 ? `<div class="product-gallery-hint">Колесо мыши</div>` : ""}
        </div>
      </div>

      <div class="product-detail-info">
        <p class="eyebrow">${escapeHtml(selectedAnime?.title || "")} / ${escapeHtml(selectedDesign?.title || "")}</p>
        <h2>${escapeHtml(selectedProduct.product_name)}</h2>
        <div class="product-price">${escapeHtml(formatPrice(selectedProduct.price))}</div>

        ${tagsHtml}

        <p class="product-description">
          ${escapeHtml(selectedProduct.description)}
        </p>

        <div class="product-options print-position-options">
          <h3>Расположение принта</h3>
          <div class="print-position-list">
            <button type="button" class="print-position-btn ${selectedPrintPosition === "На груди" ? "is-selected" : ""}" data-print-position="На груди">На груди</button>
            <button type="button" class="print-position-btn ${selectedPrintPosition === "На спине" ? "is-selected" : ""}" data-print-position="На спине">На спине</button>
          </div>
        </div>

        <div class="product-options">
          <h3>Размер</h3>
          <div class="size-list size-slider-wrap">
            <div
              class="size-slider"
              style="--size-count: ${sizeOptions.length}; --selected-index: ${selectedSizeIndex};"
              aria-label="Выбор размера"
            >
              ${sizeOptions.map((option, index) => `
                <button
                  type="button"
                  class="size-step ${option.label === selectedSize ? "is-selected" : ""} ${option.available ? "" : "is-unavailable"}"
                  data-size="${escapeHtml(option.label)}"
                  ${option.available ? "" : "disabled aria-disabled=\"true\""}
                  aria-label="${escapeHtml(option.available ? `Выбрать размер ${option.label}` : `Размер ${option.label} недоступен`)}"
                >
                  <span class="size-step-label">${escapeHtml(option.label)}</span>
                  <span class="size-step-mark" aria-hidden="true"></span>
                </button>
              `).join("")}
            </div>

            <a href="${escapeHtml(sizeGuideHref)}" class="secondary-btn size-guide-inline">
              Размерная сетка
            </a>
          </div>
        </div>

        <div class="product-meta">
          <p><strong>Статус</strong>${escapeHtml(statusText)}</p>
          <p><strong>Цвет</strong>${escapeHtml(selectedProduct.color || "Уточняется")}</p>
          <p><strong>Состав</strong>${escapeHtml(selectedProduct.composition)}</p>
          <p><strong>Уход</strong>${escapeHtml(selectedProduct.care)}</p>
        </div>

        <div class="product-actions">
          <button type="button" class="big-btn order-open-btn" id="orderOpenBtn">
            Заказать →
          </button>
        </div>
      </div>
    </article>
  `;

  const galleryArea = productResult.querySelector(".product-main-image-wrap");
  const preview = getGalleryPreviewElement();

  productResult.querySelectorAll(".product-gallery-dot").forEach((button) => {
    button.addEventListener("click", () => {
      selectedImageIndex = Number(button.dataset.imageIndex || 0);
      hideGalleryPreview();
      renderProductCard();
    });

    button.addEventListener("mouseenter", () => {
      const previewImage = button.dataset.preview;
      preview.innerHTML = `<img src="${escapeHtml(previewImage)}" alt="Миниатюра товара">`;
      preview.classList.add("is-visible");
    });

    button.addEventListener("mousemove", (event) => {
      preview.style.left = `${event.clientX + 18}px`;
      preview.style.top = `${event.clientY + 18}px`;
    });

    button.addEventListener("mouseleave", hideGalleryPreview);
  });

  if (galleryArea && productImages.length > 1) {
    galleryArea.addEventListener("wheel", (event) => {
      event.preventDefault();

      if (event.deltaY > 0) {
        selectedImageIndex = (selectedImageIndex + 1) % productImages.length;
      } else {
        selectedImageIndex = (selectedImageIndex - 1 + productImages.length) % productImages.length;
      }

      hideGalleryPreview();
      renderProductCard();
    }, { passive: false });
  }

  productResult.querySelectorAll(".print-position-btn").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPrintPosition = button.dataset.printPosition || "На груди";
      renderProductCard();
    });
  });

  productResult.querySelectorAll(".size-step:not(:disabled)").forEach((button) => {
    button.addEventListener("click", () => {
      selectedSize = button.dataset.size;
      renderProductCard();
    });
  });

  const orderOpenButton = productResult.querySelector("#orderOpenBtn");

  if (orderOpenButton) {
    orderOpenButton.addEventListener("click", openOrderModal);
  }
}

function getGalleryPreviewElement() {
  let preview = document.querySelector("#galleryHoverPreview");

  if (!preview) {
    preview = document.createElement("div");
    preview.id = "galleryHoverPreview";
    preview.className = "gallery-hover-preview";
    document.body.appendChild(preview);
  }

  return preview;
}

function hideGalleryPreview() {
  const preview = document.querySelector("#galleryHoverPreview");
  if (preview) preview.classList.remove("is-visible");
}

function renderQuickFilters() {
  if (!quickFilterRow) return;

  quickFilterRow.querySelectorAll(".quick-filter").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === activeQuickFilter);
  });
}

function renderQuickProducts() {
  if (!quickProductGrid) return;

  const quickProducts = getQuickProducts(activeQuickFilter);
  const visibleProducts = quickProducts.slice(0, quickVisibleCount);
  const hasMoreProducts = quickProducts.length > quickVisibleCount;
  const quickMoreWrap = getQuickMoreWrap();

  quickProductGrid.innerHTML = "";

  if (!quickProducts.length) {
    quickProductGrid.innerHTML = `
      <div class="quick-empty">
        <h3>Пока нет товаров</h3>
        <p>Добавь товары в Google Таблицу, проверь active = TRUE и колонку tags.</p>
      </div>
    `;

    if (quickMoreWrap) quickMoreWrap.innerHTML = "";
    return;
  }

  visibleProducts.forEach((product) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "quick-product-card";

    const cardTagsHtml = product.visible_tags.length
      ? `<div class="quick-product-tags">${product.visible_tags.slice(0, 2).map((tag) => `<span>${escapeHtml(formatTag(tag))}</span>`).join("")}</div>`
      : "";

    card.innerHTML = `
      <div class="quick-product-image">
        <img src="${escapeHtml(product.image_main)}" alt="${escapeHtml(product.product_name)}">
      </div>

      <div class="quick-product-bottom">
        <div class="quick-product-info">
          <h3>${escapeHtml(product.product_name)}</h3>
          <span class="quick-product-subtitle">${escapeHtml(product.anime_title)}</span>
        </div>

        <div class="quick-product-price-tags">
          <strong>${escapeHtml(formatPrice(product.price))}</strong>
          ${cardTagsHtml}
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      selectQuickProduct(product.anime_id, product.design_id, product.clothing_type);
    });

    quickProductGrid.appendChild(card);
  });

  if (!quickMoreWrap) return;

  if (hasMoreProducts) {
    const remainingCount = quickProducts.length - quickVisibleCount;

    quickMoreWrap.innerHTML = `
      <button type="button" class="quick-load-more" id="quickLoadMore">
        Показать больше
        <span>ещё ${remainingCount}</span>
      </button>
    `;

    quickMoreWrap.querySelector("#quickLoadMore").addEventListener("click", () => {
      quickVisibleCount += getQuickInitialLimit();
      renderQuickProducts();
    });
  } else {
    quickMoreWrap.innerHTML = "";
  }
}

function initQuickFilters() {
  if (!quickFilterRow) return;

  quickFilterRow.querySelectorAll(".quick-filter").forEach((button) => {
    button.addEventListener("click", () => {
      activeQuickFilter = button.dataset.filter;
      quickVisibleCount = getQuickInitialLimit();
      renderQuickFilters();
      renderQuickProducts();
    });
  });

  renderQuickFilters();
  renderQuickProducts();
}

function selectQuickProduct(animeId, designId, garmentId, options = {}) {
  const anime = catalogData.find((item) => item.id === animeId);
  const design = getRealDesigns(anime).find((item) => item.id === designId);
  const garment = garments.find((item) => item.id === garmentId);
  const product = findProduct(animeId, designId, garmentId);

  if (!anime || !design || !garment || !product) return;

  const restoredSize = getAvailableSizeLabel(product, options.size);

  selectedAnime = anime;
  selectedDesign = design;
  selectedGarment = garment;
  selectedProduct = product;
  selectedImageIndex = 0;
  selectedSize = restoredSize || getFirstAvailableSize(product);
  selectedPrintPosition = normalizePrintPosition(options.printPosition);

  renderAnimeTiles();
  renderQuickFilters();
  renderQuickProducts();
  renderDesignTiles();
  renderGarmentTiles();
  renderProductCard();

  if (designStep) designStep.classList.remove("is-hidden");
  if (garmentStep) garmentStep.classList.remove("is-hidden");
  if (productResult) productResult.classList.remove("is-hidden");

  const scrollBehavior = options.scrollBehavior || "smooth";
  productResult?.scrollIntoView({ behavior: scrollBehavior, block: "start" });
}

function selectAnime(animeId) {
  selectedAnime = catalogData.find((anime) => anime.id === animeId);
  selectedDesign = null;
  selectedGarment = null;
  selectedProduct = null;
  selectedImageIndex = 0;
  selectedSize = "M";
  selectedPrintPosition = "На груди";

  renderAnimeTiles();
  renderQuickFilters();
  renderQuickProducts();
  renderDesignTiles();

  if (designStep) designStep.classList.remove("is-hidden");
  if (garmentStep) garmentStep.classList.add("is-hidden");
  if (productResult) productResult.classList.add("is-hidden");

  designStep?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectDesign(design) {
  selectedDesign = design;
  selectedGarment = null;
  selectedProduct = null;
  selectedImageIndex = 0;
  selectedSize = "M";
  selectedPrintPosition = "На груди";

  renderDesignTiles();
  renderGarmentTiles();

  if (garmentStep) garmentStep.classList.remove("is-hidden");
  if (productResult) productResult.classList.add("is-hidden");

  garmentStep?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectGarment(garmentId) {
  selectedGarment = garments.find((garment) => garment.id === garmentId);
  selectedProduct = findProduct(selectedAnime.id, selectedDesign.id, garmentId);
  selectedImageIndex = 0;
  selectedSize = getFirstAvailableSize(selectedProduct);
  selectedPrintPosition = "На груди";

  if (!selectedProduct) return;

  renderGarmentTiles();
  renderProductCard();

  if (productResult) productResult.classList.remove("is-hidden");
  productResult?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showCatalogError(error) {
  console.error(error);

  if (quickProductGrid) {
    quickProductGrid.innerHTML = `
      <div class="quick-empty">
        <h3>Не удалось загрузить каталог</h3>
        <p>Проверь ссылку Apps Script, доступ Anyone и название листа Products.</p>
      </div>
    `;
  }
}


function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("product") || "").trim();
}

function openProductFromUrl() {
  const urlState = getCatalogUrlState();
  const productId = urlState.productId;

  if (!productId) return;

  const product = products.find((item) => item.id === productId);

  if (!product) {
    console.warn(`Товар с id "${productId}" не найден`);
    return;
  }

  selectQuickProduct(product.anime_id, product.design_id, product.clothing_type, {
    size: urlState.size,
    printPosition: urlState.printPosition,
    scrollBehavior: "auto"
  });
}

async function initCatalog() {
  renderQuickSkeletons();

  try {
    const rawProducts = await loadProductsFromSheet();
    products = normalizeProducts(rawProducts);
    quickVisibleCount = getQuickInitialLimit();
    catalogData = buildCatalogData(products);
    garments = buildGarments(products);

    console.log("Товары из таблицы:", products);
    console.log("Категории аниме:", catalogData);
    console.log("Типы одежды:", garments);

    renderAnimeTiles();
    initQuickFilters();
    openProductFromUrl();
  } catch (error) {
    showCatalogError(error);
  }
}

let lastQuickInitialLimit = getQuickInitialLimit();

function handleQuickLimitModeChange() {
  const nextQuickInitialLimit = getQuickInitialLimit();

  if (nextQuickInitialLimit === lastQuickInitialLimit) return;

  lastQuickInitialLimit = nextQuickInitialLimit;
  quickVisibleCount = nextQuickInitialLimit;

  renderQuickProducts();
}

if (quickMobileQuery.addEventListener) {
  quickMobileQuery.addEventListener("change", handleQuickLimitModeChange);
} else if (quickMobileQuery.addListener) {
  quickMobileQuery.addListener(handleQuickLimitModeChange);
}

document.addEventListener("DOMContentLoaded", initCatalog);

function initDropCarousel() {
  const items = Array.from(document.querySelectorAll(".drop-carousel-item"));

  if (items.length < 5) return;

  let activeIndex = 0;

  const holdMs = 2600; // сколько стоит в центре
  const moveMs = 1800; // сколько едет до следующей позиции

  const positionClasses = [
    "drop-pos-front",
    "drop-pos-right",
    "drop-pos-back-right",
    "drop-pos-back-left",
    "drop-pos-left"
  ];

  function renderDropCarousel() {
    items.forEach((item, index) => {
      const offset = (index - activeIndex + items.length) % items.length;

      item.classList.remove(...positionClasses);

      item.classList.add(positionClasses[offset]);
    });
  }

  renderDropCarousel();

  setInterval(() => {
    activeIndex = (activeIndex - 1 + items.length) % items.length;
    renderDropCarousel();
  }, holdMs + moveMs);
}

document.addEventListener("DOMContentLoaded", initDropCarousel);
