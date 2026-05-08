"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/utils";
import tzlookup from "tz-lookup";
import { getUserProfile } from "@/lib/supabase/getUserProfile";
import { sendPushToUser } from "@/lib/action/pushNotification";
import { revalidatePath } from "next/cache";

// ============================================================================
// 1. HÀM TÍNH KHOẢNG CÁCH (HAVERSINE) TRÊN SERVER
// ============================================================================
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Bán kính Trái Đất (mét)
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
// 2. LÕI CHẤM CÔNG CHÍNH: KẾT HỢP FACE ID + GPS SERVER
// ============================================================================
export async function processFaceAttendance(
    scannedEmployeeId: string,
    location: { lat: number; lng: number },
    isProxyCheckIn: boolean = false
) {
    try {
        const supabase = await createSupabaseServerClient();

        // BƯỚC 1: XÁC THỰC NGƯỜI CẦM MÁY
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Phiên đăng nhập không hợp lệ.");

        const { data: employee } = await supabase.from('employees').select('id').eq('auth_id', user.id).single();
        const { data: profile } = await supabase.from('user_profiles').select('role_id').eq('auth_id', user.id).single();

        if (!employee || !profile) throw new Error("Không tìm thấy hồ sơ người dùng.");

        const currentEmpId = employee.id;
        const isAdmin = profile.role_id === 'admin';

        if (!isProxyCheckIn && currentEmpId !== scannedEmployeeId) {
            throw new Error("TỪ CHỐI: Khuôn mặt không khớp với tài khoản đang đăng nhập.");
        }

        // BƯỚC 2: CHỐT THỜI GIAN
        const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
        const todayStr = vnTime.toISOString().split('T')[0];
        const dbTimeStr = vnTime.toISOString();
        const checkInHour = vnTime.getHours();
        const checkInMinute = vnTime.getMinutes();

        // BƯỚC 3: AUTO GEOFENCING (TỰ ĐỘNG ĐỊNH VỊ)
        let currentLocationId: string | null = null;
        let currentLocationName = "";
        let isAtOffice = false;
        let minDistance = Infinity;

        const { data: companySetting } = await supabase.from('company_settings').select('geocode, attendance_radius').single();
        const ALLOWED_RADIUS = companySetting?.attendance_radius || 50;

        if (companySetting?.geocode) {
            const [lat, lng] = companySetting.geocode.split(',').map(Number);
            const dist = getDistanceFromLatLonInMeters(location.lat, location.lng, lat, lng);
            minDistance = Math.min(minDistance, dist);
            if (dist <= ALLOWED_RADIUS) {
                isAtOffice = true;
                currentLocationName = "Văn phòng Công ty";
            }
        }

        if (!isAtOffice) {
            const { data: activeProjects } = await supabase.from('projects').select('id, name, geocode').not('geocode', 'is', null);
            if (activeProjects) {
                for (const proj of activeProjects) {
                    const [pLat, pLng] = proj.geocode.split(',').map(Number);
                    const dist = getDistanceFromLatLonInMeters(location.lat, location.lng, pLat, pLng);
                    minDistance = Math.min(minDistance, dist);

                    if (dist <= ALLOWED_RADIUS) {
                        currentLocationId = proj.id;
                        currentLocationName = proj.name;
                        break;
                    }
                }
            }
        }

        if (!isAtOffice && !currentLocationId) {
            throw new Error(`Ngoài vùng chấm công! Điểm dự án gần nhất cách ${Math.round(minDistance)}m (Yêu cầu < ${ALLOWED_RADIUS}m).`);
        }

        // BƯỚC 4: KIỂM TRA QUYỀN
        if (isProxyCheckIn) {
            if (isAtOffice) {
                const hrRoles = ['hr_manager', 'hr_staff'];
                if (!isAdmin && !hrRoles.includes(profile.role_id)) {
                    throw new Error("Chấm công hộ tại văn phòng chỉ dành cho phòng Hành chính Nhân sự.");
                }
            } else {
                const { data: supLink } = await supabase.from('project_members').select('role_id').eq('project_id', currentLocationId).eq('employee_id', currentEmpId).single();
                const validRoles = ['project_manager', 'manager', 'team_leader', 'DIRECTOR', 'MANAGER', 'TEAM_LEADER'];
                if (!isAdmin && (!supLink || !validRoles.includes(supLink.role_id))) {
                    throw new Error("TỪ CHỐI: Bạn không có quyền Tổ trưởng/Quản lý tại dự án này để chấm công hộ.");
                }
            }

            if (currentLocationId) {
                const { data: workerLink } = await supabase.from('project_members').select('id').eq('project_id', currentLocationId).eq('employee_id', scannedEmployeeId).single();
                if (!workerLink) throw new Error("TỪ CHỐI: Nhân sự này chưa được thêm vào danh sách thi công của dự án.");
            }
        } else {
            if (!isAtOffice && currentLocationId && !isAdmin) {
                const { data: myLink } = await supabase.from('project_members').select('id').eq('project_id', currentLocationId).eq('employee_id', currentEmpId).single();
                if (!myLink) throw new Error("TỪ CHỐI: Bạn không có tên trong danh sách nhân sự thi công của dự án này.");
            }
        }

        // BƯỚC 5: GHI NHẬN DB
        const { data: existingRecord } = await supabase.from('attendance_records').select('*').eq('employee_id', scannedEmployeeId).eq('date', todayStr).single();
        const messageParams = isProxyCheckIn ? `(Quản lý xác nhận)` : '';

        if (existingRecord) {
            if (!existingRecord.check_out_time) {
                const checkInTime = new Date(existingRecord.check_in_time);
                let workingHours = (vnTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
                if (workingHours > 5) workingHours -= 1.5; // Trừ nghỉ trưa nếu làm > 5 tiếng

                await supabase.from('attendance_records').update({
                    check_out_time: dbTimeStr, check_out_lat: location.lat, check_out_lng: location.lng,
                    status: workingHours >= 8 ? 'Hoàn thành' : 'Về sớm',
                    working_hours: parseFloat(Math.max(0, workingHours).toFixed(2)), updated_at: dbTimeStr
                }).eq('id', existingRecord.id);

                revalidatePath(`/hrm/attendance`);
                return { success: true, type: 'CHECK_OUT', message: `Chốt ca thành công tại ${currentLocationName}! ${messageParams}` };
            } else {
                return { success: false, error: "Nhân sự này đã hoàn thành chấm công hôm nay." };
            }
        } else {
            const isLate = checkInHour > 8 || (checkInHour === 8 && checkInMinute > 0);
            await supabase.from('attendance_records').insert({
                employee_id: scannedEmployeeId, date: todayStr, check_in_time: dbTimeStr,
                check_in_lat: location.lat, check_in_lng: location.lng, status: isLate ? 'Đi muộn' : 'Đang làm việc'
            });

            revalidatePath(`/hrm/attendance`);
            return { success: true, type: 'CHECK_IN', message: `Vào ca thành công tại ${currentLocationName}! ${messageParams}` };
        }
    } catch (error: any) {
        return { success: false, error: error.message || 'Lỗi hệ thống khi xử lý chấm công.' };
    }
}

// ============================================================================
// 3. TẢI DỮ LIỆU KHUÔN MẶT ĐỂ ĐỐI CHIẾU (DÙNG CHUNG AUTO-GEOFENCING)
// ============================================================================
export async function getNearbyProjectAndFaceData(location: { lat: number; lng: number }, isProxyCheckIn: boolean = false) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Hết phiên đăng nhập." };

    const { data: employee } = await supabase.from('employees').select('id, name, code, face_descriptor').eq('auth_id', user.id).single();
    const { data: profile } = await supabase.from('user_profiles').select('role_id').eq('auth_id', user.id).single();

    if (!employee || !profile) return { success: false, error: "Hồ sơ không hợp lệ." };

    const isAdmin = profile.role_id === 'admin';

    // ĐỊNH VỊ (Giống hệt processFaceAttendance)
    let currentLocationId: string | null = null;
    let currentLocationName = "";
    let isAtOffice = false;
    let minDistance = Infinity;

    const { data: companySetting } = await supabase.from('company_settings').select('geocode, attendance_radius').single();
    const ALLOWED_RADIUS = companySetting?.attendance_radius || 50;

    if (companySetting?.geocode) {
        const [lat, lng] = companySetting.geocode.split(',').map(Number);
        const dist = getDistanceFromLatLonInMeters(location.lat, location.lng, lat, lng);
        if (dist <= ALLOWED_RADIUS) {
            isAtOffice = true; currentLocationName = "Văn phòng Công ty"; minDistance = dist;
        }
    }

    if (!isAtOffice) {
        const { data: activeProjects } = await supabase.from('projects').select('id, name, geocode').not('geocode', 'is', null);
        if (activeProjects) {
            for (const proj of activeProjects) {
                const [pLat, pLng] = proj.geocode.split(',').map(Number);
                const dist = getDistanceFromLatLonInMeters(location.lat, location.lng, pLat, pLng);
                if (dist <= ALLOWED_RADIUS && dist < minDistance) {
                    currentLocationId = proj.id; currentLocationName = proj.name; minDistance = dist;
                }
            }
        }
    }

    if (!isAtOffice && !currentLocationId) {
        return { success: false, error: `Ngoài vùng chấm công! Khoảng cách hiện tại: ${Math.round(minDistance)}m.` };
    }

    // TẢI KHUÔN MẶT THEO CHẾ ĐỘ
    let members: any[] = [];

    if (isProxyCheckIn) {
        if (isAtOffice) return { success: false, error: "Chấm công hộ chỉ khả dụng tại công trường." };

        // Load toàn bộ nhân viên dự án
        const { data: mems } = await supabase.from('project_members')
            .select(`employee_id, employees!inner(id, name, code, face_descriptor)`)
            .eq('project_id', currentLocationId)
            .not('employees.face_descriptor', 'is', null);

        members = mems || [];
    } else {
        // Tự chấm công -> Chỉ lấy bản thân mình
        if (employee.face_descriptor) {
            members = [{ employee_id: employee.id, employees: employee }];
        }
    }

    if (members.length === 0) return { success: false, error: "Không tìm thấy dữ liệu khuôn mặt hợp lệ (Chưa đăng ký Face ID)." };

    const formattedMembers = members.map((item: any) => ({
        id: item.employees.id,
        name: item.employees.name,
        code: item.employees.code,
        descriptor: item.employees.face_descriptor
    }));

    return {
        success: true,
        project: { id: currentLocationId, name: currentLocationName, distance: Math.round(minDistance) },
        members: formattedMembers
    };
}

// ============================================================================
// CÁC HÀM CŨ LIÊN QUAN ĐẾN ĐƠN TỪ / QUẢN LÝ (Giữ nguyên)
// ============================================================================

export async function getMyAttendanceRecords() {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: employee } = await supabase.from('employees').select('id, code, name').eq('auth_id', user.id).single();
        if (!employee) return [];

        const { data: records, error } = await supabase.from('attendance_records').select('*').eq('employee_id', employee.id).order('date', { ascending: false }).limit(30);

        if (error || !records || records.length === 0) return [];

        const minDate = records[records.length - 1].date;
        const maxDate = records[0].date;

        const { data: approvedRequests } = await supabase.from('attendance_requests').select('start_date, actual_in_time, actual_out_time').eq('employee_id', employee.id).eq('status', 'approved').eq('request_type', 'explanation').gte('start_date', minDate).lte('start_date', maxDate).order('created_at', { ascending: true });

        const reqMap = (approvedRequests || []).reduce((acc: any, req: any) => { acc[req.start_date] = req; return acc; }, {});

        return records.map((record: any) => {
            const reqInfo = reqMap[record.date];
            return {
                id: record.id, date: record.date, employeeCode: employee.code, name: employee.name,
                checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }) : "",
                checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }) : "",
                adjustedCheckIn: reqInfo?.actual_in_time ? reqInfo.actual_in_time.substring(0, 5) : undefined,
                adjustedCheckOut: reqInfo?.actual_out_time ? reqInfo.actual_out_time.substring(0, 5) : undefined,
                status: record.status,
                location: record.check_in_lat ? `Tọa độ: ${record.check_in_lat.toFixed(3)}, ${record.check_in_lng.toFixed(3)}` : ""
            };
        });
    } catch (e) { return []; }
}

export async function submitAttendanceRequest(payload: any) {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Vui lòng đăng nhập." };

        const { data: employee } = await supabase.from('employees').select('id, name, manager_id').eq('auth_id', user.id).single();
        if (!employee) return { success: false, error: "Hồ sơ không hợp lệ." };

        if (payload.request_type === 'explanation' && payload.sub_type !== 'field_work') {
            const reqDate = new Date(payload.start_date);
            const firstDay = new Date(reqDate.getFullYear(), reqDate.getMonth(), 1).toLocaleDateString('en-CA');
            const lastDay = new Date(reqDate.getFullYear(), reqDate.getMonth() + 1, 0).toLocaleDateString('en-CA');

            const { count, error: countError } = await supabase.from('attendance_requests').select('*', { count: 'exact', head: true }).eq('employee_id', employee.id).eq('request_type', 'explanation').neq('sub_type', 'field_work').gte('start_date', firstDay).lte('start_date', lastDay);
            if (countError) return { success: false, error: `Lỗi đếm số lượng đơn: ${countError.message}` };
            if (count !== null && count >= 3) return { success: false, error: "Tối đa 3 lần giải trình/tháng." };
        }

        const { error } = await supabase.from('attendance_requests').insert({ ...payload, employee_id: employee.id });
        if (error) return { success: false, error: `Lỗi DB: ${error.message}` };

        if (employee.manager_id) {
            const { data: manager } = await supabase.from('employees').select('auth_id').eq('id', employee.manager_id).single();
            if (manager && manager.auth_id) {
                const reqTypeName = payload.request_type === 'leave' ? 'Nghỉ phép' : 'Giải trình';
                const notifTitle = `Đơn ${reqTypeName} mới`;
                const notifMessage = `Nhân viên ${employee.name} gửi đơn ${reqTypeName} cho ngày ${formatDate(payload.start_date)}.`;
                try {
                    await supabase.from('notifications').insert({ user_id: manager.auth_id, title: notifTitle, message: notifMessage, link: '/hrm/approvals' });
                    try { await sendPushToUser(manager.auth_id, notifTitle, notifMessage, '/hrm/approvals'); } catch (e) { }
                } catch (e) { }
            }
        }
        return { success: true, message: "Đã gửi đơn thành công!" };
    } catch (e: any) { return { success: false, error: `Lỗi hệ thống: ${e.message}` }; }
}

export async function getPendingRequests() {
    const supabase = await createSupabaseServerClient();
    try {
        const userProfile = await getUserProfile();
        if (!userProfile || !userProfile.isAuthenticated) return [];

        const currentEmployeeId = userProfile.entityId;
        const userRole = (userProfile.role || '').toLowerCase();
        const isHR = userRole === 'admin' || userRole === 'hr' || userRole === 'giám đốc';

        let targetEmpIds: string[] = [];

        if (!isHR) {
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
                            allowedDeptIds.add(dept.id); addedNew = true;
                        }
                    }
                }
            }

            const { data: deptEmps } = await supabase.from('employees').select('id').in('department_id', Array.from(allowedDeptIds));
            const { data: directReports } = await supabase.from('employees').select('id').eq('manager_id', currentEmployeeId);

            const combinedIds = new Set([
                currentEmployeeId,
                ...(deptEmps ? deptEmps.map(e => e.id) : []),
                ...(directReports ? directReports.map(e => e.id) : [])
            ]);
            targetEmpIds = Array.from(combinedIds).filter(Boolean) as string[];
        }

        let query = supabase.from('attendance_requests').select('*').eq('status', 'pending');
        if (!isHR) query = query.in('employee_id', targetEmpIds);

        const { data: requests, error } = await query.order('created_at', { ascending: false });
        if (error || !requests) return [];

        const empIds = [...new Set(requests.map(r => r.employee_id))];
        const { data: employees } = await supabase.from('employees').select('id, code, name').in('id', empIds);
        const empMap = (employees || []).reduce((acc: any, emp: any) => { acc[emp.id] = emp; return acc; }, {});

        return await Promise.all(requests.map(async (req) => {
            let machine_in_time = null, machine_out_time = null;
            if (req.request_type === 'explanation' && req.sub_type !== 'field_work') {
                const { data: record } = await supabase.from('attendance_records').select('check_in_time, check_out_time').eq('employee_id', req.employee_id).eq('date', req.start_date).maybeSingle();
                machine_in_time = record?.check_in_time || null;
                machine_out_time = record?.check_out_time || null;
            }
            return {
                ...req, start_date_formatted: formatDate(req.start_date),
                employee: empMap[req.employee_id] || { name: "N/A", code: "N/A" },
                machine_in_time, machine_out_time
            };
        }));
    } catch (e) { return []; }
}

export async function processAttendanceRequest(requestId: string, newStatus: 'approved' | 'rejected', adminNotes?: string) {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Lỗi phiên." };

        const { data: approverEmp } = await supabase.from('employees').select('id').eq('auth_id', user.id).single();
        const { data: request } = await supabase.from('attendance_requests').select('*').eq('id', requestId).single();
        if (!request) throw new Error("Không tìm thấy đơn.");

        await supabase.from('attendance_requests').update({
            status: newStatus, approver_id: approverEmp?.id || null,
            approver_note: adminNotes || null, updated_at: new Date().toISOString()
        }).eq('id', requestId);

        if (newStatus === 'approved') {
            if (request.request_type === 'explanation') {
                const { data: record } = await supabase.from('attendance_records').select('*').eq('employee_id', request.employee_id).eq('date', request.start_date).single();
                const formatTimeStr = (t: string) => t.length > 5 ? t.substring(0, 5) : t;

                let finalInDate = record?.check_in_time ? new Date(record.check_in_time) : null;
                let finalOutDate = record?.check_out_time ? new Date(record.check_out_time) : null;

                if (request.actual_in_time) finalInDate = new Date(`${request.start_date}T${formatTimeStr(request.actual_in_time)}:00+07:00`);
                if (request.actual_out_time) finalOutDate = new Date(`${request.start_date}T${formatTimeStr(request.actual_out_time)}:00+07:00`);

                let wHoursToSave = 0, calcStatus = 'Đủ công';
                if (finalInDate && finalOutDate) {
                    let wHours = (finalOutDate.getTime() - finalInDate.getTime()) / (1000 * 60 * 60);
                    if (wHours > 5) wHours -= 1.5;
                    wHoursToSave = parseFloat(Math.max(0, wHours).toFixed(2));
                    if (wHoursToSave >= 8.5) calcStatus = 'Tăng ca (OT)';
                    else if (wHoursToSave >= 7.5) calcStatus = 'Đủ công';
                    else if (wHoursToSave >= 3.5) calcStatus = 'Nửa công';
                    else calcStatus = 'Thiếu giờ/Về sớm';
                } else calcStatus = 'Thiếu giờ';

                const finalStatus = request.sub_type === 'field_work' ? 'Công tác (CT)' : `${calcStatus} (Có GT)`;

                if (record) {
                    await supabase.from('attendance_records').update({ status: finalStatus, working_hours: request.sub_type === 'field_work' ? 8 : wHoursToSave }).eq('id', record.id);
                } else {
                    await supabase.from('attendance_records').insert({
                        employee_id: request.employee_id, date: request.start_date, check_in_time: finalInDate?.toISOString() || null,
                        check_out_time: finalOutDate?.toISOString() || null, status: finalStatus, working_hours: request.sub_type === 'field_work' ? 8 : wHoursToSave
                    });
                }
            } else if (request.request_type === 'leave') {
                let leaveStatus = request.sub_type === 'unpaid' ? 'Nghỉ không lương (UL)' : 'Nghỉ (P)';
                let workingHoursToLog = request.sub_type === 'unpaid' ? 0 : 8;
                let currDate = new Date(request.start_date);
                const endDate = new Date(request.end_date || request.start_date);

                while (currDate <= endDate) {
                    const dateStr = currDate.toISOString().split('T')[0];
                    const { data: extRecord } = await supabase.from('attendance_records').select('id').eq('employee_id', request.employee_id).eq('date', dateStr).maybeSingle();
                    if (extRecord) {
                        await supabase.from('attendance_records').update({ status: leaveStatus, working_hours: workingHoursToLog }).eq('id', extRecord.id);
                    } else {
                        await supabase.from('attendance_records').insert({ employee_id: request.employee_id, date: dateStr, status: leaveStatus, working_hours: workingHoursToLog });
                    }
                    currDate.setDate(currDate.getDate() + 1);
                }
            }
        }

        const { data: targetEmp } = await supabase.from('employees').select('auth_id').eq('id', request.employee_id).single();
        if (targetEmp && targetEmp.auth_id) {
            const notifTitle = `Đơn ${request.request_type === 'leave' ? 'nghỉ phép' : 'giải trình'} ${newStatus === 'approved' ? 'ĐÃ DUYỆT' : 'BỊ TỪ CHỐI'}`;
            await supabase.from('notifications').insert({ user_id: targetEmp.auth_id, title: notifTitle, message: "Kiểm tra chi tiết đơn", link: '/my-attendance?tab=requests' });
            try { await sendPushToUser(targetEmp.auth_id, notifTitle, "Kiểm tra chi tiết", '/my-attendance'); } catch (e) { }
        }
        return { success: true, message: "Đã xử lý." };
    } catch (e: any) { return { success: false, error: "Lỗi hệ thống." }; }
}

export async function getAllAttendanceRecords(month: number, year: number, searchQuery: string = "") {
    const supabase = await createSupabaseServerClient();
    try {
        const userProfile = await getUserProfile();
        if (!userProfile || !userProfile.isAuthenticated) return [];

        const currentEmployeeId = userProfile.entityId;
        const userRole = (userProfile.role || '').toLowerCase();
        const isHR = userRole === 'admin' || userRole === 'hr' || userRole === 'giám đốc';

        let targetEmpIds: string[] = [];

        if (!isHR) {
            const { data: managedDepts } = await supabase.from('department_managers').select('department_id').eq('manager_id', currentEmployeeId);
            const directManagedDeptIds = managedDepts ? managedDepts.map(d => d.department_id) : [];
            let allowedDeptIds = new Set<string>(directManagedDeptIds);

            const { data: deptEmps } = await supabase.from('employees').select('id').in('department_id', Array.from(allowedDeptIds));
            const { data: directReports } = await supabase.from('employees').select('id').eq('manager_id', currentEmployeeId);

            const combinedIds = new Set([currentEmployeeId, ...(deptEmps?.map(e => e.id) || []), ...(directReports?.map(e => e.id) || [])]);
            targetEmpIds = Array.from(combinedIds).filter(Boolean) as string[];
        }

        const startDate = new Date(year, month - 1, 1).toLocaleDateString('en-CA');
        const endDate = new Date(year, month, 0).toLocaleDateString('en-CA');

        let query = supabase.from('attendance_records').select('*').gte('date', startDate).lte('date', endDate);
        if (!isHR) query = query.in('employee_id', targetEmpIds);

        const { data: records } = await query.order('date', { ascending: false });
        if (!records) return [];

        const empIds = [...new Set(records.map(r => r.employee_id))];
        const { data: employees } = await supabase.from('employees').select('id, code, name').in('id', empIds);
        const empMap = (employees || []).reduce((acc: any, emp: any) => { acc[emp.id] = emp; return acc; }, {});

        const { data: approvedRequests } = await supabase.from('attendance_requests').select('employee_id, start_date, actual_in_time, actual_out_time').eq('status', 'approved').eq('request_type', 'explanation').gte('start_date', startDate).lte('start_date', endDate);
        const reqMap = (approvedRequests || []).reduce((acc: any, req: any) => { acc[`${req.employee_id}_${req.start_date}`] = req; return acc; }, {});

        let formattedData = records.map((record: any) => {
            const empInfo = empMap[record.employee_id] || { name: "N/A", code: "N/A" };
            const reqInfo = reqMap[`${record.employee_id}_${record.date}`];
            return {
                id: record.id, date: record.date, employeeCode: empInfo.code, name: empInfo.name,
                checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
                checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "",
                adjustedCheckIn: reqInfo?.actual_in_time ? reqInfo.actual_in_time.substring(0, 5) : undefined,
                adjustedCheckOut: reqInfo?.actual_out_time ? reqInfo.actual_out_time.substring(0, 5) : undefined,
                status: record.status,
                location: record.check_in_lat ? `${record.check_in_lat.toFixed(3)}, ${record.check_in_lng.toFixed(3)}` : ""
            };
        });

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            formattedData = formattedData.filter((r: any) => r.name.toLowerCase().includes(lowerQuery) || r.employeeCode.toLowerCase().includes(lowerQuery));
        }
        return formattedData;
    } catch (e) { return []; }
}

export async function getMyRequests() {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data: emp } = await supabase.from('employees').select('id').eq('auth_id', user.id).single();
        if (!emp) return [];

        const { data } = await supabase.from('attendance_requests').select('*').eq('employee_id', emp.id).order('created_at', { ascending: false });
        return data || [];
    } catch (e) { return []; }
}

export async function getProcessedRequests() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from('attendance_requests')
            .select(`*, employee:employees!fk_requests_employee(name, code), approver:employees!fk_requests_approver(name)`)
            .in('status', ['approved', 'rejected'])
            .order('updated_at', { ascending: false });
        return error ? [] : (data || []);
    } catch (error: any) { return []; }
}

export async function updateAttendanceRequest(id: string, newStatus: 'approved' | 'rejected' | 'pending', newNote: string) {
    try {
        if (newStatus === 'approved') return await processAttendanceRequest(id, 'approved', newNote);
        const supabase = await createSupabaseServerClient();

        const { data: request } = await supabase.from('attendance_requests').select('*').eq('id', id).single();
        if (!request) return { success: false, error: "Không tìm thấy thông tin đơn." };

        if (request.status === 'approved') {
            await rollbackAttendanceRecords(supabase, request.employee_id, request.start_date, request.end_date);
        }

        await supabase.from('attendance_requests').update({ status: newStatus, approver_note: newNote, updated_at: new Date().toISOString() }).eq('id', id);

        const reqTypeName = request.request_type === 'leave' ? 'nghỉ phép' : 'giải trình';
        let statusText = newStatus === 'rejected' ? 'ĐÃ BỊ TỪ CHỐI (HỦY)' : 'ĐƯỢC HOÀN TÁC (CHỜ XỬ LÝ LẠI)';
        const notifTitle = `HR thay đổi trạng thái đơn ${reqTypeName}`;
        const notifMessage = `Đơn của bạn (áp dụng ${formatDate(request.start_date)}) ${statusText}.`;

        try {
            await supabase.from('notifications').insert({ user_id: request.employee_id, title: notifTitle, message: notifMessage, link: '/my-attendance?tab=requests' });
            await sendPushToUser(request.employee_id, notifTitle, notifMessage, '/my-attendance?tab=requests');
        } catch (e) { }

        return { success: true, message: "Đã cập nhật trạng thái đơn." };
    } catch (error: any) { return { success: false, error: "Lỗi hệ thống khi xử lý yêu cầu." }; }
}

export async function deleteAttendanceRequest(id: string) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: request } = await supabase.from('attendance_requests').select('*').eq('id', id).single();
        if (!request) return { success: false, error: "Không tìm thấy đơn từ để xóa." };

        if (request.status === 'approved') {
            await rollbackAttendanceRecords(supabase, request.employee_id, request.start_date, request.end_date);
        }

        await supabase.from('attendance_requests').delete().eq('id', id);

        const reqTypeName = request.request_type === 'leave' ? 'nghỉ phép' : 'giải trình';
        try {
            await supabase.from('notifications').insert({ user_id: request.employee_id, title: `⚠️ Đơn đã bị xóa`, message: `Đơn ${reqTypeName} ngày ${formatDate(request.start_date)} đã bị HR xóa.`, link: '/my-attendance' });
        } catch (e) { }

        return { success: true, message: "Đã xóa đơn từ thành công." };
    } catch (error: any) { return { success: false, error: "Lỗi hệ thống khi xóa yêu cầu." }; }
}

export async function updateMyRequest(id: string, payload: any) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Hết phiên đăng nhập." };

        const { data: employee } = await supabase.from('employees').select('id, name, manager_id').eq('auth_id', user.id).single();
        if (!employee) return { success: false, error: "Hồ sơ không hợp lệ." };

        const { data: request } = await supabase.from('attendance_requests').select('status, employee_id, request_type').eq('id', id).single();
        if (!request || request.employee_id !== employee.id) return { success: false, error: "Bạn không có quyền thao tác trên đơn này." };
        if (request.status !== 'pending') return { success: false, error: "Chỉ có thể sửa đơn đang Chờ duyệt." };

        await supabase.from('attendance_requests').update({
            sub_type: payload.sub_type, start_date: payload.start_date, end_date: payload.end_date || null,
            actual_in_time: payload.actual_in_time || null, actual_out_time: payload.actual_out_time || null,
            reason: payload.reason, updated_at: new Date().toISOString()
        }).eq('id', id);

        if (employee.manager_id) {
            const { data: manager } = await supabase.from('employees').select('auth_id').eq('id', employee.manager_id).single();
            if (manager && manager.auth_id) {
                try {
                    await supabase.from('notifications').insert({ user_id: manager.auth_id, title: `📝 Đơn vừa được cập nhật`, message: `Nhân viên ${employee.name} vừa sửa đơn.`, link: '/hrm/approvals' });
                } catch (e) { }
            }
        }
        return { success: true, message: "Đã cập nhật thông tin." };
    } catch (e: any) { return { success: false, error: "Hệ thống đang bận." }; }
}

export async function deleteMyRequest(id: string) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Hết phiên đăng nhập." };

        const { data: employee } = await supabase.from('employees').select('id, name, manager_id').eq('auth_id', user.id).single();
        if (!employee) return { success: false, error: "Hồ sơ không hợp lệ." };

        const { data: request } = await supabase.from('attendance_requests').select('status, employee_id, request_type, start_date').eq('id', id).single();
        if (!request || request.employee_id !== employee.id) return { success: false, error: "Bạn không có quyền thao tác trên đơn này." };
        if (request.status !== 'pending') return { success: false, error: "Chỉ có thể xóa đơn Chờ duyệt." };

        await supabase.from('attendance_requests').delete().eq('id', id);

        if (employee.manager_id) {
            const { data: manager } = await supabase.from('employees').select('auth_id').eq('id', employee.manager_id).single();
            if (manager && manager.auth_id) {
                try { await supabase.from('notifications').insert({ user_id: manager.auth_id, title: `🗑️ Đơn đã hủy`, message: `Nhân viên ${employee.name} đã hủy đơn.`, link: '/hrm/approvals' }); } catch (e) { }
            }
        }
        return { success: true, message: "Đã hủy đơn." };
    } catch (e: any) { return { success: false, error: "Hệ thống đang bận." }; }
}

async function rollbackAttendanceRecords(supabase: any, employeeId: string, startDate: string, endDate: string | null) {
    let currDate = new Date(startDate);
    const lastDate = new Date(endDate || startDate);

    while (currDate <= lastDate) {
        const dateStr = currDate.toISOString().split('T')[0];
        const { data: record } = await supabase.from('attendance_records').select('*').eq('employee_id', employeeId).eq('date', dateStr).maybeSingle();

        if (record) {
            const checkIn = record.check_in_time ? new Date(record.check_in_time) : null;
            const checkOut = record.check_out_time ? new Date(record.check_out_time) : null;

            if (!checkIn && !checkOut) {
                await supabase.from('attendance_records').delete().eq('id', record.id);
            } else {
                let wHoursToSave = 0, calcStatus = 'Thiếu giờ';
                if (checkIn && checkOut) {
                    let wHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
                    if (wHours > 5) wHours -= 1.5;
                    wHoursToSave = parseFloat(Math.max(0, wHours).toFixed(2));
                    if (wHoursToSave >= 8.5) calcStatus = 'Tăng ca (OT)';
                    else if (wHoursToSave >= 7.5) calcStatus = 'Đủ công';
                    else if (wHoursToSave >= 3.5) calcStatus = 'Nửa công';
                    else calcStatus = 'Thiếu giờ/Về sớm';
                } else if (checkIn) calcStatus = 'Đang làm việc';

                await supabase.from('attendance_records').update({ status: calcStatus, working_hours: wHoursToSave }).eq('id', record.id);
            }
        }
        currDate.setDate(currDate.getDate() + 1);
    }
}

export async function createManualAttendance(formData: FormData) {
    try {
        const supabase = await createSupabaseServerClient();
        const employee_id = formData.get("employee_id") as string;
        const date = formData.get("date") as string;
        const record_type = formData.get("record_type") as string;
        const notes = formData.get("note") as string;

        if (!employee_id || !date) return { success: false, error: "Vui lòng chọn nhân viên và ngày hợp lệ." };

        let upsertData: any = { employee_id, date, notes, updated_at: new Date().toISOString() };

        if (record_type === "WORKING") {
            const check_in_time = formData.get("check_in_time") as string;
            const check_out_time = formData.get("check_out_time") as string;
            if (!check_in_time || !check_out_time) return { success: false, error: "Vui lòng nhập đủ giờ vào và giờ ra." };

            const checkInISO = new Date(`${date}T${check_in_time}:00`).toISOString();
            const checkOutISO = new Date(`${date}T${check_out_time}:00`).toISOString();
            upsertData.check_in_time = checkInISO; upsertData.check_out_time = checkOutISO; upsertData.status = "Đủ công";

            let hours = (new Date(checkOutISO).getTime() - new Date(checkInISO).getTime()) / (1000 * 60 * 60);
            if (hours > 4) hours -= 1;
            upsertData.working_hours = parseFloat(Math.max(0, hours).toFixed(2));
        } else {
            const leave_status = formData.get("leave_status") as string;
            if (!leave_status) return { success: false, error: "Vui lòng chọn trạng thái nghỉ." };
            const statusMap: Record<string, string> = { "NGHI_CA": "Nghỉ ca", "NGHI_PHEP": "Nghỉ phép", "KHONG_PHEP": "Không phép", "OM_DAU": "Ốm đau" };
            upsertData.check_in_time = null; upsertData.check_out_time = null; upsertData.working_hours = 0;
            upsertData.status = statusMap[leave_status] || leave_status;
        }

        const { error } = await supabase.from('attendance_records').upsert(upsertData, { onConflict: 'employee_id, date' });
        if (error) return { success: false, error: "Lỗi lưu dữ liệu: " + error.message };

        revalidatePath('/hrm/attendance');
        revalidatePath('/hrm/payroll');
        return { success: true, message: "Ghi nhận công thành công!" };
    } catch (error) { return { success: false, error: "Hệ thống đang bận, vui lòng thử lại." }; }
}