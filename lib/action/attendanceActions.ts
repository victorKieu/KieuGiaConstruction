"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/utils";
import { getUserProfile } from "@/lib/supabase/getUserProfile";
import { sendPushToUser } from "@/lib/action/pushNotification";
import { revalidatePath } from "next/cache";

// ============================================================================
// 1. HÀM TÍNH KHOẢNG CÁCH (HAVERSINE)
// ============================================================================
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
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
// 2. LÕI CHẤM CÔNG CHÍNH (Đã fix lỗi UUID cho Quyền hệ thống & Quyền dự án)
// ============================================================================
export async function processFaceAttendance(
    scannedEmployeeId: string,
    location: { lat: number; lng: number },
    isProxyCheckIn: boolean = false
) {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Phiên đăng nhập đã hết hạn.");

        const { data: actorEmployee } = await supabase.from('employees').select('id').eq('auth_id', user.id).single();
        const { data: profile } = await supabase.from('user_profiles').select('role_id').eq('auth_id', user.id).single();
        if (!actorEmployee) throw new Error("Không tìm thấy hồ sơ nhân sự.");

        const actorEmpId = actorEmployee.id;

        // DỊCH UUID QUYỀN HỆ THỐNG SANG TEXT
        let actorRole = '';
        let isAdmin = false;
        if (profile && profile.role_id) {
            const { data: roleDict } = await supabase.from('sys_dictionaries').select('code').eq('id', profile.role_id).maybeSingle();
            actorRole = (roleDict?.code || '').toLowerCase();
            isAdmin = actorRole === 'admin';
        }

        if (!isProxyCheckIn && scannedEmployeeId !== actorEmpId) {
            throw new Error("Dữ liệu khuôn mặt không khớp với tài khoản đăng nhập.");
        }

        const { data: companySetting } = await supabase.from('company_settings').select('geocode, attendance_radius').single();
        const radiusLimit = companySetting?.attendance_radius || 50;
        let candidates: { id: string | null; name: string; dist: number; type: 'office' | 'project' }[] = [];

        if (companySetting?.geocode) {
            const [lat, lng] = companySetting.geocode.split(',').map(Number);
            const d = calculateDistance(location.lat, location.lng, lat, lng);
            if (d <= radiusLimit) candidates.push({ id: null, name: "Văn phòng", dist: d, type: 'office' });
        }

        const { data: projects } = await supabase.from('projects').select('id, name, geocode').not('geocode', 'is', null);
        projects?.forEach(p => {
            const [pLat, pLng] = p.geocode!.split(',').map(Number);
            const d = calculateDistance(location.lat, location.lng, pLat, pLng);
            if (d <= radiusLimit) candidates.push({ id: p.id, name: p.name, dist: d, type: 'project' });
        });

        if (candidates.length === 0) throw new Error("Bạn đang đứng ngoài vùng chấm công cho phép.");
        candidates.sort((a, b) => a.dist - b.dist);

        let finalLoc = null;
        let lastError = "";

        for (const loc of candidates) {
            try {
                if (isProxyCheckIn) {
                    if (loc.type === 'office') {
                        const canProxyAtOffice = ['hr_manager', 'hr_staff'].includes(actorRole) || isAdmin;
                        if (!canProxyAtOffice) throw new Error("Chấm công hộ tại Văn phòng chỉ dành cho Admin/HR.");
                    } else {
                        // DỊCH UUID QUYỀN DỰ ÁN
                        const { data: isManager } = await supabase.from('project_members')
                            .select('role_id')
                            .eq('project_id', loc.id!)
                            .eq('employee_id', actorEmpId)
                            .maybeSingle();

                        let isManagerAtProject = false;
                        if (isManager && isManager.role_id) {
                            const { data: dict } = await supabase.from('sys_dictionaries').select('code').eq('id', isManager.role_id).maybeSingle();
                            const rCode = (dict?.code || '').toLowerCase();
                            if (['project_manager', 'manager', 'team_leader', 'director', 'admin'].includes(rCode)) {
                                isManagerAtProject = true;
                            }
                        }

                        if (!isAdmin && !isManagerAtProject) {
                            throw new Error(`Bạn không phải Tổ trưởng/Quản lý của dự án ${loc.name}.`);
                        }

                        const { data: isMember } = await supabase.from('project_members')
                            .select('employee_id')
                            .eq('project_id', loc.id!)
                            .eq('employee_id', scannedEmployeeId)
                            .maybeSingle();

                        if (!isMember) throw new Error(`Công nhân này không thuộc dự án ${loc.name}.`);
                    }
                } else {
                    if (loc.type === 'project' && !isAdmin) {
                        const { data: myLink } = await supabase.from('project_members')
                            .select('employee_id')
                            .eq('project_id', loc.id!)
                            .eq('employee_id', scannedEmployeeId)
                            .maybeSingle();

                        if (!myLink) throw new Error(`Bạn không thuộc dự án ${loc.name}.`);
                    }
                }
                finalLoc = loc;
                break;
            } catch (e: any) {
                lastError = e.message;
            }
        }

        if (!finalLoc) throw new Error(lastError || "Bạn không có quyền chấm công tại khu vực này.");

        // ==========================================================
        // GHI NHẬN DB: KIẾN TRÚC MASTER-DETAIL (CHỐNG SPAM LOCATION)
        // ==========================================================

        const now = new Date();
        const dbTimestamp = now.toISOString();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        const vnTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
        const [vnHour, vnMinute] = vnTimeStr.split(':').map(Number);
        const isLate = vnHour > 8 || (vnHour === 8 && vnMinute > 15);

        // 1. TÌM BẢN GHI MẸ (Lương ngày)
        const { data: masterRecord } = await supabase.from('attendance_records')
            .select('*')
            .eq('employee_id', scannedEmployeeId)
            .eq('date', todayStr)
            .maybeSingle();

        let currentMasterId = masterRecord?.id;

        // NẾU CHƯA CÓ CA LÀM VIỆC TRONG NGÀY -> VÀO CA ĐẦU TIÊN
        if (!masterRecord) {
            const { data: newMaster, error: masterErr } = await supabase.from('attendance_records').insert({
                employee_id: scannedEmployeeId,
                date: todayStr,
                check_in_time: dbTimestamp,
                check_in_lat: location.lat,
                check_in_lng: location.lng,
                status: isLate ? 'Đi muộn' : 'Đang làm việc'
            }).select('id').single();

            if (masterErr || !newMaster) throw new Error("Không thể tạo ca làm việc mới.");

            // Tạo Checkpoint đầu tiên
            await supabase.from('employee_checkpoints').insert({
                attendance_id: newMaster.id,
                employee_id: scannedEmployeeId,
                project_id: finalLoc.id,
                check_in_time: dbTimestamp,
                check_in_lat: location.lat,
                check_in_lng: location.lng
            });

            revalidatePath('/hrm/attendance');
            return { success: true, type: 'CHECK_IN', message: `Vào ca đầu tiên tại ${finalLoc.name}!` };
        }

        // 2. NẾU ĐÃ CÓ CA -> KIỂM TRA LỊCH TRÌNH DI CHUYỂN GẦN NHẤT (CHECKPOINTS)
        const { data: latestCheckpoint } = await supabase.from('employee_checkpoints')
            .select('*')
            .eq('attendance_id', currentMasterId)
            .order('check_in_time', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (latestCheckpoint) {
            // Trường hợp A: Checkpoint này CHƯA chốt (Đang ở một địa điểm)
            if (!latestCheckpoint.check_out_time) {
                // 1. Quét đúng địa điểm đang đứng -> HÀNH ĐỘNG CHỐT CA (Ra về / Hoàn thành)
                if (latestCheckpoint.project_id === finalLoc.id) {

                    // Cập nhật chốt Checkpoint
                    await supabase.from('employee_checkpoints').update({
                        check_out_time: dbTimestamp,
                        check_out_lat: location.lat,
                        check_out_lng: location.lng
                    }).eq('id', latestCheckpoint.id);

                    // Cập nhật Master Record
                    const checkInDate = new Date(masterRecord.check_in_time!);
                    let hours = (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
                    if (hours > 5) hours -= 1.5; // Trừ giờ nghỉ trưa

                    await supabase.from('attendance_records').update({
                        check_out_time: dbTimestamp,
                        check_out_lat: location.lat,
                        check_out_lng: location.lng,
                        working_hours: parseFloat(Math.max(0, hours).toFixed(2)),
                        status: hours >= 8 ? 'Hoàn thành' : 'Về sớm',
                        updated_at: dbTimestamp
                    }).eq('id', currentMasterId);

                    revalidatePath('/hrm/attendance');
                    return { success: true, type: 'CHECK_OUT', message: `Đã hoàn thành công việc tại ${finalLoc.name}!` };
                }

                // 2. Quét ở ĐỊA ĐIỂM KHÁC -> HÀNH ĐỘNG DI CHUYỂN
                else {
                    // Tự động chốt Checkpoint cũ
                    await supabase.from('employee_checkpoints').update({
                        check_out_time: dbTimestamp,
                        check_out_lat: location.lat, // Có thể lấy tọa độ hiện tại làm điểm chốt luôn
                        check_out_lng: location.lng
                    }).eq('id', latestCheckpoint.id);

                    // Mở Checkpoint mới ở địa điểm mới
                    await supabase.from('employee_checkpoints').insert({
                        attendance_id: currentMasterId,
                        employee_id: scannedEmployeeId,
                        project_id: finalLoc.id,
                        check_in_time: dbTimestamp,
                        check_in_lat: location.lat,
                        check_in_lng: location.lng
                    });

                    // Cập nhật Master thành 'Đang làm việc' và xóa giờ check_out tạm thời
                    await supabase.from('attendance_records').update({
                        check_out_time: null,
                        status: 'Đang làm việc',
                        updated_at: dbTimestamp
                    }).eq('id', currentMasterId);

                    revalidatePath('/hrm/attendance');
                    return { success: true, type: 'CHECK_IN', message: `Chuyển vị trí: Bắt đầu làm tại ${finalLoc.name}!` };
                }
            }

            // Trường hợp B: Checkpoint gần nhất ĐÃ CHỐT (Đang rảnh rỗi)
            else {
                // RÀO CHẮN: Cố tình quét lại địa điểm vừa mới chốt xong -> CHẶN
                if (latestCheckpoint.project_id === finalLoc.id) {
                    return { success: false, error: `Bạn đã chốt ca tại ${finalLoc.name} trước đó. Không thể Check-in lại cùng 1 điểm!` };
                }

                // Đến địa điểm mới sau khi đã chốt ở nơi cũ
                await supabase.from('employee_checkpoints').insert({
                    attendance_id: currentMasterId,
                    employee_id: scannedEmployeeId,
                    project_id: finalLoc.id,
                    check_in_time: dbTimestamp,
                    check_in_lat: location.lat,
                    check_in_lng: location.lng
                });

                // Cập nhật lại Master Record
                await supabase.from('attendance_records').update({
                    check_out_time: null,
                    status: 'Đang làm việc',
                    updated_at: dbTimestamp
                }).eq('id', currentMasterId);

                revalidatePath('/hrm/attendance');
                return { success: true, type: 'CHECK_IN', message: `Bắt đầu công việc tiếp theo tại ${finalLoc.name}!` };
            }
        }
        else {
            // TƯƠNG THÍCH NGƯỢC (DỮ LIỆU CŨ): Đã có bản ghi Mẹ nhưng chưa có Checkpoint con
            await supabase.from('employee_checkpoints').insert({
                attendance_id: currentMasterId,
                employee_id: scannedEmployeeId,
                project_id: finalLoc.id,
                check_in_time: dbTimestamp,
                check_in_lat: location.lat,
                check_in_lng: location.lng
            });

            revalidatePath('/hrm/attendance');
            return { success: true, type: 'CHECK_IN', message: `Đồng bộ Lịch trình mới tại ${finalLoc.name}!` };
        }

        // RÀO CHẮN AN TOÀN: Bắt mọi trường hợp lọt khe (tránh lỗi undefined)
        return { success: false, error: "Lỗi logic xử lý chấm công không xác định." };

    } catch (err: any) {
        return { success: false, error: err.message || "Lỗi hệ thống chấm công." };
    }
}

// ============================================================================
// 3. TẢI DỮ LIỆU KHUÔN MẶT ĐỂ ĐỐI CHIẾU (Fix UUID)
// ============================================================================
export async function getNearbyProjectAndFaceData(location: { lat: number; lng: number }, isProxyCheckIn: boolean = false) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Hết phiên đăng nhập." };

    const { data: employee } = await supabase.from('employees').select('id, name, code, face_descriptor').eq('auth_id', user.id).single();
    const { data: profile } = await supabase.from('user_profiles').select('role_id').eq('auth_id', user.id).single();
    if (!employee) return { success: false, error: "Hồ sơ không hợp lệ." };

    const currentEmpId = employee.id;

    // DỊCH UUID QUYỀN HỆ THỐNG
    let userRole = '';
    let isAdmin = false;
    if (profile && profile.role_id) {
        const { data: roleDict } = await supabase.from('sys_dictionaries').select('code').eq('id', profile.role_id).maybeSingle();
        userRole = (roleDict?.code || '').toLowerCase();
        isAdmin = userRole === 'admin';
    }

    const { data: companySetting } = await supabase.from('company_settings').select('geocode, attendance_radius').single();
    const ALLOWED_RADIUS = companySetting?.attendance_radius || 50;
    let possibleLocations: any[] = [];

    if (companySetting?.geocode) {
        const [lat, lng] = companySetting.geocode.split(',').map(Number);
        const dist = calculateDistance(location.lat, location.lng, lat, lng);
        if (dist <= ALLOWED_RADIUS) possibleLocations.push({ type: 'office', id: null, name: "Văn phòng", dist });
    }

    const { data: activeProjects } = await supabase.from('projects').select('id, name, geocode').not('geocode', 'is', null);
    if (activeProjects) {
        for (const proj of activeProjects) {
            const [pLat, pLng] = proj.geocode.split(',').map(Number);
            const dist = calculateDistance(location.lat, location.lng, pLat, pLng);
            if (dist <= ALLOWED_RADIUS) possibleLocations.push({ type: 'project', id: proj.id, name: proj.name, dist });
        }
    }

    if (possibleLocations.length === 0) return { success: false, error: `Ngoài vùng chấm công! Bán kính cho phép: ${ALLOWED_RADIUS}m.` };
    possibleLocations.sort((a, b) => a.dist - b.dist);

    let finalLocation = null;
    let members: any[] = [];
    let lastAuthError = "";
    let canProxyAtThisLocation = false;

    // VÒNG LẶP SMART FALLBACK TÌM ĐỊA ĐIỂM CHUẨN
    for (const loc of possibleLocations) {
        try {
            if (isProxyCheckIn) {
                if (loc.type === 'office') {
                    const canProxyAtOffice = ['hr_manager', 'hr_staff'].includes(userRole) || isAdmin;
                    if (!canProxyAtOffice) throw new Error("Chấm công hộ tại VP chỉ dành cho HR/Admin.");
                    const { data: mems } = await supabase.from('employees').select('id, name, code, face_descriptor').not('face_descriptor', 'is', null);
                    members = mems ? mems.map(m => ({ employees: m })) : [];
                    canProxyAtThisLocation = true;
                } else {
                    // Dự án: Xét quyền bảng project_members (Dịch UUID)
                    const { data: supLink } = await supabase.from('project_members')
                        .select('role_id')
                        .eq('project_id', loc.id)
                        .eq('employee_id', currentEmpId)
                        .maybeSingle();

                    let isManagerAtProject = false;
                    if (supLink && supLink.role_id) {
                        const { data: dict } = await supabase.from('sys_dictionaries').select('code').eq('id', supLink.role_id).maybeSingle();
                        const rCode = (dict?.code || '').toLowerCase();
                        if (['project_manager', 'manager', 'team_leader', 'director', 'admin'].includes(rCode)) {
                            isManagerAtProject = true;
                        }
                    }

                    if (!isAdmin && !isManagerAtProject) {
                        throw new Error(`Bạn không phải Quản lý/Tổ trưởng của dự án: ${loc.name}.`);
                    }

                    const { data: projMems } = await supabase.from('project_members').select('employee_id').eq('project_id', loc.id);
                    if (projMems && projMems.length > 0) {
                        const empIds = projMems.map(pm => pm.employee_id);
                        const { data: emps } = await supabase.from('employees')
                            .select('id, name, code, face_descriptor')
                            .in('id', empIds)
                            .not('face_descriptor', 'is', null);
                        members = emps ? emps.map(e => ({ employees: e })) : [];
                    }
                    canProxyAtThisLocation = true;
                }
            } else {
                if (loc.type === 'project' && !isAdmin) {
                    const { data: myLink } = await supabase.from('project_members')
                        .select('employee_id')
                        .eq('project_id', loc.id)
                        .eq('employee_id', currentEmpId)
                        .maybeSingle();

                    if (!myLink) throw new Error(`Bạn không thuộc dự án: ${loc.name}.`);
                }

                // Mặc dù đang ở Tab Cá Nhân, vẫn ngầm check quyền Quản lý để báo cho UI bật Tab "Chấm Đội"
                if (loc.type === 'project') {
                    const { data: checkManager } = await supabase.from('project_members')
                        .select('role_id')
                        .eq('project_id', loc.id)
                        .eq('employee_id', currentEmpId)
                        .maybeSingle();

                    if (checkManager && checkManager.role_id) {
                        const { data: dict } = await supabase.from('sys_dictionaries').select('code').eq('id', checkManager.role_id).maybeSingle();
                        const rCode = (dict?.code || '').toLowerCase();
                        if (['project_manager', 'manager', 'team_leader', 'director', 'admin'].includes(rCode)) {
                            canProxyAtThisLocation = true;
                        }
                    } else if (isAdmin) {
                        canProxyAtThisLocation = true;
                    }
                } else if (loc.type === 'office' && (['hr_manager', 'hr_staff'].includes(userRole) || isAdmin)) {
                    canProxyAtThisLocation = true;
                }

                if (employee.face_descriptor) members = [{ employees: employee }];
            }

            finalLocation = loc;
            break; // THOÁT VÒNG LẶP NẾU XỬ LÝ THÀNH CÔNG KHÔNG GẶP LỖI THROW MỚI NÀO
        } catch (err: any) {
            lastAuthError = err.message;
        }
    } // KẾT THÚC VÒNG LẶP FOR

    if (!finalLocation) {
        const closestLoc = possibleLocations[0];
        return { success: false, project: { id: closestLoc.id, name: closestLoc.name, distance: Math.round(closestLoc.dist) }, canProxy: false, error: lastAuthError || "Bạn không có quyền chấm công tại đây." };
    }

    return {
        success: true,
        project: { id: finalLocation.id, name: finalLocation.name, distance: Math.round(finalLocation.dist) },
        canProxy: canProxyAtThisLocation, // Bắn cờ này về để UI bật/tắt Tab "Chấm Đội"
        members: members.map((item: any) => ({
            id: item.employees.id, name: item.employees.name, code: item.employees.code, descriptor: item.employees.face_descriptor
        }))
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

export async function getAttendanceCheckpoints(attendanceId: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from('employee_checkpoints')
        .select(`
            *,
            projects(name)
        `)
        .eq('attendance_id', attendanceId)
        .order('check_in_time', { ascending: true });

    if (error) return [];
    return data;
}