import './globals.css';

export const metadata = {
  title: 'Control Room — Marketing AI Hub',
  description: 'Hub interno per i tool AI di marketing e comunicazione.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className="font-body">{children}</body>
    </html>
  );
}
