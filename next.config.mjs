/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Opt out of Chrome's Topics API / FLoC interest-based tracking
          { key: 'Permissions-Policy', value: 'browsing-topics=(), interest-cohort=()' },
          // Don't send the full URL to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
export default nextConfig;
