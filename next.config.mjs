import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Kunci root ke folder Web — cegah Turbopack scan ke parent
  // D:\Intern\Develop (yang ada package-lock.json nyasar di luar git repo).
  turbopack: {
    root: resolve(__dirname),
  },
  allowedDevOrigins: ["humble-pretext-crock.ngrok-free.dev", "127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  // Proxy: semua /api/v1/* diteruskan ke backend LOCAL (localhost:8080).
  // Disamakan dengan NEXT_PUBLIC_API_URL di .env.local (tetap localhost).
  // Dipakai saat web diakses via ngrok (backend gak perlu di-ngrok / terekspos).
  // Kalau backend pindah (host cloud/ngrok langsung), ganti destination + API_URL.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:8080/api/v1/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://localhost:8080/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
