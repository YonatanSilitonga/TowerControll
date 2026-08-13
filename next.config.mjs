/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
  // Proxy: semua /api/v1/* diteruskan ke backend LOCAL (127.0.0.1:8080).
  // Dipakai saat web diakses via ngrok (backend gak perlu di-ngrok / terekspos).
  // Kalau backend pindah (host cloud/ngrok langsung), ganti destination + API_URL.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:8080/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
