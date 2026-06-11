import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Los Pechofríos — Polla Mundial 2026',
  description: 'Resultados en vivo del Mundial 2026, polla entre amigos y predicciones con IA.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
