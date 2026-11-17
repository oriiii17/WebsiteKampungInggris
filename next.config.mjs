/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // ── Optimalkan performa build & runtime ──
  compress: true,
  poweredByHeader: false,

  // Keep streamed responses for browsers. Crawlers and command-line inspection
  // clients receive metadata in <head> before the body stream starts.
  htmlLimitedBots: /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|curl|lighthouse/i,

  // Cache gambar lebih lama & ukuran device yang umum
  images: {
    minimumCacheTTL: 86400,
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [32, 64, 128, 256],
  },

  // HTTP headers untuk cache aset statis lebih agresif
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/api/reader/(.*)",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=()" },
        ],
      },
    ];
  },

  webpack: (config) => {
    // Hindari bundel canvas native untuk pdfjs-dist di browser
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
