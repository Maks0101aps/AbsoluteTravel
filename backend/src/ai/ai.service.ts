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

// --- Place moderation -------------------------------------------------------

// What the moderator receives about a user-submitted place.
export interface PlaceModerationInput {
  name: string;
  region: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  // Image data URLs (`data:image/...;base64,...`). The model inspects them too.
  photos: string[];
}

export type PlaceDecision = 'approve' | 'reject' | 'review';

export interface PlaceModerationResult {
  decision: PlaceDecision;
  reason: string;
  score: number; // 0..1 confidence that this is a genuine, appropriate place
  // True only when a real model produced the verdict (vs. offline fallback).
  moderatedByAi: boolean;
}

const PLACE_SYSTEM_PROMPT = `Ти — модератор карти цікавих місць України для застосунку Absolute Travel.
Твоє завдання — вирішити, чи можна опублікувати місце, яке надіслав користувач, щоб інші мандрівники бачили його на карті.

Критерії ПРИЙНЯТИ (approve):
- Це реальне, конкретне місце, куди можна сходити чи поїхати відпочити в Україні (пам'ятка, природа, гори, місто, узбережжя, музей, парк, фортеця тощо).
- Назва, опис і категорія узгоджені між собою й виглядають правдоподібно.
- Фотографії схожі на справжнє місце/локацію (краєвид, споруда, природа) і відповідають опису.
- Немає нічого образливого, небезпечного, незаконного, реклами чи спаму.

ВІДХИЛИТИ (reject), якщо:
- Це спам, реклама, беззмістовний або образливий текст, політичні заклики, небезпечний чи незаконний контент.
- Місце явно вигадане, не існує або не в Україні.
- Фотографії не стосуються місця (скриншоти, меми, люди крупним планом, випадкові фото, відверті/неприйнятні зображення).

Якщо бракує впевненості — обери "review", щоб місце перевірив адміністратор вручну.

Відповідай ЛИШЕ валідним JSON без пояснень навколо, у форматі:
{"decision":"approve"|"reject"|"review","reason":"коротке пояснення українською (1-2 речення)","score":число_від_0_до_1}`;

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

  /**
   * Moderate a user-submitted place: decide whether it is a genuine, appropriate
   * spot to publish on the map. Inspects the text AND the attached photos.
   *
   * Gracefully degrades: if no API key is configured (or the call fails), it
   * returns a "review" verdict so a human admin makes the final call — the
   * submission is never silently approved without a real check.
   */
  async moderatePlace(input: PlaceModerationInput): Promise<PlaceModerationResult> {
    const key = this.apiKey;
    if (!key) {
      return {
        decision: 'review',
        reason:
          'ШІ-модерацію не налаштовано (немає GEMINI_API_KEY). Місце надіслано на ручну перевірку адміністратором.',
        score: 0.5,
        moderatedByAi: false,
      };
    }

    // Build the multimodal request: place details as text + the photos inline.
    const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> =
      [];

    parts.push({
      text:
        `Перевір це місце, яке надіслав користувач:\n` +
        `Назва: ${input.name}\n` +
        `Область/регіон: ${input.region}\n` +
        `Категорія: ${input.category}\n` +
        `Геолокація: ${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}\n` +
        `Опис: ${input.description}\n\n` +
        `Далі — ${input.photos.length} фото цього місця. Оціни, чи вони справжні й відповідають опису.`,
    });

    for (const photo of input.photos.slice(0, 4)) {
      const parsed = parseDataUrl(photo);
      if (parsed) {
        parts.push({ inline_data: { mime_type: parsed.mimeType, data: parsed.base64 } });
      }
    }

    const body = {
      system_instruction: { parts: [{ text: PLACE_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 400,
        responseMimeType: 'application/json',
      },
    };

    const url = `${GEMINI_ENDPOINT}/${this.model}:generateContent`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error('Gemini place moderation request failed', err as Error);
      return this.moderationFallback('Не вдалося зв’язатися з ШІ-модератором.');
    }

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail = data?.error?.message ?? `HTTP ${res.status}`;
      this.logger.error(`Gemini place moderation error: ${detail}`);
      return this.moderationFallback('ШІ-модератор тимчасово недоступний.');
    }

    const raw: string =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p?.text ?? '')
        .join('')
        .trim() ?? '';

    const verdict = parseModerationJson(raw);
    if (!verdict) {
      this.logger.warn(`Could not parse moderation JSON: ${raw.slice(0, 200)}`);
      return this.moderationFallback('ШІ-модератор повернув неоднозначну відповідь.');
    }

    return { ...verdict, moderatedByAi: true };
  }

  private moderationFallback(reason: string): PlaceModerationResult {
    return {
      decision: 'review',
      reason: `${reason} Місце надіслано на ручну перевірку адміністратором.`,
      score: 0.5,
      moderatedByAi: false,
    };
  }
}

// Split a `data:<mime>;base64,<data>` URL into its parts. Returns null if the
// string is not a base64 data URL.
function parseDataUrl(url: string): { mimeType: string; base64: string } | null {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(url ?? '');
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

// Best-effort parse of the model's JSON verdict, tolerant of code fences and
// surrounding prose. Clamps/normalises the fields.
function parseModerationJson(raw: string): Omit<PlaceModerationResult, 'moderatedByAi'> | null {
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }

  const decisionRaw = String(parsed?.decision ?? '').toLowerCase();
  const decision: PlaceDecision =
    decisionRaw === 'approve' || decisionRaw === 'reject' ? (decisionRaw as PlaceDecision) : 'review';

  let score = Number(parsed?.score);
  if (!Number.isFinite(score)) score = 0.5;
  score = Math.min(1, Math.max(0, score));

  const reason = String(parsed?.reason ?? '').trim() || 'Без додаткового пояснення.';

  return { decision, reason, score };
}
