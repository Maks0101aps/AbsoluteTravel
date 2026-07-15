import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';

export interface VerifyCheckmarkDto {
  userId?: number;
  placeId?: number;
  lat?: number;
  lng?: number;
  photo?: string;
}

// XP reward per difficulty level — mirrors DIFFICULTY_META on the frontend.
const DIFFICULTY_XP: Record<number, number> = { 1: 20, 2: 50, 3: 100, 4: 250 };

// A visit only counts within this radius of the point.
const MAX_DISTANCE_METERS = 300;

const IMAGE_DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp|avif|gif);base64,[A-Za-z0-9+/=\s]+$/;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // ~5MB decoded-ish

@Injectable()
export class CheckmarksService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  /** Verify a claimed visit: check distance, run AI, award XP/coins once. */
  async verify(dto: VerifyCheckmarkDto) {
    const userId = Number(dto.userId);
    const placeId = Number(dto.placeId);
    const lat = Number(dto.lat);
    const lng = Number(dto.lng);
    const photo = typeof dto.photo === 'string' ? dto.photo : '';

    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('Не вказано користувача');
    }
    if (!placeId || Number.isNaN(placeId)) {
      throw new BadRequestException('Не вказано місце');
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Не вдалося визначити твоє місцезнаходження');
    }
    if (!IMAGE_DATA_URL_RE.test(photo)) {
      throw new BadRequestException('Додай коректне фото');
    }
    if (approxBytesOfDataUrl(photo) > MAX_PHOTO_BYTES) {
      throw new BadRequestException('Фото завелике — спробуй менше зображення');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Користувача не знайдено');

    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place) throw new NotFoundException('Місце не знайдено');

    // Already counted for this user? Can't earn it twice.
    const existing = await this.prisma.checkmark.findUnique({
      where: { userId_placeId: { userId, placeId } },
    });
    if (existing) {
      throw new ConflictException('Місце вже зараховано');
    }

    // Distance gate.
    const distanceMeters = haversine(lat, lng, place.lat, place.lng);
    if (distanceMeters > MAX_DISTANCE_METERS) {
      throw new BadRequestException(
        `Ти закадто далеко від точки (${Math.round(distanceMeters)} м). Підійди ближче.`,
      );
    }

    // AI verification (gracefully approves when unavailable).
    const verdict = await this.ai.verifyVisit({
      placeName: place.name,
      placeDescription: place.description,
      placePhotos: parsePhotos(place.photos),
      userPhoto: photo,
    });

    if (!verdict.verified) {
      return {
        verified: false,
        xpAwarded: 0,
        coinsAwarded: 0,
        newLevel: user.level,
        leveledUp: false,
        reason: verdict.reason,
      };
    }

    const xpAwarded = DIFFICULTY_XP[place.difficulty] ?? DIFFICULTY_XP[1];
    const coinsAwarded = Math.floor(xpAwarded / 2);
    const newXp = user.xp + xpAwarded;
    const newLevel = levelFromXp(newXp);
    const leveledUp = newLevel > user.level;

    await this.prisma.$transaction([
      this.prisma.checkmark.create({
        data: {
          userId,
          placeId,
          photo,
          distanceMeters,
          aiVerified: verdict.verified,
          aiReason: verdict.reason,
          xpAwarded,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          xp: newXp,
          coins: { increment: coinsAwarded },
          level: newLevel,
        },
      }),
      this.prisma.coinTransaction.create({
        data: { userId, amount: coinsAwarded, reason: `checkmark:${placeId}` },
      }),
    ]);

    return {
      verified: true,
      xpAwarded,
      coinsAwarded,
      newLevel,
      leveledUp,
      reason: verdict.reason,
    };
  }

  /** All places the user has verified, with basic Place data (for the profile). */
  async listForUser(userId: number) {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('Не вказано користувача');
    }
    const checkmarks = await this.prisma.checkmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { place: true },
    });
    return checkmarks.map((c) => ({
      id: c.id,
      placeId: c.placeId,
      distanceMeters: c.distanceMeters,
      aiVerified: c.aiVerified,
      aiReason: c.aiReason,
      xpAwarded: c.xpAwarded,
      createdAt: c.createdAt,
      place: {
        id: c.place.id,
        name: c.place.name,
        region: c.place.region,
        category: c.place.category,
        difficulty: c.place.difficulty,
        lat: c.place.lat,
        lng: c.place.lng,
      },
    }));
  }
}

// Great-circle distance between two WGS84 points, in metres.
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius, metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Simple level curve: level = 1 + floor(sqrt(xp / 50)).
function levelFromXp(xp: number): number {
  return 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 50));
}

function parsePhotos(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function approxBytesOfDataUrl(url: string): number {
  const comma = url.indexOf(',');
  const b64 = comma >= 0 ? url.slice(comma + 1) : url;
  return Math.floor((b64.length * 3) / 4);
}
