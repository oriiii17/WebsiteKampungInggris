"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

type PasswordInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder: string;
  required?: boolean;
  minLength?: number;
  helperText?: string;
};

export default function PasswordInput({ id, value, onChange, autoComplete, placeholder, required, minLength, helperText }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return <>
    <span className="auth-password-control">
      <Lock aria-hidden="true" className="auth-password-lock" />
      <input id={id} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} placeholder={placeholder} required={required} minLength={minLength} />
      <button type="button" className="auth-password-toggle" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={visible} title={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        <span>{visible ? "Sembunyikan" : "Tampilkan"}</span>
      </button>
    </span>
    {helperText && <span className="auth-password-helper">{helperText}</span>}
  </>;
}
