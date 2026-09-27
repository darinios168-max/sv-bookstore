/**
 * SV Bookstore - Telegram Mini App Configuration
 * 
 * Configured specifically for:
 * Store Owner: បណ្ណាគារសៃវ៉ា លោកគ្រូគ្រី (@Svbook168)
 * Admin Chat ID: 6503377762
 * Bot: @svbookstorebot
 */
const CONFIG = {
  // Store Information
  storeName: "បណ្ណាគារ សៃវ៉ា (SV Bookstore)",
  storeNameKh: "បណ្ណាគារ សៃវ៉ា",
  storeNameEn: "SV Bookstore",
  storeTagline: "សៀវភៅល្អៗ បង្កើនចំណេះដឹង និងការអភិវឌ្ឍន៍ខ្លួន",
  storeTaglineEn: "Discover Your Next Great Read",
  storeDescription: "សៀវភៅគុណភាពខ្ពស់ សៀវភៅអភិវឌ្ឍន៍ខ្លួន បច្ចេកវិទ្យា និងសម្ភារសិក្សា",
  appVersion: "1.4.0", // 👈 Version របស់កម្មវិធី (ដំឡើងលេខនេះពេលកែប្រែកូដ)
  
  currency: "$", // USD ($) standard
  currencyCode: "USD",
  exchangeRateKHR: 4100, // 1 USD = ~4,100 KHR for local convenience
  
  // Telegram Bot Information
  botUsername: "svbookstorebot",
  botToken: "8957347548:AAHPs83VKzCtA8fD0uPhVUbjUtPi22LM-Yo",
  
  // Store Owner / Admin Details
  adminChatId: "6503377762", // Telegram Chat ID for @Svbook168
  adminUsername: "Svbook168",
  adminName: "បណ្ណាគារសៃវ៉ា លោកគ្រូគ្រី",

  // Admin Security / Login Credentials (ការពារការចូលកែប្រែទំនិញ & ស្តុក)
  adminAuth: {
    username: "Svbook168", // Username to login
    password: "sv168"      // Password (អាចប្តូរតាមចិត្ត)
  },

  // Cloud Database Realtime Sync Settings
  // (បើកមុខងារនេះ ដើម្បី Sync ទំនិញរវាងទូរស័ព្ទម្ចាស់ហាង និងអតិថិជនទាំងអស់ដោយស្វ័យប្រវត្តិ)
  cloudSync: {
    enabled: true,
    apiUrl: "", // e.g. "https://sv-bookstore-default-rtdb.firebaseio.com/products.json" or JSONBin URL
    apiKey: "", // Optional Auth Token / Master Key
    autoSyncOnSave: true // Auto sync to Cloud whenever owner adds or modifies an item
  },
  
  // Delivery Settings
  shippingFee: 1.50, // Standard local delivery fee in Cambodia ($1.50)
  freeShippingThreshold: 25.00, // Free delivery on orders over $25
  
  // Payment Options Enabled
  paymentMethods: [
    { 
      id: "khqr", 
      name: "KHQR / ABA Bank / Bakong", 
      nameKh: "ទូទាត់តាម KHQR / ធនាគារ ABA / បាគង", 
      icon: "📱", 
      description: "Scan KHQR or transfer via ABA / Bakong / Wing / ACLEDA" 
    },
    { 
      id: "cod", 
      name: "Cash on Delivery (COD)", 
      nameKh: "ទូទាត់ប្រាក់ពេលទំនិញដល់ (COD)", 
      icon: "💵", 
      description: "Pay with cash when your books arrive" 
    },
    { 
      id: "telegram_pay", 
      name: "Telegram Stars", 
      nameKh: "ទូទាត់តាម Telegram Stars", 
      icon: "⭐", 
      description: "Fast payment directly inside Telegram" 
    }
  ],
  
  // Bank / QR Info (Shown when customer selects KHQR / Bank Transfer)
  bankInfo: {
    bankName: "ABA Bank / KHQR / Bakong",
    accountName: "បណ្ណាគារ សៃវ៉ា (SV BOOKSTORE)",
    accountNumber: "001 688 168 (ABA) | 096 xxx xxxx",
    khqrImage: "" // Can put URL to your ABA KHQR code image here
  },

  // Discount Coupons
  coupons: {
    "WELCOME10": { discountPercent: 10, description: "បញ្ចុះតម្លៃ 10% សម្រាប់អតិថិជនថ្មី" },
    "SV168": { discountAmount: 2.00, description: "បញ្ចុះតម្លៃ $2.00 ភ្លាមៗ" },
    "VIPREAD": { discountPercent: 15, description: "VIP Reader 15% Off" }
  }
};

// Export for module or global use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
