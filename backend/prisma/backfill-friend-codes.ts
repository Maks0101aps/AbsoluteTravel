// One-off: assigns a friendCode to any existing user that predates the
// friendCode column (added after data already existed, so `prisma db push`
// left it null on old rows instead of requiring a default for all of them).
// Run once after `prisma db push`: npx ts-node prisma/backfill-friend-codes.ts
import { PrismaClient } from '@prisma/client';
import { generateUniqueFriendCode } from '../src/friends/friend-code.util';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { friendCode: null }, select: { id: true } });
  for (const u of users) {
    const friendCode = await generateUniqueFriendCode(prisma);
    await prisma.user.update({ where: { id: u.id }, data: { friendCode } });
  }
  console.log(`Backfilled friendCode for ${users.length} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
