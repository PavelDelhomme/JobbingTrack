"use client";

type FilterSelectOption = {
  value: string;
  label: string;
};

type FilterSelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  allowEmpty?: boolean;
};

export function FilterSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Tous",
  allowEmpty = true,
}: FilterSelectFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
