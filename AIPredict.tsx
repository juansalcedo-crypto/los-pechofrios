'use client';

import { useState } from 'react';
import type { Match } from '@/lib/types';

export default function AIPredict({ matches }: { matches: Match[] }) {
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function preguntar() {
    if (!pregunta.trim() || cargando) return;
    setCargando(true);
    setError('');
    setRespuesta('');

    // Contexto compacto: próximos 20 partidos + últimos 15 resultados
    const proximos = matches
      .filter((m) => m.status === 'SCHEDULED' || m.status === 'TIMED')
      .slice(0, 20)
      .map((m) => `${m.homeTeam.name} vs ${m.awayTeam.name} (${m.group ?? m.stage}, ${m.utcDate.slice(0, 10)})`);
    const recientes = matches
      .filter((m) => m.status === 'FINISHED')
      .slice(-15)
      .map(
        (m) =>
          `${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name}`
      );
    const context = `PRÓXIMOS:\n${proximos.join('\n') || '(sin datos)'}\n\nRESULTADOS RECIENTES:\n${recientes.join('\n') || '(sin datos)'}`;

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: pregunta, context }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Algo falló, intenta de nuevo.');
      else setRespuesta(data.answer);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="chat-box">
      <div className="chat-form">
        <input
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && preguntar()}
          placeholder="Ej: ¿Quién gana Colombia vs Alemania?"
          aria-label="Pregunta al analista de IA"
        />
        <button className="boton" onClick={preguntar} disabled={cargando}>
          {cargando ? 'Analizando…' : 'Analizar'}
        </button>
      </div>
      {error && <div className="aviso">{error}</div>}
      {respuesta && <div className="chat-respuesta">{respuesta}</div>}
      {!respuesta && !error && (
        <p style={{ color: 'var(--gris)', fontSize: '0.85rem', marginTop: 12 }}>
          El analista usa los datos reales de la API para darte un pronóstico. Es un pronóstico, no una garantía — pecho frío avisado no pierde plata.
        </p>
      )}
    </div>
  );
}
