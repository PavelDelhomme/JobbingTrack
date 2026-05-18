import React from "react";

interface DashboardSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export default function DashboardSection({
  title,
  description,
  children,
  className = "",
  actions,
}: DashboardSectionProps) {
  return (
    <section
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2 ml-4">{actions}</div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">{children}</div>
    </section>
  );
}
