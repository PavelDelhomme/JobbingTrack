import React from 'react'

interface DataPoint {
  label: string
  value: number
  color?: string
}

interface PieChartProps {
  data: DataPoint[]
  title: string
  height?: number
  className?: string
  showLegend?: boolean
}

export default function PieChart({
  data,
  title,
  height = 200,
  className = '',
  showLegend = true
}: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = 35
  const centerX = 50
  const centerY = 50

  const defaultColors = [
    '#3B82F6&apos;, '#EF4444', &apos;#10B981', '#F59E0B&apos;, '#8B5CF6',
    '#EC4899&apos;, '#06B6D4', &apos;#84CC16', '#F97316&apos;, '#6366F1'
  ]

  const getPath = (startAngle: number, endAngle: number) => {
    const startAngleRad = (startAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180

    const x1 = centerX + radius * Math.cos(startAngleRad)
    const y1 = centerY + radius * Math.sin(startAngleRad)
    const x2 = centerX + radius * Math.cos(endAngleRad)
    const y2 = centerY + radius * Math.sin(endAngleRad)

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
  }

  let currentAngle = 0

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>

      <div className="flex items-center justify-center">
        <div className="relative" style={{ height, width: height }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            {/* Secteurs du graphique */}
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100
              const startAngle = currentAngle
              const endAngle = currentAngle + (percentage / 100) * 360
              const color = item.color || defaultColors[index % defaultColors.length]

              currentAngle = endAngle

              if (percentage === 0) return null

              return (
                <path
                  key={index}
                  d={getPath(startAngle, endAngle)}
                  fill={color}
                  stroke="#fff"
                  strokeWidth="0.5"
                  className="transition-all duration-300 hover:opacity-80"
                />
              )
            })}

            {/* Cercle central pour l'effet donut */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius * 0.6}
              fill="white"
              className="dark:fill-gray-800"
            />
          </svg>
        </div>

        {/* Légende */}
        {showLegend && (
          <div className="ml-6 flex-1 min-w-0">
            <div className="space-y-2">
              {data.map((item, index) => {
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
                const color = item.color || defaultColors[index % defaultColors.length]

                return (
                  <div key={index} className="flex items-center text-sm">
                    <div
                      className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-gray-700 dark:text-gray-300 truncate">
                      {item.label}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-auto">
                      {percentage}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
