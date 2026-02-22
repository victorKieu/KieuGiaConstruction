/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    // THÊM ĐOẠN NÀY ĐỂ MỞ RỘNG GIỚI HẠN UPLOAD CHO SERVER ACTIONS
    experimental: {
        serverActions: {
            bodySizeLimit: '50mb', // Nâng hẳn lên 50MB cho thoải mái với các file CSV khổng lồ
        },
    },
}

export default nextConfig