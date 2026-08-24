import clsx from 'clsx';

export default function Card({ children, className, padding = true }) {
  return (
    <div className={clsx('bg-white rounded-xl border border-gray-100 shadow-sm', padding && 'p-6', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
