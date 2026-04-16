'use client';

import { useState, useRef, useEffect } from 'react';
import { t, UNITS, DISH_TYPES, MEAL_TIMES } from '@/lib/i18n';
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
  const [mS, setMS] = useState(['']);
  const [mTips, setMTips] = useState('');
  const [mPrep, setMPrep] = useState('');
  const [mCook, setMCook] = useState('');
  const [mCal, setMCal] = useState('');
  const [mCalP, setMCalP] = useState('serving');
  const [mServ, setMServ] = useState('4');
  const [mTags, setMTags] = useState('');
  const [mDishType, setMDishType] = useState('');
  const [mMealTime, setMMealTime] = useState('');

  // Photos
  const [photos, setPhotos] = useState([]);
  const [ocrImgs, setOcrImgs] = useState([]);
  const fRef = useRef(null);
  const oRef = useRef(null);

  useEffect(() => {
    if (editRecipe) {
      setMT(editRecipe.title || '');
      setMDesc(editRecipe.description || '');
      setMI(editRecipe.ingredients?.length > 0
        ? editRecipe.ingredients.map(x => ({ name: x.name || '', amount: String(x.amount || ''), unit: x.unit || 'шт' }))
        : [{ name: '', amount: '', unit: 'шт' }]);
      setMS(editRecipe.steps?.length > 0 ? editRecipe.steps.map(x => x.content || '') : ['']);
      setMTips(editRecipe.tips || '');
      setMPrep(editRecipe.prep_time || '');
      setMCook(editRecipe.cook_time || '');
      setMCal(editRecipe.calories ? String(editRecipe.calories) : '');
      setMCalP(editRecipe.calories_per || 'serving');
      setMServ(String(editRecipe.servings || 4));
      setMTags((editRecipe.tags || []).join(', '));
      setMDishType(editRecipe.dish_type || '');
      setMMealTime(editRecipe.meal_time || '');
    }
  }, []);

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
      else { setPrev(data); setMode('preview'); }
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
      else { setPrev(data); setOcrImgs([]); setMode('preview'); }
    } catch (e) {
      if (e.name !== 'AbortError') setErr(t(lang, 'parseFail'));
    }
    setBusy(false); setBMsg('');
  }

  async function addPhotos(e) {
    const files = [...(e.target.files || [])];
    if (photos.length + files.length > 5) { e.target.value = ''; return; }
    setBusy(true); setBMsg(t(lang, 'resizing'));
    const np = [...photos];
    for (const f of files) {
      const blob = await resizeImage(f);
      np.push({ blob, url: URL.createObjectURL(blob), main: np.length === 0 });
    }
    setPhotos(np);
    setBusy(false); setBMsg('');
    e.target.value = '';
  }

  function doManual() {
    if (!mT.trim() || !mI.some(x => x.name.trim()) || !mS.some(x => x.trim())) return;
    setPrev({
      id: editRecipe?.id,
      title: mT.trim(),
      description: mDesc.trim(),
      servings: parseInt(mServ) || 4,
      cook_time: mCook, prep_time: mPrep,
      calories: mCal ? parseInt(mCal) : null, calories_per: mCalP,
      tags: mTags.split(',').map(s => s.trim()).filter(Boolean),
      tips: mTips,
      dish_type: mDishType || null,
      meal_time: mMealTime || null,
      ingredients: mI.filter(x => x.name.trim()).map(x => ({ name: x.name.trim(), amount: parseFloat(x.amount) || 0, unit: x.unit })),
      steps: mS.filter(x => x.trim()).map(x => ({ title: '', content: x.trim(), timer_seconds: null })),
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
      steps: prev.steps,
      tags: prev.tags || [],
      tips: prev.tips || '',
      dish_type: prev.dish_type || null,
      meal_time: prev.meal_time || null,
    };

    if (prev.id) {
      await supabase.from('recipes').update(recipeData).eq('id', prev.id);
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        const path = `${user.id}/${prev.id}/${Date.now()}_${i}.jpg`;
        const { error: upErr } = await supabase.storage.from('photos').upload(path, p.blob, { contentType: 'image/jpeg' });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
          await supabase.from('recipe_photos').insert({ recipe_id: prev.id, url: publicUrl, is_main: false, sort_order: 99 });
        }
      }
    } else {
      const { data: recipe, error } = await supabase.from('recipes').insert({
        user_id: user.id, ...recipeData, lang: recipeLang,
      }).select().single();

      if (error || !recipe) { setBusy(false); setBMsg(''); return; }

      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        const path = `${user.id}/${recipe.id}/${Date.now()}_${i}.jpg`;
        const { error: upErr } = await supabase.storage.from('photos').upload(path, p.blob, { contentType: 'image/jpeg' });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
          await supabase.from('recipe_photos').insert({ recipe_id: recipe.id, url: publicUrl, is_main: p.main, sort_order: i });
        }
      }
    }

    setBusy(false); setBMsg('');
    onPublished();
  }

  if (!canAdd) return (
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center px-5">
      <div className="text-center">
        <div className="text-5xl mb-3">🔒</div>
        <p className="text-gray-500">{t(lang, 'cantAdd')}</p>
        <button className="mt-4 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold" onClick={onBack}>{t(lang, 'back')}</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen pb-6">
      {/* Header */}
      <div className="sticky top-0 bg-[#faf8f5] z-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
        <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="font-display text-xl font-extrabold gradient-text">
          {isEdit ? t(lang, 'editRecipe') : t(lang, 'addRecipe')}
        </h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-4">
        {mode === 'ai' && <>
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">✨</div>
            <p className="text-xs text-gray-500">{t(lang, 'pasteText')}</p>
          </div>

          {/* OCR block */}
          <div className="border border-gray-200 rounded-2xl p-4 mb-4 bg-white">
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
              <button className="w-full mt-3 py-3.5 gradient-btn text-white rounded-2xl text-sm font-bold disabled:opacity-50" disabled={!raw.trim()} onClick={doParse}>✨ {t(lang, 'parseBtn')}</button>
              <button className="block mx-auto mt-3 text-xs text-gray-400" onClick={() => setMode('manual')}>{t(lang, 'orManual')}</button>
            </>
          )}
        </>}

        {mode === 'manual' && <>
          <div className="text-center mb-4"><div className="text-4xl mb-2">{isEdit ? '✏️' : '📝'}</div></div>

          <label className="text-xs font-bold text-gray-500 mb-1 block">{t(lang, 'titleLabel')}</label>
          <input className="w-full mb-3 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand bg-white" value={mT} onChange={e => setMT(e.target.value)} />

          <label className="text-xs font-bold text-gray-500 mb-1 block">{t(lang, 'dishType')}</label>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {DISH_TYPES.map(dt => (
              <button key={dt} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${mDishType === dt ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`} onClick={() => setMDishType(mDishType === dt ? '' : dt)}>{dt}</button>
            ))}
          </div>

          <label className="text-xs font-bold text-gray-500 mb-1 block">{t(lang, 'mealTime')}</label>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {MEAL_TIMES.map(mt => (
              <button key={mt} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${mMealTime === mt ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`} onClick={() => setMMealTime(mMealTime === mt ? '' : mt)}>{mt}</button>
            ))}
          </div>

          <div className="mb-3 space-y-2">
            <div className="flex gap-2 items-center"><span className="text-xs font-semibold text-gray-500 w-[70px]">{t(lang, 'servings')}</span><input className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" type="number" min="1" value={mServ} onChange={e => setMServ(e.target.value)} /></div>
            <div className="flex gap-2 items-center"><span className="text-xs font-semibold text-gray-500 w-[70px]">{t(lang, 'prepTime')}</span><input className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" value={mPrep} onChange={e => setMPrep(e.target.value)} placeholder={t(lang, 'timeP')} /></div>
            <div className="flex gap-2 items-center"><span className="text-xs font-semibold text-gray-500 w-[70px]">{t(lang, 'cookTime')}</span><input className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" value={mCook} onChange={e => setMCook(e.target.value)} placeholder={t(lang, 'timeP')} /></div>
            <div className="flex gap-2 items-center"><span className="text-xs font-semibold text-gray-500 w-[70px]">{t(lang, 'cal')}</span><input className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" type="number" value={mCal} onChange={e => setMCal(e.target.value)} placeholder={t(lang, 'kcal')} />
              <button className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${mCalP==='serving'?'bg-gray-800 text-white border-gray-800':'bg-white text-gray-500 border-gray-200'}`} onClick={() => setMCalP('serving')}>{t(lang, 'calP')}</button>
              <button className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${mCalP==='total'?'bg-gray-800 text-white border-gray-800':'bg-white text-gray-500 border-gray-200'}`} onClick={() => setMCalP('total')}>{t(lang, 'calT')}</button>
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
          {mS.map((x, i) => (
            <div key={i} className="flex gap-2 items-start mb-2">
              <div className="w-7 h-7 rounded-lg bg-gray-800 text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0 mt-2">{i + 1}</div>
              <textarea className="flex-1 min-h-[60px] p-2.5 border border-gray-200 rounded-xl text-xs outline-none bg-white resize-y" value={x} onChange={e => setMS(mS.map((v,j) => j===i ? e.target.value : v))} placeholder={t(lang, 'stepP')} />
              {mS.length > 1 && <button className="text-gray-400 text-lg px-1 mt-2" onClick={() => setMS(mS.filter((_,j) => j !== i))}>×</button>}
            </div>
          ))}
          <button className="w-full py-2 border border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-500 mb-4" onClick={() => setMS([...mS, ''])}>{t(lang, 'addStep')}</button>

          <label className="text-xs font-bold text-gray-500 mb-1 block">{t(lang, 'tips')}</label>
          <textarea className="w-full min-h-[80px] p-3 border border-gray-200 rounded-2xl text-sm outline-none bg-white resize-y mb-3" value={mTips} onChange={e => setMTips(e.target.value)} placeholder={t(lang, 'tipsP')} />

          <label className="text-xs font-bold text-gray-500 mb-1 block">Теги (через запятую)</label>
          <input className="w-full mb-4 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand bg-white" value={mTags} onChange={e => setMTags(e.target.value)} placeholder="суп, курица, быстро..." />

          <button className="w-full py-3.5 gradient-btn text-white rounded-2xl text-sm font-bold disabled:opacity-50" disabled={!mT.trim() || !mI.some(x => x.name.trim()) || !mS.some(x => x.trim())} onClick={doManual}>{t(lang, 'prevBtn')}</button>
          {!isEdit && <button className="block mx-auto mt-3 text-xs text-gray-400" onClick={() => setMode('ai')}>{t(lang, 'backAI')}</button>}
        </>}

        {mode === 'preview' && prev && <>
          <div className="text-center mb-4"><div className="text-4xl mb-2">👀</div><p className="text-xs text-gray-500">{t(lang, 'check')}</p></div>

          {/* Photo upload */}
          <label className="text-xs font-bold text-gray-500 mb-2 block">{t(lang, 'photos')}</label>
          <input type="file" accept="image/*" multiple ref={fRef} className="hidden" onChange={addPhotos} />
          <div className="grid grid-cols-3 gap-2 mb-4">
            {photos.map((p, i) => (
              <div key={i} className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer ${p.main ? 'border-brand' : 'border-transparent'}`} onClick={() => setPhotos(photos.map((v,j) => ({...v, main: j===i})))}>
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                {p.main && <div className="absolute top-1 left-1 bg-brand text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">★</div>}
                <button className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs" onClick={e => { e.stopPropagation(); const np = photos.filter((_,j)=>j!==i); if(np.length&&!np.some(v=>v.main))np[0].main=true; setPhotos(np); }}>×</button>
              </div>
            ))}
            {photos.length < 5 && (
              <div className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer text-gray-400 gap-1 text-[11px] font-semibold" onClick={() => fRef.current?.click()}>
                🖼 {t(lang, 'addPh')}
              </div>
            )}
          </div>

          {busy && <div className="flex flex-col items-center py-4 gap-2"><div className="w-9 h-9 border-3 border-gray-200 border-t-brand rounded-full animate-spin" /><span className="text-sm text-gray-500">{bMsg}</span></div>}

          {/* Preview card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            <h3 className="font-display text-xl font-bold mb-2">{prev.title}</h3>
            {prev.description && <p className="text-xs text-gray-500 mb-3">{prev.description}</p>}
            <div className="flex gap-1.5 flex-wrap mb-2">
              {prev.dish_type && <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-semibold">{prev.dish_type}</span>}
              {prev.meal_time && <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-semibold">{prev.meal_time}</span>}
              {(prev.tags || []).map(tg => <span key={tg} className="text-[11px] px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-500 font-semibold">{tg}</span>)}
            </div>
            <div className="flex gap-3 text-xs text-gray-400 mb-3 flex-wrap">
              {prev.prep_time && <span>🔪 {prev.prep_time}</span>}
              {prev.cook_time && <span>⏱ {prev.cook_time}</span>}
              <span>{prev.servings || 4} {t(lang, 'serv')}</span>
              {prev.calories && <span>🔥 {prev.calories} {t(lang, 'kcal')}</span>}
            </div>
            <h4 className="font-bold text-sm mb-2">{t(lang, 'ingredients')}</h4>
            {(prev.ingredients || []).map((g, i) => <div key={i} className="flex gap-2 py-1.5 border-b border-dashed border-gray-100 text-xs"><span className="font-bold min-w-[50px] text-amber-700">{g.amount || ''} {g.unit || ''}</span><span>{g.name}</span></div>)}
            <h4 className="font-bold text-sm mt-3 mb-2">{t(lang, 'steps')}</h4>
            {(prev.steps || []).map((s, i) => <p key={i} className="text-xs text-gray-500 mb-1"><strong>{i + 1}.</strong> {s.content}</p>)}
            {prev.tips && <div className="bg-yellow-50 rounded-xl p-3 mt-3 text-xs text-yellow-800">{prev.tips}</div>}
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-3 rounded-xl text-sm font-bold bg-[#faf8f5] border border-gray-200" onClick={() => setMode('manual')}>← {t(lang, 'back')}</button>
            <button className="flex-1 py-3 rounded-xl text-sm font-bold bg-green-700 text-white" onClick={publish} disabled={busy}>
              {isEdit ? t(lang, 'saveChanges') : t(lang, 'publish') + ' 🚀'}
            </button>
          </div>
        </>}
      </div>
    </div>
  );
}
