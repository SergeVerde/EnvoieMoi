import { NextResponse } from 'next/server';

const LANGS_MAP = {
  ru: 'Русский', en: 'English', fr: 'Français', es: 'Español',
  pt: 'Português', de: 'Deutsch', it: 'Italiano', tr: 'Türkçe',
};

function buildSystem(lang) {
  const ln = LANGS_MAP[lang] || 'Русский';
  return `Ты парсер рецептов. Верни ТОЛЬКО JSON без backticks. Переведи всё на ${ln}.
{"title":"","description":"","servings":4,"cook_time":"","prep_time":"","calories":null,"calories_per":"serving","dish_type":"","meal_time":"","tags":[],"tips":"","ingredients":[{"amount":1,"unit":"","name":""}],"steps":[{"title":"","content":"","timer_seconds":null}]}
unit: г,кг,мл,л,ч.л.,ст.л.,стакан,шт,щепотка,по вкусу,пучок,зубчик,"". tags макс 5. dish_type: Напиток|Закуска|Салат|Суп|Основное блюдо|Гарнир|Десерт|Выпечка или "". meal_time: Завтрак|Обед|Ужин|Перекус или "".`;
}

export async function POST(request) {
  try {
    const { text, images, lang } = await request.json();
    const messages = [];

    if (images && images.length > 0) {
      const content = images.map(img => ({
        type: 'image_url',
        image_url: { url: img },
      }));
      content.push({ type: 'text', text: 'Распознай рецепт с фото и верни JSON.' });
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'user', content: 'Разбери рецепт:\n\n' + text });
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324',
        messages: [
          { role: 'system', content: buildSystem(lang || 'ru') },
          ...messages,
        ],
        max_tokens: 2000,
      }),
    });

    if (!res.ok) return NextResponse.json({ error: 'API error' }, { status: 500 });

    const data = await res.json();
    let raw = data.choices?.[0]?.message?.content || '';
    raw = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const i1 = raw.indexOf('{'), i2 = raw.lastIndexOf('}');
    if (i1 !== -1 && i2 > i1) raw = raw.slice(i1, i2 + 1);

    const parsed = JSON.parse(raw);
    if (!parsed.title || !parsed.ingredients || !parsed.steps) {
      return NextResponse.json({ error: 'Invalid result' }, { status: 422 });
    }
    return NextResponse.json(parsed);
  } catch (e) {
    console.error('Parse error:', e);
    return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
  }
}
