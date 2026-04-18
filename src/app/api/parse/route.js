import { NextResponse } from 'next/server';

const LANGS_MAP = {
  ru: 'Русский', en: 'English', fr: 'Français', es: 'Español',
  pt: 'Português', de: 'Deutsch', it: 'Italiano', tr: 'Türkçe',
};

function buildSystem(lang) {
  const ln = LANGS_MAP[lang] || 'Русский';
  return `Ты парсер рецептов. Верни ТОЛЬКО JSON без markdown, без backticks, без пояснений. Переведи всё на ${ln}.
{"title":"","description":"","servings":4,"cook_time":"","prep_time":"","calories":null,"calories_per":"serving","dish_type":"","meal_time":"","tags":[],"tips":"","ingredients":[{"amount":1,"unit":"","name":""}],"steps":[{"title":"","content":"","timer_seconds":null}]}
unit: г,кг,мл,л,ч.л.,ст.л.,стакан,шт,щепотка,по вкусу,пучок,зубчик,"". tags макс 5. dish_type: Напиток|Закуска|Салат|Суп|Основное блюдо|Гарнир|Десерт|Выпечка|Каша|Соус|Другое или "". meal_time: Завтрак|Обед|Ужин|Перекус или "".`;
}

async function callModel(model, messages, systemContent) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemContent },
        ...messages,
      ],
      max_tokens: 2000,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`${model} returned ${res.status}: ${errBody.slice(0, 200)}`);
  }
  return res.json();
}

function extractJson(raw) {
  raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const i1 = raw.indexOf('{'), i2 = raw.lastIndexOf('}');
  if (i1 !== -1 && i2 > i1) raw = raw.slice(i1, i2 + 1);
  return JSON.parse(raw);
}

export async function POST(request) {
  try {
    const { text, images, lang } = await request.json();
    const systemContent = buildSystem(lang || 'ru');
    const messages = [];

    if (images && images.length > 0) {
      const content = [
        ...images.map(img => ({ type: 'image_url', image_url: { url: img } })),
        { type: 'text', text: 'Распознай рецепт с этого фото и верни JSON строго по формату из системного промпта.' },
      ];
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'user', content: 'Разбери рецепт:\n\n' + text });
    }

    // For vision requests try two models; for text use deepseek
    const models = images?.length > 0
      ? ['google/gemini-2.0-flash-001', 'meta-llama/llama-3.2-11b-vision-instruct:free']
      : ['deepseek/deepseek-chat-v3-0324'];

    let lastError = null;
    for (const model of models) {
      try {
        const data = await callModel(model, messages, systemContent);
        let raw = data.choices?.[0]?.message?.content || '';
        const parsed = extractJson(raw);
        if (!parsed.title || !parsed.ingredients || !parsed.steps) {
          lastError = 'Model returned incomplete recipe';
          continue;
        }
        return NextResponse.json(parsed);
      } catch (e) {
        lastError = e.message;
        continue;
      }
    }

    console.error('All models failed:', lastError);
    return NextResponse.json({ error: lastError || 'Parse failed' }, { status: 500 });
  } catch (e) {
    console.error('Parse route error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
