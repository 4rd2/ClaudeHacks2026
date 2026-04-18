interface Props {
  maxSpread?: number;
  description?: string;
}

export function ConflictBadge({ maxSpread = 3.2, description = 'Specs vs Review conflict' }: Props) {
  const isRed = maxSpread > 4;
  return (
    <span
      title={description}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-default ${
        isRed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      ⚠ Conflict
    </span>
  );
}
