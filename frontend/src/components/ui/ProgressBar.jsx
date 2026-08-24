export default function ProgressBar({ valeur = 0, couleur = 'bg-indigo-500', hauteur = 'h-2', label }) {
  const pct = Math.min(100, Math.max(0, valeur));
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-100 rounded-full ${hauteur}`}>
        <div
          className={`${hauteur} rounded-full transition-all duration-500 ${couleur}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
