import './globals.css';

export const metadata = {
  title: 'Рецептник',
  description: 'Социальная сеть рецептов',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
