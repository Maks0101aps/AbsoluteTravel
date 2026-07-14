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
}[] = [
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

async function main() {
  // Clean up
  await prisma.coinTransaction.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.destination.deleteMany();
  await prisma.place.deleteMany();
  await prisma.user.deleteMany();

  // Seed the curated explore-map places (approved, admin-sourced).
  await prisma.place.createMany({
    data: SEED_PLACES.map((p) => ({
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
