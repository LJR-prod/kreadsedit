import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kreads Edit Battle',
  description: 'Le concours mensuel de montage vidéo de la team Kreads',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
