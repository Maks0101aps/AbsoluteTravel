import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { latLngToCell, cellToParent, isValidCell, gridDisk, cellToLatLng, greatCircleDistance } from 'h3-js';
import { PrismaService } from '../prisma.service';
import { levelFromXp } from '../leveling';

// Resolution the walking layer records cells at. Res 9 ≈ 0.1 km² per hex
// (~174 m edge): small enough that a short walk reveals a new cell, large
// enough that we don't spam the database. Mirrored on the frontend in
// frontend/src/exploration/h3.ts — keep both in sync.
export const EXPLORE_RESOLUTION = 9;

// Coarse resolution used to define a "region". A res-3 parent covers a large
// area (~12 000 km²), so entering one for the first time is a meaningful
// milestone worth the region bonus.
const REGION_RESOLUTION = 3;

// XP economy for automatic territory exploration (see the product spec).
const NEW_CELL_XP = 10;
const NEW_REGION_XP = 100;

/** Prisma's "unique constraint failed" — here, the VisitedCell(userId, cellId) pair. */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002';
}

export interface VisitCellDto {
  userId?: number;
  lat?: number;
  lng?: number;
}

export interface VisitCellResult {
  isNew: boolean;
  cellId: string;
  newRegion: boolean;
  xpAwarded: number;
  totalCells: number;
  totalRegions: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  unlockedCellIds?: string[];
}

@Injectable()
export class ExplorationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record that the user is standing in the H3 cell containing (lat, lng).
   * Idempotent: re-entering a known cell awards nothing. Awards +10 XP for a
   * new cell and a +100 bonus when it opens a previously-unseen region.
   */
  async visit(dto: VisitCellDto): Promise<VisitCellResult> {
    const userId = Number(dto.userId);
    const lat = Number(dto.lat);
    const lng = Number(dto.lng);

    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('Не вказано користувача');
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new BadRequestException('Некоректні координати');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Користувача не знайдено');

    // Server owns the GPS → cell conversion so clients can't claim arbitrary cells.
    const primaryCellId = latLngToCell(lat, lng, EXPLORE_RESOLUTION);
    const candidateCells = [primaryCellId];

    try {
      const neighbors = gridDisk(primaryCellId, 1).filter(c => c !== primaryCellId);
      for (const n of neighbors) {
        const nCenter = cellToLatLng(n);
        const dist = greatCircleDistance([lat, lng], nCenter, 'm');
        // If user is within 200m of neighbor cell's center, they are within ~30m of the boundary
        if (dist <= 200) {
          candidateCells.push(n);
        }
      }
    } catch (err) {
      // safe fallback if gridDisk or cellToLatLng throws
    }

    // Check which cells the user has already visited from candidateCells
    const alreadyVisitedRows = await this.prisma.visitedCell.findMany({
      where: {
        userId,
        cellId: { in: candidateCells },
      },
      select: { cellId: true },
    });
    const alreadyVisited = new Set(alreadyVisitedRows.map((r) => r.cellId));

    const newCells = candidateCells.filter((c) => !alreadyVisited.has(c));

    if (newCells.length === 0) {
      const [totalCells, totalRegions] = await this.countProgress(userId);
      return {
        isNew: false,
        cellId: primaryCellId,
        newRegion: false,
        xpAwarded: 0,
        totalCells,
        totalRegions,
        newXp: user.xp,
        newLevel: user.level,
        leveledUp: false,
        unlockedCellIds: candidateCells,
      };
    }

    // Check regions for new cells. A region is new if no already-visited cell
    // shares the region, and it was not already counted new in this transaction.
    const activeRegions = new Set<string>();
    let totalXpAwarded = 0;
    let newRegion = false;

    for (const cellId of newCells) {
      const region = cellToParent(cellId, REGION_RESOLUTION);
      const isRegionAlreadyVisited = await this.hasCellInRegion(userId, region);
      const isRegionNewInThisRequest = !isRegionAlreadyVisited && !activeRegions.has(region);

      if (isRegionNewInThisRequest) {
        activeRegions.add(region);
        newRegion = true;
      }

      totalXpAwarded += NEW_CELL_XP + (isRegionNewInThisRequest ? NEW_REGION_XP : 0);
    }

    let awarded: { newXp: number; newLevel: number; leveledUp: boolean };
    try {
      awarded = await this.prisma.$transaction(async (tx) => {
        // Create VisitedCell records for all new cells
        for (const cId of newCells) {
          await tx.visitedCell.create({ data: { userId, cellId: cId } });
        }

        const updated = await tx.user.update({
          where: { id: userId },
          data: { xp: { increment: totalXpAwarded } },
        });

        // `updated.level` is still the pre-award level: we only touched xp above.
        const level = levelFromXp(updated.xp);
        if (level !== updated.level) {
          await tx.user.update({ where: { id: userId }, data: { level } });
        }

        return { newXp: updated.xp, newLevel: level, leveledUp: level > updated.level };
      });
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      // Two requests for the same cell were in flight
      const fresh = await this.prisma.user.findUnique({ where: { id: userId } });
      const [cells, regions] = await this.countProgress(userId);
      return {
        isNew: false,
        cellId: primaryCellId,
        newRegion: false,
        xpAwarded: 0,
        totalCells: cells,
        totalRegions: regions,
        newXp: fresh?.xp ?? user.xp,
        newLevel: fresh?.level ?? user.level,
        leveledUp: false,
        unlockedCellIds: candidateCells,
      };
    }

    const { newXp, newLevel, leveledUp } = awarded;
    const [totalCells, totalRegions] = await this.countProgress(userId);

    return {
      isNew: true,
      cellId: primaryCellId,
      newRegion,
      xpAwarded: totalXpAwarded,
      totalCells,
      totalRegions,
      newXp,
      newLevel,
      leveledUp,
      unlockedCellIds: candidateCells,
    };
  }

  /** Every cell id the user has unlocked — the frontend paints these as hexes. */
  async cells(userId: number): Promise<string[]> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('Не вказано користувача');
    }
    const rows = await this.prisma.visitedCell.findMany({
      where: { userId },
      select: { cellId: true },
    });
    return rows.map((r) => r.cellId);
  }

  /** Exploration summary for the profile / progress card. */
  async stats(userId: number) {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('Не вказано користувача');
    }
    const [totalCells, totalRegions] = await this.countProgress(userId);
    return { totalCells, totalRegions };
  }

  /** Does the user have any visited cell whose res-3 parent equals `region`? */
  private async hasCellInRegion(userId: number, region: string): Promise<boolean> {
    // We only store the fine cell id, so pull the ids and fold to parents.
    // A user's cell count stays small, so this in-memory check is cheap and
    // avoids denormalising a region column.
    const cells = await this.cells(userId);
    return cells.some((c) => (isValidCell(c) ? cellToParent(c, REGION_RESOLUTION) === region : false));
  }

  /** [distinct cells, distinct res-3 regions] for a user. */
  private async countProgress(userId: number): Promise<[number, number]> {
    const cells = await this.cells(userId);
    const regions = new Set(
      cells.filter(isValidCell).map((c) => cellToParent(c, REGION_RESOLUTION)),
    );
    return [cells.length, regions.size];
  }
}
