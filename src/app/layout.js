import './globals.css';

export const metadata = {
  title: 'Pestogram',
  description: 'Социальная сеть рецептов',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
