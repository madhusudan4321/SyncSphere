'use client';

import { useState } from 'react';

export default function PasswordInput({ value, onChange, placeholder = 'Password', className = '', ...props }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative mb-2">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 border border-border rounded-[6px] text-[13px] bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white pr-[42px] mb-0 block ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text bg-transparent border-none cursor-pointer p-0 flex items-center justify-center transition-colors"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
}
