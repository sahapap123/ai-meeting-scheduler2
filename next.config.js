/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },         // ถ้าอยากบังคับผ่านแม้เจอ ESLint error (ตัวเลือก)
  experimental: {
    esmExternals: 'loose',                      // ผ่อนกฎ ESM externals
    serverComponentsExternalPackages: ['supports-color'], // อนุญาตแพ็กเกจ ESM ใน SSR
  },
};
module.exports = nextConfig;
