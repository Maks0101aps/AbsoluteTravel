import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FriendsService } from '../friends/friends.service';

export interface WallPostDto {
  id: number;
  type: string;
  placeId: number | null;
  placeName: string | null;
  cellId: string | null;
  photo: string | null;
  xpAwarded: number;
  createdAt: Date;
}

const PAGE_SIZE = 20;

@Injectable()
export class WallService {
  constructor(
    private prisma: PrismaService,
    private readonly friends: FriendsService,
  ) {}

  /**
   * A user's wall, newest first, cursor-paginated by id (descending —
   * `cursor` is the last id already seen by the client).
   *
   * Visible to the owner and their accepted friends. Wall posts carry visit
   * photos, so this stays friends-only even though the profile itself is
   * public (see UsersService.publicProfile). Like every other check in this
   * app it is a product-scope rule, not a security boundary — there is no
   * session layer, every endpoint trusts a client-supplied userId (see
   * friends/checkmarks/exploration controllers).
   */
  async listForUser(userId: number, requesterId: number, cursor?: number) {
    if (!userId || Number.isNaN(userId)) throw new BadRequestException('Не вказано користувача');
    if (!requesterId || Number.isNaN(requesterId)) throw new BadRequestException('Не вказано користувача');
    if (requesterId !== userId && !(await this.friends.areFriends(requesterId, userId))) {
      throw new ForbiddenException('Стіна доступна лише друзям');
    }

    const rows = await this.prisma.wallPost.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { checkmark: { include: { place: true } } },
    });

    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

    const posts: WallPostDto[] = page.map((r) => ({
      id: r.id,
      type: r.type,
      placeId: r.placeId,
      placeName: r.checkmark?.place?.name ?? null,
      cellId: r.cellId,
      photo: r.photo,
      xpAwarded: r.xpAwarded,
      createdAt: r.createdAt,
    }));

    return { posts, nextCursor: hasMore ? page[page.length - 1].id : null };
  }
}
