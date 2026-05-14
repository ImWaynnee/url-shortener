import { Ban, Clock, Unlink } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

const REASONS = {
  disabled: {
    title: 'Link Disabled',
    description: 'This link has been disabled by its owner.',
    icon: <Ban className="w-12 h-12 text-red-400" />
  },
  expired: {
    title: 'Link Expired',
    description: 'This link is no longer active.',
    icon: <Clock className="w-12 h-12 text-orange-400" />
  }
} as const;

export function MissingLinkPage() {
  const [params] = useSearchParams();
  const code = params.get('code') ?? '';
  const reason = params.get('reason') as keyof typeof REASONS | null;

  const { title, description, icon } = reason && REASONS[reason]
    ? REASONS[reason]
    : {
      title: 'Link Not Found',
      description: "Unfortunately, this link leads nowhere!",
      icon: <Unlink className="w-12 h-12 text-gray-600" />
    };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 text-center">
        <div className="flex justify-center mb-4">{icon}</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-2">{description}</p>
        {code && (
          <p className="pill mb-6">
            {code}
          </p>
        )}
        <div className="flex flex-col gap-2 mt-4">
          <Link
            to="/"
            className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
