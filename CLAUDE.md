# moimi – Социальная сеть рецептов

## Что это

Веб-приложение для хранения, публикации и обмена кулинарными рецептами. Пользователи могут добавлять рецепты (текстом, вручную или через распознавание фото), лайкать, сохранять в избранное, комментировать, подписываться на авторов. Рецепты автоматически парсятся AI и переводятся на язык пользователя.

## Стек

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **AI-парсинг:** OpenRouter API (DeepSeek V3) – серверный route `/api/parse`
- **Деплой:** Vercel (автодеплой из GitHub)
- **Домен:** пока на Vercel subdomain

## Репозиторий

GitHub: `SergeVerde/EnvoieMoi` (ветка main)

## Environment Variables (Vercel)

- `NEXT_PUBLIC_SUPABASE_URL` – URL проекта Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Legacy anon key (начинается с `eyJ...`)
- `OPENROUTER_API_KEY` – ключ OpenRouter для AI-парсинга рецептов

## Структура файлов

```
src/
├── app/
│   ├── layout.js              # Root layout, metadata (title: "moimi")
│   ├── globals.css             # Tailwind + кастомные стили, шрифты Nunito + Playfair Display
│   ├── page.js                 # Главная страница: лента рецептов, роутинг между экранами
│   ├── auth/
│   │   └── callback/
│   │       └── route.js        # Обработчик callback от Supabase Auth (email confirm, OAuth)
│   └── api/
│       └── parse/
│           └── route.js        # Серверный API для AI-парсинга рецептов (OpenRouter)
├── components/
│   ├── AuthScreen.jsx          # Экран входа: Google OAuth + email/пароль + регистрация
│   ├── BottomNav.jsx           # Нижняя навигация: Лента, Избранное, +, Профиль
│   ├── RecipeCard.jsx          # Карточка рецепта в ленте (фото, теги, лайки, автор)
│   ├── RecipeDetail.jsx        # Полный просмотр рецепта + комментарии + галерея
│   ├── AddRecipe.jsx           # Добавление: AI-парсинг текста, OCR с фото, ручной ввод
│   ├── ProfileView.jsx         # Профиль: аватар, био, ссылка, подписки, рецепты автора
│   └── SettingsView.jsx        # Настройки: язык интерфейса, язык рецептов
└── lib/
    ├── supabase.js             # Supabase browser client
    ├── i18n.js                 # Переводы (ru, en + заготовки fr/es/pt/de/it/tr), UNITS, LANGS
    └── image.js                # resizeImage (canvas, JPEG 80%, max 1200px), fileToBase64
```

## База данных (Supabase)

Таблицы:
- `profiles` – id (uuid, FK auth.users), username, display_name, avatar_url, bio, website, role (creator/admin/premium/user), created_at
- `recipes` – id, user_id, title, description, servings, prep_time, cook_time, calories, calories_per, ingredients (jsonb), steps (jsonb), tags (text[]), tips, lang, created_at, updated_at
- `recipe_photos` – id, recipe_id, url, is_main, sort_order
- `likes` – user_id + recipe_id (PK)
- `favorites` – user_id + recipe_id (PK)
- `comments` – id, recipe_id, user_id, text, created_at
- `follows` – follower_id + following_id (PK)
- `user_settings` – user_id (PK), ui_lang, recipe_lang

View:
- `recipes_feed` – рецепты + автор + likes_count + comments_count + main_photo_url

Storage bucket: `photos` (public)

RLS включен на всех таблицах. Политики: читать могут все, писать/удалять только свои данные.

Триггер `on_auth_user_created` – автосоздание профиля и настроек при регистрации (может не срабатывать корректно – есть fallback в ProfileView и page.js).

## Роли пользователей

- `creator` – может всё (текущий дефолт при регистрации)
- `admin` – может всё
- `premium` – может добавлять рецепты
- `user` – только просмотр, лайки, избранное, комментарии. Кнопка "+" неактивна.

## Фичи

### Реализовано
- Авторизация: Google OAuth + email/пароль с подтверждением по email
- Лента рецептов с карточками, тегами, лайками, избранным
- Полный просмотр рецепта с пересчётом порций
- Комментарии к рецептам
- AI-парсинг текста через OpenRouter (DeepSeek V3)
- OCR – распознавание рецепта с фото (до 2 фото)
- Ручной ввод с отдельными полями для ингредиентов (название + кол-во + единица)
- Загрузка фото блюда (до 5, выбор главной, авторесайз до 1200px JPEG 80%)
- Доп. поля: советы, время подготовки/готовки, калории (на порцию/на всё)
- Профиль: аватар (загрузка + ресайз), био, ссылка, подписки/подписчики
- Настройки: язык интерфейса (ru/en), язык рецептов (8 языков)
- Автоперевод рецептов при парсинге
- Ролевая система (кнопка "+" заблокирована для role=user)

### Нужно доделать / известные проблемы
- Триггер автосоздания профиля может не срабатывать – есть fallback но нужно проверить
- При входе через email+пароль после подтверждения в почте может не создаться сессия
- Поиск по рецептам работает только по title/description, нет полнотекстового поиска
- Нет редактирования рецепта после публикации
- Нет удаления рецепта
- Нет пагинации (сейчас limit 50)
- Нет push-уведомлений
- Google OAuth consent screen может быть в тестовом режиме (нужно опубликовать)
- Название в шапке ленты нужно поменять на "moimi" (в page.js)

## Стиль кода

- Компоненты: React functional с hooks, `'use client'` директива
- CSS: Tailwind utility classes inline, кастомные классы в globals.css (gradient-text, gradient-btn)
- Шрифты: Playfair Display (заголовки, display), Nunito (body)
- Цвета: amber/brand (#d97706), danger (#e74c3c), bg (#faf8f5)
- Без TypeScript (пока)
- Без ESLint конфига (пока)
- jsconfig.json настроен для алиаса `@/` → `./src/`

## Дизайн

- Мобильный-first, max-width 480px
- Тёплая крафтовая палитра (бежевый фон, амберные акценты)
- Карточки с эмодзи-заглушками если нет фото (эмодзи подбирается по тегам)
- Нижняя навигация с плавающей кнопкой "+"

## Владелец

Serge (SergeVerde), базируется в Португалии. Проект в активной разработке.

## Языки

Интерфейс: русский (основной), английский. Переводы в `src/lib/i18n.js`.
При переводе на другие языки: украинский НЕ добавлять, вместо него турецкий (уже в списке).
Длинные тире (—) запрещены, использовать только короткие (–).
