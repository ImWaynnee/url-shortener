export default function TermsOfServicePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-gray-800">
      <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Service:</strong> This URL shortener is provided as-is. We do our best to keep it reliable, but there may be occasional downtime or changes.</li>
        <li><strong>Acceptable Use:</strong> You may not use this service for spam, phishing, malware, or any illegal activity. Abuse will result in account suspension and removal of links.</li>
        <li><strong>Accounts:</strong> You are responsible for keeping your account credentials secure. Do not share your login information.</li>
        <li><strong>Content:</strong> You are responsible for the content you share via shortened URLs. We reserve the right to remove links that violate these terms.</li>
        <li><strong>Changes:</strong> We may update these terms at any time. Continued use of the service constitutes acceptance of the new terms.</li>
      </ul>
      <p className="mb-2">For questions or concerns, contact us at <a href="mailto:support@wyzwyz.xyz" className="text-blue-600 underline">support@wyzwyz.xyz</a>.</p>
      <p className="text-xs text-gray-500">Last updated: May 14, 2026</p>
    </div>
  );
}
