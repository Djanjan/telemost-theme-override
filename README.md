# Телемост без зелёного

Меняет фирменный зелёный цвет Яндекс Телемоста на любой другой.

Файлы Телемоста **не трогаются** — тема накладывается поверх при запуске.
Обновление Телемоста ничего не ломает.

## Скачать

Готовый `telemost-start.exe` — на странице
[Releases](../../releases/latest). Рядом лежит файл `.sha256`, если хотите
сверить контрольную сумму:

```powershell
Get-FileHash telemost-start.exe -Algorithm SHA256
```

Программа не подписана сертификатом, поэтому SmartScreen при первом запуске
может показать предупреждение: «Подробнее» → «Выполнить в любом случае».

## Как пользоваться

Запустите `telemost-start.exe` вместо обычного ярлыка. Он сам откроет Телемост
и применит тему.

Если Телемост уже открыт — закроет и откроет заново (иначе подключиться к нему
нельзя). Консольное окно спрячется само, когда всё применится.

Удобно: закрепите `telemost-start.exe` на панели задач вместо ярлыка Телемоста.

---

## Полный алгоритм замены и настройки темы

### Где находятся файлы конфигурации

При первом запуске создаётся персональная папка настроек:

```
%LOCALAPPDATA%\TelemostThemeOverride\
  theme.json     цвета и оформление интерфейса
  config.json    путь к Телемосту, порт, поведение консоли
```

> **Важно:** Файл `%LOCALAPPDATA%\TelemostThemeOverride\theme.json` создаётся один раз и **не перезаписывается автоматически**, чтобы ваши правки не сбрасывались.

---

### Пошаговая инструкция

#### Шаг 1. Откройте файл темы

1. Нажмите сочетание клавиш `Win + R`.
2. Вставьте путь: `%LOCALAPPDATA%\TelemostThemeOverride` и нажмите **Enter**.
3. Откройте файл `theme.json` в любом текстовом редакторе (VS Code, Блокнот и т.д.).

*(Если вы работаете с исходным кодом репозитория, редактируйте `config/theme.json`)*.

---

#### Шаг 2. Выберите способ настройки

##### Способ А. Быстрая смена основного цвета (только интерактивные элементы)
Удалите массив `accentScale` и укажите желаемый HEX-цвет в `seeds.interactive`:

```json
{
  "name": "My Custom Theme",
  "id": "my-custom-theme",
  "light": {
    "seeds": {
      "neutral": "#8e8b8b",
      "primary": "#dcde8d",
      "success": "#12c905",
      "warning": "#ffdc17",
      "error": "#fc533a",
      "info": "#a753ae",
      "interactive": "#ec729c"
    }
  },
  "dark": {
    "seeds": {
      "neutral": "#716c6b",
      "primary": "#fab283",
      "success": "#12c905",
      "warning": "#fcd53a",
      "error": "#fc533a",
      "info": "#edb2f1",
      "interactive": "#f497be"
    }
  }
}
```
*Все промежуточные оттенки (наведение, нажатие, фон сообщений) генератор построит автоматически.*

##### Способ Б. Полный контроль палитры бренда (12 оттенков)
Задайте шкалу `accentScale` (ровно 12 оттенков от самого светлого к самому тёмному).
Она имеет приоритет над автоматической генерацией из `seeds.interactive`.

##### Способ В. Полная перекраска всего интерфейса (`semantic`)
Чтобы изменить цвет **контейнеров, карточек, фона страницы, боковой панели, текста, кнопок, обводок и теней**, используйте блок `semantic` внутри `light` и `dark`:

```json
{
  "name": "Pastel Blossom",
  "id": "pastel-blossom",
  "light": {
    "seeds": { ... },
    "semantic": {
      "page": {
        "background": "#fff5f8",
        "conversation": "#fff5f8"
      },
      "surface": {
        "generic": "#ffffff",
        "genericHovered": "#fef0f5"
      },
      "modal": {
        "card": "#ffffff",
        "popup": "#ffffff"
      },
      "control": {
        "buttonBrand": "#ec729c",
        "buttonBrandText": "#ffffff"
      },
      "text": {
        "primary": "#3f1b2b",
        "secondary": "#7e445b"
      },
      "line": {
        "generic": "#f3d5e2"
      }
    }
  },
  "dark": {
    "seeds": { ... },
    "semantic": {
      "page": {
        "background": "#20121a",
        "conversation": "#20121a"
      },
      "surface": {
        "generic": "#36202e",
        "genericHovered": "#432739"
      },
      "modal": {
        "card": "#36202e",
        "popup": "#36202e"
      },
      "control": {
        "buttonBrand": "#d9659b",
        "buttonBrandText": "#ffffff"
      },
      "text": {
        "primary": "#fff2f7",
        "secondary": "#e2b4c8"
      },
      "line": {
        "generic": "#542a42"
      }
    }
  }
}
```

Всего доступно **124 семантических слота** в 15 категориях (`page`, `surface`, `elevation`, `modal`, `overlay`, `line`, `focus`, `text`, `icon`, `control`, `state`, `selection`, `status`, `shadow`, `gradient`). Полная документация слотов: [docs/semantic-colors.md](docs/semantic-colors.md).

##### Способ Г. Картинки и обои на фон в разных местах (`backgrounds`)
Вы можете установить любые фоновые изображения (обои, текстуры, арты, узоры) для окна чата, главного экрана, боковой панели со списком чатов, экрана звонка, страницы логина и модальных окон:

```json
{
  "name": "Pastel Blossom with Chat Wallpaper",
  "id": "pastel-blossom-wallpaper",
  "light": {
    "seeds": { ... },
    "backgrounds": {
      "chat": {
        "image": "wallpapers/light-bg.png",
        "size": "cover",
        "position": "center",
        "overlay": "rgba(255, 245, 248, 0.85)"
      },
      "sidebar": "wallpapers/pattern.png"
    }
  },
  "dark": {
    "seeds": { ... },
    "backgrounds": {
      "chat": {
        "image": "wallpapers/dark-bg.png",
        "size": "cover",
        "position": "center",
        "overlay": "rgba(32, 18, 26, 0.8)"
      }
    }
  }
}
```

- Поддерживаются локальные файлы (`.png`, `.jpg`, `.webp`, `.svg`), веб-ссылки `https://...`, Data URI и градиенты.
- Параметр `overlay` добавляет полупрозрачную подложку поверх картинки, чтобы текст сообщений оставался 100% читаемым.
- Доступные зоны: `chat` (чат), `page` (весь фон), `sidebar` (боковая панель), `home` (главный экран), `call` (экран звонка), `login` (вход), `modal` (карточки и окна), `settings` (настройки), `custom` (любой CSS-селектор).
- Подробное руководство и все параметры: [docs/background-images.md](docs/background-images.md).

---

#### Шаг 3. Примените тему

- **Для пользователей `.exe`**: сохраните файл `theme.json` и просто запустите `telemost-start.exe`.
- **Для разработчиков**: выполните команду `bun run launch` или `bun run apply`.

Если Телемост уже был запущен, лаунчер перезапустит его и применит новые цвета.

---

### Сброс темы к стандартным значениям

Если вы хотите вернуть исходную тему по умолчанию:
1. Удалите файл `%LOCALAPPDATA%\TelemostThemeOverride\theme.json`.
2. Запустите `telemost-start.exe` — файл создастся заново со стандартными значениями.

---

## Настройки `config.json`

| Параметр | По умолчанию | Что делает |
| --- | --- | --- |
| `telemostExe` | находится сам | Путь к `YandexTelemost.exe` |
| `debugPort` | `9333` | Технический порт, только `127.0.0.1` |
| `watch` | `true` | Держать тему при переходах внутри приложения |
| `launchTimeoutSeconds` | `45` | Сколько ждать окно Телемоста |
| `hideConsole` | `"auto"` | `auto` — спрятать после успеха, `always` — всегда, `never` — не прятать |

При `auto` окно остаётся открытым, если есть предупреждение — чтобы его можно
было прочитать.

## Пресеты тем и быстрый выбор

В программу встроена коллекция готовых тем, а также поддержка сохранения своих пресетов и обмена ими:

### Встроенные темы:
- **`pastel-blossom`** — Pastel Blossom & Rose Velvet (нежный розовый / бархатная роза)
- **`tokyo-night`** — Tokyo Night (глубокий неоновый индиго / чистый светлый)
- **`nord`** — Nord Frost (холодная арктическая палитра Nord)
- **`catppuccin`** — Catppuccin Mocha & Latte (популярная палитра Catppuccin)
- **`emerald`** — Cyberpunk Emerald (высококонтрастный изумрудно-неоновый киберпанк)
- **`dracula`** — Dracula Vampire (классический фиолетово-розовый готический стиль)
- **`monokai`** — Monokai Pro Sunset (тёплый угольный с янтарно-золотым)
- **`cobalt`** — Cobalt Midnight (глубокий кобальтово-синий)

### Команды для работы с пресетами:

```powershell
# Посмотреть список всех доступных пресетов (встроенных и пользовательских)
telemost-start.exe --list-presets

# Запустить Телемост с конкретным пресетом или файлом темы
telemost-start.exe --preset nord
telemost-start.exe --preset tokyo-night
telemost-start.exe --preset C:\path\to\theme.json

# Установить пресет по умолчанию (сохраняется в config.json)
telemost-start.exe --set-preset nord

# Сохранить текущие настройки (theme.json) как именованный пресет
telemost-start.exe --save-preset my-favorite-theme

# Импортировать файл темы от друга в папку пресетов
telemost-start.exe --import-preset friend-theme.json

# Экспортировать тему в единый самодостаточный JSON-файл для отправки другу (с упаковкой обоев)
telemost-start.exe --export-preset tokyo-night --out tokyo-night-share.json
```

## Команды

```
telemost-start.exe                          запустить и держать активную тему
telemost-start.exe --preset <name|path>     запустить с указанным пресетом
telemost-start.exe --list-presets           список всех доступных пресетов
telemost-start.exe --set-preset <name>      выбрать тему по умолчанию
telemost-start.exe --save-preset <name>     сохранить тему как пресет
telemost-start.exe --import-preset <path>   импортировать тему
telemost-start.exe --export-preset <name>   экспортировать тему в JSON
telemost-start.exe --once                   применить один раз и выйти
telemost-start.exe --where                  показать, где лежат настройки
telemost-start.exe --help                   справка
```

## Почему так сделано

Интерфейс Телемоста — веб-приложение, зашитое внутрь подписанного `.exe`
размером 156 МБ. Файла со стилями на диске просто нет, а правка самой программы
слетела бы при первом автообновлении.

Поэтому тема подставляется в момент работы, через штатный механизм Qt.
Подмена идёт на уровне базовой палитры, а не отдельных кнопок: имена элементов
меняются от версии к версии, палитра — нет. После применения программа
перепроверяет результат в живом окне и прямо сообщает, если Телемост
что-то переименовал.

Подробности: [`docs/brand-tokens.md`](docs/brand-tokens.md).

## Для разработчиков

```
bun install
bun run launch        запуск из исходников (читает %LOCALAPPDATA%)
bun run apply         быстрое применение (читает config/theme.json)
bun run build-css     показать генерируемый CSS
bun run doctor        диагностика работающего Телемоста
bun run typecheck     проверка типов TypeScript
bun run test          запуск набора unit-тестов
bun run build         собрать dist/telemost-start.exe (вшивает config/ в бинарник)
```

Источник правды по умолчанию — `config/*.json`.
При сборке (`bun run build`) скрипт автоматически выполняет `sync-defaults`, перекрашивает иконку `assets/telemost-themed.ico` и компилирует автономный бинарный файл `dist/telemost-start.exe`.

---

<sub>
Яндекс Телемост тема, Telemost dark theme, кастомная тема Телемост,
убрать зелёный цвет Телемост, telemost custom theme, изменить цвет Телемоста,
Yandex Telemost theme changer, Телемост тёмная тема, Telemost UI customization,
перекрасить Телемост, Telemost accent color, Яндекс Мессенджер тема,
Qt WebEngine CSS injection, telemost-theme-override
</sub>
