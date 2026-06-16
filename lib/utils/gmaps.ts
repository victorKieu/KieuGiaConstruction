// lib/utils/gmaps.ts

interface MapParams {
    latitude?: number | null;
    longitude?: number | null;
    geocode?: string | null;
    address?: string | null;
}

export function generateGoogleMapsDirLink({ latitude, longitude, geocode, address }: MapParams): string {
    const baseUrl = "https://www.google.com/maps/dir/?api=1";
    
    // Ưu tiên 1: Có tọa độ số tách biệt (Xác thực cao nhất)
    if (latitude && longitude) {
        return `${baseUrl}&destination=${latitude},${longitude}`;
    }
    
    // Ưu tiên 2: Có chuỗi geocode gộp dạng "10.7626,106.6601"
    if (geocode) {
        const cleanGeocode = geocode.trim().replace(/\s+/g, '');
        if (cleanGeocode) {
            return `${baseUrl}&destination=${encodeURIComponent(cleanGeocode)}`;
        }
    }
    
    // Ưu tiên 3: Tìm kiếm theo địa chỉ văn bản
    if (address) {
        return `${baseUrl}&destination=${encodeURIComponent(address.trim())}`;
    }
    
    return "https://www.google.com/maps";
}