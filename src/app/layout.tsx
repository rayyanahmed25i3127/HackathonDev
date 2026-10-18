import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import './experimental-ui.css';
export const metadata: Metadata = {
  title: 'Relay — Every lead, moving forward',
  description: 'Your connected workspace for leads, customers, and accountable teams.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
