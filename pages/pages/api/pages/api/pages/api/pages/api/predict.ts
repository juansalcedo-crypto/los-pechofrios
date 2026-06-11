import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(503).json({
      error: 'Configura ANTHROPIC_API_KEY en Vercel para activar las predicciones con IA.',
    });
  }

  try {
    const { question, context } = req.body || {};
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        system:
          'Eres el analista de futbol de "Los Pechofrios", una polla mundialista entre amigos. ' +
          'Analizas partidos del Mundial 2026 con los datos que te pasan. ' +
          'Da un pronostico claro (1, X o 2) con 2-3 razones breves. Tono relajado y con humor futbolero. ' +
          'Recuerda siempre que es solo un pronostico, no una garantia.',
        messages: [
          { role: 'user', content: 'Datos reales de la API:\n' + context + '\n\nPregunta: ' + question },
        ],
      }),
    });
    const data = await r.json();
    const text = (data.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');
    return res.status(200).json({ answer: text || 'No pude generar un analisis, intenta de nuevo.' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
