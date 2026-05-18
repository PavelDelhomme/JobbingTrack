"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
}

const Tooltip = ({ children, content, className }: TooltipProps) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

// Pour la compatibilité avec l'import existant
const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
const TooltipTrigger = ({ children, ...props }: any) => <>{children}</>;
const TooltipContent = ({ children, ...props }: any) => <>{children}</>;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
