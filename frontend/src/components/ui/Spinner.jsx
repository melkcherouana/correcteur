import clsx from 'clsx';

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
};

export default function Spinner({ size = 'md', className }) {
  return (
    <div
      className={clsx(
        'rounded-full border-gray-200 border-t-indigo-600 animate-spin',
        SIZES[size],
        className
      )}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Spinner size="lg" />
    </div>
  );
}
