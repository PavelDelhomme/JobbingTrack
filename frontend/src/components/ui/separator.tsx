import React from 'react';
import { cn } from '@/lib/utils';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal&apos; | 'vertical';
  decorative?: boolean;
}

export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: SeparatorProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role={decorative ? 'none&apos; : 'separator'}
      aria-orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal&apos; ? 'h-[1px] w-full' : &apos;h-full w-[1px]',
        className
      )}
      {...props}
    />
  );
}
