import React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  className?: string;
  /** Alias Radix / shadcn : appelé après le changement d’état */
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({
  className,
  onCheckedChange,
  onChange,
  ...props
}: SwitchProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    onCheckedChange?.(e.target.checked);
  };
  return (
    <label
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        props.checked ? "bg-primary" : "bg-input",
        props.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        {...props}
        onChange={handleChange}
      />
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition-transform",
          props.checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </label>
  );
}
