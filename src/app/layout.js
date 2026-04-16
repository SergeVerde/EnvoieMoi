import './globals.css';

export const metadata = {
  title: 'moimi',
  description: 'Покажи свой рецепт',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
