"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
// ✅ IMPORT HÀM CHUẨN CỦA SẾP VÀO ĐÂY (Sửa lại đường dẫn nếu cần)
import { getUserProfile } from "@/lib/supabase//getUserProfile";

// ============================================================================
// 1. HÀM TÍNH KHOẢNG CÁCH (HAVERSINE)
// ============================================================================
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ============================================================================
// 2. API CHẤM CÔNG GPS 
// ============================================================================

export async function submitGPSCheckIn(payload: { lat: number, lng: number }) {
    return submitMobileCheckIn(payload);
}

export async function submitMobileCheckIn(payload: { lat: number, lng: number }) {
    const supabase = await createSupabaseServerClient();

    try {
        // ✅ 1. DÙNG HÀM CHUẨN ĐỂ LẤY PROFILE & ENTITY_ID
        const profile = await getUserProfile();

        // Kiểm tra xem có đăng nhập và có phải là EMPLOYEE không
        if (!profile?.isAuthenticated || profile.type !== 'EMPLOYEE' || !profile.entityId) {
            return { success: false, error: "Tài khoản không hợp lệ hoặc chưa liên kết hồ sơ nhân sự." };
        }

        const employeeId = profile.entityId; // Lấy trực tiếp ID nhân sự!

        // 2. LẤY TỌA ĐỘ TRỤ SỞ CHÍNH
        const { data: companySetting } = await supabase
            .from('company_settings')
            .select('name, geocode, attendance_radius')
            .limit(1)
            .single();

        let allowedLocations: Array<{ name: string, lat: number, lng: number, radius: number }> = [];

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
                        radius: companySetting.attendance_radius || 150
                    });
                }
            }
        }

        // 3. LẤY TỌA ĐỘ DỰ ÁN
        const { data: memberProjects } = await supabase
            .from('project_members')
            .select(`project_id, projects ( name, geocode )`)
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
                                radius: 300
                            });
                        }
                    }
                }
            });
        }

        // 4. CHECK GEOFENCING
        let isValidLocation = false;
        let matchedLocationName = "";

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
            return { success: false, error: `Tọa độ hiện tại không hợp lệ. Vui lòng di chuyển vào khu vực quy định.` };
        }

        // 5. THỰC HIỆN CHẤM CÔNG VÀO DB
        const serverTime = new Date();
        const todayStr = serverTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

        const { data: existingRecord } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('date', todayStr)
            .maybeSingle();

        if (existingRecord) {
            if (!existingRecord.check_out_time) {
                const checkInTime = new Date(existingRecord.check_in_time);
                const diffMs = serverTime.getTime() - checkInTime.getTime();
                const workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
                const status = workingHours >= 8 ? 'Đủ công' : (workingHours >= 4 ? 'Nửa công' : 'Về sớm');

                await supabase.from('attendance_records').update({
                    check_out_time: serverTime.toISOString(),
                    check_out_lat: payload.lat,
                    check_out_lng: payload.lng,
                    status: status,
                    working_hours: workingHours,
                    updated_at: serverTime.toISOString()
                }).eq('id', existingRecord.id);

                return { success: true, type: 'CHECK_OUT', message: `Chốt ca tại ${matchedLocationName} (${workingHours}h)` };
            } else {
                return { success: false, error: "Bạn đã hoàn thành chấm công cho ngày hôm nay." };
            }
        } else {
            const isLate = serverTime.getHours() >= 8 && serverTime.getMinutes() > 0;
            const status = isLate ? 'Đi trễ' : 'Đang làm việc';

            await supabase.from('attendance_records').insert({
                employee_id: employeeId,
                date: todayStr,
                check_in_time: serverTime.toISOString(),
                check_in_lat: payload.lat,
                check_in_lng: payload.lng,
                status: status
            });

            return { success: true, type: 'CHECK_IN', message: `Bắt đầu ca tại ${matchedLocationName}.` };
        }

    } catch (error: any) {
        console.error("Lỗi Exception chấm công:", error);
        return { success: false, error: "Lỗi hệ thống không xác định." };
    }
}

// ============================================================================
// 3. LẤY BẢNG CÔNG CÁ NHÂN 
// ============================================================================

export async function getMyAttendanceRecords() {
    const supabase = await createSupabaseServerClient();
    try {
        const profile = await getUserProfile();
        if (!profile?.isAuthenticated || !profile.entityId) return [];

        const { data, error } = await supabase
            .from('attendance_records')
            .select(`*, employee:employees(id, code, name)`)
            .eq('employee_id', profile.entityId) // ✅ Lọc theo entityId chuẩn
            .order('date', { ascending: false })
            .limit(30);

        if (error) throw error;

        return data.map((record: any) => ({
            id: record.id,
            date: new Date(record.date).toLocaleDateString('vi-VN'),
            employeeCode: record.employee?.code || "Chưa có mã",
            name: record.employee?.name || profile.name,
            checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
            checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
            status: record.status,
            location: record.check_in_lat ? `Tọa độ: ${record.check_in_lat.toFixed(3)}, ${record.check_in_lng.toFixed(3)}` : ""
        }));
    } catch (e) {
        return [];
    }
}

// ============================================================================
// 4. GỬI ĐƠN XIN NGHỈ / GIẢI TRÌNH
// ============================================================================

export async function submitAttendanceRequest(payload: any) {
    const supabase = await createSupabaseServerClient();
    try {
        const profile = await getUserProfile();
        if (!profile?.isAuthenticated || profile.type !== 'EMPLOYEE' || !profile.entityId) {
            return { success: false, error: "Tài khoản không hợp lệ hoặc chưa liên kết hồ sơ nhân sự." };
        }

        const { error } = await supabase.from('attendance_requests').insert({
            employee_id: profile.entityId, // ✅ Dùng luôn entityId không cần query thêm
            ...payload
        });

        if (error) throw error;

        return { success: true, message: "Đã gửi đơn thành công. Chờ quản lý duyệt!" };
    } catch (e: any) {
        return { success: false, error: "Lỗi hệ thống khi gửi đơn." };
    }
}

// ============================================================================
// 5. API DÀNH CHO QUẢN LÝ: LẤY DANH SÁCH & DUYỆT ĐƠN BỌC THÉP
// ============================================================================

export async function getPendingRequests() {
    const supabase = await createSupabaseServerClient();
    try {
        // ✅ KIỂM TRA QUYỀN TRUY CẬP TRƯỚC KHI LẤY DATA
        const profile = await getUserProfile();
        if (!profile?.isAuthenticated) return [];

        // Chỉ lấy data nếu là ADMIN, HR_MANAGER, HOẶC LEADER (Sếp tùy chỉnh mã code này theo DB của sếp nhé)
        const allowedRoles = ['ADMIN', 'HR_MANAGER', 'LEADER', 'DIRECTOR'];
        if (!allowedRoles.includes(profile.role)) {
            console.log("Không có quyền xem danh sách đơn duyệt.");
            return []; // Không cho xem
        }

        const { data, error } = await supabase
            .from('attendance_requests')
            .select(`*, employee:employees(id, code, name)`)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("Lỗi lấy danh sách đơn:", e);
        return [];
    }
}

export async function processAttendanceRequest(requestId: string, newStatus: 'approved' | 'rejected', adminNotes?: string) {
    const supabase = await createSupabaseServerClient();
    try {
        // ✅ 1. BỌC THÉP: KIỂM TRA QUYỀN DUYỆT ĐƠN
        const profile = await getUserProfile();
        const allowedRoles = ['ADMIN', 'HR_MANAGER', 'LEADER', 'DIRECTOR'];

        if (!profile?.isAuthenticated || !allowedRoles.includes(profile.role)) {
            return { success: false, error: "Bạn không có thẩm quyền duyệt đơn này." };
        }

        const { data: request, error: reqError } = await supabase.from('attendance_requests').select('*').eq('id', requestId).single();
        if (reqError || !request) throw new Error("Không tìm thấy đơn từ.");

        // 2. VÁ LỖI CHẤM CÔNG NẾU LÀ ĐƠN GIẢI TRÌNH ĐƯỢC DUYỆT
        if (newStatus === 'approved' && request.request_type === 'explanation') {
            const { data: record } = await supabase.from('attendance_records').select('*').eq('employee_id', request.employee_id).eq('date', request.start_date).single();

            if (record) {
                let updateData: any = { status: 'Đủ công' };
                if (request.sub_type === 'forgot_in' && request.actual_in_time) {
                    updateData.check_in_time = `${request.start_date}T${request.actual_in_time}:00+07:00`;
                } else if (request.sub_type === 'forgot_out' && request.actual_out_time) {
                    updateData.check_out_time = `${request.start_date}T${request.actual_out_time}:00+07:00`;
                }
                await supabase.from('attendance_records').update(updateData).eq('id', record.id);
            } else {
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

        // 3. LƯU VẾT QUẢN LÝ ĐÃ BẤM DUYỆT (Lấy ID nhân viên của người duyệt)
        await supabase.from('attendance_requests').update({
            status: newStatus,
            approver_id: profile.entityId, // ✅ Lưu đích danh EmployeeID của Sếp/HR đã bấm duyệt
            approver_note: adminNotes || null,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }).eq('id', requestId);

        return { success: true, message: newStatus === 'approved' ? 'Đã duyệt đơn thành công!' : 'Đã từ chối đơn.' };
    } catch (e: any) {
        return { success: false, error: e.message || "Có lỗi xảy ra khi xử lý hệ thống." };
    }
}

// ============================================================================
// 6. LẤY BẢNG CÔNG TOÀN CÔNG TY (THEO THÁNG)
// ============================================================================

export async function getAllAttendanceRecords(month: number, year: number, searchQuery: string = "") {
    const supabase = await createSupabaseServerClient();
    try {
        // (Tùy chọn: Sếp có thể check quyền profile.role ở đây giống hàm getPendingRequests)

        const startDate = new Date(year, month - 1, 1).toLocaleDateString('en-CA');
        const endDate = new Date(year, month, 0).toLocaleDateString('en-CA');

        const { data, error } = await supabase
            .from('attendance_records')
            .select(`*, employee:employees(id, code, name)`)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (error) throw error;

        let formattedData = data.map((record: any) => {
            return {
                id: record.id,
                date: new Date(record.date).toLocaleDateString('vi-VN'),
                employeeCode: record.employee?.code || "Chưa có mã",
                name: record.employee?.name || "Chưa cập nhật tên",
                checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
                checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
                status: record.status,
                location: record.check_in_lat ? `${record.check_in_lat.toFixed(3)}, ${record.check_in_lng.toFixed(3)}` : ""
            };
        });

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