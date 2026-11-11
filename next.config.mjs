/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // ── Optimalkan performa build & runtime ──
  compress: true,
  poweredByHeader: false,

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
    ];
  },

  webpack: (config) => {
    // Hindari bundel canvas native untuk pdfjs-dist di browser
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
