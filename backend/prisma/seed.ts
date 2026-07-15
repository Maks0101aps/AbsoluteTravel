import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Demo password for all seeded accounts (min 8 chars)
const DEMO_PASSWORD_HASH = bcrypt.hashSync('demo1234', 10);

// Curated starter places for the explore map. Coordinates are real WGS84
// (lat/lng); the frontend projects them onto the stylised Ukraine silhouette.
// Seeded as approved + admin so the map is populated out of the box.
const SEED_PLACES: {
  name: string;
  region: string;
  category: string;
  description: string;
  bestSeason: string;
  lat: number;
  lng: number;
  difficulty?: number;
}[] = [
  // --- Kyiv: a handful of exploration points across difficulty levels -------
  { name: 'Софійський майдан', region: 'м. Київ', category: 'history', lat: 50.4526, lng: 30.5147, bestSeason: 'Будь-коли', difficulty: 1, description: 'Серце старого Києва: Софійський собор (ЮНЕСКО), пам’ятник Богдану Хмельницькому. Легка прогулянка в самому центрі — ідеально для першого чекпоїнта.' },
  { name: 'Андріївський узвіз', region: 'м. Київ', category: 'history', lat: 50.4595, lng: 30.5157, bestSeason: 'Квітень – жовтень', difficulty: 1, description: 'Найвідоміша вулиця-музей Києва. Андріївська церква, сувенірні лавки, галереї — легкий і атмосферний маршрут.' },
  { name: 'Парк Володимирська гірка', region: 'м. Київ', category: 'nature', lat: 50.4547, lng: 30.5219, bestSeason: 'Травень – вересень', difficulty: 2, description: 'Оглядовий парк над Дніпром із пам’ятником князю Володимиру. Треба спуститися й піднятися крутими стежками — трохи фізичного навантаження.' },
  { name: 'Києво-Печерська лавра', region: 'м. Київ', category: 'history', lat: 50.4340, lng: 30.5581, bestSeason: 'Будь-коли', difficulty: 2, description: 'Духовний центр із тисячолітньою історією та печерами. Дослідження всієї території й підземних лабіринтів вимагає часу й терпіння.' },
  { name: 'Батьківщина-Мати', region: 'м. Київ', category: 'city', lat: 50.4231, lng: 30.5580, bestSeason: 'Квітень – жовтень', difficulty: 3, description: 'Монумент і музей історії України у Другій світовій війні. Підйом на оглядовий майданчик щита — вимагає гарної фізичної форми.' },
  { name: 'Гідропарк і острів Труханів', region: 'м. Київ', category: 'nature', lat: 50.4602, lng: 30.5893, bestSeason: 'Червень – серпень', difficulty: 3, description: 'Острівна зона відпочинку на Дніпрі: пляжі, велодоріжки, протоки. Повне дослідження острова — це кілька годин активної ходьби чи велопрогулянки.' },
  { name: 'Заброшена канатна дорога, Дніпровські схили', region: 'м. Київ', category: 'nature', lat: 50.4467, lng: 30.5497, bestSeason: 'Травень – жовтень', difficulty: 4, description: 'Приховані дикі стежки дніпровських схилів між парками. Складний маршрут без чіткої розмітки — тільки для досвідчених дослідників міста.' },

  // --- Lviv: a matching set of city exploration points -----------------------
  { name: 'Площа Ринок', region: 'Львівська область', category: 'city', lat: 49.8419, lng: 24.0315, bestSeason: 'Будь-коли', difficulty: 1, description: 'Головна площа Львова під охороною ЮНЕСКО. Ратуша, кав’ярні, кольорові кам’яниці — найлегша точка для старту дослідження міста.' },
  { name: 'Личаківський цвинтар', region: 'Львівська область', category: 'history', lat: 49.8344, lng: 24.0578, bestSeason: 'Квітень – жовтень', difficulty: 2, description: 'Один з найстаріших некрополів Європи з унікальною скульптурою. Велика територія — треба виділити щонайменше годину, щоб дослідити ключові алеї.' },
  { name: 'Високий замок', region: 'Львівська область', category: 'nature', lat: 49.8487, lng: 24.0389, bestSeason: 'Травень – жовтень', difficulty: 2, description: 'Найвища точка Львова з панорамою на все місто. Підйом крутою стежкою через парк — легке фізичне навантаження, але того варте.' },
  { name: 'Львівська опера', region: 'Львівська область', category: 'city', lat: 49.8425, lng: 24.0217, bestSeason: 'Будь-коли', difficulty: 1, description: 'Неоренесансна будівля театру опери та балету — одна з найкрасивіших в Європі. Легка й доступна точка в центрі.' },
  { name: 'Парк Знесіння', region: 'Львівська область', category: 'nature', lat: 49.8578, lng: 24.0631, bestSeason: 'Травень – вересень', difficulty: 3, description: 'Великий лісопарк на околиці з крутими пагорбами й дикими стежками. Повноцінний трекінг для тих, хто хоче втекти від міського шуму.' },
  { name: 'Підземні тунелі Личаківського р-ну', region: 'Львівська область', category: 'history', lat: 49.8289, lng: 24.0692, bestSeason: 'Червень – вересень', difficulty: 4, description: 'Малодосліджені підземні ходи старого району. Потрібна підготовка, ліхтар і обережність — це справжній виклик для мандрівника.' },

  { name: 'Львів', region: 'Львівська область', category: 'city', lat: 49.842, lng: 24.032, bestSeason: 'Квітень – жовтень', description: 'Історичний центр під охороною ЮНЕСКО: площа Ринок, каварні, Високий замок. Прогуляйся вуличками Старого міста і піднімись на дах Львівської ратуші.' },
  { name: 'Буковель і Карпати', region: 'Івано-Франківська область', category: 'mountains', lat: 48.363, lng: 24.408, bestSeason: 'Грудень – березень, червень – вересень', description: 'Найбільший гірський курорт України. Взимку — лижі та сноуборд, влітку — гірські озера, підйомники й трекінг у Карпатах.' },
  { name: 'Говерла', region: 'Закарпатська / Івано-Франківська', category: 'mountains', lat: 48.160, lng: 24.500, bestSeason: 'Червень – вересень', description: 'Найвища вершина України (2061 м). Одноденне сходження стежкою від Заросляка — must-do для кожного мандрівника.' },
  { name: 'Озеро Синевир', region: 'Закарпатська область', category: 'nature', lat: 48.618, lng: 23.688, bestSeason: 'Травень – жовтень', description: 'Найбільше гірське озеро Карпат серед смерекових лісів. Поряд — реабілітаційний центр бурих ведмедів.' },
  { name: 'Кам’янець-Подільський', region: 'Хмельницька область', category: 'history', lat: 48.674, lng: 26.586, bestSeason: 'Травень – вересень', description: 'Стара фортеця над каньйоном річки Смотрич. Одне з наймальовничіших укріплень України — обов’язково пройдись Замковим мостом.' },
  { name: 'Хотинська фортеця', region: 'Чернівецька область', category: 'history', lat: 48.520, lng: 26.494, bestSeason: 'Травень – вересень', description: 'Могутня середньовічна твердиня на березі Дністра. Часто стає локацією для історичних фільмів та фестивалів.' },
  { name: 'Чернівці', region: 'Чернівецька область', category: 'city', lat: 48.292, lng: 25.935, bestSeason: 'Квітень – жовтень', description: 'Резиденція митрополитів Буковини (ЮНЕСКО) та затишний центр у австрійському стилі. «Маленький Відень» України.' },
  { name: 'Бакота', region: 'Хмельницька область', category: 'nature', lat: 48.567, lng: 26.900, bestSeason: 'Травень – вересень', description: 'Затоплене село й скельний монастир над Дністровським каньйоном. Ідеальні краєвиди для світанку та фото.' },
  { name: 'Софіївський парк, Умань', region: 'Черкаська область', category: 'nature', lat: 48.759, lng: 30.221, bestSeason: 'Травень – жовтень', description: 'Один з найкрасивіших дендропарків Європи: водоспади, гроти, підземна річка та романтичні алеї.' },
  { name: 'Київ', region: 'м. Київ', category: 'city', lat: 50.450, lng: 30.523, bestSeason: 'Квітень – жовтень', description: 'Софія Київська, Києво-Печерська лавра, Андріївський узвіз і набережні Дніпра. Серце країни з тисячолітньою історією.' },
  { name: 'Тунель кохання, Клевань', region: 'Рівненська область', category: 'nature', lat: 50.746, lng: 25.977, bestSeason: 'Травень, вересень – жовтень', description: 'Залізнична колія, повністю оплетена зеленню в арку. Найкраще виглядає в свіжій зелені або золотій осені.' },
  { name: 'Чернігів', region: 'Чернігівська область', category: 'history', lat: 51.494, lng: 31.294, bestSeason: 'Квітень – жовтень', description: 'Одне з найдавніших міст Русі: Спаський і Борисоглібський собори, вали Дитинця та легендарні печери.' },
  { name: 'Харків', region: 'Харківська область', category: 'city', lat: 49.994, lng: 36.230, bestSeason: 'Травень – вересень', description: 'Найбільша площа Європи — площа Свободи, сад Шевченка й потужна університетська атмосфера.' },
  { name: 'Хортиця, Запоріжжя', region: 'Запорізька область', category: 'history', lat: 47.842, lng: 35.078, bestSeason: 'Травень – вересень', description: 'Найбільший острів на Дніпрі й колиска козацтва. Музей історії запорізького козацтва та реконструйована Січ.' },
  { name: 'Асканія-Нова', region: 'Херсонська область', category: 'nature', lat: 46.454, lng: 33.881, bestSeason: 'Квітень – червень', description: 'Найстаріший степовий біосферний заповідник світу. Зоопарк просто неба, де в степу пасуться зебри й бізони.' },
  { name: 'Одеса', region: 'Одеська область', category: 'coast', lat: 46.482, lng: 30.723, bestSeason: 'Червень – вересень', description: 'Потьомкінські сходи, Дерибасівська, оперний театр і морське узбережжя. Літня столиця з особливим гумором.' },
  { name: 'Аккерманська фортеця', region: 'Одеська область', category: 'history', lat: 46.201, lng: 30.352, bestSeason: 'Травень – вересень', description: 'Одна з найбільших фортець України на березі Дністровського лиману в Білгороді-Дністровському. Понад 2000 років історії.' },
];
const CITIES = [
  { name: 'Київ', lat: 50.4501, lng: 30.5234, region: 'м. Київ' },
  { name: 'Львів', lat: 49.8397, lng: 24.0297, region: 'Львівська область' },
  { name: 'Одеса', lat: 46.4825, lng: 30.7233, region: 'Одеська область' },
  { name: 'Харків', lat: 49.9935, lng: 36.2304, region: 'Харківська область' },
  { name: 'Дніпро', lat: 48.4647, lng: 35.0462, region: 'Дніпропетровська область' },
  { name: 'Запоріжжя', lat: 47.8388, lng: 35.1396, region: 'Запорізька область' },
  { name: 'Вінниця', lat: 49.2331, lng: 28.4682, region: 'Вінницька область' },
  { name: 'Івано-Франківськ', lat: 48.9215, lng: 24.7097, region: 'Івано-Франківська область' },
  { name: 'Полтава', lat: 49.5883, lng: 34.5514, region: 'Полтавська область' },
  { name: 'Черкаси', lat: 49.4444, lng: 32.0598, region: 'Черкаська область' },
  { name: 'Луцьк', lat: 50.7472, lng: 25.3254, region: 'Волинська область' },
  { name: 'Миколаїв', lat: 46.9750, lng: 31.9946, region: 'Миколаївська область' },
  { name: 'Чернігів', lat: 51.494, lng: 31.294, region: 'Чернігівська область' },
  { name: 'Чернівці', lat: 48.292, lng: 25.935, region: 'Чернівецька область' },
  { name: 'Умань', lat: 48.759, lng: 30.221, region: 'Черкаська область' }
];

const OFFSETS = [
  { lat: 0.003, lng: 0.003 },
  { lat: 0.004, lng: -0.003 },
  { lat: -0.003, lng: 0.004 },
  { lat: -0.004, lng: -0.004 },
  { lat: 0.008, lng: 0.007 },
  { lat: 0.007, lng: -0.008 },
  { lat: -0.008, lng: 0.007 },
  { lat: -0.007, lng: -0.007 },
  { lat: 0.018, lng: 0.016 },
  { lat: 0.016, lng: -0.018 },
  { lat: -0.018, lng: 0.017 },
  { lat: -0.017, lng: -0.016 },
  { lat: 0.038, lng: 0.035 },
  { lat: 0.035, lng: -0.038 },
  { lat: -0.038, lng: 0.037 },
];

const CATEGORY_TEMPLATES: Record<string, { names: string[]; descSuffix: string }[]> = {
  nature: [
    { names: ["Центральний парк {City}", "Міський сад {City}", "Парк культури {City}"], descSuffix: "Мальовничий та просторий парк, чудове місце для відпочинку всією родиною, неспішних вечірніх прогулянок і спортивних занять на свіжому повітрі." },
    { names: ["Озеро біля {City}", "Лісове озеро", "Блакитна затока"], descSuffix: "Неймовірно красива природна водойма з прозорою водою, оточена густим зеленим лісом. Ідеально підходить для кемпінгу, риболовлі чи пікніків." },
    { names: ["Каньйон {City}", "Скеляста ущелина", "Мальовничий яр"], descSuffix: "Велична природна пам'ятка з гранітними скелями та стрімкою річкою. Чудове місце для любителів екстремального туризму та скелелазіння." },
  ],
  mountains: [
    { names: ["Оглядовий майданчик {City}", "Пагорб вітрів {City}", "Високий шпиль"], descSuffix: "Найвища точка місцевості, з якої відкривається захоплюючий панорамний вигляд на все місто, навколишні ліси та річкові долини." },
    { names: ["Лиса гора {City}", "Червоний пагорб", "Зелений курган"], descSuffix: "Містичне та овіяне легендами підняття з унікальним рельєфом. Популярний туристичний маршрут для короткого пішого трекінгу." },
  ],
  history: [
    { names: ["Стародавня фортеця {City}", "Замок {City}", "Оборонна вежа {City}"], descSuffix: "Велична середньовічна споруда, яка зберегла дух минулих епох. Тут ви зможете дослідити підземні лабіринти та старовинну архітектуру." },
    { names: ["Історичний музей {City}", "Археологічний комплекс {City}", "Старе городище"], descSuffix: "Місце з багатою історією та великою кількістю унікальних архітектурних пам'яток. Розповідає про життя та побут предків у давні часи." },
  ],
  city: [
    { names: ["Площа Свободи {City}", "Театральна площа {City}", "Площа Ринок"], descSuffix: "Культурний та географічний центр міста, де відбуваються найважливіші події, ярмарки та святкові фестивалі." },
    { names: ["Пішохідний пасаж {City}", "Вулиця мистецтв {City}", "Затишний дворик"], descSuffix: "Атмосферний куточок міста з оригінальними кав'ярнями, сувенірними крамницями та старовинними фасадами будівель." },
    { names: ["Оперний театр", "Драматичний театр {City}", "Філармонія"], descSuffix: "Видатна архітектурна перлина міста в стилі класицизму або неоренесансу. Обов'язкова локація для відвідування шанувальниками високого мистецтва." },
  ],
  coast: [
    { names: ["Центральна набережна {City}", "Річковий причал {City}", "Пляжний променад"], descSuffix: "Красива облаштована зона біля води для прогулянок, катання на велосипедах і споглядання вечірніх заходів сонця." },
    { names: ["Маяк {City}", "Оглядовий пірс {City}", "Затишна затока"], descSuffix: "Мальовничий куточок узбережжя, де можна насолодитися шумом хвиль, зробити чудові фотографії та орендувати човен чи катамаран." },
  ]
};

const GENERATED_PLACES: typeof SEED_PLACES = [];

CITIES.forEach((city) => {
  for (let i = 0; i < 15; i++) {
    const difficulty = (i % 4) + 1;
    const categories = ['nature', 'mountains', 'history', 'city', 'coast'];
    const category = categories[i % categories.length];
    
    const templates = CATEGORY_TEMPLATES[category];
    const template = templates[i % templates.length];
    
    const nameTemplate = template.names[i % template.names.length];
    const name = nameTemplate.replace(/{City}/g, city.name) + ` (Точка ${i + 1})`;
    const description = `${name} — це чудова локація у місті ${city.name}. ${template.descSuffix}`;
    
    const offset = OFFSETS[i];
    const lat = Number((city.lat + offset.lat).toFixed(5));
    const lng = Number((city.lng + offset.lng).toFixed(5));
    
    GENERATED_PLACES.push({
      name,
      region: city.region,
      category,
      description,
      bestSeason: 'Будь-коли',
      lat,
      lng,
      difficulty,
    });
  }
});

async function main() {
  // Clean up
  await prisma.message.deleteMany();
  await prisma.friend.deleteMany();
  await prisma.coinTransaction.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.destination.deleteMany();
  await prisma.place.deleteMany();
  await prisma.user.deleteMany();

  // Seed the curated explore-map places (approved, admin-sourced).
  const allPlaces = [...SEED_PLACES, ...GENERATED_PLACES];
  await prisma.place.createMany({
    data: allPlaces.map((p) => ({
      ...p,
      photos: '[]',
      status: 'approved',
      source: 'admin',
      submittedBy: 'Absolute Travel',
      aiDecision: 'approve',
      aiReason: 'Куроване місце від команди Absolute Travel.',
      reviewedAt: new Date(),
    })),
  });

  // Create Achievements
  const ach1 = await prisma.achievement.create({
    data: {
      title: 'Карпатський дослідник',
      description: 'Відкрий 25 місць у Карпатах',
      xpReward: 250,
      icon: 'mountain',
    },
  });

  const ach2 = await prisma.achievement.create({
    data: {
      title: 'Історія України',
      description: 'Відвідай 20 історичних місць',
      xpReward: 200,
      icon: 'history',
    },
  });

  const ach3 = await prisma.achievement.create({
    data: {
      title: '50 природних місць',
      description: 'Відкрий 50 природних локацій',
      xpReward: 300,
      icon: 'nature',
    },
  });

  // Create Users
  const oleksiy = await prisma.user.create({
    data: {
      username: 'oleksiy',
      email: 'oleksiy@example.com',
      password: DEMO_PASSWORD_HASH,
      city: 'Львів',
      region: 'Львівська область',
      name: 'Олексій',
      avatar: '/assets/avatar_oleksiy.avif',
      level: 24,
      xp: 2450,
      coins: 1500,
      currentDestination: 'Львів',
    },
  });

  const mariya = await prisma.user.create({
    data: {
      username: 'mariya',
      email: 'mariya@example.com',
      password: DEMO_PASSWORD_HASH,
      city: 'Ужгород',
      region: 'Закарпатська область',
      name: 'Марія',
      avatar: '/assets/avatar_mariya.avif',
      level: 18,
      xp: 1200,
      coins: 900,
      currentDestination: 'Синевир',
    },
  });

  const dmytro = await prisma.user.create({
    data: {
      username: 'dmytro',
      email: 'dmytro@example.com',
      password: DEMO_PASSWORD_HASH,
      city: 'Івано-Франківськ',
      region: 'Івано-Франківська область',
      name: 'Дмитро',
      avatar: '/assets/avatar_dmytro.avif',
      level: 21,
      xp: 1850,
      coins: 1200,
      currentDestination: 'Говерла',
    },
  });

  const iryna = await prisma.user.create({
    data: {
      username: 'iryna',
      email: 'iryna@example.com',
      password: DEMO_PASSWORD_HASH,
      city: 'Кам’янець-Подільський',
      region: 'Хмельницька область',
      name: 'Ірина',
      avatar: '/assets/avatar_iryna.avif',
      level: 15,
      xp: 950,
      coins: 450,
      currentDestination: 'Бакота',
    },
  });

  // Create Destinations
  await prisma.destination.createMany({
    data: [
      {
        name: 'Львів',
        category: 'Історичний центр',
        image: '/assets/lviv_thumb.avif',
        verified: true,
        xpReward: 100,
      },
      {
        name: 'Карпати',
        category: 'Гірський хребет',
        image: '/assets/carpathians_thumb.avif',
        verified: true,
        xpReward: 250,
      },
    ],
  });

  // Connect user achievements
  await prisma.userAchievement.create({
    data: {
      userId: oleksiy.id,
      achievementId: ach1.id,
    },
  });

  await prisma.userAchievement.create({
    data: {
      userId: oleksiy.id,
      achievementId: ach2.id,
    },
  });

  // Demo friendships: the seeded travellers already know each other, and one
  // pending request is left for the demo of the requests inbox.
  await prisma.friend.createMany({
    data: [
      { senderId: oleksiy.id, receiverId: mariya.id, status: 'ACCEPTED' },
      { senderId: dmytro.id, receiverId: oleksiy.id, status: 'ACCEPTED' },
      { senderId: mariya.id, receiverId: dmytro.id, status: 'ACCEPTED' },
      { senderId: iryna.id, receiverId: oleksiy.id, status: 'PENDING' },
    ],
  });

  // A short demo conversation between friends.
  const now = Date.now();
  await prisma.message.createMany({
    data: [
      { senderId: mariya.id, receiverId: oleksiy.id, text: 'Привіт! Ти вже був на Синевирі?', createdAt: new Date(now - 1000 * 60 * 60 * 5), readAt: new Date(now - 1000 * 60 * 60 * 4) },
      { senderId: oleksiy.id, receiverId: mariya.id, text: 'Ще ні, планую на вихідні. Поїдеш зі мною?', createdAt: new Date(now - 1000 * 60 * 60 * 4), readAt: new Date(now - 1000 * 60 * 60 * 3) },
      { senderId: mariya.id, receiverId: oleksiy.id, text: 'Так! Візьми дощовик — у горах мінлива погода 🌦️', createdAt: new Date(now - 1000 * 60 * 30) },
      { senderId: dmytro.id, receiverId: oleksiy.id, text: 'Готовий до Говерли наступного місяця?', createdAt: new Date(now - 1000 * 60 * 60 * 24) },
    ],
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
