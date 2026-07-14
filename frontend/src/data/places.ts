// Curated travel destinations shown as interactive points on the explore map.
// Coordinates are in the map's 720 x 480 viewBox (see data/ukraineMap.ts) and are
// positioned to roughly match each place's real location within the silhouette.

export type PlaceCategory = 'nature' | 'mountains' | 'history' | 'city' | 'coast';

export interface Place {
  id: string;
  name: string;
  region: string;
  category: PlaceCategory;
  x: number;
  y: number;
  // Short pitch: what it is and what to do there.
  description: string;
  // Best time to visit.
  bestSeason: string;
}

// Display metadata per category: Ukrainian label + accent colour for the marker.
export const CATEGORY_META: Record<PlaceCategory, { label: string; color: string }> = {
  nature: { label: 'Природа', color: '#3FA66B' },
  mountains: { label: 'Гори', color: '#7FC4A0' },
  history: { label: 'Історія', color: '#D9B44A' },
  city: { label: 'Місто', color: '#E4A672' },
  coast: { label: 'Узбережжя', color: '#5AB6C9' },
};

export const PLACES: Place[] = [
  {
    id: 'lviv',
    name: 'Львів',
    region: 'Львівська область',
    category: 'city',
    x: 110,
    y: 171,
    description:
      'Історичний центр під охороною ЮНЕСКО: площа Ринок, каварні, Високий замок. Прогуляйся вуличками Старого міста і піднімись на дах Львівської ратуші.',
    bestSeason: 'Квітень – жовтень',
  },
  {
    id: 'bukovel',
    name: 'Буковель і Карпати',
    region: 'Івано-Франківська область',
    category: 'mountains',
    x: 140,
    y: 216,
    description:
      'Найбільший гірський курорт України. Взимку — лижі та сноуборд, влітку — гірські озера, підйомники й трекінг у Карпатах.',
    bestSeason: 'Грудень – березень, червень – вересень',
  },
  {
    id: 'hoverla',
    name: 'Говерла',
    region: 'Закарпатська / Івано-Франківська',
    category: 'mountains',
    x: 126,
    y: 226,
    description:
      'Найвища вершина України (2061 м). Одноденне сходження стежкою від Заросляка — must-do для кожного мандрівника.',
    bestSeason: 'Червень – вересень',
  },
  {
    id: 'synevyr',
    name: 'Озеро Синевир',
    region: 'Закарпатська область',
    category: 'nature',
    x: 112,
    y: 202,
    description:
      'Найбільше гірське озеро Карпат серед смерекових лісів. Поряд — реабілітаційний центр бурих ведмедів.',
    bestSeason: 'Травень – жовтень',
  },
  {
    id: 'kamianets',
    name: 'Кам’янець-Подільський',
    region: 'Хмельницька область',
    category: 'history',
    x: 208,
    y: 221,
    description:
      'Стара фортеця над каньйоном річки Смотрич. Одне з наймальовничіших укріплень України — обов’язково пройдись Замковим мостом.',
    bestSeason: 'Травень – вересень',
  },
  {
    id: 'khotyn',
    name: 'Хотинська фортеця',
    region: 'Чернівецька область',
    category: 'history',
    x: 200,
    y: 233,
    description:
      'Могутня середньовічна твердиня на березі Дністра. Часто стає локацією для історичних фільмів та фестивалів.',
    bestSeason: 'Травень – вересень',
  },
  {
    id: 'chernivtsi',
    name: 'Чернівці',
    region: 'Чернівецька область',
    category: 'city',
    x: 193,
    y: 240,
    description:
      'Резиденція митрополитів Буковини (ЮНЕСКО) та затишний центр у австрійському стилі. «Маленький Відень» України.',
    bestSeason: 'Квітень – жовтень',
  },
  {
    id: 'bakota',
    name: 'Бакота',
    region: 'Хмельницька область',
    category: 'nature',
    x: 222,
    y: 216,
    description:
      'Затоплене село й скельний монастир над Дністровським каньйоном. Ідеальні краєвиди для світанку та фото.',
    bestSeason: 'Травень – вересень',
  },
  {
    id: 'uman',
    name: 'Софіївський парк, Умань',
    region: 'Черкаська область',
    category: 'nature',
    x: 293,
    y: 213,
    description:
      'Один з найкрасивіших дендропарків Європи: водоспади, гроти, підземна річка та романтичні алеї.',
    bestSeason: 'Травень – жовтень',
  },
  {
    id: 'kyiv',
    name: 'Київ',
    region: 'м. Київ',
    category: 'city',
    x: 314,
    y: 142,
    description:
      'Софія Київська, Києво-Печерська лавра, Андріївський узвіз і набережні Дніпра. Серце країни з тисячолітньою історією.',
    bestSeason: 'Квітень – жовтень',
  },
  {
    id: 'klevan',
    name: 'Тунель кохання, Клевань',
    region: 'Рівненська область',
    category: 'nature',
    x: 181,
    y: 139,
    description:
      'Залізнична колія, повністю оплетена зеленню в арку. Найкраще виглядає в свіжій зелені або золотій осені.',
    bestSeason: 'Травень, вересень – жовтень',
  },
  {
    id: 'chernihiv',
    name: 'Чернігів',
    region: 'Чернігівська область',
    category: 'history',
    x: 336,
    y: 111,
    description:
      'Одне з найдавніших міст Русі: Спаський і Борисоглібський собори, вали Дитинця та легендарні печери.',
    bestSeason: 'Квітень – жовтень',
  },
  {
    id: 'kharkiv',
    name: 'Харків',
    region: 'Харківська область',
    category: 'city',
    x: 488,
    y: 172,
    description:
      'Найбільша площа Європи — площа Свободи, сад Шевченка й потужна університетська атмосфера.',
    bestSeason: 'Травень – вересень',
  },
  {
    id: 'khortytsia',
    name: 'Хортиця, Запоріжжя',
    region: 'Запорізька область',
    category: 'history',
    x: 458,
    y: 264,
    description:
      'Найбільший острів на Дніпрі й колиска козацтва. Музей історії запорізького козацтва та реконструйована Січ.',
    bestSeason: 'Травень – вересень',
  },
  {
    id: 'askania',
    name: 'Асканія-Нова',
    region: 'Херсонська область',
    category: 'nature',
    x: 416,
    y: 298,
    description:
      'Найстаріший степовий біосферний заповідник світу. Зоопарк просто неба, де в степу пасуться зебри й бізони.',
    bestSeason: 'Квітень – червень',
  },
  {
    id: 'odesa',
    name: 'Одеса',
    region: 'Одеська область',
    category: 'coast',
    x: 333,
    y: 296,
    description:
      'Потьомкінські сходи, Дерибасівська, оперний театр і морське узбережжя. Літня столиця з особливим гумором.',
    bestSeason: 'Червень – вересень',
  },
  {
    id: 'akkerman',
    name: 'Аккерманська фортеця',
    region: 'Одеська область',
    category: 'history',
    x: 314,
    y: 309,
    description:
      'Одна з найбільших фортець України на березі Дністровського лиману в Білгороді-Дністровському. Понад 2000 років історії.',
    bestSeason: 'Травень – вересень',
  },
];
