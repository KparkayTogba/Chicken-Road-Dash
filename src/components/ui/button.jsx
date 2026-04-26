import React from "react";

export function Button({ onClick, className = "", children, ...props }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center bg-zinc-900 text-white font-semibold px-4 py-2 rounded-lg hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
