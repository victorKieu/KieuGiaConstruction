import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Kiều Gia Construction',
        short_name: 'Kiều Gia',
        description: 'Hệ thống quản lý Kiều Gia',
        start_url: '/',
        // 👇 CÂU THẦN CHÚ ĐỂ ẨN THANH TRÌNH DUYỆT TRÊN ANDROID NẰM Ở ĐÂY:
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0f172a', // Màu thanh trạng thái (status bar)
        icons: [
            {
                src: '/images/logo.png', // Trỏ đúng đường dẫn file logo của sếp
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/images/logo.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}