import React from "react";

export default function StatusModal({
  open,
  type = "success",
  title,
  message,
  subMessage,
  buttonText = "Continue",
  onClose,
}) {
  if (!open) return null;

  const success = type === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-steel shadow-2xl p-8 text-center animate-[fadeIn_.25s_ease]">

        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 ${
            success
              ? "border-tierA/40 bg-tierA/10 text-tierA"
              : "border-red-400/40 bg-red-400/10 text-red-400"
          }`}
        >
          {success ? (
            <svg
              className="h-10 w-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 7L10 17L5 12" />
            </svg>
          ) : (
            <svg
              className="h-10 w-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
              <path d="M8 16c1-1.5 2.5-2 4-2s3 .5 4 2" />
            </svg>
          )}
        </div>

        <h2
          className={`mt-6 text-2xl font-bold ${
            success ? "text-tierA" : "text-red-400"
          }`}
        >
          {title}
        </h2>

        <p className="mt-4 text-mist leading-7">
          {message}
        </p>

        {subMessage && (
          <p className="mt-2 text-sm text-slate">
            {subMessage}
          </p>
        )}

        <button
          onClick={onClose}
          className={`mt-8 w-44 rounded-lg py-3 font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
            success
              ? "bg-tierA text-ink hover:bg-green-400"
              : "bg-red-500 text-white hover:bg-red-600"
          }`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}