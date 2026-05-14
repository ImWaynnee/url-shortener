import { Link } from 'react-router';

export function LoginBanner() {
  return (
    <div className="w-full max-w-lg mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 shadow-sm">
      <p className="text-sm text-blue-800">
        Hello, sign up for free to track created links and more!
      </p>
      <Link
        to="/login"
        className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap ml-4"
      >
        Login →
      </Link>
    </div>
  );
}
