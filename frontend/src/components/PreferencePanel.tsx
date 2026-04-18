const ATTRIBUTES = [
  { key: 'price_sensitivity', label: 'Price Sensitivity' },
  { key: 'sound_quality', label: 'Sound Quality' },
  { key: 'comfort', label: 'Comfort' },
  { key: 'battery_life', label: 'Battery Life' },
  { key: 'portability', label: 'Portability' },
  { key: 'noise_cancellation', label: 'Noise Cancellation' },
];

interface Props {
  values?: Record<string, number>;
  onChange?: (key: string, value: number) => void;
}

export function PreferencePanel({ values = {}, onChange }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Preferences</h2>
      {ATTRIBUTES.map(({ key, label }) => {
        const pct = Math.round((values[key] ?? 0.5) * 100);
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{label}</span>
              <span>{pct}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => onChange?.(key, Number(e.target.value) / 100)}
              className="w-full accent-violet-600"
            />
          </div>
        );
      })}
    </div>
  );
}
