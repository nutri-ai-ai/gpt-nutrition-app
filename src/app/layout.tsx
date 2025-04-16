import { GeistSans } from 'geist/font/sans';
import { AuthProvider } from '@/context/auth-context';
import { AppProvider } from '@/context/app-context';
import NotificationContainer from '@/components/Notification';
import ClientLayout from '@/components/ClientLayout';
import './globals.css';

export const metadata = {
  title: 'GPT 영양학 앱',
  description: '고객 맞춤형 영양학 추천 서비스',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${GeistSans.className} bg-gray-50`}>
        <AuthProvider>
          <AppProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
            <NotificationContainer />
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
