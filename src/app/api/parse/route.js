import { NextResponse } from 'next/server';

const LANGS_MAP = {
  ru: 'Русский', en: 'English', fr: 'Français', es: 'Español',
  pt: 'Português', de: 'Deutsch', it: 'Italiano', tr: 'Türkçe',
};

function buildSystem(lang) {
  const ln = LANGS_MAP[lang] || 'Русский';
  return `Ты парсер рецептов. Верни ТОЛЬКО JSON без backticks. Переведи всё на ${ln}, сохраняя кулинарную терминологию точно.
Формат: {"title":"","description":"Одно предложение","servings":4,"cook_time":"","prep_time":"","calories":null,"calories_per":"serving","tags":[],"tips":"","ingredients":[{"amount":1,"unit":"","name":""}],"steps":[{"title":"","content":"","timer_seconds":null}]}
unit: г,кг,мл,л,ч.л.,ст.л.,стакан,шт,щепотка,по вкусу,пучок,зубчик,"". amount=0 если не указан. timer_seconds в секундах или null. tags максимум 5.`;
}

export async function POST(request) {
  try {
    const { text, images, lang } = await request.json();

    const messages = [];
    if (images && images.length > 0) {
      const content = images.map(img => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          data: img.split(',')[1],
        },
      }));
      content.push({ type: 'text', text: 'Распознай рецепт с фото и верни JSON.' });
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'user', content: 'Разбери рецепт:\n\n' + text });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: buildSystem(lang || 'ru'),
        messages,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'API error' }, { status: 500 });
    }

    const data = await res.json();
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    let raw = (data.content || []).map(b => b.text || '').join('');
    raw = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const i1 = raw.indexOf('{'), i2 = raw.lastIndexOf('}');
    if (i1 !== -1 && i2 > i1) raw = raw.slice(i1, i2 + 1);

    const parsed = JSON.parse(raw);
    if (!parsed.title || !parsed.ingredients || !parsed.steps) {
      return NextResponse.json({ error: 'Invalid parse result' }, { status: 422 });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error('Parse error:', e);
    return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
  }
}
