'use client';

import { useState, useRef, useEffect } from 'react';
import { t, UNITS, DISH_TYPES, MEAL_TIMES, DIETARY_TAGS, CUISINES } from '@/lib/i18n';

const KNOWN_DISH_TYPES = new Set(DISH_TYPES);
const KNOWN_MEAL_TIMES = new Set(MEAL_TIMES);
const KNOWN_DIETARY = new Set(DIETARY_TAGS);
const KNOWN_CUISINES = new Set(CUISINES);

function normalizeAIResult(data) {
  const aiDishType = Array.isArray(data.dish_type) ? data.dish_type : (data.dish_type ? [data.dish_type] : []);
  const validDishType = aiDishType.filter(d => KNOWN_DISH_TYPES.has(d));
  const extraDishType = aiDishType.filter(d => !KNOWN_DISH_TYPES.has(d));

  const aiMealTime = Array.isArray(data.meal_time) ? data.meal_time : (data.meal_time ? [data.meal_time] : []);
  const validMealTime = aiMealTime.filter(m => KNOWN_MEAL_TIMES.has(m));
  const extraMealTime = aiMealTime.filter(m => !KNOWN_MEAL_TIMES.has(m));

  const aiDietary = Array.isArray(data.dietary) ? data.dietary : [];
  const validDietary = aiDietary.filter(d => KNOWN_DIETARY.has(d));
  const extraDietary = aiDietary.filter(d => !KNOWN_DIETARY.has(d));

  const aiCuisine = data.cuisine || '';
  const validCuisine = KNOWN_CUISINES.has(aiCuisine) ? aiCuisine : '';
  const extraCuisine = !KNOWN_CUISINES.has(aiCuisine) && aiCuisine ? [aiCuisine] : [];

  const extraTags = [...extraDishType, ...extraMealTime, ...extraDietary, ...extraCuisine];
  const allTags = [...new Set([...(data.tags || []), ...extraTags])].filter(Boolean);

  return {
    ...data,
    dish_type: validDishType,
    meal_time: validMealTime,
    dietary: validDietary,
    cuisine: validCuisine,
    tags: allTags,
  };
}
import { resizeImage, fileToBase64 } from '@/lib/image';

export default function AddRecipe({ supabase, user, profile, lang, recipeLang, canAdd, editRecipe = null, onPublished, onBack }) {
  const isEdit = !!editRecipe;
  const [mode, setMode] = useState(isEdit ? 'manual' : 'ai');
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [bMsg, setBMsg] = useState('');
  const [err, setErr] = useState('');
  const [prev, setPrev] = useState(null);
  const abortRef = useRef(null);

  // Manual fields
  const [mT, setMT] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mI, setMI] = useState([{ name: '', amount: '', unit: 'шт' }]);
  const [mS, setMS] = useState([{ content: '' }]);
  const [mTips, setMTips] = useState('');
  const [mPrep, setMPrep] = useState('');
  const [mCook, setMCook] = useState('');
  const [mCal, setMCal] = useState('');
  const [mCalP, setMCalP] = useState('serving');
  const [mServ, setMServ] = useState('4');
  const [mTags, setMTags] = useState('');
  const [mDishTypes, setMDishTypes] = useState([]);
  const [mMealTimes, setMMealTimes] = useState([]);
  const [mDietary, setMDietary] = useState([]);
  const [mCuisine, setMCuisine] = useState('');

  // Main photo (single)
  const [mainPhotoFile, setMainPhotoFile] = useState(null);
  const [mainPhotoPreview, setMainPhotoPreview] = useState('');
  const [existingMainPhoto, setExistingMainPhoto] = useState(null);

  // Step photos: { [stepIndex]: { file, previewUrl } }
  const [stepPhotos, setStepPhotos] = useState({});

  const [ocrImgs, setOcrImgs] = useState([]);
  const fRef = useRef(null);
  const oRef = useRef(null);
  const stepPhotoRefs = useRef({});

  useEffect(() => {
    if (editRecipe) {
      setMT(editRecipe.title || '');
      setMDesc(editRecipe.description || '');
      setMI(editRecipe.ingredients?.length > 0
        ? editRecipe.ingredients.map(x => ({ name: x.name || '', amount: String(x.amount || ''), unit: x.unit || 'шт' }))
        : [{ name: '', amount: '', unit: 'шт' }]);
      setMS(editRecipe.steps?.length > 0
        ? editRecipe.steps.map(x => ({ content: typeof x === 'string' ? x : (x.content || ''), photo_url: x.photo_url || '' }))
        : [{ content: '' }]);
      setMTips(editRecipe.tips || '');
      setMPrep(editRecipe.prep_time || '');
      setMCook(editRecipe.cook_time || '');
      setMCal(editRecipe.calories ? String(editRecipe.calories) : '');
      setMCalP(editRecipe.calories_per || 'serving');
      setMServ(String(editRecipe.servings || 4));
      setMTags((editRecipe.tags || []).join(', '));
      const dt = editRecipe.dish_type;
      const mt = editRecipe.meal_time;
      setMDishTypes(Array.isArray(dt) ? dt : (dt ? [dt] : []));
      setMMealTimes(Array.isArray(mt) ? mt : (mt ? [mt] : []));
      setMDietary(editRecipe.dietary || []);
      setMCuisine(editRecipe.cuisine || '');
      if (editRecipe.id) {
        supabase.from('recipe_photos').select('*').eq('recipe_id', editRecipe.id).eq('is_main', true).maybeSingle()
          .then(({ data }) => { if (data) setExistingMainPhoto(data); });
      }
    }
  }, []);

  function toggleArr(setter, val) {
    setter(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  }

  function cancelRequest() {
    abortRef.current?.abort();
    setBusy(false); setBMsg(''); setErr('');
  }

  async function doParse() {
    if (!raw.trim()) return;
    abortRef.current = new AbortController();
    setBusy(true); setBMsg(t(lang, 'parsing')); setErr('');
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw, lang: recipeLang }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (data.error) setErr(t(lang, 'parseFail'));
      else {
        const normalizedSteps = (data.steps || []).map(s =>
          typeof s === 'string' ? { content: s } : { ...s, photo_url: s.photo_url || '' }
        );
        setPrev({ ...normalizeAIResult(data), steps: normalizedSteps });
        setMode('preview');
      }
    } catch (e) {
      if (e.name !== 'AbortError') setErr(t(lang, 'parseFail'));
    }
    setBusy(false); setBMsg('');
  }

  async function addOcrImg(e) {
    const files = [...(e.target.files || [])];
    if (ocrImgs.length + files.length > 2) { e.target.value = ''; return; }
    const imgs = [...ocrImgs];
    for (const f of files) imgs.push(await fileToBase64(f));
    setOcrImgs(imgs);
    e.target.value = '';
  }

  async function doOcr() {
    if (!ocrImgs.length) return;
    abortRef.current = new AbortController();
    setBusy(true); setBMsg(t(lang, 'ocrParsing')); setErr('');
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: ocrImgs, lang: recipeLang }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (data.error) setErr(t(lang, 'parseFail'));
      else {
        const normalizedSteps = (data.steps || []).map(s =>
          typeof s === 'string' ? { content: s } : { ...s, photo_url: s.photo_url || '' }
        );
        setPrev({ ...normalizeAIResult(data), steps: normalizedSteps });
        setOcrImgs([]);
        setMode('preview');
      }
    } catch (e) {
      if (e.name !== 'AbortError') setErr(t(lang, 'parseFail'));
    }
    setBusy(false); setBMsg('');
  }

  async function addMainPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setBMsg(t(lang, 'resizing'));
    const blob = await resizeImage(file);
    setMainPhotoFile(blob);
    setMainPhotoPreview(URL.createObjectURL(blob));
    setBusy(false); setBMsg('');
    e.target.value = '';
  }

  async function addStepPhoto(stepIdx, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await resizeImage(file);
    const previewUrl = URL.createObjectURL(blob);
    setStepPhotos(prev => ({ ...prev, [stepIdx]: { file: blob, previewUrl } }));
    e.target.value = '';
  }

  function removeStepPhoto(stepIdx) {
    setStepPhotos(prev => {
      const next = { ...prev };
      delete next[stepIdx];
      return next;
    });
    setMS(prev => prev.map((s, i) => i === stepIdx ? { ...s, photo_url: '' } : s));
  }

  function backToManualFromPreview() {
    if (prev) {
      setMT(prev.title || '');
      setMDesc(prev.description || '');
      setMI(prev.ingredients?.length > 0
        ? prev.ingredients.map(x => ({ name: x.name || '', amount: String(x.amount || ''), unit: x.unit || 'шт' }))
        : [{ name: '', amount: '', unit: 'шт' }]);
      setMS(prev.steps?.length > 0
        ? prev.steps.map(x => ({ content: x.content || '', photo_url: x.photo_url || '' }))
        : [{ content: '' }]);
      setMTips(prev.tips || '');
      setMPrep(prev.prep_time || '');
      setMCook(prev.cook_time || '');
      setMCal(prev.calories ? String(prev.calories) : '');
      setMCalP(prev.calories_per || 'serving');
      setMServ(String(prev.servings || 4));
      setMTags((prev.tags || []).join(', '));
      setMDishTypes(Array.isArray(prev.dish_type) ? prev.dish_type : []);
      setMMealTimes(Array.isArray(prev.meal_time) ? prev.meal_time : []);
      setMDietary(prev.dietary || []);
      setMCuisine(prev.cuisine || '');
    }
    setMode('manual');
  }

  function doManual() {
    if (!mT.trim() || !mI.some(x => x.name.trim()) || !mS.some(x => (x.content || x).trim())) return;
    setPrev({
      id: editRecipe?.id,
      title: mT.trim(),
      description: mDesc.trim(),
      servings: parseInt(mServ) || 4,
      cook_time: mCook, prep_time: mPrep,
      calories: mCal ? parseInt(mCal) : null, calories_per: mCalP,
      tags: mTags.split(',').map(s => s.trim()).filter(Boolean),
      tips: mTips,
      dish_type: mDishTypes.length > 0 ? mDishTypes : null,
      meal_time: mMealTimes.length > 0 ? mMealTimes : null,
      dietary: mDietary.length > 0 ? mDietary : [],
      cuisine: mCuisine || '',
      ingredients: mI.filter(x => x.name.trim()).map(x => ({ name: x.name.trim(), amount: parseFloat(x.amount) || 0, unit: x.unit })),
      steps: mS.filter(x => (x.content || x).trim()).map((x, origIdx) => ({
        title: '',
        content: (typeof x === 'string' ? x : x.content || '').trim(),
        timer_seconds: null,
        photo_url: x.photo_url || '',
        _origIdx: origIdx,
      })),
    });
    setMode('preview');
  }

  async function publish() {
    if (!prev) return;
    setBusy(true); setBMsg(t(lang, 'publish') + '...');

    const recipeData = {
      title: prev.title,
      description: prev.description || '',
      servings: prev.servings || 4,
      prep_time: prev.prep_time || '',
      cook_time: prev.cook_time || '',
      calories: prev.calories,
      calories_per: prev.calories_per || 'serving',
      ingredients: prev.ingredients,
      tags: prev.tags || [],
      tips: prev.tips || '',
      dish_type: prev.dish_type || null,
      meal_time: prev.meal_time || null,
      dietary: prev.dietary || [],
      cuisine: prev.cuisine || '',
    };

    // Upload step photos first
    const stepsWithPhotos = await Promise.all((prev.steps || []).map(async (step, i) => {
      const stepPhotoData = stepPhotos[step._origIdx !== undefined ? step._origIdx : i];
      if (stepPhotoData?.file) {
        const recipeId = prev.id || 'new';
        const path = `${user.id}/${recipeId}/step_${i}_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from('photos').upload(path, stepPhotoData.file, { contentType: 'image/jpeg' });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
          return { ...step, photo_url: publicUrl };
        }
      }
      return { ...step };
    }));

    recipeData.steps = stepsWithPhotos.map(s => ({ title: s.title || '', content: s.content, timer_seconds: s.timer_seconds || null, photo_url: s.photo_url || null }));

    if (prev.id) {
      await supabase.from('recipes').update(recipeData).eq('id', prev.id);
      if (mainPhotoFile) {
        if (existingMainPhoto) {
          await supabase.from('recipe_photos').delete().eq('recipe_id', prev.id).eq('is_main', true);
        }
        const path = `${user.id}/${prev.id}/main_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from('photos').upload(path, mainPhotoFile, { contentType: 'image/jpeg' });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
          await supabase.from('recipe_photos').insert({ recipe_id: prev.id, url: publicUrl, is_main: true, sort_order: 0 });
        }
      }
    } else {
      const { data: recipe, error } = await supabase.from('recipes').insert({
        user_id: user.id, ...recipeData, lang: recipeLang,
      }).select().single();

      if (error || !recipe) { setBusy(false); setBMsg(''); return; }

      if (mainPhotoFile) {
        const path = `${user.id}/${recipe.id}/main_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from('photos').upload(path, mainPhotoFile, { contentType: 'image/jpeg' });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
          await supabase.from('recipe_photos').insert({ recipe_id: recipe.id, url: publicUrl, is_main: true, sort_order: 0 });
        }
      }
    }

    setBusy(false); setBMsg('');
    onPublished();
  }

  // Guest/locked screen
  if (!canAdd) return (
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center px-5">
      <div className="text-center max-w-xs">
        <div className="w-16 h-16 rounded-2xl gradient-btn flex items-center justify-center mx-auto mb-5 shadow-lg">
          <span className="text-2xl">🌿</span>
        </div>
        <h2 className="font-display text-xl font-extrabold mb-3">{t(lang, 'guestWall')}</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">{t(lang, 'guestWallSub')}</p>
        <button className="px-6 py-3 border border-gray-200 rounded-2xl text-sm font-semibold bg-white" onClick={onBack}>{t(lang, 'back')}</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen pb-6">
      <div className="sticky top-0 bg-[#f8f7f4] z-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="font-display text-xl font-extrabold gradient-text">
          {isEdit ? t(lang, 'editRecipe') : t(lang, 'addRecipe')}
        </h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-4">
        {/* AI mode */}
        {mode === 'ai' && <>
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">✨</div>
            <p className="text-xs text-gray-500">{t(lang, 'pasteText')}</p>
          </div>

          <div className="border border-gray-200 rounded-2xl p-4 mb-4 bg-white shadow-sm">
            <div className="flex items-center gap-2 font-bold text-sm mb-2">📷 {t(lang, 'ocrTitle')}</div>
            <p className="text-xs text-gray-400 mb-2">{t(lang, 'ocrHint')}</p>
            <input type="file" accept="image/*" multiple ref={oRef} className="hidden" onChange={addOcrImg} />
            {ocrImgs.length > 0 && (
              <div className="flex gap-2 mb-2">
                {ocrImgs.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs" onClick={() => setOcrImgs(ocrImgs.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              {ocrImgs.length < 2 && <button className="flex-1 py-2 border border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-500" onClick={() => oRef.current?.click()}>📷 {t(lang, 'addPh')}</button>}
              {ocrImgs.length > 0 && !busy && <button className="flex-1 py-2 gradient-btn text-white rounded-xl text-xs font-bold" onClick={doOcr}>✨ {t(lang, 'ocrBtn')}</button>}
            </div>
          </div>

          <textarea
            className="w-full min-h-[120px] p-3.5 border border-gray-200 rounded-2xl text-sm outline-none focus:border-brand bg-white resize-y leading-relaxed"
            value={raw}
            onChange={e => setRaw(e.target.value)}
            placeholder={"Борщ\n\nСвёкла - 2 шт\nКартофель - 3 шт\n\n1. Свёклу отварить..."}
          />

          {err && <div className="mt-3 p-3 bg-red-50 rounded-xl text-xs text-red-700">{err}<button className="block mt-2 text-brand font-bold" onClick={() => { setMode('manual'); setErr(''); }}>📝 {t(lang, 'manual')}</button></div>}

          {busy ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-9 h-9 border-3 border-gray-200 border-t-brand rounded-full animate-spin" />
              <span className="text-sm text-gray-500 font-semibold">{bMsg}</span>
              <button className="px-5 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 bg-white" onClick={cancelRequest}>{t(lang, 'cancelParse')}</button>
            </div>
          ) : (
            <>
              <button className="w-full mt-3 py-3.5 gradient-btn text-white rounded-2xl text-sm font-bold disabled:opacity-50 shadow-sm" disabled={!raw.trim()} onClick={doParse}>✨ {t(lang, 'parseBtn')}</button>
              <button className="block mx-auto mt-3 text-xs text-gray-400" onClick={() => setMode('manual')}>{t(lang, 'orManual')}</button>
            </>
          )}
        </>}

        {/* Manual mode */}
        {mode === 'manual' && <>
          <div className="text-center mb-4"><div className="text-4xl mb-2">{isEdit ? '✏️' : '📝'}</div></div>

          {/* Main photo */}
          <label className="text-xs font-bold text-gray-500 mb-2 block">{t(lang, 'photos')}</label>
          <input type="file" accept="image/*" ref={fRef} className="hidden" onChange={addMainPhoto} />
          <div className="mb-4">
            {(mainPhotoPreview || existingMainPhoto?.url) ? (
              <div className="relative rounded-2xl overflow-hidden h-40">
                <img src={mainPhotoPreview || existingMainPhoto?.url} alt="" className="w-full h-full object-cover" />
                <button
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-sm"
                  onClick={() => { setMainPhotoFile(null); setMainPhotoPreview(''); setExistingMainPhoto(null); }}
                >×</button>
              </div>
            ) : (
              <div className="h-32 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer text-gray-400 gap-1 text-xs font-semibold bg-white" onClick={() => fRef.current?.click()}>
                🖼 {t(lang, 'addPh')}
              </div>
            )}
          </div>

          <label className="text-xs font-bold text-gray-500 mb-1 block">{t(lang, 'titleLabel')}</label>
          <input className="w-full mb-3 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand bg-white" value={mT} onChange={e => setMT(e.target.value)} />

          <label className="text-xs font-bold text-gray-500 mb-1 block">{t(lang, 'dishType')}</label>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {DISH_TYPES.map(dt => (
              <button key={dt} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${mDishTypes.includes(dt) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`} onClick={() => toggleArr(setMDishTypes, dt)}>{dt}</button>
            ))}
          </div>

          <label className="text-xs font-bold text-gray-500 mb-1 block">{t(lang, 'mealTime')}</label>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {MEAL_TIMES.map(mt => (
              <button key={mt} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${mMealTimes.includes(mt) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`} onClick={() => toggleArr(setMMealTimes, mt)}>{mt}</button>
            ))}
          </div>

          <label className="text-xs font-bold text-gray-500 mb-1 block">{t(lang, 'dietary')}</label>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {DIETARY_TAGS.map(d => (
              <button key={d} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${mDietary.includes(d) ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-gray-500 border-gray-200'}`} onClick={() => toggleArr(setMDietary, d)}>{d}</button>
            ))}
          </div>

          <label className="text-xs font-bold text-gray-500 mb-1 block">{t(lang, 'cuisine')}</label>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {CUISINES.map(c => (
              <button key={c} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${mCuisine === c ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-500 border-gray-200'}`} onClick={() => setMCuisine(mCuisine === c ? '' : c)}>{c}</button>
            ))}
          </div>

          <div className="mb-3 space-y-2">
            <div className="flex gap-2 items-center"><span className="text-xs font-semibold text-gray-500 w-[70px]">{t(lang, 'servings')}</span><input className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" type="number" min="1" value={mServ} onChange={e => setMServ(e.target.value)} /></div>
            <div className="flex gap-2 items-center"><span className="text-xs font-semibold text-gray-500 w-[70px]">{t(lang, 'prepTime')}</span><input className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" value={mPrep} onChange={e => setMPrep(e.target.value)} placeholder={t(lang, 'timeP')} /></div>
            <div className="flex gap-2 items-center"><span className="text-xs font-semibold text-gray-500 w-[70px]">{t(lang, 'cookTime')}</span><input className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" value={mCook} onChange={e => setMCook(e.target.value)} placeholder={t(lang, 'timeP')} /></div>
            <div className="flex gap-2 items-center">
              <span className="text-xs font-semibold text-gray-500 w-[70px]">{t(lang, 'cal')}</span>
              <input className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" type="number" value={mCal} onChange={e => setMCal(e.target.value)} placeholder={t(lang, 'kcal')} />
              <button className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${mCalP==='serving'?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-500 border-gray-200'}`} onClick={() => setMCalP('serving')}>{t(lang, 'calP')}</button>
              <button className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${mCalP==='total'?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-500 border-gray-200'}`} onClick={() => setMCalP('total')}>{t(lang, 'calT')}</button>
            </div>
          </div>

          <label className="text-xs font-bold text-gray-500 mb-1 block">{t(lang, 'ingredients')}</label>
          {mI.map((x, i) => (
            <div key={i} className="flex gap-1.5 items-center mb-2">
              <input className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" value={x.name} onChange={e => setMI(mI.map((v,j) => j===i ? {...v, name: e.target.value} : v))} placeholder={t(lang, 'ingName')} />
              <input className="w-14 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" type="number" min="0" step="any" value={x.amount} onChange={e => setMI(mI.map((v,j) => j===i ? {...v, amount: e.target.value} : v))} placeholder="#" />
              <select className="w-20 px-1 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" value={x.unit} onChange={e => setMI(mI.map((v,j) => j===i ? {...v, unit: e.target.value} : v))}>
                {UNITS.map(u => <option key={u} value={u}>{u || '—'}</option>)}
              </select>
              {mI.length > 1 && <button className="text-gray-400 text-lg px-1" onClick={() => setMI(mI.filter((_,j) => j !== i))}>×</button>}
            </div>
          ))}
          <button className="w-full py-2 border border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-500 mb-4" onClick={() => setMI([...mI, { name: '', amount: '', unit: 'шт' }])}>{t(lang, 'addIng')}</button>

          <label className="text-xs font-bold text-gray-500 mb-1 block">{t(lang, 'steps')}</label>
          {mS.map((x, i) => {
            const stepContent = typeof x === 'string' ? x : (x.content || '');
            const stepPhotoData = stepPhotos[i];
            const existingStepPhoto = typeof x === 'object' ? x.photo_url : '';
            if (!stepPhotoRefs.current[i]) stepPhotoRefs.current[i] = null;
            return (
              <div key={i} className="mb-3 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {(stepPhotoData?.previewUrl || existingStepPhoto) && (
                  <div className="relative">
                    <img src={stepPhotoData?.previewUrl || existingStepPhoto} alt="" className="w-full h-36 object-cover" />
                    <button className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs" onClick={() => removeStepPhoto(i)}>×</button>
                  </div>
                )}
                <div className="flex gap-2 items-start p-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0 mt-1">{i + 1}</div>
                  <textarea
                    className="flex-1 min-h-[60px] p-2 border border-gray-200 rounded-xl text-xs outline-none bg-gray-50 resize-y"
                    value={stepContent}
                    onChange={e => setMS(mS.map((v, j) => j === i ? { ...(typeof v === 'object' ? v : { content: v }), content: e.target.value } : v))}
                    placeholder={t(lang, 'stepP')}
                  />
                  {mS.length > 1 && <button className="text-gray-400 text-lg px-1 mt-1" onClick={() => { setMS(mS.filter((_,j) => j !== i)); setStepPhotos(prev => { const n = {}; Object.entries(prev).forEach(([k,v]) => { const ki = parseInt(k); if (ki < i) n[ki] = v; else if (ki > i) n[ki-1] = v; }); return n; }); }}>×</button>}
                </div>
                <div className="px-3 pb-3">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={el => stepPhotoRefs.current[i] = el}
                    onChange={e => addStepPhoto(i, e)}
                  />
                  {!stepPhotoData && !existingStepPhoto && (
                    <button className="text-xs text-gray-400 font-semibold flex items-center gap-1" onClick={() => stepPhotoRefs.current[i]?.click()}>
                      🖼 {t(lang, 'addPhStep')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <button className="w-full py-2 border border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-500 mb-4" onClick={() => setMS([...mS, { content: '' }])}>{t(lang, 'addStep')}</button>

          <label className="text-xs font-bold text-gray-500 mb-1 block">{t(lang, 'tips')}</label>
          <textarea className="w-full min-h-[80px] p-3 border border-gray-200 rounded-2xl text-sm outline-none bg-white resize-y mb-3" value={mTips} onChange={e => setMTips(e.target.value)} placeholder={t(lang, 'tipsP')} />

          <label className="text-xs font-bold text-gray-500 mb-1 block">Теги (через запятую)</label>
          <input className="w-full mb-5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand bg-white" value={mTags} onChange={e => setMTags(e.target.value)} placeholder="суп, курица, быстро..." />

          <button
            className="w-full py-3.5 gradient-btn text-white rounded-2xl text-sm font-bold shadow-sm"
            onClick={() => {
              const missing = [];
              if (!mT.trim()) missing.push(t(lang, 'titleLabel'));
              if (!mI.some(x => x.name.trim())) missing.push(t(lang, 'ingredients'));
              if (!mS.some(x => (x.content || x).trim())) missing.push(t(lang, 'steps'));
              if (missing.length) { setErr('Заполни: ' + missing.join(', ')); return; }
              setErr('');
              doManual();
            }}
          >{t(lang, 'prevBtn')}</button>
          {err && <div className="mt-2 text-xs text-red-500 font-semibold px-1">{err}</div>}
          {!isEdit && <button className="block mx-auto mt-3 text-xs text-gray-400" onClick={() => setMode('ai')}>{t(lang, 'backAI')}</button>}
        </>}

        {/* Preview mode */}
        {mode === 'preview' && prev && <>
          <div className="text-center mb-4"><div className="text-4xl mb-2">👀</div><p className="text-xs text-gray-500">{t(lang, 'check')}</p></div>

          {busy && <div className="flex flex-col items-center py-4 gap-2"><div className="w-9 h-9 border-3 border-gray-200 border-t-brand rounded-full animate-spin" /><span className="text-sm text-gray-500">{bMsg}</span></div>}

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4 shadow-sm">
            {(mainPhotoPreview || existingMainPhoto?.url) && (
              <img src={mainPhotoPreview || existingMainPhoto?.url} alt="" className="w-full aspect-square object-cover" />
            )}
            <div className="p-4">
            <h3 className="font-display text-xl font-bold mb-2">{prev.title}</h3>
            {prev.description && <p className="text-xs text-gray-500 mb-3">{prev.description}</p>}
            <div className="flex gap-1.5 flex-wrap mb-2">
              {(prev.dish_type || []).map(dt => <span key={dt} className="text-[11px] px-2.5 py-0.5 rounded-full bg-brand-light text-brand font-semibold border border-brand/20">{dt}</span>)}
              {(prev.meal_time || []).map(mt => <span key={mt} className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-100">{mt}</span>)}
              {(prev.dietary || []).map(d => <span key={d} className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">{d}</span>)}
              {prev.cuisine && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">{prev.cuisine}</span>}
              {(prev.tags || []).map(tg => <span key={tg} className="text-[11px] px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">{tg}</span>)}
            </div>
            <div className="flex gap-3 text-xs text-gray-400 mb-3 flex-wrap">
              {prev.prep_time && <span>🔪 {prev.prep_time}</span>}
              {prev.cook_time && <span>⏱ {prev.cook_time}</span>}
              <span>{prev.servings || 4} {t(lang, 'serv')}</span>
              {prev.calories && <span>🔥 {prev.calories} {t(lang, 'kcal')}</span>}
            </div>
            <h4 className="font-bold text-sm mb-2">{t(lang, 'ingredients')}</h4>
            {(prev.ingredients || []).map((g, i) => <div key={i} className="flex gap-2 py-1.5 border-b border-dashed border-gray-100 text-xs"><span className="font-bold min-w-[50px] text-brand">{g.amount || ''} {g.unit || ''}</span><span>{g.name}</span></div>)}
            <h4 className="font-bold text-sm mt-3 mb-2">{t(lang, 'steps')}</h4>
            {(prev.steps || []).map((s, i) => {
              const stepPhotoData = stepPhotos[s._origIdx !== undefined ? s._origIdx : i];
              return (
                <div key={i} className="mb-2">
                  {(stepPhotoData?.previewUrl || s.photo_url) && (
                    <img src={stepPhotoData?.previewUrl || s.photo_url} alt="" className="w-full h-28 object-cover rounded-xl mb-1" />
                  )}
                  <p className="text-xs text-gray-500"><strong>{i + 1}.</strong> {s.content}</p>
                </div>
              );
            })}
            {prev.tips && <div className="bg-amber-50 rounded-xl p-3 mt-3 text-xs text-amber-800">{prev.tips}</div>}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-3 rounded-xl text-sm font-bold bg-[#f8f7f4] border border-gray-200" onClick={backToManualFromPreview}>✏️ Редактировать</button>
            <button className="flex-1 py-3 rounded-xl text-sm font-bold gradient-btn text-white shadow-sm" onClick={publish} disabled={busy}>
              {isEdit ? t(lang, 'saveChanges') : t(lang, 'publish') + ' 🚀'}
            </button>
          </div>
        </>}
      </div>
    </div>
  );
}
