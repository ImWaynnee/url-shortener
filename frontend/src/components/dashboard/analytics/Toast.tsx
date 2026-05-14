export interface ToastMsg {
  text: string;
  sub?: string;
}

export function Toast({ text, sub }: ToastMsg) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-gray-900 text-white rounded-xl px-4 py-3 shadow-xl pointer-events-none"
    >
      <p className="text-sm font-medium">{text}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
