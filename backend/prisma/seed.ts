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


  // Give the demo accounts explored territory around their home city, so the
  // leaderboard's walking metric lines up with the XP they were seeded with.
  const EXPLORED: { userId: number; lat: number; lng: number; rings: number }[] = [
    { userId: oleksiy.id, lat: 49.8397, lng: 24.0297, rings: 4 }, // Львів
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

  // Demo friendships
  await prisma.friend.createMany({
    data: [],
  });

  // A short demo conversation between friends.
  await prisma.message.createMany({
    data: [],
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
