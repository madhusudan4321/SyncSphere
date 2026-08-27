'use client';

import { useState } from 'react';

export default function PasswordInput({ value, onChange, placeholder = 'Password', className = '', ...props }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 border border-border rounded-md text-[13px] bg-[#fafafa] outline-none text-text transition-colors focus:border-[#aaa] focus:bg-white ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs font-semibold hover:text-text"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
