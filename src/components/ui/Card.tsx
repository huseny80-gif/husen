import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('bg-white rounded-2xl shadow-sm border border-gray-100 p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('mb-4 pb-4 border-b border-gray-100', className)} {...props}>
      {children}
    </div>
  );
}
