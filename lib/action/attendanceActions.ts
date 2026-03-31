"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// ============================================================================
// 1. CÁC HÀM TIỆN ÍCH & CẤU HÌNH (GEOFENCING)
// ============================================================================

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

// Cấu hình các địa điểm cho phép chấm công
const ALLOWED_LOCATIONS = [
    { name: "Trụ sở chính", lat: 10.912345, lng: 106.718901, radius: 100 },
    { name: "Công trình Dĩ An", lat: 10.925678, lng: 106.730123, radius: 200 },
    { name: "Khu vực Test", lat: 10.762622, lng: 106.660172, radius: 1000 } // Khu vực test
];


// ============================================================================
// 2. API CHẤM CÔNG GPS (XỬ LÝ CHECK-IN / CHECK-OUT)
// ============================================================================

// Alias cho submitGPSCheckIn để tránh lỗi nếu file page.tsx đang dùng tên này
export async function submitGPSCheckIn(payload: { lat: number, lng: number }) {
    return submitMobileCheckIn(payload);
}

export async function submitMobileCheckIn(payload: { lat: number, lng: number }) {
    const supabase = await createSupabaseServerClient();

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { success: false, error: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." };
        }

        const employeeId = user.id;
        const serverTime = new Date();
        const todayStr = serverTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

        let isValidLocation = false;
        let matchedLocationName = "";

        // Kiểm tra Geofencing
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

        const { data: existingRecord, error: fetchError } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('date', todayStr)
            .maybeSingle();

        if (fetchError) return { success: false, error: "Lỗi kết nối cơ sở dữ liệu." };

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
                return { success: true, type: 'CHECK_OUT', message: `Check-out thành công tại ${matchedLocationName}! Làm việc: ${workingHours}h.` };
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
            return { success: true, type: 'CHECK_IN', message: `Check-in thành công tại ${matchedLocationName}. Bắt đầu tính giờ!` };
        }

    } catch (error: any) {
        console.error("Lỗi Exception chấm công:", error);
        return { success: false, error: "Lỗi hệ thống không xác định." };
    }
}


// ============================================================================
// 3. API LẤY LỊCH SỬ CHẤM CÔNG ĐỂ HIỂN THỊ LÊN BẢNG (DESKTOP)
// ============================================================================

export async function getMyAttendanceRecords() {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', user.id)
            .order('date', { ascending: false }) // Mới nhất xếp trên
            .limit(30); // Lấy 30 ngày gần nhất

        if (error) throw error;

        // Format lại dữ liệu cho khớp với bảng UI
        return data.map((record: any) => ({
            id: record.id,
            date: new Date(record.date).toLocaleDateString('vi-VN'),
            employeeCode: "NV-" + record.employee_id.substring(0, 4).toUpperCase(), // Rút gọn ID làm mã NV
            name: user.email?.split('@')[0] || "Nhân viên",
            checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
            checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
            status: record.status,
            location: record.check_in_lat ? `Tọa độ: ${record.check_in_lat.toFixed(3)}, ${record.check_in_lng.toFixed(3)}` : ""
        }));
    } catch (e) {
        console.error("Lỗi lấy lịch sử:", e);
        return [];
    }
}


// ============================================================================
// 4. API GỬI ĐƠN XIN NGHỈ & ĐƠN GIẢI TRÌNH CHẤM CÔNG
// ============================================================================

export async function submitAttendanceRequest(payload: any) {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Vui lòng đăng nhập." };

        const { error } = await supabase
            .from('attendance_requests')
            .insert({
                employee_id: user.id,
                ...payload
            });

        if (error) throw error;
        return { success: true, message: "Đã gửi đơn thành công. Chờ quản lý duyệt!" };
    } catch (e: any) {
        console.error("Lỗi gửi đơn:", e);
        return { success: false, error: "Lỗi hệ thống khi gửi đơn." };
    }
}