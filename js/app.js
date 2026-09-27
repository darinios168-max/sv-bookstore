/**
 * SV Bookstore - Main Application Logic
 * Pure Client-Side Telegram Mini App Architecture
 */

(function () {
  'use strict';

  // --- Global State ---
  const state = {
    products: [],
    currentCategory: 'all',
    searchQuery: '',
    cart: [], // Array of { productId, qty }
    appliedCoupon: null,
    user: null,
    activeModal: null,
    selectedPaymentMethod: 'cod',
    isAdminAuthenticated: sessionStorage.getItem('sv_admin_auth') === 'true'
  };

  const tg = window.Telegram ? window.Telegram.WebApp : null;

  // --- Helper Functions ---
  function formatPrice(num) {
    return `${CONFIG.currency}${Number(num).toFixed(2)}`;
  }

  function getProductById(id) {
    return state.products.find(p => p.id === id);
  }

  function showToast(message, icon = 'ℹ️') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function triggerHaptic(style = 'light') {
    if (tg && tg.HapticFeedback) {
      if (['light', 'medium', 'heavy', 'rigid', 'soft'].includes(style)) {
        tg.HapticFeedback.impactOccurred(style);
      } else if (['error', 'success', 'warning'].includes(style)) {
        tg.HapticFeedback.notificationOccurred(style);
      } else if (style === 'selection') {
        tg.HapticFeedback.selectionChanged();
      }
    }
  }

  // --- Image Compression for Fast Upload & LocalStorage Savings ---
  function compressImageFile(file, maxWidth = 640, maxHeight = 850, quality = 0.75) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('ឯកសារដែលបានជ្រើសមិនមែនជារូបភាពទេ'));
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('មិនអាចអានឯកសាររូបភាពបានទេ'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('មិនអាចផ្ទុករូបភាពបានទេ'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Scale down proportionally if larger than maxWidth or maxHeight
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          // Clean white background for transparency (PNGs or transparent backgrounds)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with specified quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          const compressedBytes = Math.round((compressedDataUrl.length * 3) / 4);

          resolve({
            dataUrl: compressedDataUrl,
            width,
            height,
            originalSize: file.size,
            compressedSize: compressedBytes
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // --- LocalStorage Persistence ---
  function loadCart() {
    try {
      const saved = localStorage.getItem('sv_bookstore_cart');
      if (saved) {
        state.cart = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load cart from storage', e);
      state.cart = [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem('sv_bookstore_cart', JSON.stringify(state.cart));
    } catch (e) {
      console.warn('Failed to save cart to storage', e);
    }
  }

  // --- Cloud Realtime Database Sync ---
  function getCloudSyncConfig() {
    const customUrl = localStorage.getItem('sv_cloud_api_url');
    const customKey = localStorage.getItem('sv_cloud_api_key');
    const defaultUrl = (CONFIG.cloudSync && CONFIG.cloudSync.apiUrl) ? CONFIG.cloudSync.apiUrl : '';
    const enabled = localStorage.getItem('sv_cloud_enabled') !== 'false';

    const apiUrl = (customUrl && customUrl.trim()) ? customUrl.trim() : defaultUrl.trim();
    const apiKey = (customKey && customKey.trim()) ? customKey.trim() : ((CONFIG.cloudSync && CONFIG.cloudSync.apiKey) ? CONFIG.cloudSync.apiKey : '');

    return {
      enabled: enabled && Boolean(apiUrl),
      apiUrl: apiUrl,
      apiKey: apiKey,
      autoSyncOnSave: CONFIG.cloudSync ? (CONFIG.cloudSync.autoSyncOnSave !== false) : true
    };
  }

  async function syncProductsFromCloud(quiet = true) {
    const config = getCloudSyncConfig();
    if (!config.enabled || !config.apiUrl) return null;

    try {
      if (!quiet) showToast('កំពុងទាញយកទំនិញពី Cloud...', '⏳');

      const headers = {};
      if (config.apiKey) {
        headers['X-Master-Key'] = config.apiKey;
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      let fetchUrl = config.apiUrl;
      if (config.apiKey && (fetchUrl.includes('firebaseio.com') || fetchUrl.includes('firebasedatabase.app')) && !fetchUrl.includes('auth=')) {
        const sep = fetchUrl.includes('?') ? '&' : '?';
        fetchUrl = `${fetchUrl}${sep}auth=${encodeURIComponent(config.apiKey)}`;
      }

      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers: headers,
        cache: 'no-cache'
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      let items = null;
      if (Array.isArray(data)) {
        items = data;
      } else if (data && Array.isArray(data.record)) {
        // JSONBin.io structure
        items = data.record;
      } else if (data && typeof data === 'object') {
        // Firebase object structure { prod1: {...}, prod2: {...} }
        items = Object.values(data).filter(item => item && (item.id || item.title));
      }

      if (items && items.length > 0) {
        state.products = items;
        saveStoredProducts(state.products);
        renderCategories();
        renderProducts();
        updateMainButtonUI();
        if (!quiet) {
          triggerHaptic('success');
          showToast(`បានទាញយក ${items.length} មុខទំនិញពី Cloud ជោគជ័យ!`, '☁️');
        }
        return items;
      }
    } catch (err) {
      console.warn('Cloud Sync Pull failed:', err);
      if (!quiet) {
        triggerHaptic('error');
        showToast('បរាជ័យក្នុងការទាញយកពី Cloud: ' + err.message, '⚠️');
      }
    }
    return null;
  }

  async function syncProductsToCloud(products, quiet = false) {
    const config = getCloudSyncConfig();
    if (!config.enabled || !config.apiUrl) return false;

    try {
      if (!quiet) showToast('កំពុង Auto-Sync ទៅកាន់ Cloud...', '⏳');

      const headers = { 'Content-Type': 'application/json' };
      if (config.apiKey) {
        headers['X-Master-Key'] = config.apiKey;
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      let targetUrl = config.apiUrl;
      // If Firebase Realtime Database URL and apiKey provided, append auth
      if (config.apiKey && (targetUrl.includes('firebaseio.com') || targetUrl.includes('firebasedatabase.app')) && !targetUrl.includes('auth=')) {
        const sep = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${sep}auth=${encodeURIComponent(config.apiKey)}`;
      }

      const res = await fetch(targetUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(products)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      triggerHaptic('success');
      if (!quiet) {
        showToast('បាន Auto-Sync ទៅ Cloud ជោគជ័យ! អតិថិជនទាំងអស់បានឃើញទំនិញថ្មី។', '☁️');
      }
      return true;
    } catch (err) {
      console.error('Cloud Sync Push failed:', err);
      triggerHaptic('error');
      if (!quiet) {
        showToast('បរាជ័យក្នុងការ Sync ទៅ Cloud: ' + err.message, '⚠️');
      }
      return false;
    }
  }

  // --- Calculate Cart Totals ---
  function getCartCalculations() {
    let subtotal = 0;
    let totalItems = 0;

    state.cart.forEach(item => {
      const prod = getProductById(item.productId);
      if (prod) {
        subtotal += prod.price * item.qty;
        totalItems += item.qty;
      }
    });

    let discount = 0;
    if (state.appliedCoupon) {
      if (state.appliedCoupon.discountPercent) {
        discount = (subtotal * state.appliedCoupon.discountPercent) / 100;
      } else if (state.appliedCoupon.discountAmount) {
        discount = Math.min(subtotal, state.appliedCoupon.discountAmount);
      }
    }

    const shipping = subtotal >= CONFIG.freeShippingThreshold || subtotal === 0 ? 0 : CONFIG.shippingFee;
    const total = Math.max(0, subtotal - discount + shipping);

    return {
      subtotal,
      totalItems,
      discount,
      shipping,
      total
    };
  }

  // --- Telegram WebApp Theme & Setup ---
  function initTelegram() {
    if (!tg) return;

    tg.ready();
    tg.expand();

    // Enable closing confirmation if cart has items
    if (state.cart.length > 0 && tg.enableClosingConfirmation) {
      tg.enableClosingConfirmation();
    }

    // Apply Telegram Theme parameters if present
    if (tg.themeParams) {
      const root = document.documentElement;
      if (tg.themeParams.bg_color) root.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
      if (tg.themeParams.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color);
      if (tg.themeParams.text_color) root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
      if (tg.themeParams.hint_color) root.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color);
      if (tg.themeParams.link_color) root.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color);
      if (tg.themeParams.button_color) root.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color);
      if (tg.themeParams.button_text_color) root.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color);
      if (tg.themeParams.header_bg_color) root.style.setProperty('--tg-theme-header-bg-color', tg.themeParams.header_bg_color);
    }

    // Capture User Data
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      state.user = tg.initDataUnsafe.user;
      const userNameEl = document.getElementById('user-welcome-name');
      if (userNameEl) {
        userNameEl.textContent = state.user.first_name || 'Book Lover';
      }
    }
    updateAdminVisibility();

    // Native BackButton click listener
    if (tg.BackButton) {
      tg.BackButton.onClick(() => {
        handleBackNavigation();
      });
    }

    // Native MainButton click listener
    if (tg.MainButton) {
      tg.MainButton.onClick(() => {
        handleMainButtonAction();
      });
    }
  }

  // --- Strict Store Owner Verification ---
  function isStoreOwner() {
    if (!state.user) return false;
    const isOwnerId = String(state.user.id) === String(CONFIG.adminChatId);
    const isOwnerUsername = state.user.username && state.user.username.toLowerCase() === String(CONFIG.adminUsername).toLowerCase();
    return Boolean(isOwnerId || isOwnerUsername);
  }

  function updateAdminVisibility() {
    const adminBtn = document.getElementById('header-admin-btn');
    if (!adminBtn) return;

    if (isStoreOwner()) {
      adminBtn.style.display = 'flex';
      adminBtn.title = "👑 គ្រប់គ្រងតម្លៃ & ស្តុក (ម្ចាស់ហាង @Svbook168)";
      adminBtn.style.border = "1.5px solid var(--tg-theme-button-color)";
    } else {
      adminBtn.style.display = 'none'; // Completely hidden for regular customers!
    }
  }

  // --- Navigation & Back Handlers ---
  function handleBackNavigation() {
    triggerHaptic('light');
    if (state.activeModal === 'checkout-modal') {
      closeModal('checkout-modal');
      openModal('cart-modal');
    } else if (state.activeModal) {
      closeModal(state.activeModal);
    }
  }

  function handleMainButtonAction() {
    triggerHaptic('medium');
    if (!state.activeModal || state.activeModal === 'product-detail-modal') {
      openModal('cart-modal');
    } else if (state.activeModal === 'cart-modal') {
      if (state.cart.length === 0) return;
      closeModal('cart-modal');
      openModal('checkout-modal');
    } else if (state.activeModal === 'checkout-modal') {
      processOrderSubmission();
    }
  }

  // --- Update Native Telegram MainButton & Floating UI ---
  function updateMainButtonUI() {
    const calc = getCartCalculations();
    const hasItems = calc.totalItems > 0;

    // Update Header Badge
    const cartCounterEl = document.getElementById('cart-counter');
    if (cartCounterEl) {
      if (hasItems) {
        cartCounterEl.textContent = calc.totalItems;
        cartCounterEl.classList.add('has-items');
      } else {
        cartCounterEl.classList.remove('has-items');
      }
    }

    // Floating bar elements (used in desktop preview or regular browsers)
    const floatingBar = document.getElementById('floating-bottom-bar');
    const floatingItemsCount = document.getElementById('floating-items-count');
    const floatingTotalPrice = document.getElementById('floating-total-price');

    if (floatingItemsCount) floatingItemsCount.textContent = `${calc.totalItems} ${calc.totalItems === 1 ? 'item' : 'items'}`;
    if (floatingTotalPrice) floatingTotalPrice.textContent = formatPrice(calc.total);

    // Setup Telegram MainButton
    if (tg && tg.MainButton) {
      if (state.activeModal === 'checkout-modal') {
        tg.MainButton.setText(`CONFIRM ORDER • ${formatPrice(calc.total)}`);
        tg.MainButton.show();
        tg.MainButton.enable();
        if (floatingBar) floatingBar.style.display = 'none';
      } else if (state.activeModal === 'cart-modal') {
        if (hasItems) {
          tg.MainButton.setText(`CHECKOUT • ${formatPrice(calc.total)}`);
          tg.MainButton.show();
          tg.MainButton.enable();
        } else {
          tg.MainButton.hide();
        }
        if (floatingBar) floatingBar.style.display = 'none';
      } else if (state.activeModal === 'product-detail-modal') {
        // In detail view, MainButton can either view cart or add
        if (hasItems) {
          tg.MainButton.setText(`VIEW CART (${calc.totalItems}) • ${formatPrice(calc.total)}`);
          tg.MainButton.show();
          tg.MainButton.enable();
        } else {
          tg.MainButton.hide();
        }
        if (floatingBar) floatingBar.style.display = hasItems ? 'flex' : 'none';
      } else {
        // Main Catalog View
        if (hasItems) {
          tg.MainButton.setText(`VIEW CART (${calc.totalItems}) • ${formatPrice(calc.total)}`);
          tg.MainButton.show();
          tg.MainButton.enable();
          if (floatingBar) floatingBar.style.display = 'flex';
        } else {
          tg.MainButton.hide();
          if (floatingBar) floatingBar.style.display = 'none';
        }
      }
    } else {
      // Browser fallback without Telegram
      if (floatingBar) {
        floatingBar.style.display = hasItems && state.activeModal !== 'checkout-modal' ? 'flex' : 'none';
      }
    }

    // Setup Telegram BackButton
    if (tg && tg.BackButton) {
      if (state.activeModal) {
        tg.BackButton.show();
      } else {
        tg.BackButton.hide();
      }
    }
  }

  // --- Render Categories ---
  function renderCategories() {
    const container = document.getElementById('category-scroll');
    if (!container) return;

    container.innerHTML = CATEGORIES.map(cat => `
      <button class="category-pill ${cat.id === state.currentCategory ? 'active' : ''}" data-category="${cat.id}">
        <span>${cat.icon}</span>
        <span>${cat.nameKh || cat.name}</span>
      </button>
    `).join('');

    container.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        triggerHaptic('selection');
        state.currentCategory = btn.dataset.category;
        renderCategories();
        renderProducts();
      });
    });
  }

  // --- Render Products Grid ---
  function renderProducts() {
    const container = document.getElementById('products-grid');
    const countEl = document.getElementById('section-count');
    if (!container) return;

    let filtered = state.products;

    // Filter by Category
    if (state.currentCategory !== 'all') {
      filtered = filtered.filter(p => p.category === state.currentCategory);
    }

    // Filter by Search Query
    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.details && p.details.format && p.details.format.toLowerCase().includes(q))
      );
    }

    if (countEl) {
      countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'item' : 'items'}`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No books found</h3>
          <p>Try searching with another keyword or explore other categories.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(prod => {
      const cartItem = state.cart.find(c => c.productId === prod.id);
      const inCartQty = cartItem ? cartItem.qty : 0;

      const isOutOfStock = typeof prod.stock === 'number' && prod.stock <= 0;

      let badgeHtml = '';
      if (isOutOfStock) {
        badgeHtml = `<span class="card-badge" style="background:#7f8c8d; color:#fff;">អស់ស្តុក</span>`;
      } else if (prod.badgeKh || prod.badge) {
        badgeHtml = `<span class="card-badge ${prod.badgeType || 'featured'}">${prod.badgeKh || prod.badge}</span>`;
      }

      const originalPriceHtml = prod.originalPrice
        ? `<span class="card-original-price">${formatPrice(prod.originalPrice)}</span>`
        : '';

      let actionBtnHtml = '';
      if (isOutOfStock) {
        actionBtnHtml = `
          <button class="add-cart-btn" disabled style="opacity: 0.55; background: #7f8c8d; cursor: not-allowed;" onclick="event.stopPropagation()">
            អស់ស្តុក
          </button>
        `;
      } else if (inCartQty > 0) {
        actionBtnHtml = `
          <div class="qty-badge-control" onclick="event.stopPropagation()">
            <button class="qty-badge-btn" data-action="decrease" data-id="${prod.id}">−</button>
            <span class="qty-badge-num">${inCartQty}</span>
            <button class="qty-badge-btn" data-action="increase" data-id="${prod.id}">+</button>
          </div>
        `;
      } else {
        actionBtnHtml = `
          <button class="add-cart-btn" data-action="add" data-id="${prod.id}" onclick="event.stopPropagation()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            ទិញ
          </button>
        `;
      }

      const displayTitle = prod.titleKh || prod.title;

      return `
        <div class="product-card" data-id="${prod.id}">
          ${badgeHtml}
          <div class="card-image-wrap">
            <img class="card-img" src="${prod.image}" alt="${displayTitle}" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\\'fallback-cover\\\' style=\\\'background-color:${prod.coverColor || '#34495e'}\\\'><div class=\\\'fallback-title\\\'>${displayTitle}</div><div class=\\\'fallback-author\\\'>${prod.author}</div></div>';">
          </div>
          <div class="card-body">
            <h3 class="card-title">${displayTitle}</h3>
            <div class="card-author">${prod.author}</div>
            <div class="card-rating">
              <span class="star-icon">★</span>
              <span>${prod.rating}</span>
              <span>(${prod.reviewsCount})</span>
            </div>
            <div class="card-footer">
              <div class="price-box">
                <span class="card-price">${formatPrice(prod.price)}</span>
                ${originalPriceHtml}
              </div>
              ${actionBtnHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers for details modal
    container.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        openProductDetailModal(id);
      });
    });

    // Attach quantity action buttons
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'add' || action === 'increase') {
          addToCart(id, 1);
        } else if (action === 'decrease') {
          updateCartQuantity(id, -1);
        }
      });
    });
  }

  // --- Product Detail Modal ---
  function openProductDetailModal(id) {
    const prod = getProductById(id);
    if (!prod) return;

    triggerHaptic('selection');
    const container = document.getElementById('detail-modal-body');
    if (!container) return;

    const cartItem = state.cart.find(c => c.productId === prod.id);
    let currentQty = cartItem ? cartItem.qty : 1;

    container.innerHTML = `
      <div class="detail-cover-box" style="background-color: ${prod.coverColor || '#34495e'}">
        <img src="${prod.image}" alt="${prod.title}" onerror="this.style.display='none'">
      </div>
      <h2 class="detail-title">${prod.titleKh || prod.title}</h2>
      <div class="detail-author">អ្នកនិពន្ធ (Author): ${prod.author}</div>

      <div class="detail-specs-grid">
        <div class="spec-card">
          <div class="spec-label">ទម្រង់ (Format)</div>
          <div class="spec-val">${prod.details?.format || 'Paperback'}</div>
        </div>
        <div class="spec-card">
          <div class="spec-label">ទំព័រ (Pages)</div>
          <div class="spec-val">${prod.details?.pages || '320'}</div>
        </div>
        <div class="spec-card">
          <div class="spec-label">ការវាយតម្លៃ (Rating)</div>
          <div class="spec-val">★ ${prod.rating}</div>
        </div>
      </div>

      <div class="detail-desc-title">សេចក្តីសង្ខេប (Synopsis)</div>
      <p class="detail-desc">${prod.descriptionKh || prod.description}</p>

      <div class="spec-card" style="text-align: left; margin-bottom: 16px;">
        <div style="font-size: 11px; color: var(--tg-theme-hint-color);">បោះពុម្ព (Publisher): <b>${prod.details?.publisher || 'Official Press'}</b></div>
        <div style="font-size: 11px; color: var(--tg-theme-hint-color); margin-top: 2px;">ភាសា (Language): <b>${prod.details?.language || 'Khmer / English'}</b></div>
        <div style="font-size: 11px; color: var(--tg-theme-hint-color); margin-top: 2px;">ISBN: <b>${prod.details?.isbn || 'SV-001'}</b></div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
        <div>
          <div style="font-size: 12px; color: var(--tg-theme-hint-color);">តម្លៃសរុប (Price)</div>
          <div id="modal-calc-price" style="font-size: 20px; font-weight: 700; color: var(--tg-theme-text-color);">
            ${formatPrice(prod.price * currentQty)}
          </div>
        </div>
        <div class="cart-qty-ctrl">
          <button class="cart-qty-btn" id="modal-qty-minus">−</button>
          <span class="cart-qty-val" id="modal-qty-val">${currentQty}</span>
          <button class="cart-qty-btn" id="modal-qty-plus">+</button>
        </div>
      </div>
    `;

    const minusBtn = document.getElementById('modal-qty-minus');
    const plusBtn = document.getElementById('modal-qty-plus');
    const qtyValEl = document.getElementById('modal-qty-val');
    const calcPriceEl = document.getElementById('modal-calc-price');
    const submitBtn = document.getElementById('modal-add-cart-submit');

    if (submitBtn) {
      submitBtn.textContent = cartItem ? 'កែប្រែកន្ត្រក (Update Cart)' : 'ដាក់ចូលកន្ត្រក (Add to Cart)';
      submitBtn.onclick = () => {
        setCartQuantity(prod.id, currentQty);
        triggerHaptic('medium');
        showToast(`Added ${prod.title} to cart!`, '📚');
        closeModal('product-detail-modal');
      };
    }

    if (minusBtn && plusBtn) {
      minusBtn.onclick = () => {
        if (currentQty > 1) {
          currentQty--;
          qtyValEl.textContent = currentQty;
          calcPriceEl.textContent = formatPrice(prod.price * currentQty);
          triggerHaptic('selection');
        }
      };

      plusBtn.onclick = () => {
        if (currentQty < (prod.stock || 99)) {
          currentQty++;
          qtyValEl.textContent = currentQty;
          calcPriceEl.textContent = formatPrice(prod.price * currentQty);
          triggerHaptic('selection');
        }
      };
    }

    openModal('product-detail-modal');
  }

  // --- Cart Operations ---
  function addToCart(productId, delta = 1) {
    const prod = getProductById(productId);
    if (!prod) return;

    const availableStock = typeof prod.stock === 'number' ? prod.stock : 20;

    if (delta > 0 && availableStock <= 0) {
      triggerHaptic('error');
      showToast('សុំអភ័យទោស សៀវភៅនេះអស់ពីស្តុកហើយ!', '⚠️');
      return;
    }

    const existing = state.cart.find(c => c.productId === productId);
    if (existing) {
      if (delta > 0 && existing.qty + delta > availableStock) {
        triggerHaptic('error');
        showToast(`សុំទោស ស្តុកនៅសល់ត្រឹមតែ ${availableStock} ក្បាលប៉ុណ្ណោះ!`, '⚠️');
        return;
      }
      existing.qty += delta;
      if (existing.qty <= 0) {
        state.cart = state.cart.filter(c => c.productId !== productId);
      }
    } else {
      state.cart.push({ productId, qty: Math.max(1, delta) });
    }

    saveCart();
    triggerHaptic('light');
    renderProducts();
    updateMainButtonUI();
    renderCartModal();
  }

  function updateCartQuantity(productId, delta) {
    addToCart(productId, delta);
  }

  function setCartQuantity(productId, qty) {
    if (qty <= 0) {
      state.cart = state.cart.filter(c => c.productId !== productId);
    } else {
      const existing = state.cart.find(c => c.productId === productId);
      if (existing) {
        existing.qty = qty;
      } else {
        state.cart.push({ productId, qty });
      }
    }

    saveCart();
    renderProducts();
    updateMainButtonUI();
    renderCartModal();
  }

  function removeFromCart(productId) {
    state.cart = state.cart.filter(c => c.productId !== productId);
    saveCart();
    triggerHaptic('medium');
    renderProducts();
    updateMainButtonUI();
    renderCartModal();
  }

  function clearCart() {
    state.cart = [];
    state.appliedCoupon = null;
    saveCart();
    triggerHaptic('heavy');
    renderProducts();
    updateMainButtonUI();
    renderCartModal();
  }

  // --- Render Cart Modal ---
  function renderCartModal() {
    const listContainer = document.getElementById('cart-items-list');
    const emptyContainer = document.getElementById('cart-empty-state');
    const contentArea = document.getElementById('cart-active-content');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    if (!listContainer) return;

    const calc = getCartCalculations();

    if (state.cart.length === 0) {
      if (emptyContainer) emptyContainer.style.display = 'block';
      if (contentArea) contentArea.style.display = 'none';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    if (emptyContainer) emptyContainer.style.display = 'none';
    if (contentArea) contentArea.style.display = 'block';
    if (checkoutBtn) checkoutBtn.disabled = false;

    // Render Items
    listContainer.innerHTML = state.cart.map(item => {
      const prod = getProductById(item.productId);
      if (!prod) return '';

      return `
        <div class="cart-item">
          <img class="cart-item-img" src="${prod.image}" alt="${prod.title}" onerror="this.style.background='${prod.coverColor || '#ccc'}'">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${prod.title}</h4>
            <div class="cart-item-price">${formatPrice(prod.price * item.qty)}</div>
          </div>
          <div class="cart-item-actions">
            <div class="cart-qty-ctrl">
              <button class="cart-qty-btn" data-action="cart-minus" data-id="${prod.id}">−</button>
              <span class="cart-qty-val">${item.qty}</span>
              <button class="cart-qty-btn" data-action="cart-plus" data-id="${prod.id}">+</button>
            </div>
            <button class="cart-remove-btn" data-action="cart-remove" data-id="${prod.id}" title="Remove item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners
    listContainer.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const act = btn.dataset.action;
        if (act === 'cart-plus') updateCartQuantity(id, 1);
        if (act === 'cart-minus') updateCartQuantity(id, -1);
        if (act === 'cart-remove') removeFromCart(id);
      };
    });

    // Summary calculations
    const subtotalEl = document.getElementById('cart-subtotal');
    const shippingEl = document.getElementById('cart-shipping');
    const discountRow = document.getElementById('cart-discount-row');
    const discountEl = document.getElementById('cart-discount');
    const totalEl = document.getElementById('cart-total');

    if (subtotalEl) subtotalEl.textContent = formatPrice(calc.subtotal);
    if (shippingEl) shippingEl.textContent = calc.shipping === 0 ? 'FREE' : formatPrice(calc.shipping);

    if (discountRow && discountEl) {
      if (calc.discount > 0) {
        discountRow.style.display = 'flex';
        discountEl.textContent = `-${formatPrice(calc.discount)}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (totalEl) totalEl.textContent = formatPrice(calc.total);

    if (checkoutBtn) {
      checkoutBtn.textContent = `Proceed to Checkout • ${formatPrice(calc.total)}`;
    }
  }

  // --- Coupon Logic ---
  function applyCouponCode() {
    const input = document.getElementById('coupon-input');
    if (!input) return;

    const code = input.value.trim().toUpperCase();
    if (!code) return;

    if (CONFIG.coupons && CONFIG.coupons[code]) {
      state.appliedCoupon = { code, ...CONFIG.coupons[code] };
      triggerHaptic('success');
      showToast(`Coupon applied: ${state.appliedCoupon.description}`, '🎟️');
      renderCartModal();
      updateMainButtonUI();
    } else {
      triggerHaptic('error');
      showToast('Invalid coupon code. Try WELCOME10 or BOOKWORM', '⚠️');
    }
  }

  // --- Checkout Modal Setup ---
  function prepareCheckoutModal() {
    const calc = getCartCalculations();

    // Fill customer info from Telegram User if available
    const nameInput = document.getElementById('checkout-name');
    const usernameInput = document.getElementById('checkout-telegram-handle');

    if (state.user) {
      if (nameInput && !nameInput.value) {
        nameInput.value = `${state.user.first_name || ''} ${state.user.last_name || ''}`.trim();
      }
      if (usernameInput) {
        usernameInput.value = state.user.username ? `@${state.user.username}` : `ID: ${state.user.id}`;
      }
    }

    // Update payment method list
    const paymentMethodsContainer = document.getElementById('payment-methods-list');
    if (paymentMethodsContainer) {
      paymentMethodsContainer.innerHTML = CONFIG.paymentMethods.map(pm => `
        <label class="payment-option ${pm.id === state.selectedPaymentMethod ? 'selected' : ''}" data-method="${pm.id}">
          <input type="radio" name="paymentMethod" value="${pm.id}" class="payment-radio" ${pm.id === state.selectedPaymentMethod ? 'checked' : ''}>
          <span class="payment-icon">${pm.icon}</span>
          <div class="payment-text">
            <h4>${pm.name}</h4>
            <p>${pm.description}</p>
          </div>
        </label>
      `).join('');

      paymentMethodsContainer.querySelectorAll('.payment-option').forEach(el => {
        el.addEventListener('click', () => {
          const method = el.dataset.method;
          state.selectedPaymentMethod = method;
          paymentMethodsContainer.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
          el.classList.add('selected');

          const bankBox = document.getElementById('bank-transfer-details');
          if (bankBox) {
            bankBox.classList.toggle('visible', method === 'bank_qr');
          }
          triggerHaptic('selection');
        });
      });
    }

    // Fill Bank info
    const bankDetailsEl = document.getElementById('bank-transfer-details');
    if (bankDetailsEl && CONFIG.bankInfo) {
      bankDetailsEl.innerHTML = `
        <h4>${CONFIG.bankInfo.bankName}</h4>
        <div class="bank-row"><span>Account Name:</span><b>${CONFIG.bankInfo.accountName}</b></div>
        <div class="bank-row"><span>Account Number:</span><b>${CONFIG.bankInfo.accountNumber}</b></div>
        <p style="font-size: 11px; color: var(--tg-theme-hint-color); margin-top: 6px;">Please upload or share your payment slip via Telegram chat after placing the order.</p>
      `;
    }

    // Update order summary inside checkout
    const checkoutTotalEl = document.getElementById('checkout-summary-total');
    if (checkoutTotalEl) {
      checkoutTotalEl.textContent = formatPrice(calc.total);
    }
  }

  // --- Order Processing & Direct Telegram Bot API Delivery ---
  async function processOrderSubmission() {
    const nameInput = document.getElementById('checkout-name');
    const phoneInput = document.getElementById('checkout-phone');
    const addressInput = document.getElementById('checkout-address');
    const noteInput = document.getElementById('checkout-note');

    const customerName = nameInput ? nameInput.value.trim() : '';
    const customerPhone = phoneInput ? phoneInput.value.trim() : '';
    const customerAddress = addressInput ? addressInput.value.trim() : '';
    const customerNote = noteInput ? noteInput.value.trim() : '';

    if (!customerName) {
      triggerHaptic('error');
      showToast('Please enter your full name', '⚠️');
      if (nameInput) nameInput.focus();
      return;
    }

    if (!customerPhone) {
      triggerHaptic('error');
      showToast('Please enter your phone number', '⚠️');
      if (phoneInput) phoneInput.focus();
      return;
    }

    if (!customerAddress) {
      triggerHaptic('error');
      showToast('Please enter your delivery address', '⚠️');
      if (addressInput) addressInput.focus();
      return;
    }

    const calc = getCartCalculations();
    const orderId = `SV-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderDate = new Date().toLocaleString();

    // Prepare Order Payload
    const orderItemsSummary = state.cart.map(item => {
      const prod = getProductById(item.productId);
      return {
        title: prod ? prod.title : 'Item',
        qty: item.qty,
        unitPrice: prod ? prod.price : 0,
        subtotal: prod ? prod.price * item.qty : 0
      };
    });

    const paymentMethodObj = CONFIG.paymentMethods.find(p => p.id === state.selectedPaymentMethod);
    const paymentMethodName = paymentMethodObj ? paymentMethodObj.name : state.selectedPaymentMethod;

    const orderData = {
      orderId,
      date: orderDate,
      customer: {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        note: customerNote,
        telegramId: state.user ? state.user.id : null,
        telegramUsername: state.user ? state.user.username : null
      },
      items: orderItemsSummary,
      pricing: calc,
      paymentMethod: paymentMethodName
    };

    // Show Progress on MainButton
    if (tg && tg.MainButton) {
      tg.MainButton.showProgress();
      tg.MainButton.disable();
    }

    const confirmBtn = document.getElementById('checkout-confirm-btn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Submitting order...';
    }

    const totalKHR = Math.round(calc.total * (CONFIG.exchangeRateKHR || 4100)).toLocaleString();

    // 1. Format Telegram Receipt Message (HTML)
    let receiptMessage = `📖 <b>ការកុម្ម៉ង់សៀវភៅថ្មី (NEW ORDER)</b>\n`;
    receiptMessage += `🔖 <b>លេខកូដ (Order ID):</b> #${orderId}\n`;
    receiptMessage += `📅 <b>កាលបរិច្ឆេទ:</b> ${orderDate}\n\n`;
    receiptMessage += `👤 <b>អតិថិជន (Customer):</b> ${customerName}\n`;
    receiptMessage += `📞 <b>លេខទូរស័ព្ទ (Phone):</b> ${customerPhone}\n`;
    if (state.user && state.user.username) receiptMessage += `✈️ <b>Telegram:</b> @${state.user.username}\n`;
    receiptMessage += `📍 <b>អាសយដ្ឋាន (Address):</b> ${customerAddress}\n`;
    if (customerNote) receiptMessage += `📝 <b>សម្គាល់ (Note):</b> ${customerNote}\n`;
    receiptMessage += `💳 <b>ការទូទាត់ (Payment):</b> ${paymentMethodName}\n\n`;
    receiptMessage += `🛒 <b>សៀវភៅដែលបានកុម្ម៉ង់ (Books Ordered):</b>\n`;

    orderItemsSummary.forEach(item => {
      receiptMessage += `• ${item.title} × ${item.qty} — ${formatPrice(item.subtotal)}\n`;
    });

    receiptMessage += `\n📦 <b>សរុបរង (Subtotal):</b> ${formatPrice(calc.subtotal)}\n`;
    if (calc.discount > 0) receiptMessage += `🎟️ <b>បញ្ចុះតម្លៃ (Discount):</b> -${formatPrice(calc.discount)}\n`;
    receiptMessage += `🚚 <b>សេវាដឹក (Delivery):</b> ${calc.shipping === 0 ? 'FREE' : formatPrice(calc.shipping)}\n`;
    receiptMessage += `💰 <b>ទឹកប្រាក់សរុប (TOTAL): ${formatPrice(calc.total)} (${totalKHR} ៛)</b>\n\n`;
    receiptMessage += `🙏 សូមអរគុណសម្រាប់ការគាំទ្រ <b>${CONFIG.storeName}</b>!`;

    // 2. Client-Side Telegram Bot API Deliveries (NO BACKEND REQUIRED)
    try {
      // Send directly to Customer's Chat if Telegram user ID is known
      if (state.user && state.user.id && CONFIG.botToken) {
        await sendTelegramMessage(CONFIG.botToken, state.user.id, receiptMessage);
      }

      // Send to Admin Chat if configured
      if (CONFIG.adminChatId && CONFIG.botToken) {
        const adminAlert = `🚨 <b>NEW STORE ORDER</b>\n\n${receiptMessage}`;
        await sendTelegramMessage(CONFIG.botToken, CONFIG.adminChatId, adminAlert);
      }

      // Also call Telegram WebApp native sendData if launched via keyboard
      if (tg && tg.sendData) {
        try {
          tg.sendData(JSON.stringify(orderData));
        } catch (e) {
          console.log('sendData not applicable in this context');
        }
      }
    } catch (err) {
      console.warn('Bot API delivery notice:', err);
    }

    // 3. Deduct stock for ordered items
    state.cart.forEach(item => {
      const prod = getProductById(item.productId);
      if (prod && typeof prod.stock === 'number') {
        prod.stock = Math.max(0, prod.stock - item.qty);
      }
    });
    saveStoredProducts(state.products);

    // 4. Save order history in localStorage
    saveOrderToHistory(orderData);

    // 5. Clear current cart
    clearCart();

    // 5. Hide Telegram MainButton & Haptic Success
    if (tg && tg.MainButton) {
      tg.MainButton.hideProgress();
      tg.MainButton.hide();
    }
    triggerHaptic('success');

    // 6. Show Success Modal
    closeModal('checkout-modal');
    renderSuccessModal(orderData, receiptMessage);
  }

  // --- Send Message via Telegram Bot API (Direct Fetch) ---
  async function sendTelegramMessage(botToken, chatId, textHtml) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: textHtml,
        parse_mode: 'HTML'
      })
    });
    return response.json();
  }

  function saveOrderToHistory(order) {
    try {
      const history = JSON.parse(localStorage.getItem('sv_order_history') || '[]');
      history.unshift(order);
      localStorage.setItem('sv_order_history', JSON.stringify(history.slice(0, 20)));
    } catch (e) {
      console.warn('Could not save order history', e);
    }
  }

  // --- Success Modal Render ---
  function renderSuccessModal(order, receiptText) {
    const body = document.getElementById('success-modal-body');
    if (!body) return;

    body.innerHTML = `
      <div class="success-screen">
        <div class="success-icon-wrap">✓</div>
        <h3>Order Placed Successfully!</h3>
        <p>Your order <b>#${order.orderId}</b> has been received and is being prepared.</p>

        <div class="order-receipt-card">
          <div class="receipt-header">
            <span>SV Bookstore Receipt</span>
            <span>${order.date.split(',')[0]}</span>
          </div>
          <div style="font-size: 13px; margin-bottom: 8px;">
            <div><b>Customer:</b> ${order.customer.name}</div>
            <div><b>Deliver to:</b> ${order.customer.address}</div>
            <div><b>Payment:</b> ${order.paymentMethod}</div>
          </div>
          <div style="border-top: 1px dashed var(--tg-theme-border-color); padding-top: 8px; margin-top: 8px;">
            ${order.items.map(it => `
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                <span>${it.title} × ${it.qty}</span>
                <span>${formatPrice(it.subtotal)}</span>
              </div>
            `).join('')}
          </div>
          <div style="border-top: 1px solid var(--tg-theme-border-color); padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; font-weight: 700; font-size: 14px;">
            <span>Total Paid</span>
            <span>${formatPrice(order.pricing.total)}</span>
          </div>
        </div>

        <button class="btn-primary" id="success-contact-owner-btn" style="margin-bottom: 8px; background: #27ae60;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          ផ្ញើសារទៅកាន់អ្នកលក់ (@${CONFIG.adminUsername || 'Svbook168'})
        </button>

        <button class="btn-secondary" id="success-message-store-btn" style="margin-bottom: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          បើកឆាតជាមួយ Bot (@${CONFIG.botUsername})
        </button>

        <button class="btn-secondary" id="success-continue-shopping-btn">
          ត្រឡប់ទៅកាន់បណ្ណាគារវិញ (Back to Store)
        </button>
      </div>
    `;

    document.getElementById('success-contact-owner-btn').onclick = () => {
      const ownerLink = `https://t.me/${CONFIG.adminUsername || 'Svbook168'}?text=${encodeURIComponent('សួស្តីបង ខ្ញុំបានកុម្ម៉ង់សៀវភៅលេខកូដ #' + order.orderId)}`;
      if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(ownerLink);
      } else {
        window.open(ownerLink, '_blank');
      }
    };

    document.getElementById('success-message-store-btn').onclick = () => {
      const tgLink = `https://t.me/${CONFIG.botUsername}?start=order_${order.orderId}`;
      if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(tgLink);
      } else {
        window.open(tgLink, '_blank');
      }
    };

    document.getElementById('success-continue-shopping-btn').onclick = () => {
      closeModal('success-modal');
    };

    openModal('success-modal');
  }

  // --- Modal Open/Close Controls ---
  function openModal(modalId) {
    const backdrop = document.getElementById('modal-backdrop');
    const sheet = document.getElementById(modalId);
    if (!sheet) return;

    if (backdrop) backdrop.classList.add('open');
    sheet.classList.add('open');
    state.activeModal = modalId;

    if (modalId === 'cart-modal') {
      renderCartModal();
    } else if (modalId === 'checkout-modal') {
      prepareCheckoutModal();
    }

    updateMainButtonUI();
  }

  function closeModal(modalId) {
    const backdrop = document.getElementById('modal-backdrop');
    const sheet = document.getElementById(modalId);
    if (sheet) sheet.classList.remove('open');

    // If no other modals open, remove backdrop
    const anyOpen = document.querySelectorAll('.bottom-sheet.open');
    if (anyOpen.length === 0 && backdrop) {
      backdrop.classList.remove('open');
      state.activeModal = null;
    } else if (anyOpen.length > 0) {
      state.activeModal = anyOpen[anyOpen.length - 1].id;
    }

    updateMainButtonUI();
  }

  function closeAllModals() {
    document.querySelectorAll('.bottom-sheet.open').forEach(sheet => {
      sheet.classList.remove('open');
    });
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
    state.activeModal = null;
    updateMainButtonUI();
  }

  // --- Admin / Settings Panel & Product Manager ---
  function openAdminModal() {
    const body = document.getElementById('admin-modal-body');
    if (!body) return;

    // Strict access control: Only allow owner (@Svbook168 - ID: 6503377762)
    if (!isStoreOwner()) {
      triggerHaptic('error');
      body.innerHTML = `
        <div style="text-align: center; padding: 24px 16px;">
          <div style="font-size: 52px; margin-bottom: 12px;">⛔</div>
          <h3 style="font-size: 18px; font-weight: 700; color: var(--tg-theme-danger-color); margin-bottom: 8px;">
            គ្មានសិទ្ធិចូលប្រើប្រាស់ (Access Denied)
          </h3>
          <p style="font-size: 13px; color: var(--tg-theme-hint-color); line-height: 1.6; margin-bottom: 16px;">
            ផ្ទាំងគ្រប់គ្រងតម្លៃ និងស្តុកនេះ ត្រូវបានកំណត់សម្រាប់តែម្ចាស់ហាងផ្ទាល់៖<br>
            <b style="color: var(--tg-theme-text-color);">បណ្ណាគារសៃវ៉ា លោកគ្រូគ្រី (@${CONFIG.adminUsername || 'Svbook168'})</b><br>
            (Admin Chat ID: <code>${CONFIG.adminChatId}</code>) ប៉ុណ្ណោះ។
          </p>
          <div style="font-size: 12px; color: var(--tg-theme-hint-color); background: var(--tg-theme-bg-color); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 20px; display: inline-block;">
            គណនី Telegram របស់អ្នក: <b>${state.user ? (state.user.username ? '@' + state.user.username : 'ID: ' + state.user.id) : 'ភ្ញៀវទូទៅ'}</b>
          </div>
          <button class="btn-primary" id="denied-back-store-btn">
            ត្រឡប់ទៅកាន់បណ្ណាគារវិញ (Back to Store)
          </button>
        </div>
      `;
      const backBtn = document.getElementById('denied-back-store-btn');
      if (backBtn) backBtn.onclick = () => closeAllModals();
      openModal('admin-modal');
      return;
    }

    // Auto-login for verified Owner (@Svbook168 - ID: 6503377762) so they enter directly
    state.isAdminAuthenticated = true;
    sessionStorage.setItem('sv_admin_auth', 'true');
    renderAdminDashboard(body);
    openModal('admin-modal');
  }

  // Admin Login Screen (Fallback for testing)
  function renderAdminLogin(container) {
    const prefilledUser = (CONFIG.adminAuth && CONFIG.adminAuth.username) ? CONFIG.adminAuth.username : "Svbook168";

    container.innerHTML = `
      <div style="text-align: center; padding: 12px 8px 24px 8px;">
        <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(36, 129, 204, 0.12); color: var(--tg-theme-button-color); display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 12px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          🔐
        </div>
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">ចូលគណនីគ្រប់គ្រង (Admin Login)</h3>
        <p style="font-size: 12px; color: var(--tg-theme-hint-color); max-width: 320px; margin: 0 auto 18px auto; line-height: 1.5;">
          ទំព័រនេះសម្រាប់តែម្ចាស់ហាង (Admin) ប៉ុណ្ណោះ។ សូមបញ្ចូល Username & Password ដើម្បីចូលកែប្រែទំនិញ តម្លៃ និងស្តុក។
        </p>

        <form id="admin-login-form" onsubmit="event.preventDefault()" style="text-align: left; max-width: 320px; margin: 0 auto;">
          <div class="form-group">
            <label class="form-label">ឈ្មោះគណនី (Username)</label>
            <input type="text" id="admin-login-username" class="form-control" placeholder="វាយ Username" value="${prefilledUser}" required>
          </div>
          <div class="form-group">
            <label class="form-label">ពាក្យសម្ងាត់ (Password)</label>
            <input type="password" id="admin-login-password" class="form-control" placeholder="វាយពាក្យសម្ងាត់ (Default: sv168)" required>
          </div>
          <button type="submit" class="btn-primary" id="admin-login-submit-btn" style="margin-top: 14px; height: 44px; font-size: 14px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            ចូលប្រព័ន្ធ (Login)
          </button>
        </form>
      </div>
    `;

    const form = document.getElementById('admin-login-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const userInput = document.getElementById('admin-login-username').value.trim();
        const passInput = document.getElementById('admin-login-password').value.trim();

        const validUser = (CONFIG.adminAuth && CONFIG.adminAuth.username) ? CONFIG.adminAuth.username : "Svbook168";
        const customPass = localStorage.getItem('sv_custom_admin_password');
        const validPass = customPass || (CONFIG.adminAuth && CONFIG.adminAuth.password ? CONFIG.adminAuth.password : "sv168");

        if ((userInput.toLowerCase() === validUser.toLowerCase() || userInput.toLowerCase() === "admin") && passInput === validPass) {
          state.isAdminAuthenticated = true;
          sessionStorage.setItem('sv_admin_auth', 'true');
          triggerHaptic('success');
          showToast('ចូលគណនីគ្រប់គ្រងជោគជ័យ!', '✅');
          renderAdminDashboard(container);
        } else {
          triggerHaptic('error');
          showToast('ឈ្មោះគណនី ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ!', '❌');
          const passEl = document.getElementById('admin-login-password');
          if (passEl) {
            passEl.value = '';
            passEl.focus();
          }
        }
      };
    }
  }

  // Admin Dashboard (Revealed for Store Owner @Svbook168)
  function renderAdminDashboard(container) {
    let activeAdminTab = 'products'; // 'products' or 'settings'

    function renderDashboardContent() {
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--tg-theme-border-color);">
          <div>
            <div style="font-size: 13px; font-weight: 700; color: var(--tg-theme-text-color); display: flex; align-items: center; gap: 6px;">
              <span>👑 ម្ចាស់ហាង:</span>
              <span style="color: var(--tg-theme-button-color);">@${CONFIG.adminUsername || 'Svbook168'}</span>
            </div>
            <div style="font-size: 11px; color: #27ae60; font-weight: 600;">
              ✓ ស្គាល់គណនីស្វ័យប្រវត្តិ (Chat ID: ${CONFIG.adminChatId})
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button id="admin-logout-btn" style="background: none; border: 1px solid var(--tg-theme-border-color); color: #e74c3c; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: var(--radius-sm); cursor: pointer;">
              🔒 ចាកចេញ
            </button>
            <button id="admin-close-modal-btn" style="background: none; border: 1px solid var(--tg-theme-border-color); color: var(--tg-theme-text-color); font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: var(--radius-sm); cursor: pointer;">
              ✕ បិទផ្ទាំង
            </button>
          </div>
        </div>

        <div class="admin-tabs">
          <button class="admin-tab-btn ${activeAdminTab === 'products' ? 'active' : ''}" id="tab-btn-products">
            📦 គ្រប់គ្រងមុខទំនិញ & ស្តុក
          </button>
          <button class="admin-tab-btn ${activeAdminTab === 'settings' ? 'active' : ''}" id="tab-btn-settings">
            ⚙️ ការកំណត់ & សុវត្ថិភាព
          </button>
        </div>

        <div id="admin-tab-content"></div>
      `;

      // Close modal button
      const closeBtn = document.getElementById('admin-close-modal-btn');
      if (closeBtn) {
        closeBtn.onclick = () => {
          closeModal('admin-modal');
        };
      }

      // Logout handler
      const logoutBtn = document.getElementById('admin-logout-btn');
      if (logoutBtn) {
        logoutBtn.onclick = () => {
          state.isAdminAuthenticated = false;
          sessionStorage.removeItem('sv_admin_auth');
          triggerHaptic('light');
          showToast('បានចាកចេញពីគណនីគ្រប់គ្រង!', '👋');
          renderAdminLogin(container);
        };
      }

      // Tab switcher handlers
      const tabProductsBtn = document.getElementById('tab-btn-products');
      if (tabProductsBtn) {
        tabProductsBtn.onclick = () => {
          activeAdminTab = 'products';
          renderDashboardContent();
        };
      }

      const tabSettingsBtn = document.getElementById('tab-btn-settings');
      if (tabSettingsBtn) {
        tabSettingsBtn.onclick = () => {
          activeAdminTab = 'settings';
          renderDashboardContent();
        };
      }

      const tabContent = document.getElementById('admin-tab-content');
      if (tabContent) {
        if (activeAdminTab === 'products') {
          renderProductsManager(tabContent);
        } else {
          renderSettingsManager(tabContent);
        }
      }
    }

    function renderProductsManager(tabContainer) {
      let uploadedPhotoDataUrl = null;
      const cloudCfg = getCloudSyncConfig();

      tabContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div>
            <h4 style="font-size: 14px; font-weight: 700;">បញ្ជីទំនិញ (${state.products.length})</h4>
            <p style="font-size: 11px; color: var(--tg-theme-hint-color);">អ្នកអាចកែសម្រួលតម្លៃ និងចំនួនស្តុកបានភ្លាមៗ</p>
          </div>
          <button class="btn-primary" id="toggle-add-product-btn" style="width: auto; height: 34px; padding: 0 12px; font-size: 12px;">
            + បន្ថែមទំនិញថ្មី
          </button>
        </div>

        <!-- Add Product Form (Hidden by default) -->
        <div class="add-product-form-box" id="add-product-box" style="display: none;">
          <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 10px;">➕ បន្ថែមសៀវភៅ ឬទំនិញថ្មី</h4>
          <form id="add-prod-form" onsubmit="event.preventDefault()">
            <div class="form-group">
              <label class="form-label">ឈ្មោះសៀវភៅ / ទំនិញ (Title) *</label>
              <input type="text" id="new-prod-title" class="form-control" placeholder="ឧ. ទម្លាប់អ្នកមាន (Rich Habits)" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div class="form-group">
                <label class="form-label">អ្នកនិពន្ធ (Author) *</label>
                <input type="text" id="new-prod-author" class="form-control" placeholder="ឧ. Robert Kiyosaki" required>
              </div>
              <div class="form-group">
                <label class="form-label">ប្រភេទ (Category)</label>
                <select id="new-prod-category" class="form-control" style="height: 42px;">
                  ${CATEGORIES.filter(c => c.id !== 'all').map(c => `
                    <option value="${c.id}">${c.nameKh || c.name}</option>
                  `).join('')}
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
              <div class="form-group">
                <label class="form-label">តម្លៃលក់ ($) *</label>
                <input type="number" step="0.01" id="new-prod-price" class="form-control" placeholder="15.00" required>
              </div>
              <div class="form-group">
                <label class="form-label">តម្លៃដើម ($)</label>
                <input type="number" step="0.01" id="new-prod-orig-price" class="form-control" placeholder="20.00">
              </div>
              <div class="form-group">
                <label class="form-label">ចំនួនស្តុក (Stock) *</label>
                <input type="number" id="new-prod-stock" class="form-control" placeholder="25" value="20" required>
              </div>
            </div>

            <!-- Photo Upload & Direct Camera Capture -->
            <div class="form-group photo-input-group">
              <label class="form-label" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span>📸 រូបភាពសៀវភៅ (Photo)</span>
                <span style="font-size: 11px; color: var(--tg-theme-hint-color);">Upload ឬ ថតផ្ទាល់</span>
              </label>

              <div class="photo-action-grid">
                <label class="photo-action-btn-label" for="prod-file-upload">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>📁 ជ្រើសរូប (Gallery)<br><small style="font-weight: normal; opacity: 0.85;">File Upload</small></span>
                  <input type="file" id="prod-file-upload" accept="image/*" style="display: none;">
                </label>

                <label class="photo-action-btn-label" for="prod-camera-capture">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span>📷 ថតរូប (Camera)<br><small style="font-weight: normal; opacity: 0.85;">ថតផ្ទាល់ពីទូរស័ព្ទ</small></span>
                  <input type="file" id="prod-camera-capture" accept="image/*" capture="environment" style="display: none;">
                </label>
              </div>

              <!-- Preview Area -->
              <div id="photo-preview-wrap" class="photo-preview-wrap" style="display: none;">
                <img id="photo-preview-img" class="photo-preview-img" src="" alt="មើលរូបភាព">
                <div class="photo-preview-info">
                  <div class="photo-preview-status">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>រូបភាពរួចរាល់ ✓</span>
                  </div>
                  <div id="photo-preview-size" class="photo-preview-size">~0 KB (បង្រួមរួចរាល់)</div>
                </div>
                <button type="button" id="photo-preview-clear-btn" class="photo-preview-clear">
                  ✕ ដកចេញ
                </button>
              </div>

              <!-- Optional Manual URL input -->
              <div style="margin-top: 6px;">
                <input type="url" id="new-prod-image" class="form-control" placeholder="ឬបញ្ចូលលីងរូបភាព (Image URL ឧ. https://...)">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">សេចក្តីសង្ខេប / ព័ត៌មានលម្អិត</label>
              <textarea id="new-prod-desc" class="form-control" placeholder="រៀបរាប់ខ្លីៗអំពីខ្លឹមសារសៀវភៅ..."></textarea>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button class="btn-primary" id="save-new-prod-submit-btn" style="height: 38px; font-size: 13px;">រក្សាទុក (Save)</button>
              <button type="button" class="btn-secondary" id="cancel-add-prod-btn" style="height: 38px; margin: 0; font-size: 13px;">បោះបង់</button>
            </div>
          </form>
        </div>

        <!-- Batch Update All Action Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(39, 174, 96, 0.08); border: 1px solid rgba(39, 174, 96, 0.25); border-radius: var(--radius-sm); padding: 8px 12px; margin-bottom: 10px;">
          <div style="font-size: 11px; color: var(--tg-theme-text-color); display: flex; align-items: center; gap: 6px;">
            <span>${cloudCfg.apiUrl ? '☁️ <b>Cloud Auto-Sync:</b> សកម្ម' : '⚡ កែតម្លៃ/ស្តុកខាងក្រោម រួចចុច:'}</span>
          </div>
          <button class="btn-primary" id="top-update-all-btn" style="width: auto; height: 32px; padding: 0 14px; font-size: 12px; background: #27ae60; box-shadow: none;">
            💾 Update ទាំងអស់
          </button>
        </div>

        <!-- Product List -->
        <div class="admin-prod-list">
          ${state.products.map(prod => {
            const stock = typeof prod.stock === 'number' ? prod.stock : 20;
            const stockClass = stock <= 0 ? 'out-stock' : (stock < 5 ? 'low-stock' : 'in-stock');
            const stockLabel = stock <= 0 ? 'អស់ស្តុក' : `សល់ ${stock}`;

            return `
              <div class="admin-prod-item" data-id="${prod.id}">
                <img class="admin-prod-thumb" src="${prod.image}" alt="${prod.title}" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=120'">
                <div class="admin-prod-info">
                  <div class="admin-prod-title">${prod.titleKh || prod.title}</div>
                  <div class="admin-prod-meta">
                    <span class="stock-tag ${stockClass}">${stockLabel}</span>
                    <span>${prod.author}</span>
                  </div>
                </div>
                <div class="admin-prod-controls">
                  <div style="display: flex; flex-direction: column; align-items: flex-end;">
                    <span style="font-size: 10px; color: var(--tg-theme-hint-color);">តម្លៃ ($)</span>
                    <input type="number" step="0.5" class="admin-input-small prod-price-input" data-id="${prod.id}" value="${prod.price}">
                  </div>
                  <div style="display: flex; flex-direction: column; align-items: flex-end;">
                    <span style="font-size: 10px; color: var(--tg-theme-hint-color);">ស្តុក</span>
                    <input type="number" min="0" class="admin-input-small prod-stock-input" data-id="${prod.id}" value="${stock}">
                  </div>
                  <button class="admin-action-icon-btn delete prod-del-btn" data-id="${prod.id}" title="លុបទំនិញ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
          <button class="btn-primary" id="bottom-update-all-btn" style="height: 42px; font-size: 13px; background: #27ae60;">
            💾 រក្សាទុក & Update ទាំងអស់ (Save & Update All)
          </button>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button class="btn-secondary" id="export-catalog-btn" style="margin: 0; font-size: 12px;">
              📥 ទាញយក products.js
            </button>
            <button class="btn-secondary" id="copy-catalog-btn" style="margin: 0; font-size: 12px;">
              📋 ចម្លងកូដ (Copy)
            </button>
          </div>
          <button class="btn-secondary" id="reset-catalog-btn" style="margin: 0; font-size: 12px; color: var(--tg-theme-danger-color);">
            🔄 កំណត់ដើមវិញ (Reset Catalog)
          </button>

          <div style="margin-top: 6px; padding: 10px; background: rgba(36, 129, 204, 0.07); border-radius: var(--radius-sm); font-size: 11px; line-height: 1.5; color: var(--tg-theme-hint-color);">
            💡 <b>ចំណាំសម្រាប់ម្ចាស់ហាង:</b> ក្រោយបន្ថែមទំនិញរួច ប្រព័ន្ធនឹង <b>Update All</b> ភ្លាមៗក្នុងទូរស័ព្ទរបស់លោកគ្រូ។ ប្រសិនបើចង់ឱ្យអតិថិជនផ្សេងទៀតមើលឃើញទំនិញថ្មីនេះ សូមចុច <b>"ទាញយក products.js"</b> ឬ <b>"ចម្លងកូដ"</b> យកទៅ Update ជំនួសក្នុងហ្វាយ <code>js/products.js</code> នៅលើ Hosting/GitHub!
          </div>
        </div>
      `;

      // Toggle Add Form
      const toggleBtn = document.getElementById('toggle-add-product-btn');
      const addBox = document.getElementById('add-product-box');
      const cancelBtn = document.getElementById('cancel-add-prod-btn');

      if (toggleBtn && addBox) {
        toggleBtn.onclick = () => {
          const isHidden = addBox.style.display === 'none';
          addBox.style.display = isHidden ? 'block' : 'none';
          toggleBtn.textContent = isHidden ? '✕ បិទ Form' : '+ បន្ថែមទំនិញថ្មី';
        };
      }
      if (cancelBtn && addBox && toggleBtn) {
        cancelBtn.onclick = () => {
          addBox.style.display = 'none';
          toggleBtn.textContent = '+ បន្ថែមទំនិញថ្មី';
        };
      }

      // Image Upload & Camera Capture Listeners
      const fileUploadInput = document.getElementById('prod-file-upload');
      const cameraCaptureInput = document.getElementById('prod-camera-capture');
      const photoPreviewWrap = document.getElementById('photo-preview-wrap');
      const photoPreviewImg = document.getElementById('photo-preview-img');
      const photoPreviewSize = document.getElementById('photo-preview-size');
      const photoClearBtn = document.getElementById('photo-preview-clear-btn');
      const manualUrlInput = document.getElementById('new-prod-image');

      const processSelectedImage = async (file) => {
        if (!file) return;
        try {
          showToast('កំពុងដំណើរការ និងបង្រួមរូបភាព...', '⏳');
          triggerHaptic('medium');
          const result = await compressImageFile(file, 640, 850, 0.75);
          uploadedPhotoDataUrl = result.dataUrl;

          if (photoPreviewImg && photoPreviewWrap && photoPreviewSize) {
            photoPreviewImg.src = uploadedPhotoDataUrl;
            const kb = Math.round(result.compressedSize / 1024);
            photoPreviewSize.textContent = `ទំហំ: ~${kb} KB (${result.width}x${result.height}px) បង្រួមរួចរាល់`;
            photoPreviewWrap.style.display = 'flex';
          }

          if (manualUrlInput) {
            manualUrlInput.placeholder = 'រូបភាពត្រូវបានជ្រើសរើសរួចរាល់ ✓';
          }
          triggerHaptic('success');
          showToast('បានដាក់រូបភាពសៀវភៅរួចរាល់!', '📸');
        } catch (err) {
          console.error('Image compression failed:', err);
          triggerHaptic('error');
          showToast('មិនអាចដំណើរការរូបភាពបានទេ: ' + err.message, '⚠️');
        }
      };

      if (fileUploadInput) {
        fileUploadInput.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) processSelectedImage(file);
        };
      }

      if (cameraCaptureInput) {
        cameraCaptureInput.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) processSelectedImage(file);
        };
      }

      if (photoClearBtn) {
        photoClearBtn.onclick = () => {
          uploadedPhotoDataUrl = null;
          if (photoPreviewImg) photoPreviewImg.src = '';
          if (photoPreviewWrap) photoPreviewWrap.style.display = 'none';
          if (fileUploadInput) fileUploadInput.value = '';
          if (cameraCaptureInput) cameraCaptureInput.value = '';
          if (manualUrlInput) {
            manualUrlInput.placeholder = 'ឬបញ្ចូលលីងរូបភាព (Image URL ឧ. https://...)';
          }
          triggerHaptic('light');
          showToast('បានដករូបភាពចេញវិញ', '🗑️');
        };
      }

      if (manualUrlInput) {
        manualUrlInput.oninput = () => {
          if (manualUrlInput.value.trim() && uploadedPhotoDataUrl) {
            uploadedPhotoDataUrl = null;
            if (photoPreviewWrap) photoPreviewWrap.style.display = 'none';
          }
        };
      }

      // Add New Product Handler
      const saveProdBtn = document.getElementById('save-new-prod-submit-btn');
      if (saveProdBtn) {
        saveProdBtn.onclick = () => {
          const title = document.getElementById('new-prod-title').value.trim();
          const author = document.getElementById('new-prod-author').value.trim();
          const category = document.getElementById('new-prod-category').value;
          const price = parseFloat(document.getElementById('new-prod-price').value);
          const origPrice = parseFloat(document.getElementById('new-prod-orig-price').value) || null;
          const stock = parseInt(document.getElementById('new-prod-stock').value) || 10;
          const manualUrl = document.getElementById('new-prod-image').value.trim();
          const image = uploadedPhotoDataUrl || manualUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600';
          const desc = document.getElementById('new-prod-desc').value.trim() || 'សៀវភៅគុណភាពខ្ពស់ពីបណ្ណាគារ សៃវ៉ា';

          if (!title || !author || isNaN(price)) {
            triggerHaptic('error');
            showToast('សូមបំពេញឈ្មោះ, អ្នកនិពន្ធ, និងតម្លៃលក់!', '⚠️');
            return;
          }

          const newProduct = {
            id: `prod-${Date.now()}`,
            title: title,
            titleKh: title,
            author: author,
            category: category,
            price: price,
            originalPrice: origPrice,
            rating: 5.0,
            reviewsCount: 1,
            badge: "New",
            badgeKh: "ថ្មី",
            badgeType: "new",
            stock: stock,
            coverColor: "#2c3e50",
            image: image,
            description: desc,
            descriptionKh: desc,
            details: {
              format: "Paperback",
              pages: 280,
              language: "Khmer / English",
              publisher: "បណ្ណាគារ សៃវ៉ា",
              isbn: `SV-${Math.floor(1000 + Math.random() * 9000)}`
            }
          };

          state.products.unshift(newProduct);
          saveStoredProducts(state.products);
          
          // Auto Update All views across the entire store
          state.currentCategory = 'all';
          state.searchQuery = '';
          const searchInput = document.getElementById('search-input');
          if (searchInput) searchInput.value = '';
          renderCategories();
          renderProducts();
          updateMainButtonUI();
          triggerHaptic('success');
          showToast(`បានបន្ថែម "${title}" និង Update ទាំងអស់រួចរាល់!`, '✅');
          renderDashboardContent();

          // Auto Sync to Cloud if configured (Realtime update for all customer devices)
          const cloudConfig = getCloudSyncConfig();
          if (cloudConfig.enabled && cloudConfig.autoSyncOnSave) {
            syncProductsToCloud(state.products, true);
          }
        };
      }

      // Batch Save & Update All Functionality
      const handleUpdateAll = () => {
        let changedCount = 0;
        tabContainer.querySelectorAll('.prod-price-input').forEach(input => {
          const id = input.dataset.id;
          const newPrice = parseFloat(input.value);
          const prod = getProductById(id);
          if (prod && !isNaN(newPrice) && newPrice >= 0) {
            if (prod.price !== newPrice) {
              prod.price = newPrice;
              changedCount++;
            }
          }
        });

        tabContainer.querySelectorAll('.prod-stock-input').forEach(input => {
          const id = input.dataset.id;
          const newStock = parseInt(input.value);
          const prod = getProductById(id);
          if (prod && !isNaN(newStock) && newStock >= 0) {
            if (prod.stock !== newStock) {
              prod.stock = newStock;
              changedCount++;
            }
          }
        });

        saveStoredProducts(state.products);
        state.currentCategory = 'all';
        state.searchQuery = '';
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        renderCategories();
        renderProducts();
        updateMainButtonUI();
        triggerHaptic('success');
        showToast(`បាន Update ទំនិញទាំងអស់ជោគជ័យ! (${state.products.length} មុខ)`, '✅');
        renderDashboardContent();

        // Auto Sync to Cloud if configured
        const cloudConfig = getCloudSyncConfig();
        if (cloudConfig.enabled && cloudConfig.autoSyncOnSave) {
          syncProductsToCloud(state.products, true);
        }
      };

      const topUpdateBtn = document.getElementById('top-update-all-btn');
      if (topUpdateBtn) topUpdateBtn.onclick = handleUpdateAll;

      const bottomUpdateBtn = document.getElementById('bottom-update-all-btn');
      if (bottomUpdateBtn) bottomUpdateBtn.onclick = handleUpdateAll;

      // Quick Price Change
      tabContainer.querySelectorAll('.prod-price-input').forEach(input => {
        input.addEventListener('change', (e) => {
          const id = e.target.dataset.id;
          const newPrice = parseFloat(e.target.value);
          if (!isNaN(newPrice) && newPrice >= 0) {
            const prod = getProductById(id);
            if (prod) {
              prod.price = newPrice;
              saveStoredProducts(state.products);
              renderProducts();
              triggerHaptic('light');
              showToast(`កែសម្រួលតម្លៃ ${prod.titleKh || prod.title} -> $${newPrice.toFixed(2)}`, '💵');
            }
          }
        });
      });

      // Quick Stock Change
      tabContainer.querySelectorAll('.prod-stock-input').forEach(input => {
        input.addEventListener('change', (e) => {
          const id = e.target.dataset.id;
          const newStock = parseInt(e.target.value);
          if (!isNaN(newStock) && newStock >= 0) {
            const prod = getProductById(id);
            if (prod) {
              prod.stock = newStock;
              saveStoredProducts(state.products);
              renderProducts();
              triggerHaptic('light');
              showToast(`កែសម្រួលស្តុក ${prod.titleKh || prod.title} -> ${newStock} ក្បាល`, '📦');
              renderDashboardContent();
            }
          }
        });
      });

      // Delete Product
      tabContainer.querySelectorAll('.prod-del-btn').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          const prod = getProductById(id);
          if (confirm(`តើអ្នកពិតជាចង់លុប "${prod ? (prod.titleKh || prod.title) : 'ទំនិញ'}" មែនទេ?`)) {
            state.products = state.products.filter(p => p.id !== id);
            saveStoredProducts(state.products);
            renderProducts();
            triggerHaptic('heavy');
            showToast('បានលុបទំនិញជោគជ័យ!', '🗑️');
            renderDashboardContent();
          }
        };
      });

      // Export Catalog to File
      const exportBtn = document.getElementById('export-catalog-btn');
      if (exportBtn) {
        exportBtn.onclick = () => {
          const dataStr = "data:text/javascript;charset=utf-8," + encodeURIComponent("const PRODUCTS = " + JSON.stringify(state.products, null, 2) + ";\n");
          const dl = document.createElement('a');
          dl.setAttribute("href", dataStr);
          dl.setAttribute("download", "products.js");
          dl.click();
          triggerHaptic('success');
          showToast('បានទាញយកហ្វាយ products.js ជោគជ័យ!', '💾');
        };
      }

      // Copy Catalog Code
      const copyBtn = document.getElementById('copy-catalog-btn');
      if (copyBtn) {
        copyBtn.onclick = () => {
          const code = "const PRODUCTS = " + JSON.stringify(state.products, null, 2) + ";\n";
          const doCopySuccess = () => {
            triggerHaptic('success');
            showToast('បានចម្លងកូដ products.js ជោគជ័យ!', '📋');
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(doCopySuccess).catch(() => {
              fallbackCopyText(code, doCopySuccess);
            });
          } else {
            fallbackCopyText(code, doCopySuccess);
          }
        };
      }

      function fallbackCopyText(text, cb) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          if (cb) cb();
        } catch (e) {
          showToast('មិនអាចចម្លងកូដបានទេ សូមប្រើប៊ូតុង "ទាញយក"', '⚠️');
        }
        document.body.removeChild(ta);
      }

      // Reset Catalog
      const resetBtn = document.getElementById('reset-catalog-btn');
      if (resetBtn) {
        resetBtn.onclick = () => {
          if (confirm('កំណត់បញ្ជីសៀវភៅទាំងអស់ទៅជាទម្រង់ដើមវិញ?')) {
            localStorage.removeItem('sv_custom_products');
            state.products = [...PRODUCTS];
            state.currentCategory = 'all';
            state.searchQuery = '';
            renderCategories();
            renderProducts();
            updateMainButtonUI();
            triggerHaptic('success');
            showToast('បានកំណត់បញ្ជីទំនិញដើមឡើងវិញ!', '📚');
            renderDashboardContent();
          }
        };
      }
    }

    function renderSettingsManager(tabContainer) {
      const customPass = localStorage.getItem('sv_custom_admin_password') || (CONFIG.adminAuth && CONFIG.adminAuth.password ? CONFIG.adminAuth.password : "sv168");

      tabContainer.innerHTML = `
        <div class="admin-card">
          <h4>🤖 ការតភ្ជាប់ Telegram Bot</h4>
          <div style="font-size: 12px; color: var(--tg-theme-hint-color); margin-bottom: 6px;">
            Connected Bot: <b>@${CONFIG.botUsername}</b>
          </div>
          <div class="form-group">
            <label class="form-label">Admin Telegram Chat ID</label>
            <input type="text" id="admin-chat-id-input" class="form-control" placeholder="e.g. 6503377762" value="${CONFIG.adminChatId || ''}">
            <p style="font-size: 11px; color: var(--tg-theme-hint-color); margin-top: 4px;">
              រាល់ការកុម្ម៉ង់ទាំងអស់នឹងត្រូវបានផ្ញើដោយស្វ័យប្រវត្តទៅកាន់ Chat ID នេះ។
            </p>
          </div>
          <button class="btn-primary" id="save-admin-settings-btn" style="height: 38px; font-size: 13px;">
            រក្សាទុក Chat ID
          </button>
        </div>

        <div class="admin-card">
          <h4>🔐 សុវត្ថិភាព & ពាក្យសម្ងាត់ (Admin Password)</h4>
          <div class="form-group">
            <label class="form-label">ពាក្យសម្ងាត់ថ្មី (New Password)</label>
            <input type="password" id="new-admin-password-input" class="form-control" placeholder="វាយពាក្យសម្ងាត់ថ្មី">
            <p style="font-size: 11px; color: var(--tg-theme-hint-color); margin-top: 4px;">
              ពាក្យសម្ងាត់បច្ចុប្បន្ន: <b>${customPass}</b>
            </p>
          </div>
          <button class="btn-primary" id="save-new-password-btn" style="height: 38px; font-size: 13px;">
            ប្តូរពាក្យសម្ងាត់ថ្មី
          </button>
        </div>

        <div class="admin-card">
          <h4>☁️ Cloud Database Sync (Auto-Sync គ្រប់ទូរស័ព្ទទាំងអស់)</h4>
          <p style="font-size: 11px; color: var(--tg-theme-hint-color); margin-bottom: 10px; line-height: 1.5;">
            មុខងារនេះអនុញ្ញាតឱ្យរាល់ពេលលោកគ្រូបន្ថែម ឬកែប្រែទំនិញលើទូរស័ព្ទ វានឹង Auto-Sync ទៅកាន់ Cloud ដោយស្វ័យប្រវត្តិ ធ្វើឱ្យអតិថិជនទាំងអស់ឃើញទំនិញថ្មីភ្លាមៗ ដោយមិនបាច់ Deploy ម្តងទៀតឡើយ!
          </p>

          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 12px;">
            <span>ស្ថានភាព Cloud:</span>
            <span id="cloud-sync-status-badge" style="font-weight: 700; color: ${getCloudSyncConfig().apiUrl ? '#27ae60' : '#e67e22'};">
              ${getCloudSyncConfig().apiUrl ? '🟢 កំពុងដំណើរការ (Active)' : '⚪ Offline / LocalStorage'}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">Cloud Database URL (Firebase RTDB ឬ JSONBin)</label>
            <input type="url" id="cloud-api-url-input" class="form-control" placeholder="https://<project>-default-rtdb.firebaseio.com/products.json" value="${getCloudSyncConfig().apiUrl || ''}">
            <p style="font-size: 10px; color: var(--tg-theme-hint-color); margin-top: 3px;">
              អាចប្រើ Firebase Realtime Database (ឥតគិតថ្លៃ ១០០%) ឬ JSONBin.io URL
            </p>
          </div>

          <div class="form-group">
            <label class="form-label">API Key / Auth Token (ប្រសិនបើមាន)</label>
            <input type="password" id="cloud-api-key-input" class="form-control" placeholder="Secret Key / Auth Token (ទុកទទេបើជា Public Database)" value="${getCloudSyncConfig().apiKey || ''}">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
            <button class="btn-primary" id="push-cloud-now-btn" style="height: 38px; font-size: 12px; background: #27ae60;">
              ☁️ Push ទៅ Cloud
            </button>
            <button class="btn-secondary" id="pull-cloud-now-btn" style="margin: 0; height: 38px; font-size: 12px;">
              📥 Pull ពី Cloud
            </button>
          </div>

          <button class="btn-secondary" id="save-cloud-settings-btn" style="height: 36px; font-size: 12px; margin-top: 8px;">
            💾 រក្សាទុកការកំណត់ Cloud
          </button>

          <!-- Quick Setup Guide -->
          <details style="margin-top: 12px; font-size: 11px; color: var(--tg-theme-hint-color); cursor: pointer;">
            <summary style="font-weight: 600; color: var(--tg-theme-button-color);">📖 របៀបបង្កើត Firebase Realtime Database ឥតគិតថ្លៃ (១ នាទី)</summary>
            <ol style="margin-top: 6px; padding-left: 18px; line-height: 1.6;">
              <li>ចូលទៅកាន់ <b>console.firebase.google.com</b> រួចចុច <b>Create a project</b> (ដាក់ឈ្មោះ sv-bookstore)</li>
              <li>ចូលទៅកាន់ <b>Build ➔ Realtime Database ➔ Create Database</b></li>
              <li>ជ្រើសរើស <b>Start in test mode</b> (អនុញ្ញាតឱ្យ Read/Write បាន)</li>
              <li>ចម្លង URL របស់ Database ដែលមានទម្រង់ <code>https://your-app-default-rtdb.firebaseio.com/</code> រួចថែម <code>products.json</code> នៅចុងបញ្ចប់ (ឧ. <code>https://your-app-default-rtdb.firebaseio.com/products.json</code>) យកមកបិទភ្ជាប់ក្នុងប្រអប់ខាងលើនេះ ជាការស្រេច!</li>
            </ol>
          </details>
        </div>

        <div class="admin-card">
          <h4>👤 ព័ត៌មានម្ចាស់ហាង</h4>
          <div style="font-size: 12px; line-height: 1.6;">
            <div>ម្ចាស់ហាង: <b>${CONFIG.adminName || 'បណ្ណាគារសៃវ៉ា'}</b></div>
            <div>Username: <b>@${CONFIG.adminUsername || 'Svbook168'}</b></div>
            <div>រូបិយប័ណ្ណ: <b>USD ($) & KHR (៛)</b></div>
            <div>សេវាដឹកជញ្ជូន: <b>$${CONFIG.shippingFee.toFixed(2)}</b> (លើស $${CONFIG.freeShippingThreshold} ដឹកឥតគិតថ្លៃ)</div>
            <div style="margin-top: 4px;">កំណែទម្រង់ (Version): <b class="badge-tag">v${CONFIG.appVersion || '1.4.0'}</b></div>
          </div>
        </div>
      `;

      const saveAdminBtn = document.getElementById('save-admin-settings-btn');
      if (saveAdminBtn) {
        saveAdminBtn.onclick = () => {
          const idInput = document.getElementById('admin-chat-id-input');
          const val = idInput ? idInput.value.trim() : '';
          CONFIG.adminChatId = val;
          localStorage.setItem('sv_admin_chat_id', val);
          triggerHaptic('success');
          showToast('បានរក្សាទុក Admin Chat ID!', '⚙️');
        };
      }

      const savePassBtn = document.getElementById('save-new-password-btn');
      if (savePassBtn) {
        savePassBtn.onclick = () => {
          const passInput = document.getElementById('new-admin-password-input');
          const newPass = passInput ? passInput.value.trim() : '';
          if (!newPass || newPass.length < 4) {
            triggerHaptic('error');
            showToast('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៤ តួអក្សរ!', '⚠️');
            return;
          }
          localStorage.setItem('sv_custom_admin_password', newPass);
          triggerHaptic('success');
          showToast('បានប្តូរពាក្យសម្ងាត់ជោគជ័យ!', '🔒');
          renderDashboardContent();
        };
      }

      // Cloud Sync Button Handlers
      const saveCloudBtn = document.getElementById('save-cloud-settings-btn');
      if (saveCloudBtn) {
        saveCloudBtn.onclick = () => {
          const urlInput = document.getElementById('cloud-api-url-input');
          const keyInput = document.getElementById('cloud-api-key-input');
          const url = urlInput ? urlInput.value.trim() : '';
          const key = keyInput ? keyInput.value.trim() : '';
          localStorage.setItem('sv_cloud_api_url', url);
          localStorage.setItem('sv_cloud_api_key', key);
          localStorage.setItem('sv_cloud_enabled', url ? 'true' : 'false');
          triggerHaptic('success');
          showToast('បានរក្សាទុកការកំណត់ Cloud Sync!', '☁️');
          renderDashboardContent();
        };
      }

      const pushCloudBtn = document.getElementById('push-cloud-now-btn');
      if (pushCloudBtn) {
        pushCloudBtn.onclick = async () => {
          const urlInput = document.getElementById('cloud-api-url-input');
          const keyInput = document.getElementById('cloud-api-key-input');
          const url = urlInput ? urlInput.value.trim() : '';
          const key = keyInput ? keyInput.value.trim() : '';
          if (!url) {
            triggerHaptic('error');
            showToast('សូមបញ្ចូល Cloud Database URL ជាមុនសិន!', '⚠️');
            return;
          }
          localStorage.setItem('sv_cloud_api_url', url);
          localStorage.setItem('sv_cloud_api_key', key);
          localStorage.setItem('sv_cloud_enabled', 'true');
          await syncProductsToCloud(state.products, false);
          renderDashboardContent();
        };
      }

      const pullCloudBtn = document.getElementById('pull-cloud-now-btn');
      if (pullCloudBtn) {
        pullCloudBtn.onclick = async () => {
          const urlInput = document.getElementById('cloud-api-url-input');
          const keyInput = document.getElementById('cloud-api-key-input');
          const url = urlInput ? urlInput.value.trim() : '';
          const key = keyInput ? keyInput.value.trim() : '';
          if (!url) {
            triggerHaptic('error');
            showToast('សូមបញ្ចូល Cloud Database URL ជាមុនសិន!', '⚠️');
            return;
          }
          localStorage.setItem('sv_cloud_api_url', url);
          localStorage.setItem('sv_cloud_api_key', key);
          localStorage.setItem('sv_cloud_enabled', 'true');
          const items = await syncProductsFromCloud(false);
          if (items) {
            renderDashboardContent();
          }
        };
      }
    }

    renderDashboardContent();
  }

  // --- Attach Event Listeners ---
  function setupEvents() {
    // Backdrop click
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => closeAllModals());
    }

    // Modal close buttons
    document.querySelectorAll('.sheet-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sheet = btn.closest('.bottom-sheet');
        if (sheet) closeModal(sheet.id);
      });
    });

    // Cart trigger in header
    const cartBtn = document.getElementById('header-cart-btn');
    if (cartBtn) {
      cartBtn.addEventListener('click', () => {
        triggerHaptic('medium');
        openModal('cart-modal');
      });
    }

    // Admin trigger in header
    const adminBtn = document.getElementById('header-admin-btn');
    if (adminBtn) {
      adminBtn.addEventListener('click', () => {
        triggerHaptic('selection');
        openAdminModal();
      });
    }

    // Search input
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (searchClear) {
          searchClear.classList.toggle('visible', state.searchQuery.length > 0);
        }
        renderProducts();
      });
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        searchClear.classList.remove('visible');
        searchInput.focus();
        renderProducts();
      });
    }

    // Cart Checkout button
    const cartCheckoutBtn = document.getElementById('cart-checkout-btn');
    if (cartCheckoutBtn) {
      cartCheckoutBtn.addEventListener('click', () => {
        triggerHaptic('medium');
        closeModal('cart-modal');
        openModal('checkout-modal');
      });
    }

    // Coupon Apply button
    const couponBtn = document.getElementById('coupon-apply-btn');
    if (couponBtn) {
      couponBtn.addEventListener('click', () => applyCouponCode());
    }

    const couponInput = document.getElementById('coupon-input');
    if (couponInput) {
      couponInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applyCouponCode();
      });
    }

    // Floating bar checkout button
    const floatingBtn = document.getElementById('floating-checkout-btn');
    if (floatingBtn) {
      floatingBtn.addEventListener('click', () => {
        triggerHaptic('medium');
        openModal('cart-modal');
      });
    }

    // Checkout confirm button
    const checkoutConfirmBtn = document.getElementById('checkout-confirm-btn');
    if (checkoutConfirmBtn) {
      checkoutConfirmBtn.addEventListener('click', () => {
        processOrderSubmission();
      });
    }

    // Restore saved Admin Chat ID if available
    const savedAdminId = localStorage.getItem('sv_admin_chat_id');
    if (savedAdminId) {
      CONFIG.adminChatId = savedAdminId;
    }
  }

  // --- App Initialization ---
  function init() {
    loadCart();
    state.products = getStoredProducts();
    initTelegram();
    renderCategories();
    renderProducts();
    setupEvents();
    updateMainButtonUI();
    updateAdminVisibility();

    // Background Cloud Realtime Sync (Syncs latest catalog live for all users)
    const cloudCfg = getCloudSyncConfig();
    if (cloudCfg.enabled) {
      syncProductsFromCloud(true);
    }

    console.log("🚀 SV Bookstore Telegram Mini App Initialized");
  }

  // Execute on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
