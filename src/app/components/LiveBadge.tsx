'use client';

import { formatViewCount } from '@/lib/utils';

interface LiveBadgeProps {
  viewerCount: number;
}

export function LiveBadge({ viewerCount }: LiveBadgeProps) {
  return (
    <div className="absolute top-2 left-2 flex items-center gap-2">
      <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded">
        LIVE
      </span>
      <span className="px-2 py-0.5 text-xs font-medium bg-black/70 text-white rounded">
        {formatViewCount(viewerCount)}
      </span>
    </div>
  );
}
