"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Hàm tính khoảng cách giữa 2 tọa độ (mét) - Công thức Haversine
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Bán kính trái đất (mét)
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Cấu hình các địa điểm cho phép chấm công (Nên đưa vào DB sau này)
const ALLOWED_LOCATIONS = [
    { name: "Trụ sở chính", lat: 10.912345, lng: 106.718901, radius: 100 },
    { name: "Công trình Dĩ An", lat: 10.925678, lng: 106.730123, radius: 200 },
    // Dành cho sếp test tại nhà (Thay tọa độ nhà sếp vào đây)
    { name: "Khu vực Test", lat: 10.762622, lng: 106.660172, radius: 1000 }
];

export async function submitMobileCheckIn(payload: { lat: number, lng: number }) {
    const supabase = await createSupabaseServerClient();

    try {
        // 1. Xác thực nhân viên
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { success: false, error: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." };
        }

        const employeeId = user.id;

        // 2. Lấy thời gian chuẩn từ Server (Chống Fake Time)
        const serverTime = new Date();
        const todayStr = serverTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

        // 3. Kiểm tra Geofencing (Vị trí)
        let isValidLocation = false;
        let matchedLocationName = "";

        for (const loc of ALLOWED_LOCATIONS) {
            const distance = getDistanceFromLatLonInMeters(payload.lat, payload.lng, loc.lat, loc.lng);
            if (distance <= loc.radius) {
                isValidLocation = true;
                matchedLocationName = loc.name;
                break;
            }
        }

        if (!isValidLocation) {
            return {
                success: false,
                error: `Tọa độ của bạn (${payload.lat.toFixed(4)}, ${payload.lng.toFixed(4)}) không nằm trong khu vực chấm công hợp lệ.`
            };
        }

        // 4. Kiểm tra lịch sử chấm công hôm nay
        const { data: existingRecord, error: fetchError } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('date', todayStr)
            .maybeSingle();

        if (fetchError) {
            console.error("Lỗi truy vấn db:", fetchError);
            return { success: false, error: "Lỗi kết nối cơ sở dữ liệu." };
        }

        if (existingRecord) {
            // Đã Check-in -> Thực hiện Check-out
            if (!existingRecord.check_out_time) {
                const checkInTime = new Date(existingRecord.check_in_time);
                const diffMs = serverTime.getTime() - checkInTime.getTime();
                const workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

                const status = workingHours >= 8 ? 'Đủ công' : (workingHours >= 4 ? 'Nửa công' : 'Về sớm');

                const { error: updateError } = await supabase
                    .from('attendance_records')
                    .update({
                        check_out_time: serverTime.toISOString(),
                        check_out_lat: payload.lat,
                        check_out_lng: payload.lng,
                        status: status,
                        working_hours: workingHours,
                        updated_at: serverTime.toISOString()
                    })
                    .eq('id', existingRecord.id);

                if (updateError) throw updateError;
                return {
                    success: true,
                    type: 'CHECK_OUT',
                    message: `Check-out thành công tại ${matchedLocationName}! Thời gian làm việc: ${workingHours} giờ.`
                };
            } else {
                return { success: false, error: "Bạn đã hoàn thành chấm công (Vào & Ra) cho ngày hôm nay." };
            }
        } else {
            // Chưa Check-in -> Thực hiện Check-in
            const isLate = serverTime.getHours() >= 8 && serverTime.getMinutes() > 0;
            const status = isLate ? 'Đi trễ' : 'Đang làm việc';

            const { error: insertError } = await supabase
                .from('attendance_records')
                .insert({
                    employee_id: employeeId,
                    date: todayStr,
                    check_in_time: serverTime.toISOString(),
                    check_in_lat: payload.lat,
                    check_in_lng: payload.lng,
                    status: status
                });

            if (insertError) throw insertError;
            return {
                success: true,
                type: 'CHECK_IN',
                message: `Check-in thành công tại ${matchedLocationName}. Bắt đầu tính giờ làm việc!`
            };
        }

    } catch (error: any) {
        console.error("Lỗi Exception chấm công:", error);
        return { success: false, error: "Lỗi hệ thống không xác định." };
    }
}