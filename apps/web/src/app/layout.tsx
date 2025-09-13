import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'katex/dist/katex.min.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AP Calculus Tutor - Verified Answers',
  description:
    'Get verified answers to your AP Calculus AB/BC questions with step-by-step solutions and explanations.',
  keywords: ['AP Calculus', 'tutor', 'verified answers', 'AB', 'BC', 'mathematics'],
  authors: [{ name: 'AP Bot Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'AP Calculus Tutor - Verified Answers',
    description:
      'Get verified answers to your AP Calculus AB/BC questions with step-by-step solutions and explanations.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AP Calculus Tutor - Verified Answers',
    description:
      'Get verified answers to your AP Calculus AB/BC questions with step-by-step solutions and explanations.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className='h-full'>
      <body className={`${inter.className} h-full`}>
        <div className='min-h-full'>{children}</div>
        <Toaster
          position='top-right'
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
