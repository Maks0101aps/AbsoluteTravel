import { PrismaClient } from '@prisma/client';

// Excludes visually ambiguous characters (0/O, 1/I/L) so codes are easy to
// read off a screen and retype by hand.
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

/** Generates a friendCode guaranteed unique against the current table. */
export async function generateUniqueFriendCode(
  prisma: Pick<PrismaClient, 'user'>,
): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomCode();
    const existing = await prisma.user.findUnique({ where: { friendCode: code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique friend code');
}
