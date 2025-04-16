/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  webpack: (config) => {
    // 기본 웹팩 설정 변경이 필요한 경우 여기에 추가
    return config;
  },
};

module.exports = nextConfig; 