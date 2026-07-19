import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PushService } from './push.service';

// Gentle "go for a walk / explore" nudges. Copy is Ukrainian (the app's default
// locale) — the OS-level notification is rendered by the service worker before
// any React/i18n is available, so per-user localisation isn't practical here.
const WALK_REMINDERS: { title: string; body: string }[] = [
  {
    title: 'Час на пригоду 🌲',
    body: 'Поруч чекають нові місця. Вийди прогулятися та відкрий клітинку на карті!',
  },
  {
    title: 'Досліди щось нове 🧭',
    body: 'Ти давно не заглядав у застосунок. Знайди цікаве місце неподалік!',
  },
  {
    title: 'Прогулянка кличе 🥾',
    body: 'Свіже повітря + нові відкриття = XP. Час вирушати!',
  },
  {
    title: 'Карта чекає 🗺️',
    body: 'Кожен крок наближає новий рівень. Куди підеш сьогодні?',
  },
];

@Injectable()
export class PushReminderService {
  private readonly logger = new Logger(PushReminderService.name);

  constructor(private readonly push: PushService) {}

  // Every day at 11:00 (server local time). A single daily nudge — frequent
  // enough to re-engage, rare enough not to annoy.
  @Cron(CronExpression.EVERY_DAY_AT_11AM)
  async sendWalkReminder() {
    if (!this.push.isEnabled()) return;
    const pick =
      WALK_REMINDERS[Math.floor(Math.random() * WALK_REMINDERS.length)];
    const count = await this.push.notifyAllSubscribers({
      title: pick.title,
      body: pick.body,
      url: '/',
      tag: 'walk-reminder',
    });
    this.logger.log(`walk reminder sent to ${count} subscription(s)`);
  }
}
