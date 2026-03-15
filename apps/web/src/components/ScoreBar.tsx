interface ScoreBarProps {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: { height: "h-1.5", text: "text-xs" },
  md: { height: "h-2.5", text: "text-sm" },
  lg: { height: "h-4", text: "text-base" },
};

function getScoreColor(value: number): string {
  if (value < 40) return "bg-red-500";
  if (value <= 70) return "bg-yellow-500";
  return "bg-emerald-500";
}

function getScoreTextColor(value: number): string {
  if (value < 40) return "text-red-400";
  if (value <= 70) return "text-yellow-400";
  return "text-emerald-400";
}

export function ScoreBar({ value, label, size = "md" }: ScoreBarProps) {
  const { height, text } = sizeConfig[size];
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className={`${text} text-zinc-400`}>{label}</span>
          <span className={`${text} font-semibold ${getScoreTextColor(clampedValue)}`}>
            {clampedValue}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className={`flex-1 ${height} bg-zinc-700 rounded-full overflow-hidden`}>
          <div
            className={`${height} ${getScoreColor(clampedValue)} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${clampedValue}%` }}
          />
        </div>
        {!label && (
          <span className={`${text} font-semibold ${getScoreTextColor(clampedValue)} w-8 text-right`}>
            {clampedValue}
          </span>
        )}
      </div>
    </div>
  );
}
