import React from "react";

interface DataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  title: string;
  color?: string;
  height?: number;
  className?: string;
}

export default function LineChart({
  data,
  title,
  color = "#3B82F6",
  height = 200,
  className = "",
}: LineChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));

  const getPointPosition = (value: number, index: number) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((value - minValue) / (maxValue - minValue)) * 100;
    return { x, y: 100 - y }; // Inverser Y car SVG coordonnées vont du haut vers le bas
  };

  const getPath = () => {
    if (data.length === 0) return "";

    const points = data.map((point, index) => {
      const { x, y } = getPointPosition(point.value, index);
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>

      <div className="relative" style={{ height }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Grille */}
          <defs>
            <pattern
              id="grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="0.2"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Ligne */}
          <path
            d={getPath()}
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />

          {/* Points */}
          {data.map((point, index) => {
            const { x, y } = getPointPosition(point.value, index);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1"
                fill={color}
                className="animate-pulse"
              />
            );
          })}
        </svg>

        {/* Labels */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>{data[0]?.label}</span>
          <span>{data[data.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}
