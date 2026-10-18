import { clsx } from 'clsx';

interface BadgeProps {
  label: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple';
}

export function Badge({ label, color = 'blue' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-blue-100 text-blue-800':   color === 'blue',
          'bg-green-100 text-green-800': color === 'green',
          'bg-red-100 text-red-800':     color === 'red',
          'bg-yellow-100 text-yellow-800': color === 'yellow',
          'bg-gray-100 text-gray-700':   color === 'gray',
          'bg-purple-100 text-purple-800': color === 'purple',
        }
      )}
    >
      {label}
    </span>
  );
}
