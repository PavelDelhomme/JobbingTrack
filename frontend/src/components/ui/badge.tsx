import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-100 text-green-800 hover:bg-green-100/80",
        warning:
          "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80",
        info:
          "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Badge spécifique pour indiquer la source des données
const dataSourceBadgeVariants = cva(
  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
  {
    variants: {
      source: {
        REAL: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        SIMULATED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
        FALLBACK: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        MIXED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      },
    },
  }
)

export interface DataSourceBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  source: "REAL" | "SIMULATED" | "FALLBACK" | "MIXED"
}

function DataSourceBadge({ className, source, ...props }: DataSourceBadgeProps) {
  const getDisplayText = (source: string) => {
    switch (source) {
      case 'REAL':
        return '✅ VRAI';
      case 'SIMULATED':
        return '🎲 SIMULÉ';
      case 'FALLBACK':
        return '⚠️ FALLBACK';
      case 'MIXED':
        return '🔄 MIXTE';
      default:
        return source;
    }
  };

  return (
    <div className={cn(dataSourceBadgeVariants({ source }), className)} {...props}>
      {getDisplayText(source)}
    </div>
  )
}

export { Badge, badgeVariants, DataSourceBadge }
