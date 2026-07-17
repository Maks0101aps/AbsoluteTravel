import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FriendsService } from '../friends/friends.service';
import { AiService } from '../ai/ai.service';

export class CreateLabelDto {
  userId: number;
  name: string;
  description: string;
  lat: number;
  lng: number;
  photo?: string;
  friendsOnly?: boolean;
  isTemporary?: boolean;
  customParams?: Record<string, string>;
}

@Injectable()
export class FriendLabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendsService,
    private readonly ai: AiService,
  ) {}

  private async requireExistingUser(userId: number) {
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) {
      throw new UnauthorizedException('Користувача не знайдено, увійдіть знову');
    }
  }

  async create(dto: CreateLabelDto) {
    const userId = Number(dto.userId);
    await this.requireExistingUser(userId);

    const name = (dto.name ?? '').trim();
    const description = (dto.description ?? '').trim();
    const lat = Number(dto.lat);
    const lng = Number(dto.lng);

    if (name.length < 3) {
      throw new BadRequestException('Назва мітки має містити щонайменше 3 символи');
    }
    if (name.length > 80) {
      throw new BadRequestException('Назва мітки задовга');
    }
    if (description.length < 5) {
      throw new BadRequestException('Опис мітки має містити щонайменше 5 символів');
    }
    if (description.length > 500) {
      throw new BadRequestException('Опис задовгий');
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Вкажіть коректні координати');
    }

    const isTemporary = Boolean(dto.isTemporary);
    const expiresAt = isTemporary ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
    const customParamsStr = JSON.stringify(dto.customParams ?? {});

    const label = await this.prisma.friendLabel.create({
      data: {
        userId,
        name,
        description,
        lat,
        lng,
        photo: dto.photo || null,
        friendsOnly: dto.friendsOnly !== false,
        isTemporary,
        expiresAt,
        customParams: customParamsStr,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return {
      ...label,
      likesCount: 0,
      dislikesCount: 0,
      myReaction: null,
    };
  }

  async list(userId: number) {
    await this.requireExistingUser(userId);
    const friendIds = await this.friends.friendIds(userId);

    const now = new Date();

    const labels = await this.prisma.friendLabel.findMany({
      where: {
        OR: [
          { userId }, // own labels
          { userId: { in: friendIds } }, // friends' labels
          { friendsOnly: false }, // public labels from anyone
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          },
        },
        reactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return labels.map((label) => {
      const likesCount = label.reactions.filter((r) => r.type === 'LIKE').length;
      const dislikesCount = label.reactions.filter((r) => r.type === 'DISLIKE').length;
      const myReaction = label.reactions.find((r) => r.userId === userId)?.type || null;

      // omit raw reactions list to save bytes
      const { reactions, ...rest } = label;
      return {
        ...rest,
        likesCount,
        dislikesCount,
        myReaction,
      };
    });
  }

  async delete(id: number, userId: number) {
    await this.requireExistingUser(userId);
    const label = await this.prisma.friendLabel.findUnique({ where: { id } });
    if (!label) {
      throw new NotFoundException('Мітку не знайдено');
    }
    if (label.userId !== userId) {
      throw new ForbiddenException('Ви можете видаляти тільки власні мітки');
    }

    await this.prisma.friendLabel.delete({ where: { id } });
    return { ok: true, id };
  }

  async react(id: number, userId: number, type: 'LIKE' | 'DISLIKE' | null) {
    await this.requireExistingUser(userId);
    const label = await this.prisma.friendLabel.findUnique({
      where: { id },
      select: { id: true, userId: true, friendsOnly: true },
    });
    if (!label) {
      throw new NotFoundException('Мітку не знайдено');
    }

    // Check visibility if friendsOnly is true
    if (label.friendsOnly && label.userId !== userId) {
      const areFriends = await this.friends.areFriends(label.userId, userId);
      if (!areFriends) {
        throw new ForbiddenException('Ви не маєте доступу до цієї мітки');
      }
    }

    if (type === null) {
      // Remove reaction if it exists
      await this.prisma.labelReaction.deleteMany({
        where: { labelId: id, userId },
      });
    } else {
      // Upsert reaction
      await this.prisma.labelReaction.upsert({
        where: {
          labelId_userId: { labelId: id, userId },
        },
        update: { type },
        create: { labelId: id, userId, type },
      });
    }

    // Return the updated counts and reaction for the caller
    const reactions = await this.prisma.labelReaction.findMany({
      where: { labelId: id },
    });

    const likesCount = reactions.filter((r) => r.type === 'LIKE').length;
    const dislikesCount = reactions.filter((r) => r.type === 'DISLIKE').length;
    const myReaction = reactions.find((r) => r.userId === userId)?.type || null;

    return {
      id,
      likesCount,
      dislikesCount,
      myReaction,
    };
  }

  async report(id: number, reporterId: number, reason: string) {
    await this.requireExistingUser(reporterId);
    const label = await this.prisma.friendLabel.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
      },
    });
    if (!label) {
      throw new NotFoundException('Мітку не знайдено');
    }
    if (label.userId === reporterId) {
      throw new BadRequestException('Не можна скаржитися на власну мітку');
    }

    // Check visibility
    if (label.friendsOnly) {
      const areFriends = await this.friends.areFriends(label.userId, reporterId);
      if (!areFriends) {
        throw new ForbiddenException('Ви не маєте доступу до цієї мітки');
      }
    }

    const reportReason = (reason ?? '').trim();
    if (!reportReason) {
      throw new BadRequestException('Вкажіть причину скарги');
    }

    // Call AI to moderate
    const verdict = await this.ai.moderateLabelReport({
      name: label.name,
      description: label.description,
      photo: label.photo,
      customParams: label.customParams,
      reporterReason: reportReason,
    });

    if (verdict.decision === 'delete') {
      await this.prisma.friendLabel.delete({ where: { id } });
      return {
        action: 'deleted',
        reason: verdict.reason,
      };
    }

    return {
      action: 'kept',
      reason: verdict.reason,
    };
  }
}
