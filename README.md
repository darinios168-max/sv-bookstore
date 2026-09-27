# 📚 SV Bookstore - Telegram Mini App (Frontend Only)

A modern, fast, and feature-rich **Telegram Mini App (TWA)** for e-commerce and bookstore sales — built with **100% pure client-side frontend (HTML, CSS, JavaScript)**. **No backend server, no database hosting, and no maintenance required!**

- 🌐 **Live Mini App URL:** [https://darinios168-max.github.io/sv-bookstore/](https://darinios168-max.github.io/sv-bookstore/)
- 🤖 **Telegram Bot:** [@svbookstorebot](https://t.me/svbookstorebot)
- 👑 **Store Owner:** [@Svbook168](https://t.me/Svbook168) (Chat ID: `6503377762`)
- ☁️ **Cloud Database:** Firebase Realtime Database (Auto-Sync)

---

## ✨ Features

- 📱 **Native Telegram Look & Feel**:
  - Automatically adapts to Telegram dark/light theme (`--tg-theme-*` variables).
  - Uses native Telegram `MainButton` ("View Cart", "Checkout", "Confirm Order").
  - Native `BackButton` navigation and confirmation dialogues.
  - Native Haptic Feedback (`impactOccurred`, `notificationOccurred`).
  - Auto-reads the customer's name & username directly from Telegram.
- 📖 **Product Catalog**:
  - Categories: *Self Growth, Tech & Coding, Fiction & Sci-Fi, Finance & Wealth, Stationery & Gifts*.
  - Instant real-time search & category filter.
  - Rich book cards with ratings, review count, badges (*Bestseller, New, Trending*), and stock status.
  - Book Overview modal with format, pages, language, ISBN, and synopsis.
- 🛒 **Shopping Cart & Checkout**:
  - Quantity controls directly in the product card and in the cart drawer.
  - Promo coupon system (Try `WELCOME10` or `BOOKWORM`).
  - Automatic shipping fee and free shipping threshold ($50+).
- 💳 **Payment & Order Delivery (No Backend Needed!)**:
  - Supports **Cash on Delivery (COD)**, **Bank Transfer / QR Code**, and **Telegram Stars**.
  - **Instant Telegram Receipts**: Sends a formatted HTML receipt directly into the buyer's Telegram chat using the Bot API.
  - **Store Owner Alerts**: Sends an instant alert to your Telegram account whenever a new order is placed!
- ⚙️ **In-App Admin Settings**:
  - Easily set your Admin Chat ID to receive orders.
  - Export product catalog as JSON or reset to default books.

---

## 📁 File Structure

```text
├── index.html          # Main Telegram Mini App interface
├── preview.html        # Interactive mobile simulator for testing in your desktop browser
├── config.js           # Bot token, store currency, payment methods & coupons
├── css/
│   └── style.css       # Telegram-themed responsive stylesheet
└── js/
    ├── app.js          # Core shopping logic & Telegram Bot API messaging
    ├── products.js     # Bookstore product database (easy to edit)
    └── telegram-mock.js # Fallback simulator for previewing outside Telegram
```

---

## 🚀 Step 1: Test It Locally (Right Now)

You don't need any server!
1. Open this folder in Finder: `/Users/vip/Documents/Telegram mini bot`
2. Double-click **`preview.html`** or **`index.html`** to open it in your browser (Safari, Chrome, etc.).
3. You will see the simulated iPhone Telegram interface where you can browse books, add to cart, test promo codes, and try the checkout flow!

---

## 🌐 Step 2: Auto-Deploy to Free Hosting

Telegram requires Mini Apps to have an **HTTPS** web link. You can host and auto-deploy it **100% free forever**:

### 🚀 Option A: 1-Click Auto-Deploy to GitHub Pages (Recommended)
1. Create a free GitHub repository (e.g. `svbookstore`).
2. Open Terminal in this folder and connect to your repository:
   ```bash
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO>.git
   ```
3. Run the automated deploy script:
   ```bash
   ./deploy.sh
   ```
4. GitHub Actions will automatically build & deploy your Mini App!
5. In your GitHub repo: **Settings ➔ Pages ➔ Source: GitHub Actions**.
   Your Mini App URL will be ready: `https://<YOUR-USERNAME>.github.io/<YOUR-REPO>/`

### ⚡ Option B: Vercel Auto-Deploy
1. Go to [vercel.com](https://vercel.com).
2. Connect your GitHub repository (or drag-and-drop this folder).
3. Vercel automatically deploys every time you push code, with instant link: `https://svbookstore.vercel.app`.

---

## ☁️ Step 3: Cloud Database Realtime Sync (បន្ថែមទំនិញលើទូរស័ព្ទ ➔ Sync ភ្លាមៗ)

ដើម្បីឱ្យរាល់ពេលលោកគ្រូបន្ថែម ឬកែប្រែទំនិញលើទូរស័ព្ទ អតិថិជនទាំងអស់បានឃើញទំនិញថ្មីភ្លាមៗ **ដោយមិនបាច់ Deploy ម្តងទៀត**៖

1. ចូលទៅកាន់ **[console.firebase.google.com](https://console.firebase.google.com)** (Free 100%)
2. បង្កើត Project មួយ (ឈ្មោះ `sv-bookstore`)
3. ចូល **Build ➔ Realtime Database ➔ Create Database ➔ Start in test mode**
4. ចម្លង Database URL របស់អ្នក (ឧ. `https://sv-bookstore-default-rtdb.firebaseio.com/products.json`)
5. បើក Admin Manager ក្នុង Mini App ➔ ចូល **⚙️ ការកំណត់** ➔ បិទភ្ជាប់ URL ក្នុង **Cloud Database URL** រួចចុច **"Save" & "Push ទៅ Cloud"**!
6. ចាប់ពីពេលនេះទៅ រាល់ពេលបន្ថែមទំនិញថ្មី វានឹង **Auto-Sync** ទៅកាន់អតិថិជនទាំងអស់ភ្លាមៗ!

---

## 🤖 Step 3: Link the Mini App to @svbookstorebot

Once you have your HTTPS URL from Step 2:

1. Open Telegram and search for **[@BotFather](https://t.me/BotFather)**.
2. Send `/mybots`.
3. Select your bot: **`@svbookstorebot`**.
4. Tap **Bot Settings** -> **Menu Button** -> **Configure menu button**.
5. Paste your HTTPS Web App URL (e.g. `https://your-site.vercel.app`).
6. Enter a title for the button: `📚 Open Bookstore` (or `🛒 Shop Now`).
7. **Done!** Now open [t.me/svbookstorebot](https://t.me/svbookstorebot) in Telegram. You will see a button labeled **"📚 Open Bookstore"** right next to the message bar!

### (Optional) Add a Bot Description & About text in BotFather:
- `/setdescription` -> *"Welcome to SV Bookstore! Tap 'Open Bookstore' below to browse bestsellers, programming guides, and stationery."*
- `/setabouttext` -> *"SV Bookstore - Your favorite bookstore on Telegram."*

---

## 🔔 Step 4: Receive Order Alerts Directly on Telegram

Your Telegram Admin Chat ID is **already configured**:
- **Store Owner:** បណ្ណាគារសៃវ៉ា លោកគ្រូគ្រី ([@Svbook168](https://t.me/Svbook168))
- **Admin Chat ID:** `6503377762`
- **Connected Bot:** [@svbookstorebot](https://t.me/svbookstorebot)

**Important One-Time Step:**
1. Open your bot **[t.me/svbookstorebot](https://t.me/svbookstorebot)** on Telegram.
2. Tap **Start** (or send `/start`) once from your personal account (`@Svbook168`).
3. That's it! This gives the bot permission to message you. Whenever any customer places an order in the Mini App, you will instantly receive a notification with their name, phone number, address, payment method, and list of books ordered!

---

---

## 👑 Admin Manager, Auto-Login & Update All (ម្ចាស់ហាង)

The Admin Manager is strictly protected and exclusively for the store owner:
- **Authorized Owner:** បណ្ណាគារសៃវ៉ា លោកគ្រូគ្រី ([@Svbook168](https://t.me/Svbook168))
- **Owner Chat ID:** `6503377762`
- **⚡ ចូលផ្ទាល់ដោយស្វ័យប្រវត្តិ (Direct Auto-Login):** ពេលប្រព័ន្ធស្គាល់ថាជាគណនីរបស់ `@Svbook168` (ID: `6503377762`) ម្ចាស់ហាងអាចចុចចូល **Admin Manager** បានភ្លាមៗដោយស្វ័យប្រវត្តិ ដោយមិនចាំបាច់វាយលេខសម្ងាត់ម្តងទៀតឡើយ!

### 🔄 Auto-Update All & Batch Save:
1. **➕ បន្ថែមទំនិញរួច ➔ Auto-Update All ភ្លាមៗ:** ពេលលោកគ្រូបន្ថែមទំនិញថ្មីរួច ប្រព័ន្ធនឹង Update បញ្ជីទំនិញទាំងអស់នៅលើ Storefront ស្វ័យប្រវត្ត ហើយប្តូរមកកាន់ Tab "ទាំងអស់ (All)" ដើម្បីឱ្យឃើញសៀវភៅថ្មីនៅខាងលើគេបង្អស់ភ្លាម។
2. **💾 រក្សាទុក & Update ទាំងអស់ (Save & Update All):** លោកគ្រូអាចកែប្រែតម្លៃ ឬចំនួនស្តុកសៀវភៅច្រើនមុខក្នុងពេលតែមួយ រួចចុចតែ ១ ប៊ូតុងដើម្បី Update ទាំងអស់។
3. **📋 ចម្លងកូដ (Copy Code) & 📥 ទាញយក products.js:** ក្រោយពេលកែប្រែរួច លោកគ្រូអាចចុចចម្លងកូដ ឬទាញយកហ្វាយដើម្បី Update ទៅកាន់ Hosting (GitHub / Vercel / Netlify) ឱ្យអតិថិជនទាំងអស់បានឃើញទំនិញថ្មីដូចគ្នា។

### 📸 Photo Options when Adding Products:
1. **📁 ជ្រើសរូបពីទូរស័ព្ទ (Gallery / File Upload):** Select any image from your phone's photo library or computer.
2. **📷 ថតរូបផ្ទាល់ (Camera Capture):** Opens your phone camera directly to snap a photo of the book cover.
3. **⚡ Smart Client-Side Compression:** High-res photos (5MB–15MB) are automatically resized (max 640x850px) and compressed (~30KB–50KB) on the device using HTML5 Canvas, ensuring instant loading and safe storage without overflowing local storage limits.
4. **🔗 Manual URL Fallback:** You can also paste an image URL directly.

---

## 🛠️ Configuration Options (`config.js`)

- `currency`: Change currency symbol (`$`, `€`, `£`, `฿`, `₹`, etc.).
- `shippingFee`: Flat rate delivery fee.
- `freeShippingThreshold`: Minimum cart amount for free delivery.
- `coupons`: Add or change discount codes (e.g. `WELCOME10`, `BOOKWORM`).
- `bankInfo`: Update your bank account details for Bank Transfer / QR payments.

Enjoy your new Telegram Mini App bookstore! 🚀
