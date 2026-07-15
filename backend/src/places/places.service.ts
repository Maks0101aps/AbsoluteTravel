import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { AdminService } from '../admin/admin.service';

export interface SubmitPlaceDto {
  name?: string;
  region?: string;
  category?: string;
  description?: string;
  bestSeason?: string;
  lat?: number;
  lng?: number;
  photos?: string[];
  submittedBy?: string;
  difficulty?: number;
}

export interface UpdatePlaceDto {
  name?: string;
  region?: string;
  category?: string;
  description?: string;
  bestSeason?: string;
  lat?: number;
  lng?: number;
  difficulty?: number;
}

const CATEGORIES = ['nature', 'mountains', 'history', 'city', 'coast'];
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 4;

// Rough bounding box of Ukraine (WGS84). Submissions outside it are rejected.
const UA_BOUNDS = { minLat: 44.0, maxLat: 52.6, minLng: 21.9, maxLng: 40.5 };

// Guardrails on the base64 payload so a single request can't blow up the DB.
const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // ~5MB per image (decoded-ish)
const IMAGE_DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp|avif|gif);base64,[A-Za-z0-9+/=\s]+$/;

@Injectable()
export class PlacesService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private admin: AdminService,
  ) {}

  // Shape a DB row for the public map (drops internal moderation fields).
  private toPublic(place: any) {
    return {
      id: place.id,
      name: place.name,
      region: place.region,
      category: place.category,
      description: place.description,
      bestSeason: place.bestSeason,
      lat: place.lat,
      lng: place.lng,
      photos: parsePhotos(place.photos),
      difficulty: place.difficulty,
      source: place.source,
      submittedBy: place.submittedBy,
    };
  }

  // Full shape including moderation info — for the admin panel.
  private toAdmin(place: any) {
    return {
      ...this.toPublic(place),
      status: place.status,
      aiDecision: place.aiDecision,
      aiReason: place.aiReason,
      aiScore: place.aiScore,
      createdAt: place.createdAt,
      reviewedAt: place.reviewedAt,
    };
  }

  /** Approved places for the public explore map. */
  async listApproved() {
    const places = await this.prisma.place.findMany({
      where: { status: 'approved' },
      orderBy: { createdAt: 'asc' },
    });
    return places.map((p) => this.toPublic(p));
  }

  // Validate the shared fields for both user submissions and admin creation.
  private normalize(dto: SubmitPlaceDto) {
    const name = (dto.name ?? '').trim();
    const region = (dto.region ?? '').trim();
    const category = (dto.category ?? '').trim().toLowerCase();
    const description = (dto.description ?? '').trim();
    const bestSeason = (dto.bestSeason ?? '').trim() || 'Будь-коли';
    const submittedBy = (dto.submittedBy ?? '').trim() || null;
    const lat = Number(dto.lat);
    const lng = Number(dto.lng);
    const photos = Array.isArray(dto.photos) ? dto.photos.filter((p) => typeof p === 'string') : [];
    const difficulty = Number.isFinite(Number(dto.difficulty))
      ? Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Math.round(Number(dto.difficulty))))
      : MIN_DIFFICULTY;

    if (name.length < 3) {
      throw new BadRequestException('Назва місця має містити щонайменше 3 символи');
    }
    if (name.length > 80) {
      throw new BadRequestException('Назва місця задовга');
    }
    if (!CATEGORIES.includes(category)) {
      throw new BadRequestException('Оберіть коректну категорію місця');
    }
    if (!region) {
      throw new BadRequestException('Вкажіть область або регіон');
    }
    if (description.length < 20) {
      throw new BadRequestException('Опишіть місце детальніше (щонайменше 20 символів)');
    }
    if (description.length > 1500) {
      throw new BadRequestException('Опис задовгий (максимум 1500 символів)');
    }

    // Geolocation is mandatory and must land inside Ukraine.
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Вкажіть геолокацію місця (широту й довготу)');
    }
    if (
      lat < UA_BOUNDS.minLat ||
      lat > UA_BOUNDS.maxLat ||
      lng < UA_BOUNDS.minLng ||
      lng > UA_BOUNDS.maxLng
    ) {
      throw new BadRequestException('Геолокація має бути в межах України');
    }

    // At least two photos, each a valid image data URL within the size cap.
    if (photos.length < 2) {
      throw new BadRequestException('Додайте щонайменше 2 фотографії місця');
    }
    if (photos.length > MAX_PHOTOS) {
      throw new BadRequestException(`Забагато фотографій (максимум ${MAX_PHOTOS})`);
    }
    for (const photo of photos) {
      if (!IMAGE_DATA_URL_RE.test(photo)) {
        throw new BadRequestException('Кожне фото має бути коректним зображенням');
      }
      if (approxBytesOfDataUrl(photo) > MAX_PHOTO_BYTES) {
        throw new BadRequestException('Одне з фото завелике — спробуйте менше зображення');
      }
    }

    return { name, region, category, description, bestSeason, submittedBy, lat, lng, photos, difficulty };
  }

  /**
   * User-facing submission. Validates the payload, runs AI moderation, and
   * stores the place with the resulting status:
   *   approve → approved (goes live), reject → rejected, review → pending.
   */
  async submit(dto: SubmitPlaceDto) {
    const data = this.normalize(dto);

    const verdict = await this.ai.moderatePlace({
      name: data.name,
      region: data.region,
      category: data.category,
      description: data.description,
      lat: data.lat,
      lng: data.lng,
      photos: data.photos,
    });

    const status =
      verdict.decision === 'approve'
        ? 'approved'
        : verdict.decision === 'reject'
          ? 'rejected'
          : 'pending';

    const place = await this.prisma.place.create({
      data: {
        name: data.name,
        region: data.region,
        category: data.category,
        description: data.description,
        bestSeason: data.bestSeason,
        lat: data.lat,
        lng: data.lng,
        photos: JSON.stringify(data.photos),
        difficulty: data.difficulty,
        status,
        source: 'user',
        submittedBy: data.submittedBy,
        aiDecision: verdict.decision,
        aiReason: verdict.reason,
        aiScore: verdict.score,
        reviewedAt: verdict.decision === 'review' ? null : new Date(),
      },
    });

    return {
      status,
      decision: verdict.decision,
      reason: verdict.reason,
      moderatedByAi: verdict.moderatedByAi,
      place: this.toPublic(place),
    };
  }

  // --- Admin ---------------------------------------------------------------

  async adminList(token: string | undefined, status?: string) {
    await this.admin.requireAdmin(token);
    const where = status && status !== 'all' ? { status } : {};
    const places = await this.prisma.place.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return places.map((p) => this.toAdmin(p));
  }

  async adminCounts(token: string | undefined) {
    await this.admin.requireAdmin(token);
    const grouped = await this.prisma.place.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const g of grouped) counts[g.status] = g._count._all;
    return counts;
  }

  async adminCreate(token: string | undefined, dto: SubmitPlaceDto) {
    await this.admin.requireAdmin(token);
    const data = this.normalize(dto);
    const place = await this.prisma.place.create({
      data: {
        name: data.name,
        region: data.region,
        category: data.category,
        description: data.description,
        bestSeason: data.bestSeason,
        lat: data.lat,
        lng: data.lng,
        photos: JSON.stringify(data.photos),
        difficulty: data.difficulty,
        status: 'approved',
        source: 'admin',
        submittedBy: data.submittedBy ?? 'Адміністратор',
        aiDecision: 'approve',
        aiReason: 'Додано адміністратором вручну.',
        aiScore: 1,
        reviewedAt: new Date(),
      },
    });
    return this.toAdmin(place);
  }

  /** Admin edit: name, category, region, description, position and difficulty. */
  async adminUpdate(token: string | undefined, id: number, dto: UpdatePlaceDto) {
    await this.admin.requireAdmin(token);
    const existing = await this.prisma.place.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Місце не знайдено');

    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length < 3 || name.length > 80) {
        throw new BadRequestException('Назва місця має містити від 3 до 80 символів');
      }
      data.name = name;
    }
    if (dto.region !== undefined) {
      const region = dto.region.trim();
      if (!region) throw new BadRequestException('Вкажіть область або регіон');
      data.region = region;
    }
    if (dto.category !== undefined) {
      const category = dto.category.trim().toLowerCase();
      if (!CATEGORIES.includes(category)) {
        throw new BadRequestException('Оберіть коректну категорію місця');
      }
      data.category = category;
    }
    if (dto.description !== undefined) {
      const description = dto.description.trim();
      if (description.length < 20 || description.length > 1500) {
        throw new BadRequestException('Опис має містити від 20 до 1500 символів');
      }
      data.description = description;
    }
    if (dto.bestSeason !== undefined) {
      data.bestSeason = dto.bestSeason.trim() || 'Будь-коли';
    }
    if (dto.lat !== undefined || dto.lng !== undefined) {
      const lat = dto.lat !== undefined ? Number(dto.lat) : existing.lat;
      const lng = dto.lng !== undefined ? Number(dto.lng) : existing.lng;
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < UA_BOUNDS.minLat ||
        lat > UA_BOUNDS.maxLat ||
        lng < UA_BOUNDS.minLng ||
        lng > UA_BOUNDS.maxLng
      ) {
        throw new BadRequestException('Геолокація має бути в межах України');
      }
      data.lat = lat;
      data.lng = lng;
    }
    if (dto.difficulty !== undefined) {
      const difficulty = Number(dto.difficulty);
      if (!Number.isFinite(difficulty)) {
        throw new BadRequestException('Некоректний рівень складності');
      }
      data.difficulty = Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Math.round(difficulty)));
    }

    const place = await this.prisma.place.update({ where: { id }, data });
    return this.toAdmin(place);
  }

  async adminSetStatus(token: string | undefined, id: number, status: 'approved' | 'rejected') {
    await this.admin.requireAdmin(token);
    const existing = await this.prisma.place.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Місце не знайдено');
    const place = await this.prisma.place.update({
      where: { id },
      data: { status, reviewedAt: new Date() },
    });
    return this.toAdmin(place);
  }

  async adminDelete(token: string | undefined, id: number) {
    await this.admin.requireAdmin(token);
    const existing = await this.prisma.place.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Місце не знайдено');
    await this.prisma.place.delete({ where: { id } });
    return { ok: true, id };
  }
}

function parsePhotos(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

// Approximate decoded size of a base64 data URL, for the size guardrail.
function approxBytesOfDataUrl(url: string): number {
  const comma = url.indexOf(',');
  const b64 = comma >= 0 ? url.slice(comma + 1) : url;
  return Math.floor((b64.length * 3) / 4);
}
