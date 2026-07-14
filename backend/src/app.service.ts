import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async getLandingData() {
    const users = await this.prisma.user.findMany({
      include: {
        achievements: {
          include: {
            achievement: true,
          },
        },
      },
    });

    const destinations = await this.prisma.destination.findMany();
    const achievements = await this.prisma.achievement.findMany();

    const currentUser = users.find((u) => u.name === 'Олексій') || users[0];
    const friends = users.filter((u) => u.id !== currentUser?.id);

    return {
      currentUser,
      friends,
      destinations,
      achievements,
    };
  }

  async getUsers() {
    return this.prisma.user.findMany({
      include: {
        achievements: {
          include: {
            achievement: true,
          },
        },
      },
    });
  }

  async getDestinations() {
    return this.prisma.destination.findMany();
  }

  async getAchievements() {
    return this.prisma.achievement.findMany();
  }
}
