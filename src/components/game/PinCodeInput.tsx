"use client";

interface PinCodeInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  describedBy?: string;
  invalid?: boolean;
  className?: string;
}

export default function PinCodeInput({ id, value, onChange, label, describedBy, invalid = false, className = "" }: PinCodeInputProps) {
  return (
    <div className={`relative w-full max-w-[22rem] rounded-xl focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#244b3a] ${className}`}>
      <div aria-hidden="true" className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className={`grid h-12 min-w-0 place-items-center rounded-lg border bg-white text-xl font-extrabold tabular-nums text-[#183b2d] transition-colors sm:h-14 sm:rounded-xl ${invalid ? "border-[#ba472f]" : "border-[#b8aa8e]"}`}>
            {value[index] || ""}
          </span>
        ))}
      </div>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="absolute inset-0 z-10 h-full w-full cursor-text rounded-xl opacity-0"
      />
    </div>
  );
}
