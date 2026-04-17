'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';

export default function RecipeExportView({ recipe, photos, lang, onBack }) {
  const [compact, setCompact] = useState(false);
  const r = recipe;

  const mainPhoto = photos?.find(p => p.is_main)?.url || photos?.[0]?.url || r.main_photo_url;

  function doPrint() {
    window.print();
  }

  const cur = r.servings || 4;

  return (
    <div className="max-w-md mx-auto min-h-screen pb-6">
      {/* Controls hidden on print */}
      <div className="no-print sticky top-0 bg-[#f8f7f4] z-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="font-display text-xl font-extrabold gradient-text">{t(lang, 'printPreview')}</h1>
        <div className="w-10" />
      </div>

      <div className="no-print px-5 pt-4 pb-3 flex items-center gap-3">
        <div className="flex rounded-xl overflow-hidden border border-gray-200 flex-1">
          <button
            className={`flex-1 py-2 text-xs font-bold ${!compact ? 'bg-gray-900 text-white' : 'bg-white text-gray-500'}`}
            onClick={() => setCompact(false)}
          >{t(lang, 'printNormal')}</button>
          <button
            className={`flex-1 py-2 text-xs font-bold ${compact ? 'bg-gray-900 text-white' : 'bg-white text-gray-500'}`}
            onClick={() => setCompact(true)}
          >{t(lang, 'printCompact')} (A4)</button>
        </div>
        <button
          className="px-4 py-2 gradient-btn text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm"
          onClick={doPrint}
        >🖨 {t(lang, 'printBtn')}</button>
      </div>

      <p className="no-print text-center text-xs text-gray-400 mb-4">{t(lang, 'printHint')}</p>

      {/* Recipe content — printed */}
      <div className={`recipe-print ${compact ? 'compact' : ''} px-6 pt-2`} id="recipe-print-content">

        {/* Header with photo */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '10pt' }}>
          {mainPhoto && (
            <img
              src={mainPhoto}
              alt=""
              style={{ width: compact ? '70px' : '100px', height: compact ? '70px' : '100px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1 }}>
            <h1>{r.title}</h1>
            {r.description && <p style={{ color: '#555', marginTop: '4pt' }}>{r.description}</p>}
            <p className="meta">
              {[
                r.prep_time && `🔪 ${r.prep_time}`,
                r.cook_time && `⏱ ${r.cook_time}`,
                `${cur} порц.`,
                r.calories && `🔥 ${r.calories} ккал`,
                r.dish_type && (Array.isArray(r.dish_type) ? r.dish_type.join(', ') : r.dish_type),
                r.meal_time && (Array.isArray(r.meal_time) ? r.meal_time.join(', ') : r.meal_time),
                r.cuisine && r.cuisine,
              ].filter(Boolean).join('  ·  ')}
            </p>
            {(r.tags || []).length > 0 && (
              <p className="meta">{r.tags.join(', ')}</p>
            )}
          </div>
        </div>

        {/* Ingredients */}
        <h2>{t(lang, 'ingredients')}</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4pt' }}>
          <tbody>
            {(r.ingredients || []).map((ing, i) => (
              <tr key={i} style={{ borderBottom: '1px dashed #eee' }}>
                <td style={{ width: '30%', color: '#166534', fontWeight: 'bold', padding: '3pt 0' }}>
                  {ing.amount ? `${ing.amount} ${ing.unit || ''}`.trim() : ''}
                </td>
                <td style={{ padding: '3pt 0' }}>{ing.name}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Steps */}
        <h2>{t(lang, 'steps')}</h2>
        <ol style={{ paddingLeft: '0', listStyle: 'none', marginBottom: '4pt' }}>
          {(r.steps || []).map((step, i) => (
            <li key={i} className="step-with-photo" style={{ display: 'flex', gap: '8pt', marginBottom: compact ? '4pt' : '8pt', alignItems: 'flex-start' }}>
              {step.photo_url && (
                <img
                  src={step.photo_url}
                  alt=""
                  className="step-photo-print"
                  style={{ width: compact ? '48pt' : '60pt', height: compact ? '48pt' : '60pt', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, display: 'flex', gap: '6pt', alignItems: 'flex-start' }}>
                <span style={{ background: '#1a1917', color: 'white', borderRadius: '4px', width: '18pt', height: '18pt', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '9pt', flexShrink: 0 }}>{i + 1}</span>
                <p style={{ margin: 0 }}>{step.content}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Tips */}
        {r.tips && (
          <>
            <h2>{t(lang, 'tips')}</h2>
            <p style={{ background: '#fffbeb', borderLeft: '3px solid #d97706', padding: '6pt 10pt', borderRadius: '4px' }}>{r.tips}</p>
          </>
        )}

        {/* Footer */}
        <p style={{ marginTop: '16pt', fontSize: '8pt', color: '#aaa', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '8pt' }}>
          Pestogram — социальная сеть рецептов
        </p>
      </div>
    </div>
  );
}
