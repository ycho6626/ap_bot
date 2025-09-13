import Link from 'next/link';

export default function HomePage() {
  return (
    <div className='max-w-4xl mx-auto'>
      <div className='text-center py-12'>
        <h1 className='text-4xl font-bold text-gray-900 mb-4'>AP Calculus Admin</h1>
        <p className='text-xl text-gray-600 mb-8'>
          Human-in-the-loop review interface for AP Calculus cases
        </p>

        <div className='space-y-4'>
          <Link href='/review' className='btn btn-primary btn-lg inline-block'>
            Review Cases
          </Link>
        </div>
      </div>

      <div className='mt-12 grid grid-cols-1 md:grid-cols-2 gap-6'>
        <div className='card p-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-2'>Review Cases</h2>
          <p className='text-gray-600 mb-4'>
            Review and approve, reject, or request revisions for generated answers.
          </p>
          <Link href='/review' className='text-primary-600 hover:text-primary-700'>
            Go to Review Cases →
          </Link>
        </div>

        <div className='card p-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-2'>Teacher Access</h2>
          <p className='text-gray-600 mb-4'>
            This interface requires teacher role or higher to access review functionality.
          </p>
          <div className='text-sm text-gray-500'>
            Current role: <span className='font-medium'>Teacher</span>
          </div>
        </div>
      </div>
    </div>
  );
}
