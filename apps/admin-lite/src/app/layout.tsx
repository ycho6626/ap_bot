import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AP Calculus Admin',
  description: 'Admin interface for AP Calculus review cases',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <div className='min-h-screen bg-gray-50'>
          <header className='bg-white shadow-sm border-b'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <div className='flex justify-between items-center h-16'>
                <div className='flex items-center'>
                  <h1 className='text-xl font-semibold text-gray-900'>AP Calculus Admin</h1>
                </div>
                <nav className='flex space-x-8'>
                  <a
                    href='/review'
                    className='text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium'
                  >
                    Review Cases
                  </a>
                </nav>
              </div>
            </div>
          </header>
          <main className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>{children}</main>
        </div>
        <Toaster position='top-right' />
      </body>
    </html>
  );
}
