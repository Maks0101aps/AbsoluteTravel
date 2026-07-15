// Explore-map places. Live data now comes from the backend (`GET /api/places`);
// this file provides the category metadata plus an offline fallback dataset so
// the map still renders if the API is unreachable.
//
// Positions are stored as real WGS84 coordinates (lat/lng) and projected onto
// the stylised silhouette at render time (see data/geo.ts).

export type PlaceCategory = 'nature' | 'mountains' | 'history' | 'city' | 'coast';

export interface Place {
  id: string | number;
  name: string;
  region: string;
  category: PlaceCategory;
  // Geolocation (mandatory for every place).
  lat: number;
  lng: number;
  // Short pitch: what it is and what to do there.
  description: string;
  // Best time to visit.
  bestSeason: string;
  // Image URLs (data URLs for user/admin submissions). May be empty for the
  // curated starter set, which is text-only.
  photos?: string[];
  // Exploration difficulty, 1 (easy) – 4 (extreme). Drives the XP reward.
  difficulty?: number;
  source?: string;
  submittedBy?: string | null;
}

export const DIFFICULTY_META: Record<number, { label: string; color: string; xp: number }> = {
  1: { label: 'Легко', color: '#3FA66B', xp: 20 },
  2: { label: 'Середньо', color: '#D9B44A', xp: 50 },
  3: { label: 'Складно', color: '#E4A672', xp: 100 },
  4: { label: 'Екстремально', color: '#E05A5A', xp: 250 },
};

export const DIFFICULTY_ORDER = [1, 2, 3, 4];

// Display metadata per category: Ukrainian label + accent colour for the marker.
export const CATEGORY_META: Record<PlaceCategory, { label: string; color: string }> = {
  nature: { label: 'Природа', color: '#3FA66B' },
  mountains: { label: 'Гори', color: '#7FC4A0' },
  history: { label: 'Історія', color: '#D9B44A' },
  city: { label: 'Місто', color: '#E4A672' },
  coast: { label: 'Узбережжя', color: '#5AB6C9' },
};

export const CATEGORY_ORDER: PlaceCategory[] = ['nature', 'mountains', 'history', 'city', 'coast'];

// Offline fallback — mirrors the seeded curated places (data lives in the DB).
export const PLACES: Place[] = [
  { id: 'lviv', name: 'Львів', region: 'Львівська область', category: 'city', lat: 49.842, lng: 24.032, bestSeason: 'Квітень – жовтень', description: 'Історичний центр під охороною ЮНЕСКО: площа Ринок, каварні, Високий замок. Прогуляйся вуличками Старого міста і піднімись на дах Львівської ратуші.' },
  { id: 'bukovel', name: 'Буковель і Карпати', region: 'Івано-Франківська область', category: 'mountains', lat: 48.363, lng: 24.408, bestSeason: 'Грудень – березень, червень – вересень', description: 'Найбільший гірський курорт України. Взимку — лижі та сноуборд, влітку — гірські озера, підйомники й трекінг у Карпатах.' },
  { id: 'hoverla', name: 'Говерла', region: 'Закарпатська / Івано-Франківська', category: 'mountains', lat: 48.160, lng: 24.500, bestSeason: 'Червень – вересень', description: 'Найвища вершина України (2061 м). Одноденне сходження стежкою від Заросляка — must-do для кожного мандрівника.' },
  { id: 'synevyr', name: 'Озеро Синевир', region: 'Закарпатська область', category: 'nature', lat: 48.618, lng: 23.688, bestSeason: 'Травень – жовтень', description: 'Найбільше гірське озеро Карпат серед смерекових лісів. Поряд — реабілітаційний центр бурих ведмедів.' },
  { id: 'kamianets', name: 'Кам’янець-Подільський', region: 'Хмельницька область', category: 'history', lat: 48.674, lng: 26.586, bestSeason: 'Травень – вересень', description: 'Стара фортеця над каньйоном річки Смотрич. Одне з наймальовничіших укріплень України — обов’язково пройдись Замковим мостом.' },
  { id: 'khotyn', name: 'Хотинська фортеця', region: 'Чернівецька область', category: 'history', lat: 48.520, lng: 26.494, bestSeason: 'Травень – вересень', description: 'Могутня середньовічна твердиня на березі Дністра. Часто стає локацією для історичних фільмів та фестивалів.' },
  { id: 'chernivtsi', name: 'Чернівці', region: 'Чернівецька область', category: 'city', lat: 48.292, lng: 25.935, bestSeason: 'Квітень – жовтень', description: 'Резиденція митрополитів Буковини (ЮНЕСКО) та затишний центр у австрійському стилі. «Маленький Відень» України.' },
  { id: 'bakota', name: 'Бакота', region: 'Хмельницька область', category: 'nature', lat: 48.567, lng: 26.900, bestSeason: 'Травень – вересень', description: 'Затоплене село й скельний монастир над Дністровським каньйоном. Ідеальні краєвиди для світанку та фото.' },
  { id: 'uman', name: 'Софіївський парк, Умань', region: 'Черкаська область', category: 'nature', lat: 48.759, lng: 30.221, bestSeason: 'Травень – жовтень', description: 'Один з найкрасивіших дендропарків Європи: водоспади, гроти, підземна річка та романтичні алеї.' },
  { id: 'kyiv', name: 'Київ', region: 'м. Київ', category: 'city', lat: 50.450, lng: 30.523, bestSeason: 'Квітень – жовтень', description: 'Софія Київська, Києво-Печерська лавра, Андріївський узвіз і набережні Дніпра. Серце країни з тисячолітньою історією.' },
  { id: 'klevan', name: 'Тунель кохання, Клевань', region: 'Рівненська область', category: 'nature', lat: 50.746, lng: 25.977, bestSeason: 'Травень, вересень – жовтень', description: 'Залізнична колія, повністю оплетена зеленню в арку. Найкраще виглядає в свіжій зелені або золотій осені.' },
  { id: 'chernihiv', name: 'Чернігів', region: 'Чернігівська область', category: 'history', lat: 51.494, lng: 31.294, bestSeason: 'Квітень – жовтень', description: 'Одне з найдавніших міст Русі: Спаський і Борисоглібський собори, вали Дитинця та легендарні печери.' },
  { id: 'kharkiv', name: 'Харків', region: 'Харківська область', category: 'city', lat: 49.994, lng: 36.230, bestSeason: 'Травень – вересень', description: 'Найбільша площа Європи — площа Свободи, сад Шевченка й потужна університетська атмосфера.' },
  { id: 'khortytsia', name: 'Хортиця, Запоріжжя', region: 'Запорізька область', category: 'history', lat: 47.842, lng: 35.078, bestSeason: 'Травень – вересень', description: 'Найбільший острів на Дніпрі й колиска козацтва. Музей історії запорізького козацтва та реконструйована Січ.' },
  { id: 'askania', name: 'Асканія-Нова', region: 'Херсонська область', category: 'nature', lat: 46.454, lng: 33.881, bestSeason: 'Квітень – червень', description: 'Найстаріший степовий біосферний заповідник світу. Зоопарк просто неба, де в степу пасуться зебри й бізони.' },
  { id: 'odesa', name: 'Одеса', region: 'Одеська область', category: 'coast', lat: 46.482, lng: 30.723, bestSeason: 'Червень – вересень', description: 'Потьомкінські сходи, Дерибасівська, оперний театр і морське узбережжя. Літня столиця з особливим гумором.' },
  { id: 'akkerman', name: 'Аккерманська фортеця', region: 'Одеська область', category: 'history', lat: 46.201, lng: 30.352, bestSeason: 'Травень – вересень', description: 'Одна з найбільших фортець України на березі Дністровського лиману в Білгороді-Дністровському. Понад 2000 років історії.' },
];
