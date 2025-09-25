import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
interface ProjectGeocode {
    id: string;
    geocode: string; // ví dụ: "10.8019,106.6416"
}

interface ForecastEntry {
    project_id: string;
    date: string;
    location: string;
    condition: string;
    temperature_c: number;
    wind_kph: number;
    humidity: number;
    chance_of_rain: number;
    source?: string;
}

/**
 * Parse geocode từ chuỗi "lat,long"
 */
function parseGeocode(geocode: string): { latitude: number; longitude: number } | null {
    const [latStr, lonStr] = geocode.split(",");
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lonStr);
    if (isNaN(latitude) || isNaN(longitude)) return null;
    return { latitude, longitude };
}

/**
 * Gọi WeatherAPI để lấy dự báo thời tiết 7 ngày theo tọa độ
 */
export async function fetchWeatherForecast(project: ProjectGeocode): Promise<ForecastEntry[]> {
    const coords = parseGeocode(project.geocode);
    if (!coords) return [];

    const apiKey = process.env.WEATHER_API_KEY;
    const query = `${coords.latitude},${coords.longitude}`;
    const url = `https://api.weatherapi.com/v1/forecast.json?q=${query}&days=7&key=${apiKey}`;

    const res = await fetch(url);
    const json = await res.json();

    if (!json.forecast?.forecastday) return [];

    return json.forecast.forecastday.map((day: any) => ({
        project_id: project.id,
        date: day.date,
        location: query,
        condition: day.day.condition.text,
        temperature_c: day.day.avgtemp_c,
        wind_kph: day.day.maxwind_kph,
        humidity: day.day.avghumidity,
        chance_of_rain: day.day.daily_chance_of_rain,
        source: "WeatherAPI",
    }));
}

/**
 * Lưu dữ liệu dự báo thời tiết vào Supabase
 */
export async function saveWeatherForecast(forecast: ForecastEntry[]) {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;

    if (!token) {
        return {
            data: null,
            error: {
                message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
                code: "jwt_expired",
            },
        };
    }

    const supabase = createSupabaseServerClient(token);

    const { error } = await supabase
        .from("weather_forecast")
        .upsert(forecast, {
            onConflict: "project_id,date",
            ignoreDuplicates: false,
        })

    if (error) {
        console.error("Lỗi khi lưu weather_forecast:", error.message);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Gọi và lưu dự báo thời tiết cho một dự án
 */
export async function updateProjectWeatherForecast(project: ProjectGeocode) {
    const forecast = await fetchWeatherForecast(project);
    if (!forecast.length) return { success: false, error: "Không có dữ liệu dự báo." };
    return await saveWeatherForecast(forecast);
}