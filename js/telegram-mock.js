/**
 * Telegram WebApp Mock & Compatibility Layer
 * Ensures seamless development and testing in regular desktop & mobile browsers.
 * If running inside Telegram, official window.Telegram.WebApp is preserved.
 */
(function() {
  if (typeof window.Telegram === 'undefined') {
    window.Telegram = {};
  }

  // If already inside Telegram WebApp, don't overwrite
  if (window.Telegram.WebApp && window.Telegram.WebApp.initData) {
    console.log("📱 Running inside official Telegram WebApp environment");
    return;
  }

  console.log("🌐 Running in standard browser (Mock Telegram WebApp active for preview)");

  // Check if role is set to owner or customer for testing
  const urlParams = new URLSearchParams(window.location.search);
  const activeRole = urlParams.get('role') || localStorage.getItem('sv_preview_role') || 'owner';
  const isOwner = activeRole === 'owner';

  const mockUser = isOwner ? {
    id: 6503377762,
    first_name: "បណ្ណាគារសៃវ៉ា",
    last_name: "លោកគ្រូគ្រី",
    username: "Svbook168",
    language_code: "km"
  } : {
    id: 999888777,
    first_name: "អតិថិជន (Customer)",
    last_name: "Reader",
    username: "buyer168",
    language_code: "km"
  };

  // Setup Mock WebApp object
  const mockWebApp = {
    initData: "mock_data",
    initDataUnsafe: {
      query_id: "mock_123",
      user: mockUser
    },
    version: "7.0",
    platform: "weba",
    colorScheme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    themeParams: {
      bg_color: "#f7f9fa",
      text_color: "#1c1d1f",
      hint_color: "#8e8e93",
      link_color: "#2481cc",
      button_color: "#2481cc",
      button_text_color: "#ffffff",
      secondary_bg_color: "#ffffff"
    },
    isExpanded: true,
    viewportHeight: window.innerHeight,
    viewportStableHeight: window.innerHeight,
    headerColor: "#ffffff",
    backgroundColor: "#f7f9fa",

    // Lifecycle methods
    ready: function() {
      console.log("[Telegram.WebApp] ready() called");
    },
    expand: function() {
      console.log("[Telegram.WebApp] expand() called");
    },
    close: function() {
      console.log("[Telegram.WebApp] close() called");
      if (confirm("Close Telegram Mini App?")) {
        window.close();
      }
    },
    enableClosingConfirmation: function() {
      console.log("[Telegram.WebApp] Closing confirmation enabled");
    },
    disableClosingConfirmation: function() {
      console.log("[Telegram.WebApp] Closing confirmation disabled");
    },

    // Native MainButton Mock
    MainButton: {
      text: "CONTINUE",
      color: "#2481cc",
      textColor: "#ffffff",
      isVisible: false,
      isActive: true,
      isProgressVisible: false,
      _callback: null,
      setText: function(t) {
        this.text = t;
        this._updateDom();
        return this;
      },
      onClick: function(fn) {
        this._callback = fn;
        return this;
      },
      offClick: function(fn) {
        this._callback = null;
        return this;
      },
      show: function() {
        this.isVisible = true;
        this._updateDom();
        return this;
      },
      hide: function() {
        this.isVisible = false;
        this._updateDom();
        return this;
      },
      enable: function() {
        this.isActive = true;
        this._updateDom();
        return this;
      },
      disable: function() {
        this.isActive = false;
        this._updateDom();
        return this;
      },
      showProgress: function(leaveActive) {
        this.isProgressVisible = true;
        this._updateDom();
        return this;
      },
      hideProgress: function() {
        this.isProgressVisible = false;
        this._updateDom();
        return this;
      },
      _updateDom: function() {
        const btn = document.getElementById('native-main-btn-mock');
        if (!btn) return;
        btn.textContent = this.isProgressVisible ? "Processing..." : this.text;
        btn.style.display = this.isVisible ? 'flex' : 'none';
        btn.disabled = !this.isActive;
      }
    },

    // Native BackButton Mock
    BackButton: {
      isVisible: false,
      _callback: null,
      onClick: function(fn) {
        this._callback = fn;
        return this;
      },
      offClick: function(fn) {
        this._callback = null;
        return this;
      },
      show: function() {
        this.isVisible = true;
        this._updateDom();
        return this;
      },
      hide: function() {
        this.isVisible = false;
        this._updateDom();
        return this;
      },
      _updateDom: function() {
        const btn = document.getElementById('native-back-btn-mock');
        if (!btn) return;
        btn.style.display = this.isVisible ? 'flex' : 'none';
      }
    },

    // Haptic Feedback Mock
    HapticFeedback: {
      impactOccurred: function(style) {
        if (navigator.vibrate) {
          navigator.vibrate(style === 'heavy' ? 40 : 20);
        }
      },
      notificationOccurred: function(type) {
        if (navigator.vibrate) {
          navigator.vibrate([30, 50, 30]);
        }
      },
      selectionChanged: function() {
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    },

    // Send Data back to Bot
    sendData: function(data) {
      console.log("[Telegram.WebApp] sendData called with:", data);
    },

    openLink: function(url) {
      window.open(url, '_blank');
    },

    openTelegramLink: function(url) {
      window.open(url, '_blank');
    },

    showAlert: function(message, callback) {
      alert(message);
      if (callback) callback();
    },

    showConfirm: function(message, callback) {
      const res = confirm(message);
      if (callback) callback(res);
    }
  };

  // Only assign if not provided by official script
  if (!window.Telegram.WebApp) {
    window.Telegram.WebApp = mockWebApp;
  } else {
    // If official exists but is lacking fields because of desktop/testing
    if (!window.Telegram.WebApp.initDataUnsafe || !window.Telegram.WebApp.initDataUnsafe.user) {
      window.Telegram.WebApp.initDataUnsafe = mockWebApp.initDataUnsafe;
    }
  }
})();
