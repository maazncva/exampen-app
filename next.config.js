/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.b-cdn.net" },
      { protocol: "https", hostname: "**.supabase.co" }
    ]
  }
};
module.exports = nextConfig;
