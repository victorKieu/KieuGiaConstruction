"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/utils";
import tzlookup from "tz-lookup";
import { getUserProfile } from "@/lib/supabase/getUserProfile";

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
        // --- 1. KIỂM TRA PHIÊN ĐĂNG NHẬP ---
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { success: false, error: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." };
        }
        const authId = user.id;

        // --- 2. LẤY DANH SÁCH TỌA ĐỘ CHO PHÉP (GEOFENCING) ---
        const { data: companySetting } = await supabase
            .from('company_settings')
            .select('name, geocode, attendance_radius')
            .limit(1)
            .single();

        let allowedLocations: Array<{ name: string, lat: number, lng: number, radius: number }> = [];

        // Add Trụ sở chính
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

        // Add Công trình của nhân viên
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
                                radius: 300 // Bán kính công trình
                            });
                        }
                    }
                }
            });
        }

        // --- 3. KIỂM TRA VỊ TRÍ HIỆN TẠI VỚI GEOFENCING ---
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

        // ==========================================================
        // 🚀 4. LOGIC TÍNH TOÁN MÚI GIỜ CHUẨN TỪ GPS
        // ==========================================================

        const exactTimeZone = tzlookup(payload.lat, payload.lng);
        const serverNow = new Date();

        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: exactTimeZone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
        });

        const parts = formatter.formatToParts(serverNow);
        const tp = parts.reduce((acc: any, part) => {
            acc[part.type] = part.value;
            return acc;
        }, {});

        const todayStr = `${tp.year}-${tp.month}-${tp.day}`;
        const dbTimeStr = serverNow.toISOString();

        const { data: existingRecord } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', authId)
            .eq('date', todayStr)
            .maybeSingle();

        if (existingRecord) {
            if (!existingRecord.check_out_time) {
                // CHỐT CA (CHECK-OUT)
                const checkInTime = new Date(existingRecord.check_in_time);
                const diffMs = serverNow.getTime() - checkInTime.getTime();

                // Tính số giờ làm việc thực tế (Quy đổi ra giờ)
                let workingHours = diffMs / (1000 * 60 * 60);

                // Nếu khoảng thời gian làm việc > 5 tiếng, tự động trừ 1 tiếng nghỉ trưa
                if (workingHours > 5) {
                    workingHours -= 1;
                }
                workingHours = parseFloat(workingHours.toFixed(2));

                // Phân loại trạng thái theo LOGIC MỚI
                let status = 'Đủ công';
                if (workingHours > 8.5) {
                    status = 'Tăng ca (OT)'; // Làm dư giờ
                } else if (workingHours >= 7.5) {
                    status = 'Đủ công'; // Làm 8 tiếng (Cho phép chênh lệch nhẹ)
                } else if (workingHours >= 4) {
                    status = 'Nửa công';
                } else {
                    status = 'Về sớm';
                }

                await supabase.from('attendance_records').update({
                    check_out_time: dbTimeStr,
                    check_out_lat: payload.lat,
                    check_out_lng: payload.lng,
                    status: status,
                    working_hours: workingHours,
                    updated_at: new Date().toISOString()
                }).eq('id', existingRecord.id);

                return { success: true, type: 'CHECK_OUT', message: `Chốt ca! Thời gian làm: ${workingHours}h - Trạng thái: ${status}` };
            } else {
                return { success: false, error: "Bạn đã hoàn thành chấm công cho ngày hôm nay." };
            }
        } else {
            // VÀO CA (CHECK-IN)
            // Giờ chuẩn là 8:00. Nếu check-in sau 8:00 (VD: 8:01) -> Đi muộn
            const checkInHour = parseInt(tp.hour);
            const checkInMinute = parseInt(tp.minute);

            const isLate = checkInHour > 8 || (checkInHour === 8 && checkInMinute > 0);
            const status = isLate ? 'Đi muộn' : 'Đang làm việc';

            await supabase.from('attendance_records').insert({
                employee_id: authId,
                date: todayStr,
                check_in_time: dbTimeStr,
                check_in_lat: payload.lat,
                check_in_lng: payload.lng,
                status: status
            });

            return { success: true, type: 'CHECK_IN', message: `Vào ca lúc ${tp.hour}:${tp.minute}. Trạng thái: ${status}` };
        }

    } catch (error: any) {
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

        // TRUY VẤN BẢNG EMPLOYEES ĐỂ LẤY TÊN VÀ MÃ (Khớp bằng auth_id)
        const { data: employee } = await supabase
            .from('employees')
            .select('code, name')
            .eq('auth_id', authId)
            .maybeSingle();

        const empName = employee?.name || user.email?.split('@')[0] || "Người dùng";
        const empCode = employee?.code || "Chưa có mã";

        return records.map((record: any) => ({
            id: record.id,
            date: formatDate(record.date), // ✅ Đã fix: Dùng formatDate cho ngày
            employeeCode: empCode,
            name: empName,
            checkIn: record.check_in_time
                ? new Date(record.check_in_time).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })
                : "",
            checkOut: record.check_out_time
                ? new Date(record.check_out_time).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })
                : "",
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

        // Insert đơn từ
        const { error } = await supabase.from('attendance_requests').insert({
            employee_id: user.id,
            ...payload
        });
        if (error) throw error;

        // BẮN THÔNG BÁO CHO QUẢN LÝ
        const { data: employee } = await supabase.from('employees').select('name, manager_id').eq('auth_id', user.id).single();
        if (employee && employee.manager_id) {
            const { data: manager } = await supabase.from('employees').select('auth_id').eq('id', employee.manager_id).single();

            if (manager && manager.auth_id) {
                const reqTypeName = payload.request_type === 'leave' ? 'Nghỉ phép' : 'Giải trình';
                await supabase.from('notifications').insert({
                    user_id: manager.auth_id,
                    title: `Có đơn ${reqTypeName} mới cần duyệt`,
                    // ✅ Đã fix: Dùng formatDate trong nội dung thông báo
                    message: `Nhân viên ${employee.name} vừa gửi đơn ${reqTypeName} cho ngày ${formatDate(payload.start_date)}. Vui lòng kiểm tra!`,
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
        // ✅ 1. Sử dụng hàm trung tâm của sếp để lấy Profile
        const userProfile = await getUserProfile();

        if (!userProfile || !userProfile.isAuthenticated || userProfile.type !== 'EMPLOYEE') {
            console.log("❌ Không tìm thấy Profile nhân viên hợp lệ.");
            return [];
        }

        const currentEmployeeId = userProfile.entityId; // Đây chính là ID trong bảng employees
        const userRole = (userProfile.role || '').toLowerCase();
        const isHR = userRole === 'admin' || userRole === 'hr' || userRole === 'giám đốc';

        let targetAuthIds: string[] = [];

        if (!isHR) {
            // --- LOGIC PHÂN QUYỀN CHO QUẢN LÝ ---
            const { data: managedDepts } = await supabase
                .from('department_managers')
                .select('department_id')
                .eq('manager_id', currentEmployeeId); // Dùng entityId chuẩn

            const directManagedDeptIds = managedDepts ? managedDepts.map(d => d.department_id) : [];
            let allowedDeptIds = new Set<string>(directManagedDeptIds);

            if (directManagedDeptIds.length > 0) {
                const { data: allDepts } = await supabase.from('sys_dictionaries').select('id, meta_data').eq('category', 'DEPARTMENT');
                let addedNew = true;
                while (addedNew) {
                    addedNew = false;
                    for (const dept of (allDepts || [])) {
                        const parentId = dept.meta_data?.parent_id;
                        if (parentId && allowedDeptIds.has(parentId) && !allowedDeptIds.has(dept.id)) {
                            allowedDeptIds.add(dept.id);
                            addedNew = true;
                        }
                    }
                }
            }

            const { data: deptEmps } = await supabase.from('employees').select('auth_id').in('department_id', Array.from(allowedDeptIds));
            const { data: directReports } = await supabase.from('employees').select('auth_id').eq('manager_id', currentEmployeeId);

            const combinedIds = new Set([
                userProfile.authId, // Chính mình (auth_id)
                ...(deptEmps ? deptEmps.map(e => e.auth_id) : []),
                ...(directReports ? directReports.map(e => e.auth_id) : [])
            ]);
            targetAuthIds = Array.from(combinedIds).filter(Boolean) as string[];
        }

        // 2. TRUY VẤN DỮ LIỆU
        let query = supabase.from('attendance_requests').select('*').eq('status', 'pending');
        if (!isHR) query = query.in('employee_id', targetAuthIds);

        const { data: requests, error } = await query.order('created_at', { ascending: false });
        if (error || !requests) return [];

        // 3. MAPPING THÔNG TIN NHÂN VIÊN
        const authIds = [...new Set(requests.map(r => r.employee_id))];
        const { data: employees } = await supabase.from('employees').select('auth_id, code, name').in('auth_id', authIds);
        const empMap = (employees || []).reduce((acc: any, emp: any) => {
            acc[emp.auth_id] = emp;
            return acc;
        }, {});

        return requests.map(req => ({
            ...req,
            start_date_formatted: formatDate(req.start_date),
            employee: empMap[req.employee_id] || { name: "N/A", code: "N/A" }
        }));
    } catch (e) {
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

        if (newStatus === 'approved') {
            if (request.request_type === 'explanation') {
                // 1. DUYỆT ĐƠN GIẢI TRÌNH
                const { data: record } = await supabase.from('attendance_records').select('*').eq('employee_id', request.employee_id).eq('date', request.start_date).single();
                const formatTimeStr = (t: string) => t.length > 5 ? t.substring(0, 5) : t;

                // Xác định mã sau khi duyệt
                let finalStatus = 'Đủ công';
                if (request.sub_type === 'field_work') finalStatus = 'Công tác (CT)';

                if (record) {
                    let updateData: any = { status: finalStatus };
                    if (request.sub_type === 'forgot_in' && request.actual_in_time) {
                        updateData.check_in_time = `${request.start_date}T${formatTimeStr(request.actual_in_time)}:00+07:00`;
                    } else if (request.sub_type === 'forgot_out' && request.actual_out_time) {
                        updateData.check_out_time = `${request.start_date}T${formatTimeStr(request.actual_out_time)}:00+07:00`;
                    }

                    const inTime = updateData.check_in_time || record.check_in_time;
                    const outTime = updateData.check_out_time || record.check_out_time;
                    if (inTime && outTime) {
                        let diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
                        let wHours = diffMs / (1000 * 60 * 60);
                        if (wHours > 5) wHours -= 1;
                        updateData.working_hours = parseFloat(wHours.toFixed(2));
                    }
                    await supabase.from('attendance_records').update(updateData).eq('id', record.id);
                } else {
                    if (request.actual_in_time && request.actual_out_time) {
                        const checkIn = `${request.start_date}T${formatTimeStr(request.actual_in_time)}:00+07:00`;
                        const checkOut = `${request.start_date}T${formatTimeStr(request.actual_out_time)}:00+07:00`;
                        let diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
                        let wHours = diffMs / (1000 * 60 * 60);
                        if (wHours > 5) wHours -= 1;

                        await supabase.from('attendance_records').insert({
                            employee_id: request.employee_id,
                            date: request.start_date,
                            check_in_time: checkIn,
                            check_out_time: checkOut,
                            status: finalStatus,
                            working_hours: parseFloat(wHours.toFixed(2))
                        });
                    }
                }
            } else if (request.request_type === 'leave') {
                // 2. DUYỆT ĐƠN NGHỈ PHÉP (Tự động rải phép vào bảng chấm công)
                let leaveStatus = 'Nghỉ (P)';
                let workingHoursToLog = 8; // Điền mặc định 8h để ko bị tính mất công nếu là P

                if (request.sub_type === 'unpaid') {
                    leaveStatus = 'Nghỉ không lương (UL)';
                    workingHoursToLog = 0;
                }

                // Chạy vòng lặp từ ngày bắt đầu đến ngày kết thúc
                let currDate = new Date(request.start_date);
                const endDate = new Date(request.end_date || request.start_date);

                while (currDate <= endDate) {
                    const dateStr = currDate.toISOString().split('T')[0];

                    // Kiểm tra xem ngày này đã có record chưa
                    const { data: extRecord } = await supabase.from('attendance_records')
                        .select('id').eq('employee_id', request.employee_id).eq('date', dateStr).maybeSingle();

                    if (extRecord) {
                        await supabase.from('attendance_records').update({
                            status: leaveStatus,
                            working_hours: workingHoursToLog
                        }).eq('id', extRecord.id);
                    } else {
                        await supabase.from('attendance_records').insert({
                            employee_id: request.employee_id,
                            date: dateStr,
                            status: leaveStatus,
                            working_hours: workingHoursToLog
                        });
                    }
                    currDate.setDate(currDate.getDate() + 1);
                }
            }
        }

        const statusText = newStatus === 'approved' ? 'ĐÃ ĐƯỢC DUYỆT' : 'ĐÃ BỊ TỪ CHỐI';
        const reqTypeName = request.request_type === 'leave' ? 'nghỉ phép' : 'giải trình';

        await supabase.from('notifications').insert({
            user_id: request.employee_id,
            title: `Cập nhật trạng thái đơn ${reqTypeName}`,
            // ✅ Đã fix: Dùng formatDate trong thông báo trả về
            message: `Đơn xin ${reqTypeName} của bạn (áp dụng ngày ${formatDate(request.start_date)}) ${statusText}. ${adminNotes ? `Ghi chú: ${adminNotes}` : ''}`,
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
        // ✅ 1. Lấy Profile chuẩn
        const userProfile = await getUserProfile();
        if (!userProfile || !userProfile.isAuthenticated || userProfile.type !== 'EMPLOYEE') return [];

        const currentEmployeeId = userProfile.entityId;
        const userRole = (userProfile.role || '').toLowerCase();
        const isHR = userRole === 'admin' || userRole === 'hr' || userRole === 'giám đốc';

        let targetAuthIds: string[] = [];

        if (!isHR) {
            // --- LOGIC TÌM CẤP DƯỚI ---
            const { data: managedDepts } = await supabase.from('department_managers').select('department_id').eq('manager_id', currentEmployeeId);
            const directManagedDeptIds = managedDepts ? managedDepts.map(d => d.department_id) : [];

            let allowedDeptIds = new Set<string>(directManagedDeptIds);
            if (directManagedDeptIds.length > 0) {
                const { data: allDepts } = await supabase.from('sys_dictionaries').select('id, meta_data').eq('category', 'DEPARTMENT');
                let addedNew = true;
                while (addedNew) {
                    addedNew = false;
                    for (const dept of (allDepts || [])) {
                        const parentId = dept.meta_data?.parent_id;
                        if (parentId && allowedDeptIds.has(parentId) && !allowedDeptIds.has(dept.id)) {
                            allowedDeptIds.add(dept.id);
                            addedNew = true;
                        }
                    }
                }
            }

            const { data: deptEmps } = await supabase.from('employees').select('auth_id').in('department_id', Array.from(allowedDeptIds));
            const { data: directReports } = await supabase.from('employees').select('auth_id').eq('manager_id', currentEmployeeId);

            const combinedIds = new Set([
                userProfile.authId,
                ...(deptEmps ? deptEmps.map(e => e.auth_id) : []),
                ...(directReports ? directReports.map(e => e.auth_id) : [])
            ]);
            targetAuthIds = Array.from(combinedIds).filter(Boolean) as string[];
        }

        // 2. QUERY DỮ LIỆU
        const startDate = new Date(year, month - 1, 1).toLocaleDateString('en-CA');
        const endDate = new Date(year, month, 0).toLocaleDateString('en-CA');

        let query = supabase.from('attendance_records').select('*').gte('date', startDate).lte('date', endDate);
        if (!isHR) query = query.in('employee_id', targetAuthIds);

        const { data: records, error } = await query.order('date', { ascending: false });
        if (error || !records) return [];

        const authIds = [...new Set(records.map(r => r.employee_id))];
        const { data: employees } = await supabase.from('employees').select('auth_id, code, name').in('auth_id', authIds);
        const empMap = (employees || []).reduce((acc: any, emp: any) => {
            acc[emp.auth_id] = emp;
            return acc;
        }, {});

        let formattedData = records.map((record: any) => {
            const empInfo = empMap[record.employee_id] || { name: "N/A", code: "N/A" };
            return {
                id: record.id,
                date: record.date,
                employeeCode: empInfo.code,
                name: empInfo.name,
                checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
                checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
                status: record.status,
                location: record.check_in_lat ? `${record.check_in_lat.toFixed(3)}, ${record.check_in_lng.toFixed(3)}` : ""
            };
        });

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            formattedData = formattedData.filter((r: any) => r.name.toLowerCase().includes(lowerQuery) || r.employeeCode.toLowerCase().includes(lowerQuery));
        }

        return formattedData;
    } catch (e) {
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
            .eq('employee_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("Lỗi lấy đơn cá nhân:", e);
        return [];
    }
}