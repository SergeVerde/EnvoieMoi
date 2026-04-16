-- ═══════════════════════════════════════
-- Рецептник – Supabase Schema
-- Выполни этот SQL целиком в SQL Editor
-- ═══════════════════════════════════════

-- Профили пользователей
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text default '',
  website text default '',
  role text default 'user' check (role in ('creator','admin','premium','user')),
  created_at timestamptz default now()
);

-- Подписки
create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Рецепты
create table public.recipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text default '',
  servings int default 4,
  prep_time text default '',
  cook_time text default '',
  calories int,
  calories_per text default 'serving' check (calories_per in ('serving','total')),
  ingredients jsonb not null default '[]',
  steps jsonb not null default '[]',
  tags text[] default '{}',
  tips text default '',
  lang text default 'ru',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Фото рецептов
create table public.recipe_photos (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  url text not null,
  is_main boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Лайки
create table public.likes (
  user_id uuid references public.profiles(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, recipe_id)
);

-- Избранное
create table public.favorites (
  user_id uuid references public.profiles(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, recipe_id)
);

-- Комментарии
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  created_at timestamptz default now()
);

-- Настройки пользователя
create table public.user_settings (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  ui_lang text default 'ru',
  recipe_lang text default 'ru'
);

-- ═══ Индексы ═══
create index idx_recipes_user on public.recipes(user_id);
create index idx_recipes_created on public.recipes(created_at desc);
create index idx_recipes_tags on public.recipes using gin(tags);
create index idx_recipe_photos_recipe on public.recipe_photos(recipe_id);
create index idx_likes_recipe on public.likes(recipe_id);
create index idx_favorites_user on public.favorites(user_id);
create index idx_comments_recipe on public.comments(recipe_id);
create index idx_follows_following on public.follows(following_id);
create index idx_follows_follower on public.follows(follower_id);

-- ═══ Views (для удобных запросов) ═══

-- Рецепт с количеством лайков и главным фото
create or replace view public.recipes_feed as
select
  r.*,
  p.username as author_username,
  p.display_name as author_name,
  p.avatar_url as author_avatar,
  coalesce(lc.cnt, 0) as likes_count,
  coalesce(cc.cnt, 0) as comments_count,
  ph.url as main_photo_url
from public.recipes r
join public.profiles p on p.id = r.user_id
left join (select recipe_id, count(*) as cnt from public.likes group by recipe_id) lc on lc.recipe_id = r.id
left join (select recipe_id, count(*) as cnt from public.comments group by recipe_id) cc on cc.recipe_id = r.id
left join public.recipe_photos ph on ph.recipe_id = r.id and ph.is_main = true;

-- ═══ RLS (Row Level Security) ═══
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_photos enable row level security;
alter table public.likes enable row level security;
alter table public.favorites enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.user_settings enable row level security;

-- Профили: читать все, редактировать свой
create policy "Profiles visible to all" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Рецепты: читать все, создавать/редактировать свои
create policy "Recipes visible to all" on public.recipes for select using (true);
create policy "Users can insert own recipes" on public.recipes for insert with check (auth.uid() = user_id);
create policy "Users can update own recipes" on public.recipes for update using (auth.uid() = user_id);
create policy "Users can delete own recipes" on public.recipes for delete using (auth.uid() = user_id);

-- Фото рецептов: читать все, управлять своими (через recipe ownership)
create policy "Recipe photos visible to all" on public.recipe_photos for select using (true);
create policy "Users can manage own recipe photos" on public.recipe_photos for insert
  with check (exists (select 1 from public.recipes where id = recipe_id and user_id = auth.uid()));
create policy "Users can delete own recipe photos" on public.recipe_photos for delete
  using (exists (select 1 from public.recipes where id = recipe_id and user_id = auth.uid()));

-- Лайки: читать все, управлять свои
create policy "Likes visible to all" on public.likes for select using (true);
create policy "Users can manage own likes" on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can remove own likes" on public.likes for delete using (auth.uid() = user_id);

-- Избранное: только своё
create policy "Users see own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "Users can manage own favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "Users can remove own favorites" on public.favorites for delete using (auth.uid() = user_id);

-- Комментарии: читать все, создавать/удалять свои
create policy "Comments visible to all" on public.comments for select using (true);
create policy "Users can add comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments" on public.comments for delete using (auth.uid() = user_id);

-- Подписки: читать все, управлять свои
create policy "Follows visible to all" on public.follows for select using (true);
create policy "Users can follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- Настройки: только свои
create policy "Users see own settings" on public.user_settings for select using (auth.uid() = user_id);
create policy "Users can manage own settings" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings" on public.user_settings for update using (auth.uid() = user_id);

-- ═══ Функция: автосоздание профиля при регистрации ═══
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'preferred_username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ═══ Storage policies ═══
-- Выполни это после создания bucket "photos":
-- (Можно также сделать через Supabase UI → Storage → Policies)

insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "Anyone can view photos" on storage.objects for select using (bucket_id = 'photos');
create policy "Auth users can upload photos" on storage.objects for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "Users can delete own photos" on storage.objects for delete using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
