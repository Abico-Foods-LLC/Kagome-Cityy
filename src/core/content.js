// Тоглоомын агуулга: жимсний төрлүүд, аяллын бүлгүүд, сорилын асуултууд, бүтээгдэхүүн.

export const FRUITS = [
  { emoji: '🍎', name: 'Алим', color: '#f0464f', shade: '#b8222c', kind: 'fruit' },
  { emoji: '🍊', name: 'Жүрж', color: '#ff9a1f', shade: '#d16a00', kind: 'fruit' },
  { emoji: '🍇', name: 'Усан үзэм', color: '#8f5cd6', shade: '#5c31a3', kind: 'fruit' },
  { emoji: '🥭', name: 'Манго', color: '#ffc02e', shade: '#e08b00', kind: 'fruit' },
  { emoji: '🥕', name: 'Лууван', color: '#ff7f2a', shade: '#cf4f05', kind: 'veg' },
  { emoji: '🍅', name: 'Улаан лооль', color: '#f5453a', shade: '#b8231b', kind: 'veg' },
  { emoji: '🥦', name: 'Брокколи', color: '#3ea757', shade: '#23733a', kind: 'veg' },
  { emoji: '🎃', name: 'Хулуу', color: '#f39a2c', shade: '#c56c0a', kind: 'veg' },
];

export const PRODUCTS = [
  { sku: 0, flavor: 'Carrot & Orange', name: 'Лууван & Жүрж', size: '720 мл', src: 'assets/products/product-0.webp', side: '#f08a1c', fruit: 1 },
  { sku: 1, flavor: 'Carrot & Grape', name: 'Лууван & Усан үзэм', size: '720 мл', src: 'assets/products/product-1.webp', side: '#7a2d78', fruit: 2 },
  { sku: 2, flavor: 'Carrot & Mango', name: 'Лууван & Манго', size: '720 мл', src: 'assets/products/product-2.webp', side: '#f7b21c', fruit: 3 },
  { sku: 3, flavor: 'Carrot & Apple', name: 'Лууван & Алим', size: '720 мл', src: 'assets/products/product-3.webp', side: '#e35b3f', fruit: 0 },
  { sku: 4, flavor: 'Carrot & Orange', name: 'Лууван & Жүрж', size: '200 мл', src: 'assets/products/product-4.webp', side: '#f08a1c', fruit: 1 },
  { sku: 5, flavor: 'Carrot & Grape', name: 'Лууван & Усан үзэм', size: '200 мл', src: 'assets/products/product-5.webp', side: '#7a2d78', fruit: 2 },
  { sku: 6, flavor: 'Carrot & Mango', name: 'Лууван & Манго', size: '200 мл', src: 'assets/products/product-6.webp', side: '#f7b21c', fruit: 3 },
  { sku: 7, flavor: 'Carrot & Apple', name: 'Лууван & Алим', size: '200 мл', src: 'assets/products/product-7.webp', side: '#e35b3f', fruit: 0 },
];

export const CHAPTERS = [
  { key: 'harvest', goal: 6, title: 'Цэцэрлэгийн анхны ургац', text: 'Цэцэрлэг ба фермээс 6 жимс, ногоо түү.', hint: 'Гялалзаж буй жимсэнд ойртоод E дар.', landmark: 0 },
  { key: 'math', goal: 3, title: 'Захын ухаалаг худалдаачин', text: 'Тоо бодох зах дээр 3 өөр бодлого бод.', hint: 'Лууван Лулутай ярилц.', landmark: 1 },
  { key: 'read', goal: 2, title: 'Номын цэцэрлэгийн нууц', text: 'Номын буланд 2 эх уншаад асуултад хариул.', hint: 'Үзэм Үүлээтэй ярилц.', landmark: 2 },
  { key: 'logic', goal: 3, title: 'Логикийн өнгөт хүрд', text: 'Хүрд эргүүлж, 3 өөр таавар тайл.', hint: 'Манго Мимитэй ярилц.', landmark: 3 },
  { key: 'drive', goal: 3, title: 'Жимсний хүргэлтийн аялал', text: 'Жимсэн машинд сууж 3 алтан хаалгаар дарааллаар яв.', hint: 'Машинд суугаад алтан хаалга руу.', landmark: 4 },
  { key: 'runner', goal: 1, title: 'Ширэнгийн гүйлт', text: 'Ширэнгэ рүү орж Jungle Runner-ийн эхний үеийг дав.', hint: 'Ширэнгийн хаалга — хотын зүүн хойд буланд.', landmark: 7 },
];

export const QUESTIONS = {
  math: [
    { q: '3 сагсанд тус бүр 4 алим байна. Нийт хэдэн алим вэ?', options: ['7', '12', '16', '9'], a: 1, h: '4 + 4 + 4 гэж нэмээрэй.' },
    { q: '18 луувангаас 7-г хүргэлтэд өглөө. Хэд үлдэх вэ?', options: ['25', '9', '11', '12'], a: 2, h: '18-аас 7-г хасна.' },
    { q: '6 жүржийг 2 найздаа тэнцүү хуваав. Нэг найз хэдийг авах вэ?', options: ['2', '4', '6', '3'], a: 3, h: '6-г хоёр тэнцүү хэсэгт хуваагаарай.' },
    { q: '5 манго дээр 8 манго нэмбэл?', options: ['13', '12', '14', '3'], a: 0, h: '5 + 8 = ?' },
    { q: 'Нэг шүүс 720 мл. Хоёр шүүс нийлээд хэдэн мл вэ?', options: ['1240', '1440', '1420', '720'], a: 1, h: '720 + 720 гэж нэмээрэй.' },
    { q: '24 улаан лоолийг 4 сагсанд тэнцүү хийвэл нэг сагсанд хэд вэ?', options: ['8', '4', '6', '12'], a: 2, h: '24 : 4 = ?' },
  ],
  read: [
    { passage: 'Марал өглөө фермд очив. Тэр луувангаа усалж, дараа нь 3 алим түүв. Алимаа ногоон сагсанд хийж найздаа хүргэж өглөө.', q: 'Марал алимаа ямар өнгийн сагсанд хийсэн бэ?', options: ['Улаан', 'Шар', 'Ногоон', 'Цэнхэр'], a: 2, h: 'Эхийн гурав дахь өгүүлбэрийг дахин уншаарай.' },
    { passage: 'Усан үзэм бороонд дуртай. Харин манго нарлаг газар ургана. Хотынхон манго модыг толгодын өмнөд талд, усан үзмийг голын дэргэд тарьжээ.', q: 'Манго модыг хаана тарьсан бэ?', options: ['Голын дэргэд', 'Толгодын өмнөд талд', 'Номын санд', 'Гүүрэн дээр'], a: 1, h: 'Манго модны байршлыг хэлсэн өгүүлбэрийг олоорой.' },
    { passage: 'Лууван найз эхлээд үрээ тарив. Дараа нь усаллаа. Олон хоногийн дараа ногоон навч цухуйв.', q: 'Хамгийн эхэнд юу хийсэн бэ?', options: ['Усалсан', 'Навч түүсэн', 'Үр тарьсан', 'Ургац хураасан'], a: 2, h: '«Эхлээд» гэсэн үгийг хайгаарай.' },
    { passage: 'Kagome шүүс нь лууван болон жимсний холимог юм. Жүржтэй нь улбар шар, усан үзэмтэй нь ягаан өнгөтэй байдаг.', q: 'Усан үзэмтэй шүүс ямар өнгөтэй вэ?', options: ['Улбар шар', 'Ногоон', 'Ягаан', 'Шар'], a: 2, h: 'Сүүлийн өгүүлбэрийг уншаарай.' },
  ],
  logic: [
    { q: '2 → 4 → 8 → 16 → ? Дараагийн тоог ол.', options: ['18', '24', '30', '32'], a: 3, h: 'Өмнөх тоог 2-оор үржүүлж байна.' },
    { q: '🍎 🍊 🍇 🍎 🍊 … Дараа нь аль жимс вэ?', options: ['🍇', '🍎', '🥕', '🥭'], a: 0, h: 'Гурван жимс ижил дарааллаар давтагдаж байна.' },
    { q: 'Бусдаасаа өөрийг олоорой.', options: ['🍎 Алим', '🍇 Усан үзэм', '🥕 Лууван', '🥭 Манго'], a: 2, h: 'Гурав нь жимс, нэг нь үндэс ногоо.' },
    { q: 'Улаан нь цэнхрийн өмнө, шар нь цэнхрийн дараа. Аль дараалал зөв вэ?', options: ['🔵 🔴 🟡', '🔴 🔵 🟡', '🟡 🔵 🔴', '🔴 🟡 🔵'], a: 1, h: 'Цэнхэр нь голд байна.' },
    { q: '1, 1, 2, 3, 5, 8, ? Дараагийн тоо?', options: ['11', '12', '13', '10'], a: 2, h: 'Өмнөх хоёр тоог нэм.' },
  ],
};

export const LANDMARKS = [
  { name: 'Жимсний цэцэрлэг', emoji: '🍎', x: -36, z: 6, color: '#f45468' },
  { name: 'Тоо бодох зах', emoji: '🧮', x: -28, z: -18, color: '#f9a73e' },
  { name: 'Номын цэцэрлэг', emoji: '📖', x: 38, z: -20, color: '#9d80da' },
  { name: 'Логикийн хүрд', emoji: '🎡', x: 38, z: 22, color: '#f8809a' },
  { name: 'Жимсэн машин', emoji: '🚗', x: 10, z: 20, color: '#eea221' },
  { name: 'Ногооны ферм', emoji: '🥕', x: 40, z: -38, color: '#61a148' },
  { name: 'Kagome маркет', emoji: '🧃', x: -28, z: 24, color: '#e34d67' },
  { name: 'Ширэнгийн хаалга', emoji: '🌴', x: 46, z: -56, color: '#1f8a5a' },
  { name: 'Хотын төв', emoji: '⛲', x: 0, z: -15, color: '#2ea6c9' },
  { name: 'Захиалгын самбар', emoji: '📬', x: 5, z: -19, color: '#e07a3f' },
  { name: 'Миний талбай', emoji: '🌱', x: 56, z: -38, color: '#61a148' },
];

export const RUNNER_LEVELS = [
  { name: 'Цитрусын сүм', speed: 11, length: 380, sky: 0x9fd0e8, fog: 0xc0e2d2, ground: 0x5f9c4a, rock: 0x7b7f6a, leaf: 0x2f7a46, light: 0xfff0cc, mist: 0.008, glow: 0xffb44a },
  { name: 'Усан үзмийн хөндий', speed: 13, length: 420, sky: 0x2a2f5c, fog: 0x3a3f70, ground: 0x4a4570, rock: 0x4a4c66, leaf: 0x39556b, light: 0xa9bfff, mist: 0.013, glow: 0xb48cff },
  { name: 'Манго хүрхрээ', speed: 15, length: 460, sky: 0x7ec7c6, fog: 0xa9e2df, ground: 0x3f9a82, rock: 0x4f7f78, leaf: 0x1f6b57, light: 0xd8fff7, mist: 0.011, glow: 0x5cf2d2 },
  { name: 'Алимын балгас', speed: 17, length: 500, sky: 0xe9c99b, fog: 0xf0d8b3, ground: 0x8e9a4f, rock: 0x8c7658, leaf: 0x5b7a3a, light: 0xffc98a, mist: 0.010, glow: 0xff7a5c },
  { name: 'Ургацын оргил', speed: 19, length: 540, sky: 0xf4c27a, fog: 0xf8d7a4, ground: 0xb08c45, rock: 0x8a6e4a, leaf: 0x516e3a, light: 0xffc266, mist: 0.012, glow: 0xffd24d },
];

// Алхдаг иргэд: нэр (mascot төрлөөр) ба яриа (санамсаргүй)
export const CITIZENS = [
  { kind: 'peach', name: 'Тоор Туяа' }, { kind: 'mushroom', name: 'Мөөг Мөнх' }, { kind: 'pumpkin', name: 'Хулуу Хонгор' },
  { kind: 'grape', name: 'Үзэм Үүлэн' }, { kind: 'orange', name: 'Жүрж Жаргал' }, { kind: 'shiitake', name: 'Шийтакэ Шинэ' },
];
export const CITIZEN_LINES = [
  'Сувгийн эрэг дээр загас барьж болдог гэсэн. Загасчны хажууд саваа бий!',
  'Фермийн зүүн талд өөрийн талбай тарьж болно. Услахаа мартуузай — 1 минут тутамд ургадаг.',
  'Усан оргилуурын хажуугийн захиалгын самбараас хүргэлт авбал од өгдөг. Жимсэн машинаар хурдан!',
  'Лууван нүдэнд сайн — β-каротин их. Kagome-ийн шүүс бүр лууван агуулдаг!',
  'Өдөрт 5 өнгийн жимс, ногоо идвэл бие сайхан болно гэж багш хэлсэн.',
  'Жүрж витамин C-ээр баялаг. Ханиад хүрэхээс хамгаална!',
  'Ширэнгийн хаалганы цаана эртний сүм бий. Тэнд гүйж үзсэн үү?',
  'Kagome маркетад од-оор хөөрхөн малгай, нүдний шил авч болно!',
  'Сандал, хашааг машинаар мөргөвөл эвдэрдэг. Алхаж очоод E дарвал засаж болно.',
  'Усан үзмийн полифенол зүрхэнд сайн. Ягаан шүүс — усан үзмийн хальснаас!',
  'Шүүсний лабораторид өдөрт 3 захиалга хийж болно. Ургацаа ашиглаарай.',
  'Өглөө эрт бүх жимс дахин ургасан байдаг. 4 минут тутамд ургадаг гэсэн!',
  'Луувсай нохойг илбэл дагадаг. Сувагт сэлэх ч дуртай!',
  'Брокколид кальци их — яс бэхжүүлнэ. Бобо ахын ферм дээр ургадаг!',
];

// ---------- Маркет ----------
/** Mascot аксессуар (толгой/нүүр/их бие). secret: зөвхөн нээгдсэн үед дэлгүүрт харагдана. */
export const ACCESSORIES = {
  cap: { name: 'Kagome малгай', emoji: '🧢', slot: 'hat', price: 50 },
  straw: { name: 'Сүрлэн малгай', emoji: '👒', slot: 'hat', price: 80 },
  crown: { name: 'Титэм', emoji: '👑', slot: 'hat', price: 150 },
  party: { name: 'Баярын малгай', emoji: '🎉', slot: 'hat', price: 60 },
  flower: { name: 'Цэцэг', emoji: '🌸', slot: 'hat', price: 40 },
  headphones: { name: 'Чихэвч', emoji: '🎧', slot: 'hat', price: 90 },
  sun: { name: 'Нарны шил', emoji: '🕶️', slot: 'glasses', price: 70 },
  round: { name: 'Дугуй шил', emoji: '👓', slot: 'glasses', price: 60 },
  scarf: { name: 'Ороолт', emoji: '🧣', slot: 'extra', price: 50 },
  wings: { name: 'Эрвээхийн далавч', emoji: '🦋', slot: 'extra', price: 200 },
  balloon: { name: 'Шаар', emoji: '🎈', slot: 'extra', price: 120 },
  bag: { name: 'Цүнх', emoji: '🎒', slot: 'extra', price: 60 },
  goldcrown: { name: 'Алтан титэм', emoji: '👑', slot: 'hat', price: 0, secret: true, note: '20 алтан лууван олбол' },
};

export const SHOP_TABS = [
  { cat: 'wear', label: 'Хувцас', emoji: '🧢' },
  { cat: 'car', label: 'Машин', emoji: '🚗' },
  { cat: 'dog', label: 'Луувсай', emoji: '🐶' },
  { cat: 'trail', label: 'Эффект', emoji: '✨' },
  { cat: 'home', label: 'Гэр', emoji: '🏡' },
];

/** Бүх бараа. slot байвал equip хийгдэнэ (нэг slot-д нэг), slot-гүй (гэр) бол авмагц байрлана. */
export const SHOP = [
  ...Object.entries(ACCESSORIES).map(([id, a]) => ({ id, cat: 'wear', ...a })),
  // Машины будаг
  { id: 'car.paint.red', cat: 'car', name: 'Улаан будаг', emoji: '🟥', price: 120, slot: 'carPaint', data: { body: 0xe83a4a, dark: 0xb9243a } },
  { id: 'car.paint.blue', cat: 'car', name: 'Цэнхэр будаг', emoji: '🟦', price: 120, slot: 'carPaint', data: { body: 0x3d8bff, dark: 0x2a63c4 } },
  { id: 'car.paint.green', cat: 'car', name: 'Ногоон будаг', emoji: '🟩', price: 120, slot: 'carPaint', data: { body: 0x4fbf5a, dark: 0x35913f } },
  { id: 'car.paint.pink', cat: 'car', name: 'Ягаан будаг', emoji: '🩷', price: 120, slot: 'carPaint', data: { body: 0xff7ab8, dark: 0xd9548f } },
  { id: 'car.paint.purple', cat: 'car', name: 'Нил ягаан будаг', emoji: '🟪', price: 120, slot: 'carPaint', data: { body: 0x9b6bff, dark: 0x6f46c9 } },
  // Машины чимэг
  { id: 'car.flag', cat: 'car', name: 'Туг', emoji: '🚩', price: 80, slot: 'carDecor', data: 'flag' },
  { id: 'car.antenna', cat: 'car', name: 'Антенн бөмбөг', emoji: '📡', price: 60, slot: 'carDecor', data: 'antenna' },
  { id: 'car.crate', cat: 'car', name: 'Жимсний хайрцаг', emoji: '📦', price: 100, slot: 'carDecor', data: 'crate' },
  // Луувсай
  { id: 'dog.collar.blue', cat: 'dog', name: 'Цэнхэр хүзүүвч', emoji: '🔵', price: 40, slot: 'dogCollar', data: 0x3d8bff },
  { id: 'dog.collar.green', cat: 'dog', name: 'Ногоон хүзүүвч', emoji: '🟢', price: 40, slot: 'dogCollar', data: 0x4fbf5a },
  { id: 'dog.collar.gold', cat: 'dog', name: 'Алтан хүзүүвч', emoji: '🟡', price: 40, slot: 'dogCollar', data: 0xffc93c },
  { id: 'dog.bandana', cat: 'dog', name: 'Бандана', emoji: '🔻', price: 70, slot: 'dogExtra', data: 'bandana' },
  { id: 'dog.hat', cat: 'dog', name: 'Жижиг малгай', emoji: '🧢', price: 90, slot: 'dogHat', data: 'hat' },
  // Алхахад гарах эффект
  { id: 'trail.stars', cat: 'trail', name: 'Одны мөр', emoji: '✨', price: 300, slot: 'trail', data: 'stars' },
  { id: 'trail.petals', cat: 'trail', name: 'Дэлбээний мөр', emoji: '🌸', price: 350, slot: 'trail', data: 'petals' },
  { id: 'trail.rainbow', cat: 'trail', name: 'Солонгон мөр', emoji: '🌈', price: 500, slot: 'trail', data: 'rainbow' },
  // Миний булан (талбайн дэргэд)
  { id: 'home.flowers', cat: 'home', name: 'Цэцгийн мандал', emoji: '🌷', price: 80, data: 'flowers' },
  { id: 'home.mailbox', cat: 'home', name: 'Шуудангийн хайрцаг', emoji: '📮', price: 60, data: 'mailbox' },
  { id: 'home.bench', cat: 'home', name: 'Сандал', emoji: '🪑', price: 90, data: 'bench' },
  { id: 'home.lamp', cat: 'home', name: 'Дэнлүү', emoji: '🏮', price: 100, data: 'lamp' },
  { id: 'home.bunting', cat: 'home', name: 'Тугны оосор', emoji: '🎏', price: 120, data: 'bunting' },
  { id: 'home.scarecrow', cat: 'home', name: 'Манаач хүн', emoji: '🎃', price: 150, data: 'scarecrow' },
];
export const SHOP_BY_ID = Object.fromEntries(SHOP.map((i) => [i.id, i]));
