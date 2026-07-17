import { PrismaClient } from '@prisma/client';
import { SEED_PLACES } from '../prisma/seed';

// Additive-only, name-matched correction: updates each existing Place row's
// `difficulty` to match the curated value in SEED_PLACES, for rows that were
// inserted before an explicit difficulty was set on their source entry (they
// got the normalize() default of 1 instead). Never deletes or creates rows.
const prisma = new PrismaClient();

async function main() {
  let updated = 0;
  for (const p of SEED_PLACES) {
    if (p.difficulty === undefined) continue;
    const res = await prisma.place.updateMany({
      where: { name: p.name, source: 'admin' },
      data: { difficulty: p.difficulty },
    });
    if (res.count > 0) updated += res.count;
  }
  console.log(`Updated difficulty on ${updated} place row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
