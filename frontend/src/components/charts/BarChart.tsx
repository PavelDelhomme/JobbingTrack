import React from 'react'

interface DataPoint {
  label: string
  value: number
}

interface BarChartProps {
  data: DataPoint[]
  title: string
  color?: string
  height?: number
  className?: string
}

export default function BarChart({
  data,
  title,
  color = '#3B82F6',
  height = 200,
  className = ''
}: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))

  const getBarHeight = (value: number) => {
    return (value / maxValue) * 100
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>

      <div className="relative" style={{ height }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grille */}
          <defs>
            <pattern id="grid-horizontal" width="100" height="10" patternUnits="userSpaceOnUse">
              <path d="M 0 10 L 100 10" fill="none" stroke="#E5E7EB" strokeWidth="0.2"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid-horizontal)" />

          {/* Barres */}
          {data.map((point, index) => {
            const barWidth = 80 / data.length
            const barX = (index * barWidth) + 10
            const barHeight = getBarHeight(point.value)
            const barY = 100 - barHeight

            return (
              <g key={index}>
                {/* Barre */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth * 0.8}
                  height={barHeight}
                  fill={color}
                  rx="2"
                  className="transition-all duration-300 hover:opacity-80"
                />

                {/* Label de valeur */}
                {point.value > 0 && (
                  <text
                    x={barX + (barWidth * 0.4)}
                    y={barY - 1}
                    textAnchor="middle"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                    fontSize="3"
                  >
                    {point.value}
                  </text>
                )}
              </g>
            )
          })}

          {/* Labels des catégories */}
          {data.map((point, index) => {
            const barWidth = 80 / data.length
            const labelX = (index * barWidth) + 10 + (barWidth * 0.4)

            return (
              <text
                key={`label-${index}`}
                x={labelX}
                y="98"
                textAnchor="middle"
                className="text-xs fill-gray-500 dark:fill-gray-400"
                fontSize="2.5"
              >
                {point.label}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
