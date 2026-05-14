export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-gray-800">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p className="mb-4">This Privacy Policy describes how we handle your information when you use our URL shortener service.</p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Data Collection:</strong> We collect only the minimum information required to provide our service, such as shortened URLs, click analytics, and (if you register) your email address and authentication provider.</li>
        <li><strong>Cookies:</strong> We use cookies only for authentication and session management. No tracking or advertising cookies are used.</li>
        <li><strong>Analytics:</strong> We store basic click analytics (timestamp, IP address, user agent) for each redirect to help you monitor your links. This data is not shared with third parties.</li>
        <li><strong>Account Deletion:</strong> You may request deletion of your account and associated data at any time by contacting support.</li>
        <li><strong>Security:</strong> We use industry-standard security practices to protect your data.</li>
      </ul>
      <p className="mb-2">For questions or requests, contact us at <a href="mailto:support@wyzwyz.xyz" className="text-blue-600 underline">support@wyzwyz.xyz</a>.</p>
      <p className="text-xs text-gray-500">Last updated: May 14, 2026</p>
    </div>
  );
}
