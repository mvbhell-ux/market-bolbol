const STORE_WHATSAPP = "";
const CART_STORAGE_KEY = "market_roastery_cart_v1";
const products = [
  { id: "rice", name: "أرز أبيض", description: "كيلو · حبة عريضة", price: 35, category: "market", icon: "🍚" },
  { id: "sugar", name: "سكر أبيض", description: "كيلو · ناعم", price: 32, category: "market", icon: "🧂" },
  { id: "tea", name: "شاي أسود", description: "عبوة · 250 جم", price: 58, category: "market", icon: "🍵" },
  { id: "oil", name: "زيت دوار الشمس", description: "زجاجة · 1 لتر", price: 82, category: "market", icon: "🫒" },
  { id: "coffee", name: "قهوة محوجة", description: "تحميص طازة · 250 جم", price: 145, category: "roastery", icon: "☕" },
  { id: "coffee-dark", name: "قهوة سادة غامقة", description: "تحميص طازة · 250 جم", price: 135, category: "roastery", icon: "🫘" },
  { id: "nuts", name: "سوداني محمص", description: "تحميص طازة · 250 جم", price: 75, category: "roastery", icon: "🥜" },
  { id: "cigarettes", name: "سجائر", description: "للبالغين فقط · يُرجى تحديد النوع عند الطلب", price: 75, category: "adult", icon: "🔞" },
];
const categories = {
  all: "كل المنتجات",
  market: "الماركت",
  roastery: "المحمصة",
  adult: "السجائر",
};

const productGrid = document.getElementById("productGrid");
const cartDialog = document.getElementById("cartDialog");
const ageDialog = document.getElementById("ageDialog");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutMessage = document.getElementById("checkoutMessage");
const toast = document.getElementById("toast");
const state = {
  category: "all",
  search: "",
  cart: loadCart(),
  adultVerified: readAgeVerification(),
};

document.getElementById("currentYear").textContent = String(new Date().getFullYear());
document.getElementById("cartButton").addEventListener("click", openCart);
document.getElementById("searchInput").addEventListener("input", (event) => {
  state.search = event.currentTarget.value.trim().toLocaleLowerCase("ar");
  renderProducts();
});
document.querySelectorAll(".category-button").forEach((button) => {
  button.addEventListener("click", () => selectCategory(button.dataset.category));
});
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => document.getElementById(button.dataset.close).close());
});
document.getElementById("confirmAgeBtn").addEventListener("click", confirmAge);
document.getElementById("cancelAgeBtn").addEventListener("click", () => ageDialog.close());
document.getElementById("checkoutForm").addEventListener("submit", submitOrder);
cartDialog.addEventListener("close", () => {
  checkoutMessage.textContent = "";
});

renderProducts();
renderCart();
registerServiceWorker();
setupInstallButton();

function selectCategory(category) {
  if (!Object.hasOwn(categories, category)) return;
  if (category === "adult" && !state.adultVerified) {
    ageDialog.showModal();
    return;
  }
  state.category = category;
  document.querySelectorAll(".category-button").forEach((button) => {
    const active = button.dataset.category === category;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderProducts();
}

function confirmAge() {
  state.adultVerified = true;
  try {
    sessionStorage.setItem("market_roastery_adult_verified", "true");
  } catch {
    showToast("تم التحقق لهذه الجلسة فقط.");
  }
  ageDialog.close();
  selectCategory("adult");
}

function readAgeVerification() {
  try {
    return sessionStorage.getItem("market_roastery_adult_verified") === "true";
  } catch {
    showToast("تعذر تذكّر التحقق العمري؛ قد تحتاج لإعادة تأكيده.");
    return false;
  }
}

function renderProducts() {
  productGrid.replaceChildren();
  const visibleProducts = products.filter((product) => {
    const categoryMatches = state.category === "all" || product.category === state.category;
    const searchMatches = `${product.name} ${product.description}`.toLocaleLowerCase("ar").includes(state.search);
    return categoryMatches && searchMatches && (product.category !== "adult" || state.adultVerified);
  });

  if (!visibleProducts.length) {
    const empty = document.createElement("p");
    empty.className = "empty-products";
    empty.textContent = state.category === "adult" && !state.adultVerified
      ? "تحقق من السن لعرض منتجات هذا القسم."
      : "مفيش منتجات مطابقة للبحث.";
    productGrid.append(empty);
    return;
  }

  visibleProducts.forEach((product, index) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.style.setProperty("--card-delay", `${index * 45}ms`);

    const picture = document.createElement("div");
    picture.className = `product-picture picture-${product.category}`;
    picture.setAttribute("aria-hidden", "true");
    picture.textContent = product.icon;

    const details = document.createElement("div");
    details.className = "product-details";
    const category = document.createElement("span");
    category.className = "product-category";
    category.textContent = categories[product.category];
    const name = document.createElement("h3");
    name.textContent = product.name;
    const description = document.createElement("p");
    description.textContent = product.description;
    const bottom = document.createElement("div");
    bottom.className = "product-bottom";
    const price = document.createElement("strong");
    price.textContent = formatPrice(product.price);
    const addButton = document.createElement("button");
    addButton.className = "add-button";
    addButton.type = "button";
    addButton.setAttribute("aria-label", `أضف ${product.name} إلى السلة`);
    addButton.textContent = "+";
    addButton.addEventListener("click", () => addToCart(product.id));

    bottom.append(price, addButton);
    details.append(category, name, description, bottom);
    card.append(picture, details);
    productGrid.append(card);
  });
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  if (product.category === "adult" && !state.adultVerified) {
    state.pendingAdultCategory = true;
    ageDialog.showModal();
    return;
  }
  state.cart[productId] = (state.cart[productId] || 0) + 1;
  saveCart();
  renderCart();
  showToast(`اتضاف ${product.name} للسلة.`);
}

function openCart() {
  renderCart();
  cartDialog.showModal();
}

function renderCart() {
  cartItems.replaceChildren();
  const entries = Object.entries(state.cart).filter(([id, quantity]) =>
    products.some((product) => product.id === id) && Number.isInteger(quantity) && quantity > 0,
  );
  const count = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
  const total = entries.reduce((sum, [id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return sum + product.price * quantity;
  }, 0);
  cartCount.textContent = String(count);
  cartTotal.textContent = formatPrice(total);
  document.getElementById("checkoutButton").disabled = count === 0;

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty-cart";
    empty.textContent = "السلة لسه فاضية. اختار منتجاتك من الأقسام.";
    cartItems.append(empty);
    return;
  }

  entries.forEach(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    const row = document.createElement("div");
    row.className = "cart-item";
    const info = document.createElement("div");
    info.className = "cart-item-info";
    const name = document.createElement("strong");
    name.textContent = product.name;
    const lineTotal = document.createElement("span");
    lineTotal.textContent = formatPrice(product.price * quantity);
    info.append(name, lineTotal);

    const controls = document.createElement("div");
    controls.className = "quantity-controls";
    const decrease = makeQuantityButton("−", `تقليل كمية ${product.name}`, () => changeQuantity(id, -1));
    const quantityLabel = document.createElement("span");
    quantityLabel.textContent = String(quantity);
    const increase = makeQuantityButton("+", `زيادة كمية ${product.name}`, () => changeQuantity(id, 1));
    controls.append(decrease, quantityLabel, increase);
    row.append(info, controls);
    cartItems.append(row);
  });
}

function makeQuantityButton(text, label, onClick) {
  const button = document.createElement("button");
  button.className = "quantity-button";
  button.type = "button";
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", onClick);
  return button;
}

function changeQuantity(productId, delta) {
  const nextQuantity = (state.cart[productId] || 0) + delta;
  if (nextQuantity <= 0) {
    delete state.cart[productId];
  } else {
    state.cart[productId] = nextQuantity;
  }
  saveCart();
  renderCart();
}

function submitOrder(event) {
  event.preventDefault();
  if (!checkoutForm.reportValidity()) return;
  const entries = Object.entries(state.cart).filter(([, quantity]) => quantity > 0);
  if (!entries.length) {
    showToast("أضف منتجًا للسلة قبل إرسال الطلب.");
    return;
  }
  if (entries.some(([id]) => products.find((product) => product.id === id)?.category === "adult") && !state.adultVerified) {
    checkoutMessage.textContent = "يجب تأكيد السن القانوني قبل طلب منتجات التبغ.";
    return;
  }
  const phone = STORE_WHATSAPP.replace(/\D/g, "");
  if (!phone) {
    checkoutMessage.textContent = "إرسال الطلبات غير مفعّل بعد. أضف رقم واتساب المتجر في إعدادات التطبيق.";
    return;
  }

  const formData = new FormData(checkoutForm);
  const lines = entries.map(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return `• ${product.name} × ${quantity} — ${formatPrice(product.price * quantity)}`;
  });
  const total = entries.reduce((sum, [id, quantity]) =>
    sum + products.find((product) => product.id === id).price * quantity, 0,
  );
  const order = [
    "طلب جديد من ماركت بلبل",
    ...lines,
    `الإجمالي: ${formatPrice(total)}`,
    `الاسم: ${formData.get("customerName")}`,
    `رقم التواصل: ${formData.get("customerPhone")}`,
    `العنوان: ${formData.get("customerAddress")}`,
  ].join("\n");
  window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(order)}`;
}

function formatPrice(price) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(price) + " ج.م";
}

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("بيانات السلة المحفوظة غير صالحة.");
    }
    return Object.fromEntries(Object.entries(parsed).filter(([id, quantity]) =>
      products.some((product) => product.id === id) && Number.isInteger(quantity) && quantity > 0,
    ));
  } catch {
    showToast("تعذر استعادة السلة المحفوظة؛ ابدأ سلة جديدة.");
    return {};
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
  } catch {
    showToast("تعذر حفظ السلة على هذا الجهاز.");
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {
    showToast("تعذر تفعيل وضع العمل دون إنترنت على هذا المتصفح.");
  });
}

function setupInstallButton() {
  const installButton = document.getElementById("installBtn");
  let installPrompt;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.classList.remove("hidden");
  });
  installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    installPrompt = null;
    installButton.classList.add("hidden");
  });
}
