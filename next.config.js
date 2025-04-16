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
  // ESLint 설정 업데이트
  eslint: {
    ignoreDuringBuilds: true, // 빌드 중 ESLint 경고 무시
  },
  // 정적 페이지 최적화
  output: 'standalone',
};

module.exports = nextConfig; 