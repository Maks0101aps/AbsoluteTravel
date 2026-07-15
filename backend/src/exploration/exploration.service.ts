import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { latLngToCell, cellToParent, isValidCell } from 'h3-js';
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
    const cellId = latLngToCell(lat, lng, EXPLORE_RESOLUTION);

    const existing = await this.prisma.visitedCell.findUnique({
      where: { userId_cellId: { userId, cellId } },
    });

    if (existing) {
      const [totalCells, totalRegions] = await this.countProgress(userId);
      return {
        isNew: false,
        cellId,
        newRegion: false,
        xpAwarded: 0,
        totalCells,
        totalRegions,
        newXp: user.xp,
        newLevel: user.level,
        leveledUp: false,
      };
    }

    // A region is "new" if no already-visited cell shares this cell's coarse
    // (res-3) parent. Derived on the fly — no separate region table to maintain.
    const region = cellToParent(cellId, REGION_RESOLUTION);
    const newRegion = !(await this.hasCellInRegion(userId, region));

    const xpAwarded = NEW_CELL_XP + (newRegion ? NEW_REGION_XP : 0);
    const newXp = user.xp + xpAwarded;
    const newLevel = levelFromXp(newXp);
    const leveledUp = newLevel > user.level;

    await this.prisma.$transaction([
      this.prisma.visitedCell.create({ data: { userId, cellId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { xp: newXp, level: newLevel },
      }),
    ]);

    const [totalCells, totalRegions] = await this.countProgress(userId);

    return {
      isNew: true,
      cellId,
      newRegion,
      xpAwarded,
      totalCells,
      totalRegions,
      newXp,
      newLevel,
      leveledUp,
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
