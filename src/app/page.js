'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import RecipeCard from '@/components/RecipeCard';
import BottomNav from '@/components/BottomNav';
import AuthScreen from '@/components/AuthScreen';
import AddRecipe from '@/components/AddRecipe';
import RecipeDetail from '@/components/RecipeDetail';
import ProfileView from '@/components/ProfileView';
import SettingsView from '@/components/SettingsView';

export default function Home() {
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('feed');
  const [recipes, setRecipes] = useState([]);
  const [favIds, setFavIds] = useState([]);
  const [likeIds, setLikeIds] = useState([]);
  const [filter, setFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [viewUserId, setViewUserId] = useState(null);
  const [toast, setToast] = useState('');
  const [settings, setSettings] = useState({ ui_lang: 'ru', recipe_lang: 'ru' });
  const [editRecipeData, setEditRecipeData] = useState(null);

  const L = settings.ui_lang;
  const canAdd = ['cook', 'admin', 'creator'].includes(profile?.role);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) loadUserData(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadUserData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(userId) {
    const [profileRes, settingsRes, favsRes, likesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_settings').select('*').eq('user_id', userId).single(),
      supabase.from('favorites').select('recipe_id').eq('user_id', userId),
      supabase.from('likes').select('recipe_id').eq('user_id', userId),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (!profileRes.data) {
      const { data: { user } } = await supabase.auth.getUser();
      const username = user?.email?.split('@')[0] || 'user_' + userId.slice(0, 6);
      await supabase.from('profiles').upsert({
        id: userId,
        username: username,
        display_name: user?.user_metadata?.full_name || username,
        avatar_url: user?.user_metadata?.avatar_url || '',
        role: 'cook',
      }, { onConflict: 'id' });
      const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (newProfile) setProfile(newProfile);
    }
    if (settingsRes.data) setSettings(settingsRes.data);
    setFavIds((favsRes.data || []).map(f => f.recipe_id));
    setLikeIds((likesRes.data || []).map(l => l.recipe_id));

    await loadRecipes();
    setLoading(false);
  }

  async function loadRecipes() {
    const { data } = await supabase
      .from('recipes_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setRecipes(data || []);
  }

  // Like / Fav
  async function toggleLike(recipeId) {
    const liked = likeIds.includes(recipeId);
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('recipe_id', recipeId);
      setLikeIds(likeIds.filter(id => id !== recipeId));
    } else {
      await supabase.from('likes').insert({ user_id: user.id, recipe_id: recipeId });
      setLikeIds([...likeIds, recipeId]);
    }
    // Refresh recipes to update count
    loadRecipes();
  }

  async function toggleFav(recipeId) {
    const faved = favIds.includes(recipeId);
    if (faved) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('recipe_id', recipeId);
      setFavIds(favIds.filter(id => id !== recipeId));
      showToast(t(L, 'rmFav'));
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, recipe_id: recipeId });
      setFavIds([...favIds, recipeId]);
      showToast(t(L, 'addFav'));
    }
  }

  // Navigate
  function openRecipe(id) { setSelectedId(id); setScreen('detail'); }
  function openProfile(userId) { setViewUserId(userId || user?.id); setScreen('profile'); }

  // Filter
  const allTags = [...new Set(recipes.flatMap(r => r.tags || []))];
  const filtered = recipes.filter(r => {
    if (screen === 'favorites' && !favIds.includes(r.id)) return false;
    if (filter && !(r.tags || []).includes(filter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Loading
  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center">
      <div className="w-9 h-9 border-3 border-gray-200 border-t-brand rounded-full animate-spin" />
    </div>
  );

  // Auth
  if (!user) return <AuthScreen supabase={supabase} />;

  // Detail
  if (screen === 'detail' && selectedId) return (
    <RecipeDetail
      recipeId={selectedId}
      supabase={supabase}
      user={user}
      lang={L}
      liked={likeIds.includes(selectedId)}
      faved={favIds.includes(selectedId)}
      onLike={() => toggleLike(selectedId)}
      onFav={() => toggleFav(selectedId)}
      onBack={() => { setScreen('feed'); setSelectedId(null); }}
      onOpenProfile={openProfile}
      onEdit={(recipeData) => { setEditRecipeData(recipeData); setScreen('edit'); }}
      showToast={showToast}
    />
  );

  // Edit
  if (screen === 'edit' && editRecipeData) return (
    <AddRecipe
      supabase={supabase}
      user={user}
      profile={profile}
      lang={L}
      recipeLang={settings.recipe_lang}
      canAdd={canAdd}
      editRecipe={editRecipeData}
      onPublished={() => { loadRecipes(); setScreen('detail'); setEditRecipeData(null); showToast(t(L, 'updatedMsg')); }}
      onBack={() => { setScreen('detail'); setEditRecipeData(null); }}
    />
  );

  // Add
  if (screen === 'add') return (
    <AddRecipe
      supabase={supabase}
      user={user}
      profile={profile}
      lang={L}
      recipeLang={settings.recipe_lang}
      canAdd={canAdd}
      onPublished={() => { loadRecipes(); setScreen('feed'); showToast(t(L, 'published')); }}
      onBack={() => setScreen('feed')}
    />
  );

  // Profile
  if (screen === 'profile') return (
    <ProfileView
      supabase={supabase}
      userId={viewUserId || user.id}
      currentUser={user}
      profile={profile}
      lang={L}
      onBack={() => { setScreen('feed'); setViewUserId(null); }}
      onOpenRecipe={openRecipe}
      onSettings={() => setScreen('settings')}
      onLogout={async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); }}
      setProfile={setProfile}
    />
  );

  // Settings
  if (screen === 'settings') return (
    <SettingsView
      supabase={supabase}
      user={user}
      settings={settings}
      lang={L}
      onBack={() => setScreen('profile')}
      onUpdate={(s) => setSettings(s)}
    />
  );

  // Feed / Favorites
  return (
    <div className="max-w-md mx-auto min-h-screen relative pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-[#faf8f5] z-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold gradient-text">moimi</h1>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            className="flex-1 outline-none text-sm bg-transparent"
            placeholder={t(L, 'search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto hide-scrollbar">
          <button
            className={`px-4 py-2 rounded-full text-xs font-semibold border whitespace-nowrap ${!filter ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}
            onClick={() => setFilter(null)}
          >{t(L, 'all')}</button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`px-4 py-2 rounded-full text-xs font-semibold border whitespace-nowrap ${filter === tag ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}
              onClick={() => setFilter(tag)}
            >{tag}</button>
          ))}
        </div>
      )}

      {/* Recipes */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-5">
          <div className="text-5xl mb-3">{screen === 'favorites' ? '⭐' : '📝'}</div>
          <h3 className="font-display text-xl font-bold mb-2">{screen === 'favorites' ? t(L, 'emptyFav') : t(L, 'empty')}</h3>
          <p className="text-gray-500 text-sm">{screen === 'favorites' ? t(L, 'saveFav') : t(L, 'addFirst')}</p>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-4">
          {filtered.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              lang={L}
              liked={likeIds.includes(recipe.id)}
              faved={favIds.includes(recipe.id)}
              onOpen={() => openRecipe(recipe.id)}
              onLike={() => toggleLike(recipe.id)}
              onFav={() => toggleFav(recipe.id)}
              onShare={() => {
                const txt = `🍽️ ${recipe.title}\n${recipe.description || ''}`;
                if (navigator.share) navigator.share({ title: recipe.title, text: txt });
                else { navigator.clipboard.writeText(txt); showToast(t(L, 'copied')); }
              }}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Nav */}
      <BottomNav
        screen={screen}
        canAdd={canAdd}
        lang={L}
        onFeed={() => { setScreen('feed'); setFilter(null); }}
        onFavs={() => { setScreen('favorites'); setFilter(null); }}
        onAdd={() => setScreen('add')}
        onProfile={() => openProfile(user.id)}
      />
    </div>
  );
}
