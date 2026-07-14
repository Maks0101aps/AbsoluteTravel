import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';

// One chat turn coming from the client. `role` follows Gemini's naming:
// 'user' for the traveller, 'model' for a previous assistant reply.
export interface ChatTurn {
  role?: 'user' | 'model';
  text?: string;
}

export interface ChatDto {
  message?: string;
  // Optional quick-topic key (see TOPIC_HINTS) that nudges the advisor.
  topic?: string;
  // Prior turns so the advisor keeps context across the conversation.
  history?: ChatTurn[];
}

// Base persona shared by every request. Kept in Ukrainian because the whole
// product speaks Ukrainian to the traveller.
const SYSTEM_PROMPT = `Ти — «Порадник» Absolute Travel, доброзичливий та досвідчений радник із подорожей Україною.
Ти допомагаєш мандрівникам відкривати Україну: радиш куди піти, що подивитися, як спланувати маршрут,
що взяти в дорогу, де смачно поїсти, як розрахувати бюджет, коли краще їхати та як подбати про безпеку.

Правила:
- Відповідай українською мовою, тепло і по-дружньому, звертайся на «ти».
- Будь конкретним: називай реальні місця, міста та регіони України.
- Форматуй відповідь коротко й читабельно: марковані списки, короткі абзаци.
- Якщо просять список речей — давай практичний перелік пунктами.
- Не вигадуй точних цін, розкладів чи фактів, у яких не впевнений — краще дай орієнтир і пораду перевірити.
- Тримайся теми подорожей та відпочинку в Україні. Якщо питання зовсім не про це — м'яко поверни розмову до мандрівок.
- Відповідь тримай у межах ~200 слів, якщо не просять детальніше.`;

// Quick-topic presets surfaced as chips in the UI. Each adds a focused hint.
const TOPIC_HINTS: Record<string, string> = {
  packing: 'Користувач хоче зібрати речі в дорогу. Дай практичний чек-лист що взяти з собою.',
  where: 'Користувач шукає куди поїхати. Запропонуй кілька цікавих напрямків з коротким описом.',
  route: 'Користувач планує маршрут. Допоможи скласти зручний маршрут по днях.',
  food: 'Користувач цікавиться їжею. Порадь локальні страви та де їх скуштувати.',
  budget: 'Користувач планує бюджет. Дай орієнтовну структуру витрат та поради як заощадити.',
  season: 'Користувач питає про сезон. Підкажи найкращий час для поїздки та що врахувати.',
  safety: 'Користувач дбає про безпеку. Дай практичні поради щодо безпечної подорожі.',
};

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private get apiKey(): string | undefined {
    return process.env.GEMINI_API_KEY?.trim() || undefined;
  }

  private get model(): string {
    return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  }

  /** Whether the advisor is configured — the client uses this to show a hint. */
  status() {
    return { available: Boolean(this.apiKey), model: this.model };
  }

  async chat(dto: ChatDto) {
    const message = (dto.message ?? '').trim();
    const topic = (dto.topic ?? '').trim();

    if (!message && !topic) {
      throw new BadRequestException('Напиши запитання для порадника');
    }
    if (message.length > 2000) {
      throw new BadRequestException('Запит задовгий — спробуй коротше');
    }

    const key = this.apiKey;
    if (!key) {
      throw new ServiceUnavailableException(
        'Порадник поки не налаштований: додайте GEMINI_API_KEY у файл .env',
      );
    }

    // Build the running conversation: prior turns (trimmed) + the new message.
    const history = Array.isArray(dto.history) ? dto.history.slice(-12) : [];
    const contents: GeminiContent[] = [];
    for (const turn of history) {
      const text = (turn?.text ?? '').trim();
      if (!text) continue;
      contents.push({
        role: turn.role === 'model' ? 'model' : 'user',
        parts: [{ text }],
      });
    }

    const topicHint = topic && TOPIC_HINTS[topic] ? `\n\n${TOPIC_HINTS[topic]}` : '';
    const userText = message || 'Порадь, будь ласка, з цієї теми.';
    contents.push({ role: 'user', parts: [{ text: `${userText}${topicHint}` }] });

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 900,
        topP: 0.95,
      },
    };

    const url = `${GEMINI_ENDPOINT}/${this.model}:generateContent`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error('Gemini request failed', err as Error);
      throw new ServiceUnavailableException('Не вдалося зв’язатися з порадником. Спробуй пізніше.');
    }

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail = data?.error?.message ?? `HTTP ${res.status}`;
      this.logger.error(`Gemini error: ${detail}`);
      throw new ServiceUnavailableException('Порадник тимчасово недоступний. Спробуй ще раз.');
    }

    const candidate = data?.candidates?.[0];
    const reply: string =
      candidate?.content?.parts
        ?.map((p: { text?: string }) => p?.text ?? '')
        .join('')
        .trim() ?? '';

    if (!reply) {
      // Blocked by safety filters or empty completion.
      throw new ServiceUnavailableException(
        'Порадник не зміг сформувати відповідь. Спробуй переформулювати запит.',
      );
    }

    return { reply };
  }
}
