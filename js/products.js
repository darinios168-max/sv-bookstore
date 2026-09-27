/**
 * SV Bookstore (បណ្ណាគារ សៃវ៉ា) - Product Catalog Database
 * Pure client-side data store. Easy to add, edit, or remove books.
 */
const PRODUCTS = [
  {
    id: "prod-1",
    title: "Atomic Habits (ទម្លាប់អាតូមិក)",
    titleKh: "ទម្លាប់អាតូមិក (Atomic Habits)",
    author: "James Clear",
    category: "self-help",
    price: 18.99,
    originalPrice: 24.99,
    rating: 4.9,
    reviewsCount: 3200,
    badge: "Bestseller",
    badgeKh: "លក់ដាច់បំផុត",
    badgeType: "hot",
    stock: 25,
    coverColor: "#e67e22",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    description: "An easy and proven way to build good habits and break bad ones. Atomic Habits will reshape the way you think about progress and success, and give you the tools and strategies you need to transform your habits.",
    descriptionKh: "វិធីសាស្ត្រដ៏មានប្រសិទ្ធភាពក្នុងការកសាងទម្លាប់ល្អៗ និងលុបបំបាត់ទម្លាប់អាក្រក់ចេញពីជីវិត។ សៀវភៅនេះនឹងផ្លាស់ប្តូរផ្នត់គំនិតរបស់អ្នកអំពីភាពជោគជ័យ។",
    details: {
      format: "Hardcover (ក្របក្រាស់)",
      pages: 320,
      language: "Khmer / English",
      publisher: "Avery Publishing",
      isbn: "978-0735211292"
    }
  },
  {
    id: "prod-2",
    title: "Designing Data-Intensive Applications",
    titleKh: "ស្ថាបត្យកម្មប្រព័ន្ធទិន្នន័យកម្រិតខ្ពស់",
    author: "Martin Kleppmann",
    category: "tech",
    price: 38.50,
    originalPrice: 48.00,
    rating: 4.9,
    reviewsCount: 1840,
    badge: "Tech Classic",
    badgeKh: "វិស្វកម្ម IT",
    badgeType: "featured",
    stock: 12,
    coverColor: "#2980b9",
    image: "https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=600&auto=format&fit=crop&q=80",
    description: "The definitive guide to the architecture of modern data systems. Understand distributed systems, reliability, scalability, and maintainability in depth.",
    descriptionKh: "មគ្គុទ្ទេសក៍ឈានមុខគេលើការរចនាប្រព័ន្ធទិន្នន័យខ្នាតធំ Distributed Systems ភាពអាចជឿជាក់បាន និងការគ្រប់គ្រងស្ថាបត្យកម្ម Software.",
    details: {
      format: "Paperback (ក្របស្តើង)",
      pages: 616,
      language: "English",
      publisher: "O'Reilly Media",
      isbn: "978-1449373320"
    }
  },
  {
    id: "prod-3",
    title: "The Psychology of Money (ចិត្តវិទ្យានៃលុយ)",
    titleKh: "ចិត្តវិទ្យានៃលុយ (The Psychology of Money)",
    author: "Morgan Housel",
    category: "finance",
    price: 16.50,
    originalPrice: 22.00,
    rating: 4.8,
    reviewsCount: 2410,
    badge: "Popular",
    badgeKh: "ពេញនិយម",
    badgeType: "hot",
    stock: 30,
    coverColor: "#27ae60",
    image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&auto=format&fit=crop&q=80",
    description: "Doing well with money isn't necessarily about what you know. It's about how you behave. Timeless lessons on wealth, greed, and happiness.",
    descriptionKh: "ភាពជោគជ័យខាងហិរញ្ញវត្ថុមិនមែនអាស្រ័យលើអ្វីដែលអ្នកដឹងនោះទេ គឺអាស្រ័យលើអាកប្បកិរិយារបស់អ្នកចំពោះលុយកាក់ និងការសន្សំ។",
    details: {
      format: "Paperback",
      pages: 256,
      language: "Khmer / English",
      publisher: "Harriman House",
      isbn: "978-0857197689"
    }
  },
  {
    id: "prod-4",
    title: "Project Hail Mary",
    titleKh: "បេសកកម្មសង្គ្រោះផែនដី (Project Hail Mary)",
    author: "Andy Weir",
    category: "fiction",
    price: 19.99,
    originalPrice: 26.00,
    rating: 4.9,
    reviewsCount: 4500,
    badge: "Must Read",
    badgeKh: "គួរអាន",
    badgeType: "featured",
    stock: 18,
    coverColor: "#8e44ad",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    description: "A lone astronaut must save the earth from disaster in this incredible new science-based space adventure from the bestselling author of The Martian.",
    descriptionKh: "រឿងប្រលោមលោកបែបវិទ្យាសាស្ត្រអវកាសដ៏អស្ចារ្យ ពីអ្នកនិពន្ធសៀវភៅ The Martian ដំណើរផ្សងព្រេងរបស់អវកាសយានិកដើម្បីសង្គ្រោះមនុស្សជាតិ។",
    details: {
      format: "Hardcover",
      pages: 496,
      language: "English",
      publisher: "Ballantine Books",
      isbn: "978-0593135204"
    }
  },
  {
    id: "prod-5",
    title: "Building LLMs and Generative AI",
    titleKh: "ការបង្កើត LLMs និង Generative AI",
    author: "Sebastian Raschka",
    category: "tech",
    price: 42.00,
    originalPrice: 49.99,
    rating: 4.9,
    reviewsCount: 890,
    badge: "Trending AI",
    badgeKh: "បច្ចេកវិទ្យា AI",
    badgeType: "new",
    stock: 15,
    coverColor: "#16a085",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80",
    description: "Build a large language model from scratch. Learn how transformer models work under the hood with clear Python & PyTorch explanations.",
    descriptionKh: "រៀនបង្កើត Large Language Models (LLMs) និង Transformer Models ដោយផ្ទាល់ជាមួយ Python & PyTorch ចាប់ពីកម្រិតដំបូង។",
    details: {
      format: "Paperback",
      pages: 380,
      language: "English",
      publisher: "Manning Publications",
      isbn: "978-1617299889"
    }
  },
  {
    id: "prod-6",
    title: "Deep Work: ការផ្ដោតអារម្មណ៍កម្រិតខ្ពស់",
    titleKh: "ការផ្ដោតអារម្មណ៍កម្រិតខ្ពស់ (Deep Work)",
    author: "Cal Newport",
    category: "self-help",
    price: 17.25,
    originalPrice: 22.50,
    rating: 4.7,
    reviewsCount: 1950,
    badge: "Essential",
    badgeKh: "សំខាន់",
    badgeType: "featured",
    stock: 22,
    coverColor: "#d35400",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
    description: "Deep work is the ability to focus without distraction on a cognitively demanding task. Master this skill to stand out and thrive.",
    descriptionKh: "សមត្ថភាពក្នុងការផ្ដោតអារម្មណ៍ធ្វើការងារស៊ីជម្រៅដោយគ្មានការរំខាន ដើម្បីបង្កើនប្រសិទ្ធភាពការងារ និងភាពជោគជ័យក្នុងអាជីព។",
    details: {
      format: "Paperback",
      pages: 304,
      language: "Khmer / English",
      publisher: "Grand Central Publishing",
      isbn: "978-1455586691"
    }
  },
  {
    id: "prod-7",
    title: "The Intelligent Investor",
    titleKh: "អ្នកវិនិយោគឆ្លាតវៃ (The Intelligent Investor)",
    author: "Benjamin Graham",
    category: "finance",
    price: 21.00,
    originalPrice: 28.00,
    rating: 4.7,
    reviewsCount: 3100,
    badge: "Classic",
    badgeKh: "បុរាណវិនិយោគ",
    badgeType: "featured",
    stock: 14,
    coverColor: "#34495e",
    image: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80",
    description: "The greatest investment advisor of the twentieth century taught and inspired people worldwide on value investing and market discipline.",
    descriptionKh: "សៀវភៅគោលវិនិយោគដ៏ល្បីល្បាញបំផុតលើពិភពលោក ដែលជាគ្រូបង្រៀនរបស់មហាសេដ្ឋី Warren Buffett អំពីការវិនិយោគប្រកបដោយតម្លៃពិត។",
    details: {
      format: "Paperback",
      pages: 640,
      language: "English",
      publisher: "Harper Business",
      isbn: "978-0060555665"
    }
  },
  {
    id: "prod-8",
    title: "សៀវភៅកំណត់ហេតុស្បែក & ប៊ិចទឹក (Leather Journal)",
    titleKh: "សៀវភៅកំណត់ហេតុស្បែក & ប៊ិចទឹក",
    author: "SV Craftsmanship",
    category: "stationery",
    price: 14.50,
    originalPrice: 20.00,
    rating: 4.9,
    reviewsCount: 640,
    badge: "Artisan",
    badgeKh: "គុណភាពខ្ពស់",
    badgeType: "new",
    stock: 20,
    coverColor: "#795548",
    image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=80",
    description: "Handcrafted genuine leather notebook with 240 lined archival-grade pages and an ergonomic matte black fountain pen.",
    descriptionKh: "សៀវភៅកត់ត្រាស្បែកធម្មជាតិដ៏ប្រណិត មានចំនួន 240 ទំព័រ ក្រដាសក្រាស់គុណភាពខ្ពស់ រួមជាមួយប៊ិចទឹកស្អាតទាន់សម័យ។",
    details: {
      format: "Leather Bound A5",
      pages: 240,
      language: "Universal",
      publisher: "SV Studio",
      isbn: "SV-STAT-001"
    }
  },
  {
    id: "prod-9",
    title: "អំពូល LED សម្រាប់អានសៀវភៅពេលយប់",
    titleKh: "អំពូល LED ការពារភ្នែកពេលអានសៀវភៅ",
    author: "SV Lumina",
    category: "stationery",
    price: 9.99,
    originalPrice: 15.00,
    rating: 4.8,
    reviewsCount: 820,
    badge: "Top Rated",
    badgeKh: "ពេញនិយម",
    badgeType: "hot",
    stock: 35,
    coverColor: "#f39c12",
    image: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=600&auto=format&fit=crop&q=80",
    description: "Rechargeable clip-on book light with 3 amber eye-caring brightness levels. Blue light blocking and 60 hours battery life.",
    descriptionKh: "អំពូល LED កៀបលើសៀវភៅ អាចសាកថ្មតាម USB បាន មានពន្លឺ 3 កម្រិត ការពារភ្នែកពីពន្លឺខៀវ ប្រើបានយូរដល់ 60 ម៉ោង។",
    details: {
      format: "USB-C Rechargeable",
      pages: "N/A",
      language: "Universal",
      publisher: "SV Accessories",
      isbn: "SV-LGT-004"
    }
  }
];

const CATEGORIES = [
  { id: "all", name: "All Books", nameKh: "ទាំងអស់", icon: "✨" },
  { id: "self-help", name: "Self Growth", nameKh: "អភិវឌ្ឍន៍ខ្លួន", icon: "🌱" },
  { id: "tech", name: "Tech & IT", nameKh: "បច្ចេកវិទ្យា", icon: "💻" },
  { id: "finance", name: "Finance & Business", nameKh: "ហិរញ្ញវត្ថុ", icon: "📈" },
  { id: "fiction", name: "Fiction & Novels", nameKh: "ប្រលោមលោក", icon: "🪐" },
  { id: "stationery", name: "Stationery", nameKh: "សម្ភារសិក្សា", icon: "✒️" }
];

function getStoredProducts() {
  const custom = localStorage.getItem('sv_custom_products');
  if (custom) {
    try {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error("Error loading custom products:", e);
    }
  }
  return PRODUCTS;
}

function saveStoredProducts(products) {
  localStorage.setItem('sv_custom_products', JSON.stringify(products));
}
