import { cn, getTrustScoreColor } from '@/lib/utils';

interface TrustBarProps {
  score: number;
  className?: string;
}

export function TrustBar({ score, className }: TrustBarProps) {
  const percentage = Math.round(score * 100);
  const colorClass = getTrustScoreColor(score);

  return (
    <div className={cn('trust-bar', className)}>
      <div
        className={cn('trust-fill', colorClass)}
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Trust score: ${percentage}%`}
      />
    </div>
  );
}
