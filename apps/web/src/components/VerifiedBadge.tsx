import { CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  verified: boolean;
  className?: string;
}

export function VerifiedBadge({ verified, className }: VerifiedBadgeProps) {
  return (
    <div
      className={cn(
        'verified-badge',
        verified ? 'bg-success-100 text-success-800' : 'bg-warning-100 text-warning-800',
        className
      )}
    >
      {verified ? (
        <>
          <CheckCircle className='h-3 w-3 mr-1' data-testid='verified-icon' />
          Verified
        </>
      ) : (
        <>
          <AlertCircle className='h-3 w-3 mr-1' data-testid='not-verified-icon' />
          Not Verified
        </>
      )}
    </div>
  );
}
