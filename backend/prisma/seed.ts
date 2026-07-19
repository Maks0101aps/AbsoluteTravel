import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { gridDisk, latLngToCell } from 'h3-js';
import { EXPLORE_RESOLUTION } from '../src/exploration/exploration.service';
import { GENERATED_PLACES } from './generatedPlaces';
import { generateUniqueFriendCode } from '../src/friends/friend-code.util';

const prisma = new PrismaClient();

// Demo password for all seeded accounts (min 8 chars)
const DEMO_PASSWORD_HASH = bcrypt.hashSync('demo1234', 10);

export const SEED_PLACES = GENERATED_PLACES;

async function main() {
  // Clean up
  await prisma.labelReaction.deleteMany();
  await prisma.friendLabel.deleteMany();
  await prisma.wallPost.deleteMany();
  await prisma.checkmark.deleteMany();
  await prisma.visitedCell.deleteMany();
  await prisma.achievementClaim.deleteMany();
  await prisma.message.deleteMany();
  await prisma.friend.deleteMany();
  await prisma.coinTransaction.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.destination.deleteMany();
  await prisma.place.deleteMany();
  await prisma.user.deleteMany();

  // Seed the curated explore-map places (approved, admin-sourced).
  await prisma.place.createMany({
    data: SEED_PLACES.map((p) => ({
      name: p.name,
      region: p.region,
      category: p.category,
      description: p.description,
      bestSeason: p.bestSeason,
      lat: p.lat,
      lng: p.lng,
      photos: JSON.stringify(p.photos || []),
      difficulty: p.difficulty ?? 1,
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
      isVerified: true,
      city: 'Львів',
      region: 'Львівська область',
      name: 'Олексій',
      friendCode: await generateUniqueFriendCode(prisma),
      avatar: '/assets/avatar_oleksiy.avif',
      level: 14,
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
      isVerified: true,
      city: 'Ужгород',
      region: 'Закарпатська область',
      name: 'Марія',
      friendCode: await generateUniqueFriendCode(prisma),
      avatar: '/assets/avatar_mariya.avif',
      level: 10,
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
      isVerified: true,
      city: 'Івано-Франківськ',
      region: 'Івано-Франківська область',
      name: 'Дмитро',
      friendCode: await generateUniqueFriendCode(prisma),
      avatar: '/assets/avatar_dmytro.avif',
      level: 12,
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
      isVerified: true,
      city: 'Кам’янець-Подільський',
      region: 'Хмельницька область',
      name: 'Ірина',
      friendCode: await generateUniqueFriendCode(prisma),
      avatar: '/assets/avatar_iryna.avif',
      level: 8,
      xp: 950,
      coins: 450,
      currentDestination: 'Бакота',
    },
  });

  // Give the demo accounts explored territory around their home city, so the
  // leaderboard's walking metric lines up with the XP they were seeded with.
  const EXPLORED: { userId: number; lat: number; lng: number; rings: number }[] = [
    { userId: oleksiy.id, lat: 49.8397, lng: 24.0297, rings: 4 }, // Львів
    { userId: dmytro.id, lat: 48.9226, lng: 24.7111, rings: 3 }, // Івано-Франківськ
    { userId: mariya.id, lat: 48.6208, lng: 22.2879, rings: 3 }, // Ужгород
    { userId: iryna.id, lat: 48.6845, lng: 26.5854, rings: 2 }, // Кам’янець-Подільський
  ];
  for (const spot of EXPLORED) {
    const cells = gridDisk(latLngToCell(spot.lat, spot.lng, EXPLORE_RESOLUTION), spot.rings);
    await prisma.visitedCell.createMany({
      data: cells.map((cellId) => ({ userId: spot.userId, cellId })),
    });
  }

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

// Guarded: this file also exports SEED_PLACES for scripts/reseedPlaces.ts to
// reuse. Without this check, merely *importing* the file for that constant
// would trigger the full destructive seed (deletes every table) as a module
// side-effect — exactly what happened once already. Only run main() when this
// file is executed directly (`npm run seed` / `ts-node prisma/seed.ts`).
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
