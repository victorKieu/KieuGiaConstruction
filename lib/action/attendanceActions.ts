"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// ============================================================================
// 1. HÀM TÍNH KHOẢNG CÁCH (HAVERSINE)
// ============================================================================
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

// ✅ CẤU HÌNH TỌA ĐỘ TRỤ SỞ CHÍNH (AI CŨNG ĐƯỢC CHẤM CÔNG Ở ĐÂY)
const HEAD_OFFICE = {
    name: "Trụ sở chính",
    lat: 10.912345, // Thay bằng tọa độ thật của cty sếp
    lng: 106.718901, // Thay bằng tọa độ thật của cty sếp
    radius: 150 // Cho phép sai số 150 mét
};

// ============================================================================
// 2. API CHẤM CÔNG GPS (XỬ LÝ CHECK-IN / CHECK-OUT)
// ============================================================================

export async function submitGPSCheckIn(payload: { lat: number, lng: number }) {
    return submitMobileCheckIn(payload);
}

export async function submitMobileCheckIn(payload: { lat: number, lng: number }) {
    const supabase = await createSupabaseServerClient();

    try {
        // 1. Xác thực nhân viên
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { success: false, error: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." };
        }
        const employeeId = user.id;

        // ====================================================================
        // 2. LẤY TỌA ĐỘ TRỤ SỞ CHÍNH TỪ BẢNG COMPANY_SETTINGS
        // ====================================================================
        const { data: companySetting } = await supabase
            .from('company_settings')
            .select('name, geocode, attendance_radius')
            .limit(1)
            .single(); // Lấy dòng cấu hình duy nhất của công ty

        let allowedLocations: Array<{ name: string, lat: number, lng: number, radius: number }> = [];

        // Phân tích geocode của Trụ sở chính
        if (companySetting && companySetting.geocode) {
            const parts = companySetting.geocode.split(',');
            if (parts.length >= 2) {
                const hoLat = parseFloat(parts[0].trim());
                const hoLng = parseFloat(parts[1].trim());
                if (!isNaN(hoLat) && !isNaN(hoLng)) {
                    allowedLocations.push({
                        name: companySetting.name || "Trụ sở chính",
                        lat: hoLat,
                        lng: hoLng,
                        // Lấy bán kính từ DB, nếu không có thì mặc định 150m
                        radius: companySetting.attendance_radius || 150
                    });
                }
            }
        }

        // ====================================================================
        // 3. LẤY TỌA ĐỘ CÁC CÔNG TRÌNH NHÂN VIÊN ĐANG LÀM
        // ====================================================================
        const { data: memberProjects } = await supabase
            .from('project_members')
            .select(`
                project_id,
                projects ( name, geocode ) 
            `)
            .eq('user_id', employeeId);

        if (memberProjects && memberProjects.length > 0) {
            memberProjects.forEach((mp: any) => {
                const proj = mp.projects;
                if (proj && proj.geocode) {
                    const parts = proj.geocode.split(',');
                    if (parts.length >= 2) {
                        const projLat = parseFloat(parts[0].trim());
                        const projLng = parseFloat(parts[1].trim());
                        if (!isNaN(projLat) && !isNaN(projLng)) {
                            allowedLocations.push({
                                name: `Công trình: ${proj.name}`,
                                lat: projLat,
                                lng: projLng,
                                radius: 300 // Bán kính công trình (300 mét)
                            });
                        }
                    }
                }
            });
        }

        // 4. KIỂM TRA GEOFENCING
        let isValidLocation = false;
        let matchedLocationName = "";

        // Nếu allowedLocations rỗng (chưa setup DB), báo lỗi luôn để sếp biết
        if (allowedLocations.length === 0) {
            return { success: false, error: "Hệ thống chưa được cấu hình tọa độ chấm công." };
        }

        for (const loc of allowedLocations) {
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
                error: `Tọa độ hiện tại không hợp lệ. Bạn không ở Trụ sở chính hoặc Công trình được phân công.`
            };
        }

        // 5. THỰC HIỆN CHẤM CÔNG (Giữ nguyên logic Check-in / Check-out bọc thép)
        const serverTime = new Date();
        const todayStr = serverTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

        const { data: existingRecord, error: fetchError } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('date', todayStr)
            .maybeSingle();

        if (fetchError) return { success: false, error: "Lỗi kết nối cơ sở dữ liệu." };

        if (existingRecord) {
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
                return { success: true, type: 'CHECK_OUT', message: `Chốt ca tại ${matchedLocationName} (${workingHours}h)` };
            } else {
                return { success: false, error: "Bạn đã hoàn thành chấm công (Vào & Ra) cho ngày hôm nay." };
            }
        } else {
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
            return { success: true, type: 'CHECK_IN', message: `Bắt đầu ca tại ${matchedLocationName}.` };
        }

    } catch (error: any) {
        console.error("Lỗi Exception chấm công:", error);
        return { success: false, error: "Lỗi hệ thống không xác định." };
    }
}


// ============================================================================
// 3. API LẤY LỊCH SỬ & ĐƠN TỪ (Giữ nguyên)
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
            .order('date', { ascending: false })
            .limit(30);

        if (error) throw error;

        return data.map((record: any) => ({
            id: record.id,
            date: new Date(record.date).toLocaleDateString('vi-VN'),
            employeeCode: "NV-" + record.employee_id.substring(0, 4).toUpperCase(),
            name: user.email?.split('@')[0] || "Nhân viên",
            checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
            checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
            status: record.status,
            location: record.check_in_lat ? `Tọa độ: ${record.check_in_lat.toFixed(3)}, ${record.check_in_lng.toFixed(3)}` : ""
        }));
    } catch (e) {
        return [];
    }
}

export async function submitAttendanceRequest(payload: any) {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Vui lòng đăng nhập." };

        const { error } = await supabase.from('attendance_requests').insert({ employee_id: user.id, ...payload });
        if (error) throw error;
        return { success: true, message: "Đã gửi đơn thành công. Chờ quản lý duyệt!" };
    } catch (e: any) {
        return { success: false, error: "Lỗi hệ thống khi gửi đơn." };
    }
}

// ============================================================================
// 5. API DÀNH CHO QUẢN LÝ: LẤY DANH SÁCH ĐƠN & XỬ LÝ DUYỆT ĐƠN
// ============================================================================

// Lấy danh sách đơn đang chờ duyệt
export async function getPendingRequests() {
    const supabase = await createSupabaseServerClient();
    try {
        // Lấy join với bảng profiles/users/employees để hiển thị tên người gửi
        // Lưu ý: Thay 'employees' và các trường name, code cho khớp với DB của sếp
        const { data, error } = await supabase
            .from('attendance_requests')
            .select(`
                *,
                employee:employees(id, code, first_name, last_name)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("Lỗi lấy danh sách đơn:", e);
        return [];
    }
}

// Xử lý Duyệt / Từ chối đơn
export async function processAttendanceRequest(requestId: string, newStatus: 'approved' | 'rejected', adminNotes?: string) {
    const supabase = await createSupabaseServerClient();
    try {
        // 1. Lấy thông tin chi tiết của cái đơn này trước
        const { data: request, error: reqError } = await supabase
            .from('attendance_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (reqError || !request) throw new Error("Không tìm thấy đơn từ.");

        // 2. Nếu DUYỆT ĐƠN GIẢI TRÌNH -> Phải cập nhật lại bảng attendance_records
        if (newStatus === 'approved' && request.request_type === 'explanation') {

            // Tìm bản ghi chấm công của ngày đó
            const { data: record } = await supabase
                .from('attendance_records')
                .select('*')
                .eq('employee_id', request.employee_id)
                .eq('date', request.start_date)
                .single();

            if (record) {
                // Vá lỗi dữ liệu dựa theo loại giải trình
                let updateData: any = { status: 'Đủ công' }; // Mặc định reset về đủ công nếu được duyệt

                if (request.sub_type === 'forgot_in' && request.actual_in_time) {
                    // Cập nhật ngày giờ VÀO: Lấy date ghép với time
                    updateData.check_in_time = `${request.start_date}T${request.actual_in_time}:00+07:00`;
                }
                else if (request.sub_type === 'forgot_out' && request.actual_out_time) {
                    // Cập nhật ngày giờ RA
                    updateData.check_out_time = `${request.start_date}T${request.actual_out_time}:00+07:00`;
                }
                // Các case wrong_time, field_work sếp có thể mở rộng thêm logic tính lại working_hours ở đây

                await supabase
                    .from('attendance_records')
                    .update(updateData)
                    .eq('id', record.id);
            } else {
                // Nếu ngày đó chưa có record nào luôn (Quên chấm cả vào lẫn ra) -> Tạo mới
                // (Chỉ chạy nếu có đủ cả actual_in_time và actual_out_time)
                if (request.actual_in_time && request.actual_out_time) {
                    await supabase.from('attendance_records').insert({
                        employee_id: request.employee_id,
                        date: request.start_date,
                        check_in_time: `${request.start_date}T${request.actual_in_time}:00+07:00`,
                        check_out_time: `${request.start_date}T${request.actual_out_time}:00+07:00`,
                        status: 'Đủ công'
                    });
                }
            }
        }

        // 3. Cập nhật trạng thái của cái đơn thành Approved / Rejected
        const { error: updateError } = await supabase
            .from('attendance_requests')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
                // Thêm cột admin_notes vào DB nếu sếp muốn lưu lý do từ chối
            })
            .eq('id', requestId);

        if (updateError) throw updateError;

        return { success: true, message: newStatus === 'approved' ? 'Đã duyệt đơn thành công!' : 'Đã từ chối đơn.' };
    } catch (e: any) {
        console.error("Lỗi xử lý đơn:", e);
        return { success: false, error: e.message || "Có lỗi xảy ra khi xử lý hệ thống." };
    }
}

// ============================================================================
// 6. API DÀNH CHO HR: LẤY BẢNG CÔNG TOÀN CÔNG TY (THEO THÁNG)
// ============================================================================

export async function getAllAttendanceRecords(month: number, year: number, searchQuery: string = "") {
    const supabase = await createSupabaseServerClient();
    try {
        // Tạo khoảng thời gian từ ngày đầu tháng đến ngày cuối tháng
        const startDate = new Date(year, month - 1, 1).toLocaleDateString('en-CA');
        const endDate = new Date(year, month, 0).toLocaleDateString('en-CA');

        const { data, error } = await supabase
            .from('attendance_records')
            .select(`
                *,
                employee:employees(id, code, first_name, last_name)
            `)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (error) throw error;

        // Format lại dữ liệu
        let formattedData = data.map((record: any) => {
            const empName = record.employee
                ? `${record.employee.last_name || ''} ${record.employee.first_name || ''}`.trim()
                : "Không xác định";

            return {
                id: record.id,
                date: new Date(record.date).toLocaleDateString('vi-VN'),
                employeeCode: record.employee?.code || "NV-???",
                name: empName,
                checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
                checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
                status: record.status,
                location: record.check_in_lat ? `${record.check_in_lat.toFixed(3)}, ${record.check_in_lng.toFixed(3)}` : ""
            };
        });

        // Lọc theo từ khóa tìm kiếm (Mã NV hoặc Tên NV)
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            formattedData = formattedData.filter((r: any) =>
                r.name.toLowerCase().includes(lowerQuery) ||
                r.employeeCode.toLowerCase().includes(lowerQuery)
            );
        }

        return formattedData;
    } catch (e) {
        console.error("Lỗi lấy bảng công toàn công ty:", e);
        return [];
    }
}