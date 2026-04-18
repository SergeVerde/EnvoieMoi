import './globals.css';

export const metadata = {
  title: 'Pestogram',
  description: 'Социальная сеть рецептов',
  icons: {
    icon: '/logo2.svg',
    apple: '/logo2.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body>{children}</body>
    </html>
  );
}
