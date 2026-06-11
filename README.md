# Los Pechofríos ❄ — Polla Mundial 2026

App para seguir el Mundial 2026 con resultados que se actualizan solos, tabla de grupos, polla entre amigos (1/X/2) y un analista con IA.

## Qué hace

- **Partidos**: en vivo, próximos y resultados. Se refresca automáticamente cada 60 segundos.
- **Picks 1/X/2**: apuesta antes de que empiece el partido. Cuando termina, la boleta se pinta verde (acertaste) o roja (pecho frío).
- **Grupos**: tabla de posiciones de cada grupo en tiempo real.
- **Mis apuestas**: aciertos, fallos y % de efectividad.
- **IA Predicciones**: pregúntale a Claude por cualquier partido y te da un pronóstico con los datos reales de la API.

Las apuestas se guardan en el navegador (localStorage), así que cada persona del grupo tiene las suyas sin necesidad de login.

## Cómo desplegarlo en Vercel (10 minutos)

### 1. Consigue la API key de resultados (gratis)

1. Entra a https://www.football-data.org/client/register
2. Regístrate con tu correo — te llega el token de inmediato.
3. El plan gratuito incluye la Copa del Mundo (competición `WC`) con 10 llamadas/minuto. La app cachea las respuestas 60 segundos, así que nunca te pasas del límite.

### 2. Sube el código a GitHub

```bash
cd los-pechofrios
git init
git add .
git commit -m "Los Pechofríos v1"
# crea el repo en github.com (ej: juansalcedo-crypto/los-pechofrios) y luego:
git remote add origin https://github.com/TU_USUARIO/los-pechofrios.git
git push -u origin main
```

### 3. Despliega en Vercel

1. En https://vercel.com → **Add New → Project** → importa el repo.
2. Framework: Next.js (lo detecta solo). No cambies nada más.
3. En **Environment Variables** agrega:
   - `FOOTBALL_DATA_API_KEY` = tu token de football-data.org
   - `ANTHROPIC_API_KEY` = tu key de https://console.anthropic.com (opcional — solo para la pestaña de IA; el resto funciona sin ella)
4. **Deploy**. Listo: tendrás algo como `los-pechofrios.vercel.app`.

### Probar en local

```bash
npm install
cp .env.local.example .env.local   # pega tus keys ahí
npm run dev                         # http://localhost:3000
```

## Notas

- **Antes del arranque del Mundial** la API ya tiene el calendario completo, así que verás todos los partidos programados y puedes ir apostando desde ya.
- La pestaña de IA consume tu crédito de Anthropic por cada pregunta (centavos por consulta con el modelo configurado).
- Si más adelante quieren un ranking compartido entre todos los del grupo (en vez de apuestas locales por navegador), se puede conectar a Supabase igual que el tracker de Arches — es un cambio pequeño.
