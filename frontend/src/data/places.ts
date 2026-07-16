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
  { id: 'lviv', name: 'Львів', region: 'Львівська область', category: 'city', lat: 49.842, lng: 24.032, bestSeason: 'Квітень – жовтень', description: 'Історичний центр під охороною ЮНЕСКО: площа Ринок, каварні, Високий замок. Прогуляйся вуличками Старого міста і піднімись на дах Львівської ратуші.', photos: ['/assets/lviv_thumb.avif', '/assets/places/lviv_extra_1.jpg', '/assets/places/lviv_extra_2.jpg'] },
  { id: 'bukovel', name: 'Буковель і Карпати', region: 'Івано-Франківська область', category: 'mountains', lat: 48.363, lng: 24.408, bestSeason: 'Грудень – березень, червень – вересень', description: 'Найбільший гірський курорт України. Взимку — лижі та сноуборд, влітку — гірські озера, підйомники й трекінг у Карпатах.', photos: ['/assets/carpathians_thumb.avif', '/assets/places/bukovel_1.jpg', '/assets/places/bukovel_2.jpg'] },
  { id: 'hoverla', name: 'Говерла', region: 'Закарпатська / Івано-Франківська', category: 'mountains', lat: 48.160, lng: 24.500, bestSeason: 'Червень – вересень', description: 'Найвища вершина України (2061 м). Одноденне сходження стежкою від Заросляка — must-do для кожного мандрівника.', photos: ['/assets/scenic_gallery_1.avif', '/assets/places/hoverla_1.jpg', '/assets/places/hoverla_2.jpg'] },
  { id: 'synevyr', name: 'Озеро Синевир', region: 'Закарпатська область', category: 'nature', lat: 48.618, lng: 23.688, bestSeason: 'Травень – жовтень', description: 'Найбільше гірське озеро Карпат серед смерекових лісів. Поряд — реабілітаційний центр бурих ведмедів.', photos: ['/assets/scenic_gallery_2.avif', '/assets/scenic_gallery_3.avif', '/assets/places/synevyr_1.jpg'] },
  { id: 'kamianets', name: 'Кам’янець-Подільський', region: 'Хмельницька область', category: 'history', lat: 48.674, lng: 26.586, bestSeason: 'Травень – вересень', description: 'Стара фортеця над каньйоном річки Смотрич. Одне з наймальовничіших укріплень України — обов’язково пройдись Замковим мостом.', photos: ['/assets/places/kamianets_1.jpg', '/assets/places/kamianets_2.jpg', '/assets/places/kamianets_3.jpg'] },
  { id: 'khotyn', name: 'Хотинська фортеця', region: 'Чернівецька область', category: 'history', lat: 48.520, lng: 26.494, bestSeason: 'Травень – вересень', description: 'Могутня середньовічна твердиня на березі Дністра. Часто стає локацією для історичних фільмів та фестивалів.', photos: ['/assets/places/khotyn_1.jpg', '/assets/places/khotyn_2.jpg', '/assets/places/khotyn_3.jpg'] },
  { id: 'chernivtsi', name: 'Чернівці', region: 'Чернівецька область', category: 'city', lat: 48.292, lng: 25.935, bestSeason: 'Квітень – жовтень', description: 'Резиденція митрополитів Буковини (ЮНЕСКО) та затишний центр у австрійському стилі. «Маленький Відень» України.', photos: ['/assets/places/chernivtsi_1.jpg', '/assets/places/chernivtsi_2.jpg', '/assets/places/chernivtsi_3.jpg'] },
  { id: 'bakota', name: 'Бакота', region: 'Хмельницька область', category: 'nature', lat: 48.567, lng: 26.900, bestSeason: 'Травень – вересень', description: 'Затоплене село й скельний монастир над Дністровським каньйоном. Ідеальні краєвиди для світанку та фото.', photos: ['/assets/places/bakota_1.jpg', '/assets/places/bakota_2.jpg', '/assets/places/bakota_3.jpg'] },
  { id: 'uman', name: 'Софіївський парк, Умань', region: 'Черкаська область', category: 'nature', lat: 48.759, lng: 30.221, bestSeason: 'Травень – жовтень', description: 'Один з найкрасивіших дендропарків Європи: водоспади, гроти, підземна річка та романтичні алеї.', photos: ['/assets/places/uman_1.jpg', '/assets/places/uman_2.jpg', '/assets/places/uman_3.jpg'] },
  { id: 'kyiv', name: 'Київ', region: 'м. Київ', category: 'city', lat: 50.450, lng: 30.523, bestSeason: 'Квітень – жовтень', description: 'Софія Київська, Києво-Печерська лавра, Андріївський узвіз і набережні Дніпра. Серце країни з тисячолітньою історією.', photos: ['/assets/places/kyiv_1.jpg', '/assets/places/kyiv_2.jpg', '/assets/places/kyiv_3.jpg'] },
  { id: 'klevan', name: 'Тунель кохання, Клевань', region: 'Рівненська область', category: 'nature', lat: 50.746, lng: 25.977, bestSeason: 'Травень, вересень – жовтень', description: 'Залізнична колія, повністю оплетена зеленню в арку. Найкраще виглядає в свіжій зелені або золотій осені.', photos: ['/assets/places/klevan_1.jpg', '/assets/places/klevan_2.jpg', '/assets/places/klevan_3.jpg'] },
  { id: 'chernihiv', name: 'Чернігів', region: 'Чернігівська область', category: 'history', lat: 51.494, lng: 31.294, bestSeason: 'Квітень – жовтень', description: 'Одне з найдавніших міст Русі: Спаський і Борисоглібський собори, вали Дитинця та легендарні печери.', photos: ['/assets/places/chernihiv_1.jpg', '/assets/places/chernihiv_2.jpg', '/assets/places/chernihiv_3.jpg'] },
  { id: 'kharkiv', name: 'Харків', region: 'Харківська область', category: 'city', lat: 49.994, lng: 36.230, bestSeason: 'Травень – вересень', description: 'Найбільша площа Європи — площа Свободи, сад Шевченка й потужна університетська атмосфера.', photos: ['/assets/places/kharkiv_1.jpg', '/assets/places/kharkiv_2.jpg', '/assets/places/kharkiv_3.jpg'] },
  { id: 'khortytsia', name: 'Хортиця, Запоріжжя', region: 'Запорізька область', category: 'history', lat: 47.842, lng: 35.078, bestSeason: 'Травень – вересень', description: 'Найбільший острів на Дніпрі й колиска козацтва. Музей історії запорізького козацтва та реконструйована Січ.', photos: ['/assets/places/khortytsia_1.jpg', '/assets/places/khortytsia_2.jpg', '/assets/places/khortytsia_3.jpg'] },
  { id: 'askania', name: 'Асканія-Нова', region: 'Херсонська область', category: 'nature', lat: 46.454, lng: 33.881, bestSeason: 'Квітень – червень', description: 'Найстаріший степовий біосферний заповідник світу. Зоопарк просто неба, де в степу пасуться зебри й бізони.', photos: ['/assets/places/askania_1.jpg', '/assets/places/askania_2.jpg', '/assets/places/askania_3.jpg'] },
  { id: 'odesa', name: 'Одеса', region: 'Одеська область', category: 'coast', lat: 46.482, lng: 30.723, bestSeason: 'Червень – вересень', description: 'Потьомкінські сходи, Дерибасівська, оперний театр і морське узбережжя. Літня столиця з особливим гумором.', photos: ['/assets/places/odesa_1.jpg', '/assets/places/odesa_2.jpg', '/assets/places/odesa_3.jpg'] },
  { id: 'akkerman', name: 'Аккерманська фортеця', region: 'Одеська область', category: 'history', lat: 46.201, lng: 30.352, bestSeason: 'Травень – вересень', description: 'Одна з найбільших фортець України на березі Дністровського лиману в Білгороді-Дністровському. Понад 2000 років історії.', photos: ['/assets/places/akkerman_1.jpg', '/assets/places/akkerman_2.jpg'] },

  // --- Приховані перлини України ------------------------------------------
  // Джерела: списки маловідомих місць (znaki.fm, travel.24tv.ua) звірені з
  // українською Вікіпедією. Координати — з Вікіпедії/Вікіданих (P625), фото —
  // з відповідних категорій Wikimedia Commons (вільні ліцензії; авторів
  // указано в public/assets/places/CREDITS.md).
  {
    id: 'optymistychna',
    name: 'Оптимістична печера',
    region: 'Тернопільська область',
    category: 'nature',
    lat: 48.7349,
    lng: 25.9737,
    bestSeason: 'Травень – жовтень',
    difficulty: 4,
    description: 'Найдовша гіпсова печера світу — понад 260 км ходів під полями біля села Королівка, за що вона потрапила до Книги рекордів Гіннеса. Кристалічні лабіринти вражають, але спуск можливий лише з провідником і спорядженням.',
    photos: ['/assets/places/optymistychna_1.jpg', '/assets/places/optymistychna_2.jpg', '/assets/places/optymistychna_3.jpg']
  },
  {
    id: 'oleshky_sands',
    name: 'Олешківські піски',
    region: 'Херсонська область',
    category: 'nature',
    lat: 46.58333,
    lng: 33.05,
    bestSeason: 'Квітень – червень, вересень',
    difficulty: 3,
    description: 'Найбільший піщаний масив Європи, який називають «українською Сахарою»: справжні дюни заввишки до 5 метрів посеред степу. Влітку пісок розжарюється до +70 °C, тому найкраще їхати навесні або на початку осені.',
    photos: ['/assets/places/oleshky_sands_1.jpg', '/assets/places/oleshky_sands_2.jpg', '/assets/places/oleshky_sands_3.jpg']
  },
  {
    id: 'dnistrovskyi_canyon',
    name: 'Дністровський каньйон',
    region: 'Тернопільська / Чернівецька область',
    category: 'nature',
    lat: 48.7661,
    lng: 25.5995,
    bestSeason: 'Травень – вересень',
    difficulty: 3,
    description: 'Один із найбільших каньйонів Європи — 250 км звивистих скельних берегів Дністра з відслоненнями віком у сотні мільйонів років. Ідеальний для сплаву на каяках, велотурів і ночівлі просто над водою.',
    photos: ['/assets/places/dnistrovskyi_canyon_1.jpg', '/assets/places/dnistrovskyi_canyon_2.jpg', '/assets/places/dnistrovskyi_canyon_3.jpg']
  },
  {
    id: 'tustan',
    name: 'Тустань',
    region: 'Львівська область',
    category: 'history',
    lat: 49.19142,
    lng: 23.40952,
    bestSeason: 'Травень – жовтень',
    difficulty: 2,
    description: 'Унікальна наскельна фортеця IX–XVI століть біля села Урич: від дерев’яного міста лишилися тільки пази й вирубки у велетенських скелях. Аналогів такої конструкції в Європі немає.',
    photos: ['/assets/places/tustan_1.jpg', '/assets/places/tustan_2.jpg', '/assets/places/tustan_3.jpg']
  },
  {
    id: 'pidhirtsi',
    name: 'Підгорецький замок',
    region: 'Львівська область',
    category: 'history',
    lat: 49.9431,
    lng: 24.98351,
    bestSeason: 'Квітень – жовтень',
    difficulty: 2,
    description: 'Ренесансний палац-фортеця XVII століття з італійськими терасами — його називають найкращим зразком палацової архітектури Східної Європи. Овіяний легендами про Білу пані, входить до «Золотої підкови Львівщини».',
    photos: ['/assets/places/pidhirtsi_1.jpg', '/assets/places/pidhirtsi_2.jpg', '/assets/places/pidhirtsi_3.jpg']
  },
  {
    id: 'olesko',
    name: 'Олеський замок',
    region: 'Львівська область',
    category: 'history',
    lat: 49.96834,
    lng: 24.90056,
    bestSeason: 'Квітень – жовтень',
    difficulty: 1,
    description: 'Замок XIV століття на пагорбі серед боліт, де народився король Ян III Собеський. Усередині — багата колекція давнього мистецтва, ззовні — французький парк зі скульптурами.',
    photos: ['/assets/places/olesko_1.jpg', '/assets/places/olesko_2.jpg', '/assets/places/olesko_3.jpg']
  },
  {
    id: 'zolochiv',
    name: 'Золочівський замок',
    region: 'Львівська область',
    category: 'history',
    lat: 49.80212,
    lng: 24.9062,
    bestSeason: 'Квітень – жовтень',
    difficulty: 1,
    description: 'Зразкова бастіонна фортеця XVII століття з Великим і Китайським палацами. У дворі — загадкові «каміння тамплієрів» із досі нерозшифрованими написами.',
    photos: ['/assets/places/zolochiv_1.jpg', '/assets/places/zolochiv_2.jpg', '/assets/places/zolochiv_3.jpg']
  },
  {
    id: 'medzhybizh',
    name: 'Меджибізький замок',
    region: 'Хмельницька область',
    category: 'history',
    lat: 49.43654,
    lng: 27.41211,
    bestSeason: 'Квітень – жовтень',
    difficulty: 1,
    description: 'Біла твердиня XVI століття на стрілці Південного Бугу та Бужка, яку за форму називають кораблем. Одна з найкраще збережених фортець Поділля з музеєм і лицарськими фестивалями.',
    photos: ['/assets/places/medzhybizh_1.jpg', '/assets/places/medzhybizh_2.jpg', '/assets/places/medzhybizh_3.jpg']
  },
  {
    id: 'svirzh',
    name: 'Свірзький замок',
    region: 'Львівська область',
    category: 'history',
    lat: 49.65,
    lng: 24.43889,
    bestSeason: 'Травень – вересень',
    difficulty: 2,
    description: 'Романтичний замок XV–XVII століть над ставком, оточений парком і підйомним мостом. Настільки кінематографічний, що тут знімали «Д’Артаньяна і трьох мушкетерів».',
    photos: ['/assets/places/svirzh_1.jpg', '/assets/places/svirzh_2.jpg', '/assets/places/svirzh_3.jpg']
  },
  {
    id: 'rozhirche',
    name: 'Печерний монастир у Розгірчому',
    region: 'Львівська область',
    category: 'history',
    lat: 49.11389,
    lng: 23.69833,
    bestSeason: 'Травень – жовтень',
    difficulty: 3,
    description: 'Двоярусний скельний монастир, вирубаний у пісковиковій скелі ще у XIII–XIV століттях. Стоїть у лісі над селом — тиха й майже безлюдна альтернатива популярним замкам.',
    photos: ['/assets/places/rozhirche_1.jpg', '/assets/places/rozhirche_2.jpg', '/assets/places/rozhirche_3.jpg']
  },
  {
    id: 'kryvorivnia',
    name: 'Криворівня',
    region: 'Івано-Франківська область',
    category: 'history',
    lat: 48.17528,
    lng: 24.89667,
    bestSeason: 'Червень – вересень',
    difficulty: 2,
    description: 'Гуцульське село на Черемоші, де Параджанов знімав «Тіні забутих предків», а Франко й Грушевський проводили літо. Досі жива автентика: ґражди, дерев’яна церква і музеї просто в хатах.',
    photos: ['/assets/places/kryvorivnia_1.jpg', '/assets/places/kryvorivnia_2.jpg', '/assets/places/kryvorivnia_3.jpg']
  },
  {
    id: 'lumshory',
    name: 'Лумшори',
    region: 'Закарпатська область',
    category: 'nature',
    lat: 48.80056,
    lng: 22.71417,
    bestSeason: 'Травень – жовтень',
    difficulty: 2,
    description: 'Гірське село, відоме сірководневими джерелами й купанням у чавунних чанах, які нагрівають дровами просто неба з XVII століття. Поруч — водоспади на потоці Туриця.',
    photos: ['/assets/places/lumshory_1.jpg', '/assets/places/lumshory_2.jpg', '/assets/places/lumshory_3.jpg']
  },
  {
    id: 'tovtry',
    name: 'Подільські Товтри',
    region: 'Хмельницька область',
    category: 'nature',
    lat: 48.6039,
    lng: 26.9979,
    bestSeason: 'Травень – вересень',
    difficulty: 2,
    description: 'Найбільший національний парк України — скелясте пасмо, що є рештками бар’єрного рифу давнього моря. Каньйони, печери, джерела й унікальна степова флора на вапнякових гребенях.',
    photos: ['/assets/places/tovtry_1.jpg', '/assets/places/tovtry_2.jpg', '/assets/places/tovtry_3.jpg']
  },
  {
    id: 'mavryn',
    name: 'Мавринський майдан',
    region: 'Дніпропетровська область',
    category: 'history',
    lat: 48.5597,
    lng: 35.8053,
    bestSeason: 'Квітень – жовтень',
    difficulty: 3,
    description: 'Загадкова земляна споруда діаметром понад 100 метрів — розкопаний скіфський курган, схожий на кратер із «пелюстками». Вік оцінюють у 5 тисяч років, а призначення досі остаточно не з’ясоване.',
    photos: ['/assets/places/mavryn_1.jpg', '/assets/places/mavryn_2.jpg', '/assets/places/mavryn_3.jpg']
  },
  {
    id: 'trostianets',
    name: 'Тростянець і Круглий двір',
    region: 'Сумська область',
    category: 'city',
    lat: 50.48667,
    lng: 34.98306,
    bestSeason: 'Квітень – жовтень',
    difficulty: 1,
    description: 'Містечко з садибою цукрозаводчика Кеніга, де Чайковський написав першу симфонію. Головна дивина — Круглий двір, кругла «фортеця» XVIII століття, що служила манежем і ареною.',
    photos: ['/assets/places/trostianets_1.jpg', '/assets/places/trostianets_2.jpg', '/assets/places/trostianets_3.jpg']
  },
  {
    id: 'opishnia',
    name: 'Опішня — столиця гончарства',
    region: 'Полтавська область',
    category: 'city',
    lat: 49.95635,
    lng: 34.612,
    bestSeason: 'Травень – вересень',
    difficulty: 1,
    description: 'Неофіційна гончарна столиця України з Національним музеєм-заповідником українського гончарства і найбільшою в країні колекцією кераміки. Тут можна сісти за круг і зробити глек власноруч.',
    photos: ['/assets/places/opishnia_1.jpg', '/assets/places/opishnia_2.jpg', '/assets/places/opishnia_3.jpg']
  },
  {
    id: 'buzkyi_hard',
    name: 'Бузький Гард',
    region: 'Миколаївська область',
    category: 'nature',
    lat: 48.03972,
    lng: 30.94667,
    bestSeason: 'Травень – вересень',
    difficulty: 3,
    description: 'Гранітно-степове Побужжя, де Південний Буг проривається крізь скелі віком 2 млрд років. Пороги для рафтингу, Білі скелі, Турецький стіл і пам’ять про козацький Гард.',
    photos: ['/assets/places/buzkyi_hard_1.jpg', '/assets/places/buzkyi_hard_2.jpg', '/assets/places/buzkyi_hard_3.jpg']
  },
  {
    id: 'nesamovyte',
    name: 'Озеро Несамовите',
    region: 'Івано-Франківська область',
    category: 'mountains',
    lat: 48.12389,
    lng: 24.53111,
    bestSeason: 'Липень – вересень',
    difficulty: 4,
    description: 'Льодовикове озеро на висоті 1750 м просто на хребті Чорногора, оточене легендами про бурю, яку викликає кинутий у воду камінь. Дістатися можна лише пішки — це частина маршруту на Говерлу й Піп Іван.',
    photos: ['/assets/places/nesamovyte_1.jpg', '/assets/places/nesamovyte_2.jpg', '/assets/places/nesamovyte_3.jpg']
  },
  {
    id: 'brebeneskul',
    name: 'Озеро Бребенескул',
    region: 'Закарпатська область',
    category: 'mountains',
    lat: 48.10167,
    lng: 24.56228,
    bestSeason: 'Липень – вересень',
    difficulty: 4,
    description: 'Найвисокогірніше озеро України — 1801 м над рівнем моря, у суворому карі під однойменною вершиною. Вода крижана цілий рік, а дорога сюди — це повноцінний високогірний трекінг.',
    photos: ['/assets/places/brebeneskul_1.jpg', '/assets/places/brebeneskul_2.jpg', '/assets/places/brebeneskul_3.jpg']
  },
  {
    id: 'shypit',
    name: 'Водоспад Шипіт',
    region: 'Закарпатська область',
    category: 'nature',
    lat: 48.65444,
    lng: 23.27111,
    bestSeason: 'Травень – червень, вересень – жовтень',
    difficulty: 2,
    description: 'Каскадний водоспад заввишки 14 метрів біля підніжжя Боржави, найповноводніший навесні. Легко доступний від села Пилипець — гарний старт перед підйомом на полонину.',
    photos: ['/assets/places/shypit_1.jpg', '/assets/places/shypit_2.jpg', '/assets/places/shypit_3.jpg']
  },
  {
    id: 'maniava',
    name: 'Манявський водоспад',
    region: 'Івано-Франківська область',
    category: 'nature',
    lat: 48.62565,
    lng: 24.30356,
    bestSeason: 'Травень – вересень',
    difficulty: 2,
    description: 'Найвищий водоспад Ґорґан — близько 20 метрів у вузькій лісовій ущелині, яку місцеві звуть Слов’янським. Стежка сюди веде повз Манявський скит.',
    photos: ['/assets/places/maniava_1.jpg', '/assets/places/maniava_2.jpg', '/assets/places/maniava_3.jpg']
  },
  {
    id: 'dzhuryn',
    name: 'Джуринський водоспад',
    region: 'Тернопільська область',
    category: 'nature',
    lat: 48.805,
    lng: 25.58772,
    bestSeason: 'Травень – вересень',
    difficulty: 2,
    description: 'Найвищий рівнинний водоспад України — 16 метрів у каньйоні біля села Нирків. Рукотворний: русло Джурину прокопали ще у XVI столітті, а зараз тут купаються й ставлять намети.',
    photos: ['/assets/places/dzhuryn_1.jpg', '/assets/places/dzhuryn_2.jpg', '/assets/places/dzhuryn_3.jpg']
  },
  {
    id: 'dovbush',
    name: 'Скелі Довбуша',
    region: 'Івано-Франківська область',
    category: 'nature',
    lat: 49.05167,
    lng: 23.67889,
    bestSeason: 'Травень – жовтень',
    difficulty: 2,
    description: 'Величезні пісковикові брили в лісі біля Бубнища з печерами, сходами й переходами, вирубаними ще у давньоруські часи. За легендою, тут ховав скарби опришок Олекса Довбуш.',
    photos: ['/assets/places/dovbush_1.jpg', '/assets/places/dovbush_2.jpg', '/assets/places/dovbush_3.jpg']
  },
  {
    id: 'narcissi',
    name: 'Долина нарцисів',
    region: 'Закарпатська область',
    category: 'nature',
    lat: 48.18147,
    lng: 23.35734,
    bestSeason: 'Кінець квітня – середина травня',
    difficulty: 1,
    description: 'Єдиний у світі рівнинний масив нарциса вузьколистого — 170 гектарів білого цвіту біля Хуста. Реліктове диво цвіте лише два тижні на рік, тому час треба ловити.',
    photos: ['/assets/places/narcissi_1.jpg', '/assets/places/narcissi_2.jpg', '/assets/places/narcissi_3.jpg']
  },
  {
    id: 'zacharovanyi_krai',
    name: 'Зачарований край',
    region: 'Закарпатська область',
    category: 'nature',
    lat: 48.35278,
    lng: 23.07361,
    bestSeason: 'Травень – жовтень',
    difficulty: 3,
    description: 'Національний парк на Вигорлат-Гутинському хребті з вулканічними скелями химерних форм — Смерековий Камінь, Барвисті скелі, урочище Чорне Багно. Мало туристів і багато справжнього лісу.',
    photos: ['/assets/places/zacharovanyi_krai_1.jpg', '/assets/places/zacharovanyi_krai_2.jpg', '/assets/places/zacharovanyi_krai_3.jpg']
  },
  {
    id: 'smotrych',
    name: 'Смотрицький каньйон',
    region: 'Хмельницька область',
    category: 'nature',
    lat: 48.70667,
    lng: 26.56333,
    bestSeason: 'Квітень – жовтень',
    difficulty: 2,
    description: 'Каньйон-петля глибиною до 50 метрів, що кільцем обіймає Старе місто Кам’янця-Подільського. Найкращі краєвиди — знизу, зі стежки вздовж річки, а не з мосту.',
    photos: ['/assets/places/smotrych_1.jpg', '/assets/places/smotrych_2.jpg', '/assets/places/smotrych_3.jpg']
  },
  {
    id: 'stilske',
    name: 'Стільське городище',
    region: 'Львівська область',
    category: 'history',
    lat: 49.53333,
    lng: 24.06667,
    bestSeason: 'Травень – вересень',
    difficulty: 3,
    description: 'Одне з найбільших слов’янських городищ Європи — площею близько 250 гектарів, столиця білих хорватів IX століття. У скелях збереглися вирубані печери, храм і житла.',
    photos: ['/assets/places/stilske_1.jpg', '/assets/places/stilske_2.jpg', '/assets/places/stilske_3.jpg']
  },
  {
    id: 'chyhyryn',
    name: 'Чигирин і резиденція Богдана Хмельницького',
    region: 'Черкаська область',
    category: 'history',
    lat: 49.08333,
    lng: 32.66667,
    bestSeason: 'Травень – вересень',
    difficulty: 2,
    description: 'Колишня гетьманська столиця з відбудованою резиденцією Богдана Хмельницького на Замковій горі. З бастіонів відкривається краєвид на Тясмин і всю козацьку округу.',
    photos: ['/assets/places/chyhyryn_1.jpg', '/assets/places/chyhyryn_2.jpg', '/assets/places/chyhyryn_3.jpg']
  },
  {
    id: 'palanok',
    name: 'Замок Паланок',
    region: 'Закарпатська область',
    category: 'history',
    lat: 48.43151,
    lng: 22.6878,
    bestSeason: 'Будь-коли',
    difficulty: 2,
    description: 'Могутній замок на 68-метровій вулканічній горі над Мукачевом, який ніколи не був узятий штурмом. Три яруси дворів, 85-метрова криниця і панорама на все Закарпаття.',
    photos: ['/assets/places/palanok_1.jpg', '/assets/places/palanok_2.jpg', '/assets/places/palanok_3.jpg']
  },
  {
    id: 'nevytske',
    name: 'Невицький замок',
    region: 'Закарпатська область',
    category: 'history',
    lat: 48.68097,
    lng: 22.40917,
    bestSeason: 'Квітень – жовтень',
    difficulty: 2,
    description: 'Романтичні руїни замку XIII століття на вулканічній скелі над Ужем, оточені старим дендропарком. За легендою, будувала його «Погана Діва» на курячих яйцях замість розчину.',
    photos: ['/assets/places/nevytske_1.jpg', '/assets/places/nevytske_2.jpg', '/assets/places/nevytske_3.jpg']
  },
  {
    id: 'vylkove',
    name: 'Вилкове — українська Венеція',
    region: 'Одеська область',
    category: 'coast',
    lat: 45.39836,
    lng: 29.59036,
    bestSeason: 'Травень – вересень',
    difficulty: 2,
    description: 'Місто на воді в дельті Дунаю, де замість вулиць — канали-єрики, а замість авто — човни. Звідси рукою подати до нульового кілометра Дунаю та пеліканів біосферного заповідника.',
    photos: ['/assets/places/vylkove_1.jpg', '/assets/places/vylkove_2.jpg', '/assets/places/vylkove_3.jpg']
  },
  {
    id: 'tuzly',
    name: 'Тузлівські лимани',
    region: 'Одеська область',
    category: 'coast',
    lat: 45.78333,
    lng: 30,
    bestSeason: 'Травень – вересень',
    difficulty: 3,
    description: 'Дикий національний парк — ланцюг солоних лиманів, відрізаних від моря вузьким пересипом. Жодної інфраструктури, зате тисячі птахів і абсолютно порожні пляжі.',
    photos: ['/assets/places/tuzly_1.jpg', '/assets/places/tuzly_2.jpg', '/assets/places/tuzly_3.jpg']
  },
  {
    id: 'tokivskyi',
    name: 'Токівський водоспад',
    region: 'Дніпропетровська область',
    category: 'nature',
    lat: 47.685,
    lng: 33.942,
    bestSeason: 'Квітень – червень',
    difficulty: 2,
    description: 'Каскади річки Кам’янки по рожевому граніту — тому ж, з якого зроблено саркофаг Наполеона. Найефектніший навесні у велику воду; поруч — покинуті кар’єри.',
    photos: ['/assets/places/tokivskyi_1.jpg', '/assets/places/tokivskyi_2.jpg', '/assets/places/tokivskyi_3.jpg']
  },
  {
    id: 'radomysl',
    name: 'Замок Радомисль',
    region: 'Житомирська область',
    category: 'history',
    lat: 50.47749,
    lng: 29.2164,
    bestSeason: 'Будь-коли',
    difficulty: 1,
    description: 'Історико-культурний комплекс у відреставрованому водяному млині XIX століття на місці папірні 1612 року. Усередині — унікальний музей української домашньої ікони.',
    photos: ['/assets/places/radomysl_1.jpg', '/assets/places/radomysl_2.jpg', '/assets/places/radomysl_3.jpg']
  },
  {
    id: 'korostyshiv',
    name: 'Коростишівський кар’єр',
    region: 'Житомирська область',
    category: 'nature',
    lat: 50.31499,
    lng: 29.09312,
    bestSeason: 'Травень – вересень',
    difficulty: 2,
    description: 'Затоплений гранітний кар’єр із прозорою водою, скельними стінами й соснами по берегах — місцеві звуть його житомирським фіордом. Популярне місце для дайвінгу та кемпінгу.',
    photos: ['/assets/places/korostyshiv_1.jpg', '/assets/places/korostyshiv_2.jpg']
  },
  {
    id: 'kachanivka',
    name: 'Качанівка',
    region: 'Чернігівська область',
    category: 'history',
    lat: 50.83944,
    lng: 32.66472,
    bestSeason: 'Травень – жовтень',
    difficulty: 1,
    description: 'Найбільший в Україні палацово-парковий ансамбль — 560 гектарів парку навколо палацу Тарновських, де гостювали Шевченко, Гоголь і Рєпін. Алеї, ставки, амфітеатр і Горбатий міст.',
    photos: ['/assets/places/kachanivka_1.jpg', '/assets/places/kachanivka_2.jpg', '/assets/places/kachanivka_3.jpg']
  },
  {
    id: 'baturyn',
    name: 'Батуринська фортеця',
    region: 'Чернігівська область',
    category: 'history',
    lat: 51.34262,
    lng: 32.88688,
    bestSeason: 'Квітень – жовтень',
    difficulty: 1,
    description: 'Відбудована цитадель гетьманської столиці, зруйнованої військами Меншикова у 1708 році. Поруч — палац Розумовського, один із найкращих зразків класицизму в Україні.',
    photos: ['/assets/places/baturyn_1.jpg', '/assets/places/baturyn_2.jpg', '/assets/places/baturyn_3.jpg']
  },
  {
    id: 'sanzhiyka',
    name: 'Санжійка',
    region: 'Одеська область',
    category: 'coast',
    lat: 46.22833,
    lng: 30.60389,
    bestSeason: 'Червень – вересень',
    difficulty: 1,
    description: 'Село на обриві над морем, під яким ховається широкий піщаний пляж і старий маяк. Тиха альтернатива переповненим одеським курортам за годину їзди від міста.',
    photos: ['/assets/places/sanzhiyka_1.jpg', '/assets/places/sanzhiyka_2.jpg', '/assets/places/sanzhiyka_3.jpg']
  },
  {
    id: 'atlantyda',
    name: 'Печера Атлантида',
    region: 'Хмельницька область',
    category: 'nature',
    lat: 48.59925,
    lng: 26.34511,
    bestSeason: 'Травень – жовтень',
    difficulty: 4,
    description: 'Триярусна гіпсова печера біля Завалля з рідкісними кристалами й кальцитовими натічними формами. Проходи місцями дуже вузькі — лише з провідником і без страху перед тіснотою.',
    photos: ['/assets/places/atlantyda_1.jpg', '/assets/places/atlantyda_2.jpg', '/assets/places/atlantyda_3.jpg']
  },
  {
    id: 'dzembronia',
    name: 'Дземброня',
    region: 'Івано-Франківська область',
    category: 'mountains',
    lat: 48.07722,
    lng: 24.605,
    bestSeason: 'Червень – вересень',
    difficulty: 3,
    description: 'Найвисокогірніше село Івано-Франківщини і брама на Чорногору з боку Дзембронських скель-останців. Звідси починають маршрут на Смотрич, Піп Іван і Вухатий Камінь.',
    photos: ['/assets/places/dzembronia_1.jpg', '/assets/places/dzembronia_2.jpg', '/assets/places/dzembronia_3.jpg']
  },
  {
    id: 'hutsulshchyna',
    name: 'Національний парк «Гуцульщина»',
    region: 'Івано-Франківська область',
    category: 'nature',
    lat: 48.3007,
    lng: 25.0907,
    bestSeason: 'Травень – жовтень',
    difficulty: 2,
    description: 'Парк навколо Косова, що поєднує буковий ліс, скельні гребені Сокільського та живі гуцульські ремесла. Чудові короткі маршрути з панорамами на Карпати.',
    photos: ['/assets/places/hutsulshchyna_1.jpg', '/assets/places/hutsulshchyna_2.jpg', '/assets/places/hutsulshchyna_3.jpg']
  },
  {
    id: 'probiy',
    name: 'Водоспад Пробій',
    region: 'Івано-Франківська область',
    category: 'nature',
    lat: 48.43944,
    lng: 24.53944,
    bestSeason: 'Квітень – жовтень',
    difficulty: 1,
    description: 'Найповноводніший водоспад Карпат просто в центрі Яремчого: Прут пробиває скельний поріг заввишки 8 метрів. Поруч — знаменитий сувенірний ринок і скеля Ведмідь.',
    photos: ['/assets/places/probiy_1.jpg', '/assets/places/probiy_2.jpg', '/assets/places/probiy_3.jpg']
  },
  {
    id: 'kuyalnyk',
    name: 'Куяльницький лиман',
    region: 'Одеська область',
    category: 'coast',
    lat: 46.66444,
    lng: 30.71306,
    bestSeason: 'Червень – вересень',
    difficulty: 2,
    description: 'Солоне озеро, вода якого влітку рожевіє через мікроводорість дуналієлу, з цілющими чорними грязями й курортом із 1833 року. Сюрреалістичні краєвиди із соляною кіркою по берегах.',
    photos: ['/assets/places/kuyalnyk_1.jpg', '/assets/places/kuyalnyk_2.jpg', '/assets/places/kuyalnyk_3.jpg']
  },
  {
    id: 'kryshtaleva',
    name: 'Кришталева печера',
    region: 'Тернопільська область',
    category: 'nature',
    lat: 48.69028,
    lng: 26.09167,
    bestSeason: 'Травень – жовтень',
    difficulty: 3,
    description: 'Обладнана гіпсова печера біля Кривчого — єдина в регіоні з екскурсійним маршрутом і освітленням. Стіни вкриті кристалами гіпсу, а зали мають назви на кшталт «Голова Бика».',
    photos: ['/assets/places/kryshtaleva_1.jpg', '/assets/places/kryshtaleva_2.jpg', '/assets/places/kryshtaleva_3.jpg']
  },
  {
    id: 'zbarazh',
    name: 'Збаразький замок',
    region: 'Тернопільська область',
    category: 'history',
    lat: 49.66336,
    lng: 25.78536,
    bestSeason: 'Квітень – жовтень',
    difficulty: 1,
    description: 'Бастіонний замок XVII століття, оспіваний Сенкевичем у «Вогнем і мечем» за легендарну оборону 1649 року. Відреставрований палац, вали й музей у центрі містечка.',
    photos: ['/assets/places/zbarazh_1.jpg', '/assets/places/zbarazh_2.jpg', '/assets/places/zbarazh_3.jpg']
  },
  {
    id: 'berezhany',
    name: 'Бережанський замок',
    region: 'Тернопільська область',
    category: 'history',
    lat: 49.44625,
    lng: 24.94496,
    bestSeason: 'Травень – вересень',
    difficulty: 2,
    description: 'Ренесансний замок Сенявських на острові між рукавами Золотої Липи — колись його називали галицьким Вавелем. Зараз це атмосферні руїни з залишками унікальної замкової каплиці.',
    photos: ['/assets/places/berezhany_1.jpg', '/assets/places/berezhany_2.jpg', '/assets/places/berezhany_3.jpg']
  },
  {
    id: 'sataniv',
    name: 'Сатанів',
    region: 'Хмельницька область',
    category: 'history',
    lat: 49.25,
    lng: 26.26667,
    bestSeason: 'Травень – вересень',
    difficulty: 2,
    description: 'Містечко з замком XVI століття, найстарішою синагогою-фортецею Поділля і мінеральними джерелами. Довкола — товтри й лісові стежки національного парку.',
    photos: ['/assets/places/sataniv_1.jpg', '/assets/places/sataniv_2.jpg', '/assets/places/sataniv_3.jpg']
  },
  {
    id: 'kudryntsi',
    name: 'Кудринецький замок',
    region: 'Тернопільська область',
    category: 'history',
    lat: 48.62194,
    lng: 26.29167,
    bestSeason: 'Травень – вересень',
    difficulty: 3,
    description: 'Руїни замку XVII століття на вершині Стрілецької гори над Збручем — найдикіший і найменш відвідуваний із подільських замків. Підйом крутий, але панорама на долину того варта.',
    photos: ['/assets/places/kudryntsi_1.jpg', '/assets/places/kudryntsi_2.jpg', '/assets/places/kudryntsi_3.jpg']
  },
  {
    id: 'khrinnyky',
    name: 'Хрінницьке водосховище',
    region: 'Рівненська область',
    category: 'nature',
    lat: 50.42491,
    lng: 25.1657,
    bestSeason: 'Червень – вересень',
    difficulty: 2,
    description: 'Велике водосховище на Стирі, яке називають рівненським морем: піщані коси, острови й затоки серед лісу. Головне місце регіону для кемпінгу, віндсерфінгу та риболовлі.',
    photos: ['/assets/places/khrinnyky_1.jpg', '/assets/places/khrinnyky_2.jpg', '/assets/places/khrinnyky_3.jpg']
  },
  {
    id: 'shatsk',
    name: 'Озеро Світязь',
    region: 'Волинська область',
    category: 'nature',
    lat: 51.49694,
    lng: 23.83889,
    bestSeason: 'Червень – серпень',
    difficulty: 1,
    description: 'Найглибше природне озеро України (58 м) з прозорою карстовою водою і піщаним дном — серце Шацького національного парку. Купання, велосипед і соснові ліси навколо.',
    photos: ['/assets/places/shatsk_1.jpg', '/assets/places/shatsk_2.jpg', '/assets/places/shatsk_3.jpg']
  },
  {
    id: 'kaniv',
    name: 'Канівський природний заповідник',
    region: 'Черкаська область',
    category: 'nature',
    lat: 49.7236,
    lng: 31.52522,
    bestSeason: 'Травень – вересень',
    difficulty: 2,
    description: 'Канівські гори — «українська Швейцарія» з ярами, дібровами й дніпровськими кручами поруч із могилою Шевченка. Один із найстаріших заповідників країни з науковою стежкою.',
    photos: ['/assets/places/kaniv_1.jpg', '/assets/places/kaniv_2.jpg', '/assets/places/kaniv_3.jpg']
  },
  {
    id: 'vukhatyi',
    name: 'Гора Вухатий Камінь',
    region: 'Івано-Франківська область',
    category: 'mountains',
    lat: 48.06983,
    lng: 24.63794,
    bestSeason: 'Червень – вересень',
    difficulty: 3,
    description: 'Скельні останці на гребені Чорногори, схожі на вуха, з видом на Піп Іван і всю Дземброню. Одне з найкращих місць Карпат для зустрічі світанку над морем хмар.',
    photos: ['/assets/places/vukhatyi_1.jpg', '/assets/places/vukhatyi_2.jpg', '/assets/places/vukhatyi_3.jpg']
  },
  {
    id: 'shyshkovi',
    name: 'Шишкові горби',
    region: 'Чернівецька область',
    category: 'nature',
    lat: 48.55139,
    lng: 26.79139,
    bestSeason: 'Травень – жовтень',
    difficulty: 2,
    description: 'Конусоподібні вапнякові горби — рештки давнього коралового рифу — на кручах Дністра біля села Нагоряни. Ранкові тумани над водою роблять це місце майже нереальним.',
    photos: ['/assets/places/shyshkovi_1.jpg', '/assets/places/shyshkovi_2.jpg', '/assets/places/shyshkovi_3.jpg']
  },
  {
    id: 'chervonohorod',
    name: 'Червоногородський замок',
    region: 'Тернопільська область',
    category: 'history',
    lat: 48.80403,
    lng: 25.59681,
    bestSeason: 'Травень – вересень',
    difficulty: 3,
    description: 'Дві самотні вежі палацу посеред зниклого міста в каньйоні Джурину — місто вимерло, а замок лишився. За 700 метрів шумить найвищий рівнинний водоспад України.',
    photos: ['/assets/places/chervonohorod_1.jpg', '/assets/places/chervonohorod_2.jpg', '/assets/places/chervonohorod_3.jpg']
  },
  {
    id: 'drahobrat',
    name: 'Драгобрат',
    region: 'Закарпатська область',
    category: 'mountains',
    lat: 48.24917,
    lng: 24.24722,
    bestSeason: 'Грудень – березень, липень – вересень',
    difficulty: 3,
    description: 'Найвисокогірніший гірськолижний курорт України (1400 м) під вершинами Стога і Близниці, куди можна дістатися лише позашляховиком. Сніг лежить до травня, а влітку тут льодовикові озера й чорниця.',
    photos: ['/assets/places/drahobrat_1.jpg', '/assets/places/drahobrat_2.jpg', '/assets/places/drahobrat_3.jpg']
  }
];
