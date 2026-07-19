import { PrismaClient } from '@prisma/client';
import { SEED_PLACES } from '../prisma/seed';

// Additive-only recovery for the curated starter places: unlike prisma/seed.ts
// (which wipes every table before reseeding), this only INSERTs curated rows
// that aren't already present by name — safe to run against a live database
// that already has real user submissions, checkmarks, etc. Use this if the
// curated map ever looks sparse again (e.g. after a schema sync that touched
// the Place table) instead of the destructive full seed.
const prisma = new PrismaClient();

async function main() {
  const existingNames = new Set(
    (await prisma.place.findMany({ select: { name: true } })).map((p) => p.name),
  );

  const toInsert = SEED_PLACES.filter((p) => !existingNames.has(p.name));

  if (toInsert.length === 0) {
    console.log('All curated places already present — nothing to insert.');
    return;
  }

  await prisma.place.createMany({
    data: toInsert.map((p) => {
      const { id, ...rest } = p;
      return {
        ...rest,
        photos: JSON.stringify((p as any).photos || []),
        status: 'approved',
        source: 'admin',
        submittedBy: 'Absolute Travel',
        aiDecision: 'approve',
        aiReason: 'Куроване місце від команди Absolute Travel.',
        reviewedAt: new Date(),
      };
    }),
  });

  console.log(`Inserted ${toInsert.length} curated places (skipped ${SEED_PLACES.length - toInsert.length} already present).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
