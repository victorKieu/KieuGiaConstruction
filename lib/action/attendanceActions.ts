"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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
// 2. API CHẤM CÔNG GPS (SỬ DỤNG AUTH_ID)
// ============================================================================

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

        // ✅ LẤY TRỰC TIẾP AUTH_ID TỪ PHIÊN ĐĂNG NHẬP
        const authId = user.id;

        // Lấy cấu hình Trụ sở chính
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

        // Lấy tọa độ công trình mà nhân viên tham gia (Dùng authId tương đương user_id)
        const { data: memberProjects } = await supabase
            .from('project_members')
            .select(`project_id, projects ( name, geocode )`)
            .eq('user_id', authId);

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

        // Check Geofencing
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

        // Thực hiện Insert / Update bảng công bằng AUTH_ID
        const serverTime = new Date();
        const todayStr = serverTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

        const { data: existingRecord } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', authId) // Ghi nhận bằng Auth ID
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
                employee_id: authId, // Ghi nhận bằng Auth ID
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
// 3. LẤY BẢNG CÔNG CÁ NHÂN (TRUY VẤN NGƯỢC TỪ AUTH_ID SANG EMPLOYEES)
// ============================================================================

export async function getMyAttendanceRecords() {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const authId = user.id;

        // Lấy lịch sử theo auth_id
        const { data: records, error } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', authId)
            .order('date', { ascending: false })
            .limit(30);

        if (error) throw error;
        if (!records || records.length === 0) return [];

        // ✅ TRUY VẤN BẢNG EMPLOYEES ĐỂ LẤY TÊN VÀ MÃ (Khớp bằng auth_id)
        const { data: employee } = await supabase
            .from('employees')
            .select('code, name')
            .eq('auth_id', authId)
            .maybeSingle();

        const empName = employee?.name || user.email?.split('@')[0] || "Người dùng";
        const empCode = employee?.code || "Chưa có mã";

        return records.map((record: any) => ({
            id: record.id,
            date: new Date(record.date).toLocaleDateString('vi-VN'),
            employeeCode: empCode,
            name: empName,
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
// 4. GỬI ĐƠN TỪ (BẰNG AUTH_ID)
// ============================================================================

export async function submitAttendanceRequest(payload: any) {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Vui lòng đăng nhập." };
        console.log("Thông tin nhân viên gửi đơn:", user);
        // Insert đơn từ
        const { error } = await supabase.from('attendance_requests').insert({
            employee_id: user.id, // Auth_id của nhân viên
            ...payload
        });
        if (error) throw error;
       
        // ✅ BẮN THÔNG BÁO CHO QUẢN LÝ
        // 1. Lấy thông tin người gửi & ID Quản lý trực tiếp
        const { data: employee } = await supabase.from('employees').select('name, manager_id').eq('auth_id', user.id).single();
        console.log("Thông tin nhân viên gửi đơn:", employee);
        if (employee && employee.manager_id) {
            // 2. Lấy auth_id của Quản lý để gửi thông báo
            const { data: manager } = await supabase.from('employees').select('auth_id').eq('id', employee.manager_id).single();

            if (manager && manager.auth_id) {
                const reqTypeName = payload.request_type === 'leave' ? 'Nghỉ phép' : 'Giải trình';
                await supabase.from('notifications').insert({
                    user_id: manager.auth_id,
                    title: `Có đơn ${reqTypeName} mới cần duyệt`,
                    message: `Nhân viên ${employee.name} vừa gửi đơn ${reqTypeName} cho ngày ${payload.start_date}. Vui lòng kiểm tra!`,
                    link: '/hrm/approvals'
                });
            }
        }

        return { success: true, message: "Đã gửi đơn thành công. Chờ quản lý duyệt!" };
    } catch (e: any) {
        return { success: false, error: "Lỗi hệ thống khi gửi đơn." };
    }
}

// ============================================================================
// 5. API QUẢN LÝ: DANH SÁCH ĐƠN & DUYỆT ĐƠN
// ============================================================================

export async function getPendingRequests() {
    const supabase = await createSupabaseServerClient();
    try {
        // Lấy danh sách đơn (employee_id ở đây chính là auth_id)
        const { data: requests, error } = await supabase
            .from('attendance_requests')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!requests || requests.length === 0) return [];

        // ✅ TỰ ĐỘNG MAP DỮ LIỆU VỚI BẢNG EMPLOYEES TỪ AUTH_ID
        const authIds = [...new Set(requests.map(r => r.employee_id))];
        const { data: employees } = await supabase
            .from('employees')
            .select('auth_id, code, name')
            .in('auth_id', authIds);

        // Tạo Map để tra cứu nhanh
        const empMap = (employees || []).reduce((acc: any, emp: any) => {
            if (emp.auth_id) acc[emp.auth_id] = emp;
            return acc;
        }, {});

        // Gắn employee info vào request
        return requests.map(req => ({
            ...req,
            employee: empMap[req.employee_id] || { name: "Chưa cập nhật tên", code: "N/A" }
        }));

    } catch (e) {
        console.error("Lỗi lấy danh sách đơn:", e);
        return [];
    }
}

export async function processAttendanceRequest(requestId: string, newStatus: 'approved' | 'rejected', adminNotes?: string) {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Không xác định được phiên đăng nhập." };

        const { data: request, error: reqError } = await supabase.from('attendance_requests').select('*').eq('id', requestId).single();
        if (reqError || !request) throw new Error("Không tìm thấy đơn từ.");

        // Vá lỗi chấm công (Chỉ chạy khi duyệt đơn Giải trình)
        if (newStatus === 'approved' && request.request_type === 'explanation') {
            const { data: record } = await supabase.from('attendance_records').select('*').eq('employee_id', request.employee_id).eq('date', request.start_date).single();

            // Hàm cắt chuỗi giờ để tránh lỗi thừa giây (VD: "08:00:00" -> "08:00")
            const formatTimeStr = (t: string) => t.length > 5 ? t.substring(0, 5) : t;

            if (record) {
                let updateData: any = { status: 'Đủ công' };
                if (request.sub_type === 'forgot_in' && request.actual_in_time) {
                    updateData.check_in_time = `${request.start_date}T${formatTimeStr(request.actual_in_time)}:00+07:00`;
                } else if (request.sub_type === 'forgot_out' && request.actual_out_time) {
                    updateData.check_out_time = `${request.start_date}T${formatTimeStr(request.actual_out_time)}:00+07:00`;
                }

                // Cập nhật lại Số giờ làm việc (working_hours)
                const inTime = updateData.check_in_time || record.check_in_time;
                const outTime = updateData.check_out_time || record.check_out_time;
                if (inTime && outTime) {
                    const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
                    updateData.working_hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
                }

                const { error: updateErr } = await supabase.from('attendance_records').update(updateData).eq('id', record.id);
                if (updateErr) throw new Error("Lỗi cập nhật bảng công gốc: " + updateErr.message);
            } else {
                if (request.actual_in_time && request.actual_out_time) {
                    const checkIn = `${request.start_date}T${formatTimeStr(request.actual_in_time)}:00+07:00`;
                    const checkOut = `${request.start_date}T${formatTimeStr(request.actual_out_time)}:00+07:00`;
                    const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
                    const workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

                    const { error: insErr } = await supabase.from('attendance_records').insert({
                        employee_id: request.employee_id,
                        date: request.start_date,
                        check_in_time: checkIn,
                        check_out_time: checkOut,
                        status: 'Đủ công',
                        working_hours: workingHours
                    });
                    if (insErr) throw new Error("Lỗi tạo mới bảng công: " + insErr.message);
                }
            }
        }

        // Lưu vết Quản lý đã duyệt
        await supabase.from('attendance_requests').update({
            status: newStatus,
            approver_id: user.id,
            approver_note: adminNotes || null,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }).eq('id', requestId);

        // ✅ BẮN THÔNG BÁO CHO NHÂN VIÊN VỀ KẾT QUẢ
        const statusText = newStatus === 'approved' ? 'ĐÃ ĐƯỢC DUYỆT' : 'ĐÃ BỊ TỪ CHỐI';
        const reqTypeName = request.request_type === 'leave' ? 'nghỉ phép' : 'giải trình';

        await supabase.from('notifications').insert({
            user_id: request.employee_id, // Vì employee_id đang lưu bằng auth_id
            title: `Cập nhật trạng thái đơn ${reqTypeName}`,
            message: `Đơn xin ${reqTypeName} của bạn (áp dụng ngày ${request.start_date}) ${statusText}. ${adminNotes ? `Ghi chú: ${adminNotes}` : ''}`,
            link: '/my-attendance?tab=requests'
        });

        return { success: true, message: newStatus === 'approved' ? 'Đã duyệt đơn và vá bảng công!' : 'Đã từ chối đơn.' };
    } catch (e: any) {
        return { success: false, error: e.message || "Có lỗi xảy ra khi xử lý hệ thống." };
    }
}

// ============================================================================
// 6. LẤY BẢNG CÔNG TOÀN CÔNG TY DÀNH CHO HR
// ============================================================================

export async function getAllAttendanceRecords(month: number, year: number, searchQuery: string = "") {
    const supabase = await createSupabaseServerClient();
    try {
        const startDate = new Date(year, month - 1, 1).toLocaleDateString('en-CA');
        const endDate = new Date(year, month, 0).toLocaleDateString('en-CA');

        // Lấy tất cả records trong tháng
        const { data: records, error } = await supabase
            .from('attendance_records')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (error) throw error;
        if (!records || records.length === 0) return [];

        // ✅ TRUY VẤN TÊN VÀ MÃ NHÂN VIÊN TỪ BẢNG EMPLOYEES DỰA VÀO AUTH_ID
        const authIds = [...new Set(records.map(r => r.employee_id))];
        const { data: employees } = await supabase
            .from('employees')
            .select('auth_id, code, name')
            .in('auth_id', authIds);

        const empMap = (employees || []).reduce((acc: any, emp: any) => {
            if (emp.auth_id) acc[emp.auth_id] = emp;
            return acc;
        }, {});

        // Format data để trả về giao diện
        let formattedData = records.map((record: any) => {
            const empInfo = empMap[record.employee_id] || { name: "Chưa cập nhật tên", code: "N/A" };

            return {
                id: record.id,
                date: new Date(record.date).toLocaleDateString('vi-VN'),
                employeeCode: empInfo.code,
                name: empInfo.name,
                checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
                checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
                status: record.status,
                location: record.check_in_lat ? `${record.check_in_lat.toFixed(3)}, ${record.check_in_lng.toFixed(3)}` : ""
            };
        });

        // Xử lý bộ lọc tìm kiếm
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

// ============================================================================
// 7. LẤY DANH SÁCH ĐƠN CÁ NHÂN
// ============================================================================
export async function getMyRequests() {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('attendance_requests')
            .select('*')
            .eq('employee_id', user.id) // Tìm bằng auth_id của nhân viên
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("Lỗi lấy đơn cá nhân:", e);
        return [];
    }
}