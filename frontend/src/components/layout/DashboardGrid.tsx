import React from "react";

interface DashboardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export default function DashboardGrid({
  children,
  columns = 3,
  gap = "md",
  className = "",
}: DashboardGridProps) {
  const getGridCols = () => {
    switch (columns) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-1 md:grid-cols-2";
      case 3:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      case 4:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
      case 6:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6";
      default:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    }
  };

  const getGapSize = () => {
    switch (gap) {
      case "sm":
        return "gap-4";
      case "md":
        return "gap-6";
      case "lg":
        return "gap-8";
      default:
        return "gap-6";
    }
  };

  return (
    <div className={`grid ${getGridCols()} ${getGapSize()} ${className}`}>
      {children}
    </div>
  );
}
