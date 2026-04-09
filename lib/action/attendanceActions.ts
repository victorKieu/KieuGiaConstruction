"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/utils";
import tzlookup from "tz-lookup";
import { getUserProfile } from "@/lib/supabase/getUserProfile";
import { sendPushToUser } from "@/lib/action/pushNotification";

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
        const authId = user.id;

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

                // Tính toán giờ làm việc ĐỒNG BỘ MỚI (Trừ 1.5h nghỉ trưa nếu làm > 5h)
                let workingHours = diffMs / (1000 * 60 * 60);
                if (workingHours > 5) {
                    workingHours -= 1.5;
                }
                workingHours = Math.max(0, workingHours);
                workingHours = parseFloat(workingHours.toFixed(2));

                // Phân loại trạng thái ĐỒNG BỘ MỚI
                let status = 'Đủ công';
                if (workingHours >= 8.5) status = 'Tăng ca (OT)';
                else if (workingHours >= 7.5) status = 'Đủ công';
                else if (workingHours >= 3.5) status = 'Nửa công';
                else status = 'Về sớm';

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

        const { data: records, error } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', authId)
            .order('date', { ascending: false })
            .limit(30);

        if (error || !records || records.length === 0) return [];

        const { data: employee } = await supabase
            .from('employees')
            .select('code, name')
            .eq('auth_id', authId)
            .maybeSingle();

        const empName = employee?.name || user.email?.split('@')[0] || "Người dùng";
        const empCode = employee?.code || "Chưa có mã";

        // ✅ FIX: KÉO ĐƠN GIẢI TRÌNH ĐÃ DUYỆT LÊN ĐỂ LẤY GIỜ ĐIỀU CHỈNH
        const minDate = records[records.length - 1].date;
        const maxDate = records[0].date;

        const { data: approvedRequests } = await supabase
            .from('attendance_requests')
            .select('start_date, actual_in_time, actual_out_time')
            .eq('employee_id', authId)
            .eq('status', 'approved')
            .eq('request_type', 'explanation')
            .gte('start_date', minDate)
            .lte('start_date', maxDate)
            .order('created_at', { ascending: true }); // Ưu tiên đơn duyệt sau cùng

        const reqMap = (approvedRequests || []).reduce((acc: any, req: any) => {
            acc[req.start_date] = req;
            return acc;
        }, {});

        return records.map((record: any) => {
            const reqInfo = reqMap[record.date];
            return {
                id: record.id,
                date: record.date,
                employeeCode: empCode,
                name: empName,
                checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }) : "",
                checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }) : "",
                adjustedCheckIn: reqInfo?.actual_in_time ? reqInfo.actual_in_time.substring(0, 5) : undefined,
                adjustedCheckOut: reqInfo?.actual_out_time ? reqInfo.actual_out_time.substring(0, 5) : undefined,
                status: record.status,
                location: record.check_in_lat ? `Tọa độ: ${record.check_in_lat.toFixed(3)}, ${record.check_in_lng.toFixed(3)}` : ""
            };
        });
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

        // Kiểm tra quota giải trình trong tháng
        if (payload.request_type === 'explanation' && payload.sub_type !== 'field_work') {
            const reqDate = new Date(payload.start_date);
            const firstDay = new Date(reqDate.getFullYear(), reqDate.getMonth(), 1).toLocaleDateString('en-CA');
            const lastDay = new Date(reqDate.getFullYear(), reqDate.getMonth() + 1, 0).toLocaleDateString('en-CA');

            const { count } = await supabase
                .from('attendance_requests')
                .select('*', { count: 'exact', head: true })
                .eq('employee_id', user.id)
                .eq('request_type', 'explanation')
                .neq('sub_type', 'field_work')
                .gte('start_date', firstDay)
                .lte('start_date', lastDay);

            if (count !== null && count >= 3) {
                return { success: false, error: "Bạn đã hết lượt giải trình (Tối đa 3 lần/tháng). Hệ thống từ chối nhận đơn." };
            }
        }

        const { error } = await supabase.from('attendance_requests').insert({
            employee_id: user.id,
            ...payload
        });
        if (error) throw error;

        // BẮN THÔNG BÁO CHO QUẢN LÝ (ĐÃ ĐƯỢC BỌC BẢO VỆ)
        const { data: employee } = await supabase.from('employees').select('name, manager_id').eq('auth_id', user.id).single();
        if (employee && employee.manager_id) {
            const { data: manager } = await supabase.from('employees').select('auth_id').eq('id', employee.manager_id).single();
            if (manager && manager.auth_id) {
                const reqTypeName = payload.request_type === 'leave' ? 'Nghỉ phép' : 'Giải trình';
                const notifTitle = `Có đơn ${reqTypeName} mới cần duyệt`;
                const notifMessage = `Nhân viên ${employee.name} vừa gửi đơn ${reqTypeName} cho ngày ${formatDate(payload.start_date)}. Vui lòng kiểm tra!`;
                const notifLink = '/hrm/approvals';

                try {
                    // Ghi DB cho thông báo Web
                    await supabase.from('notifications').insert({
                        user_id: manager.auth_id, title: notifTitle, message: notifMessage, link: notifLink
                    });

                    // GỌI PUSH MOBILE ĐỘC LẬP: Lỗi OneSignal không làm sập tiến trình gửi đơn
                    try {
                        await sendPushToUser(manager.auth_id, notifTitle, notifMessage, notifLink);
                    } catch (pushErr) {
                        console.error("[NOTIFY_PUSH_ERROR]", pushErr);
                    }
                } catch (dbErr) {
                    console.error("[NOTIFY_DB_ERROR]", dbErr);
                }
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
        const userProfile = await getUserProfile();
        if (!userProfile || !userProfile.isAuthenticated || userProfile.type !== 'EMPLOYEE') return [];

        const currentEmployeeId = userProfile.entityId;
        const userRole = (userProfile.role || '').toLowerCase();
        const isHR = userRole === 'admin' || userRole === 'hr' || userRole === 'giám đốc';

        let targetAuthIds: string[] = [];

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

        let query = supabase.from('attendance_requests').select('*').eq('status', 'pending');
        if (!isHR) query = query.in('employee_id', targetAuthIds);

        const { data: requests, error } = await query.order('created_at', { ascending: false });
        if (error || !requests) return [];

        const authIds = [...new Set(requests.map(r => r.employee_id))];
        const { data: employees } = await supabase.from('employees').select('auth_id, code, name').in('auth_id', authIds);
        const empMap = (employees || []).reduce((acc: any, emp: any) => {
            acc[emp.auth_id] = emp;
            return acc;
        }, {});

        const enrichedRequests = await Promise.all(requests.map(async (req) => {
            let machine_in_time = null;
            let machine_out_time = null;

            if (req.request_type === 'explanation' && req.sub_type !== 'field_work') {
                const { data: record } = await supabase
                    .from('attendance_records')
                    .select('check_in_time, check_out_time')
                    .eq('employee_id', req.employee_id)
                    .eq('date', req.start_date)
                    .maybeSingle();

                machine_in_time = record?.check_in_time || null;
                machine_out_time = record?.check_out_time || null;
            }

            return {
                ...req,
                start_date_formatted: formatDate(req.start_date),
                employee: empMap[req.employee_id] || { name: "N/A", code: "N/A" },
                machine_in_time,
                machine_out_time
            };
        }));

        return enrichedRequests;
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

        // ✅ FIX LỚN NHẤT Ở ĐÂY: Lưu lại approver_id và note để Audit Trail
        await supabase.from('attendance_requests').update({
            status: newStatus,
            approver_id: user.id,
            approver_note: adminNotes || null,
            updated_at: new Date().toISOString()
        }).eq('id', requestId);

        // 2. LOGIC VÁ BẢNG CÔNG 
        if (newStatus === 'approved') {
            if (request.request_type === 'explanation') {
                const { data: record } = await supabase.from('attendance_records').select('*').eq('employee_id', request.employee_id).eq('date', request.start_date).single();
                const formatTimeStr = (t: string) => t.length > 5 ? t.substring(0, 5) : t;

                const targetInTimeStr = request.actual_in_time;
                const targetOutTimeStr = request.actual_out_time;

                let finalInDate = record?.check_in_time ? new Date(record.check_in_time) : null;
                let finalOutDate = record?.check_out_time ? new Date(record.check_out_time) : null;

                if (targetInTimeStr) {
                    finalInDate = new Date(`${request.start_date}T${formatTimeStr(targetInTimeStr)}:00+07:00`);
                }
                if (targetOutTimeStr) {
                    finalOutDate = new Date(`${request.start_date}T${formatTimeStr(targetOutTimeStr)}:00+07:00`);
                }

                let wHoursToSave = 0;
                let calcStatus = 'Đủ công';

                if (finalInDate && finalOutDate) {
                    let diffMs = finalOutDate.getTime() - finalInDate.getTime();
                    let wHours = diffMs / (1000 * 60 * 60);
                    if (wHours > 5) wHours -= 1.5; // Nghỉ trưa 1.5h

                    wHours = Math.max(0, wHours);
                    wHoursToSave = parseFloat(wHours.toFixed(2));

                    if (wHoursToSave >= 8.5) calcStatus = 'Tăng ca (OT)';
                    else if (wHoursToSave >= 7.5) calcStatus = 'Đủ công';
                    else if (wHoursToSave >= 3.5) calcStatus = 'Nửa công';
                    else calcStatus = 'Thiếu giờ/Về sớm';
                } else {
                    calcStatus = 'Thiếu giờ';
                }

                const finalStatus = request.sub_type === 'field_work' ? 'Công tác (CT)' : `${calcStatus} (Có GT)`;

                if (record) {
                    // CHỈ UPDATE STATUS VÀ GIỜ LÀM. KHÔNG GHI ĐÈ GIỜ MÁY!
                    await supabase.from('attendance_records').update({
                        status: finalStatus,
                        working_hours: request.sub_type === 'field_work' ? 8 : wHoursToSave
                    }).eq('id', record.id);
                } else {
                    // Nếu ngày đó vắng hoàn toàn thì mới Insert
                    await supabase.from('attendance_records').insert({
                        employee_id: request.employee_id,
                        date: request.start_date,
                        check_in_time: finalInDate ? finalInDate.toISOString() : null,
                        check_out_time: finalOutDate ? finalOutDate.toISOString() : null,
                        status: finalStatus,
                        working_hours: request.sub_type === 'field_work' ? 8 : wHoursToSave
                    });
                }
            } else if (request.request_type === 'leave') {
                let leaveStatus = 'Nghỉ (P)';
                let workingHoursToLog = 8;
                if (request.sub_type === 'unpaid') {
                    leaveStatus = 'Nghỉ không lương (UL)';
                    workingHoursToLog = 0;
                }
                let currDate = new Date(request.start_date);
                const endDate = new Date(request.end_date || request.start_date);

                while (currDate <= endDate) {
                    const dateStr = currDate.toISOString().split('T')[0];
                    const { data: extRecord } = await supabase.from('attendance_records').select('id').eq('employee_id', request.employee_id).eq('date', dateStr).maybeSingle();
                    if (extRecord) {
                        await supabase.from('attendance_records').update({ status: leaveStatus, working_hours: workingHoursToLog }).eq('id', extRecord.id);
                    } else {
                        await supabase.from('attendance_records').insert({
                            employee_id: request.employee_id, date: dateStr, status: leaveStatus, working_hours: workingHoursToLog
                        });
                    }
                    currDate.setDate(currDate.getDate() + 1);
                }
            }
        }

        // BẮN THÔNG BÁO CHO NHÂN VIÊN (ĐÃ ĐƯỢC BỌC BẢO VỆ)
        const statusText = newStatus === 'approved' ? 'ĐÃ ĐƯỢC DUYỆT' : 'ĐÃ BỊ TỪ CHỐI';
        const reqTypeName = request.request_type === 'leave' ? 'nghỉ phép' : 'giải trình';
        const notifTitle = `Cập nhật trạng thái đơn ${reqTypeName}`;
        const notifMessage = `Đơn xin ${reqTypeName} của bạn (áp dụng ngày ${formatDate(request.start_date)}) ${statusText}. ${adminNotes ? `Ghi chú: ${adminNotes}` : ''}`;
        const notifLink = '/my-attendance?tab=requests';

        try {
            await supabase.from('notifications').insert({
                user_id: request.employee_id, title: notifTitle, message: notifMessage, link: notifLink
            });
            // Bọc lỗi OneSignal
            try {
                await sendPushToUser(request.employee_id, notifTitle, notifMessage, notifLink);
            } catch (pushErr) {
                console.error("[NOTIFY_PUSH_ERROR]", pushErr);
            }
        } catch (dbErr) {
            console.error("[NOTIFY_DB_ERROR]", dbErr);
        }

        return { success: true, message: newStatus === 'approved' ? 'Đã duyệt đơn và cập nhật bảng công!' : 'Đã từ chối đơn.' };
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
        const userProfile = await getUserProfile();
        if (!userProfile || !userProfile.isAuthenticated || userProfile.type !== 'EMPLOYEE') return [];

        const currentEmployeeId = userProfile.entityId;
        const userRole = (userProfile.role || '').toLowerCase();
        const isHR = userRole === 'admin' || userRole === 'hr' || userRole === 'giám đốc';

        let targetAuthIds: string[] = [];

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

        const startDate = new Date(year, month - 1, 1).toLocaleDateString('en-CA');
        const endDate = new Date(year, month, 0).toLocaleDateString('en-CA');

        let query = supabase.from('attendance_records').select('*').gte('date', startDate).lte('date', endDate);
        if (!isHR) query = query.in('employee_id', targetAuthIds);

        const { data: records, error } = await query.order('date', { ascending: false });
        if (error || !records || records.length === 0) return [];

        const authIds = [...new Set(records.map(r => r.employee_id))];
        const { data: employees } = await supabase.from('employees').select('auth_id, code, name').in('auth_id', authIds);
        const empMap = (employees || []).reduce((acc: any, emp: any) => {
            acc[emp.auth_id] = emp;
            return acc;
        }, {});

        // ✅ FIX: KÉO ĐƠN GIẢI TRÌNH ĐÃ DUYỆT ĐỂ LẤY GIỜ ĐIỀU CHỈNH
        const { data: approvedRequests } = await supabase
            .from('attendance_requests')
            .select('employee_id, start_date, actual_in_time, actual_out_time')
            .eq('status', 'approved')
            .eq('request_type', 'explanation')
            .gte('start_date', startDate)
            .lte('start_date', endDate)
            .order('created_at', { ascending: true });

        const reqMap = (approvedRequests || []).reduce((acc: any, req: any) => {
            acc[`${req.employee_id}_${req.start_date}`] = req;
            return acc;
        }, {});

        let formattedData = records.map((record: any) => {
            const empInfo = empMap[record.employee_id] || { name: "N/A", code: "N/A" };
            const reqInfo = reqMap[`${record.employee_id}_${record.date}`];

            return {
                id: record.id,
                date: record.date,
                employeeCode: empInfo.code,
                name: empInfo.name,
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
        return [];
    }
}

/**
 * 1. Lấy danh sách các đơn đã được xử lý (APPROVED hoặc REJECTED)
 * @returns Array chứa danh sách đơn từ và thông tin nhân viên
 */
export async function getProcessedRequests() {
    try {
        const supabase = await createSupabaseServerClient();

        const { data, error } = await supabase
            .from('attendance_requests')
            .select(`
                *,
                employee:employees!fk_requests_employee(name, code),
                approver:employees!fk_requests_approver(name)
            `)
            .in('status', ['approved', 'rejected'])
            .order('updated_at', { ascending: false });

        if (error) {
            console.error("[DB_ERROR] Lấy lịch sử đơn từ thất bại:", error.message);
            return [];
        }

        return data || [];
    } catch (error: any) {
        console.error("[SERVER_ERROR] Lỗi hàm getProcessedRequests:", error.message);
        return [];
    }
}

/**
 * 2. HR/Quản lý cập nhật lại trạng thái và ghi chú của đơn đã duyệt
 * ĐÃ TÍCH HỢP PUSH NOTIFICATION & ROLLBACK ĐỒNG BỘ BẢNG CÔNG
 */
export async function updateAttendanceRequest(id: string, newStatus: 'approved' | 'rejected' | 'pending', newNote: string) {
    try {
        const supabase = await createSupabaseServerClient();

        // 🚀 ĐIỂM QUAN TRỌNG: Nếu HR update thành 'approved' -> Chuyển luồng cho processAttendanceRequest tính giờ
        if (newStatus === 'approved') {
            return await processAttendanceRequest(id, 'approved', newNote);
        }

        // 1. Lấy thông tin đơn từ để biết gửi thông báo cho ai
        const { data: request, error: reqError } = await supabase
            .from('attendance_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (reqError || !request) {
            return { success: false, error: "Không tìm thấy thông tin đơn từ trong hệ thống." };
        }

        // 2. 🚀 XỬ LÝ ROLLBACK: Nếu đơn đang APPROVED mà bị giáng xuống REJECTED/PENDING
        if (request.status === 'approved') {
            await rollbackAttendanceRecords(supabase, request.employee_id, request.start_date, request.end_date);
        }

        // 3. Thực hiện cập nhật Database
        const { error: updateError } = await supabase
            .from('attendance_requests')
            .update({
                status: newStatus,
                approver_note: newNote,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            console.error("[DB_ERROR] Cập nhật đơn thất bại:", updateError.message);
            return { success: false, error: "Không thể lưu thay đổi vào cơ sở dữ liệu." };
        }

        // 4. 🚀 XỬ LÝ BẮN THÔNG BÁO CHO NHÂN VIÊN
        const reqTypeName = request.request_type === 'leave' ? 'nghỉ phép' : 'giải trình';
        let statusText = 'ĐÃ ĐƯỢC ĐIỀU CHỈNH';

        if (newStatus === 'rejected') statusText = 'ĐÃ BỊ TỪ CHỐI (HỦY)';
        else if (newStatus === 'pending') statusText = 'ĐƯỢC HOÀN TÁC (CHỜ XỬ LÝ LẠI)';

        const notifTitle = `HR thay đổi trạng thái đơn ${reqTypeName}`;
        const notifMessage = `Đơn ${reqTypeName} (áp dụng ${formatDate(request.start_date)}) của bạn ${statusText}. ${newNote ? `Ghi chú: ${newNote}` : ''}`;
        const notifLink = '/my-attendance?tab=requests';

        try {
            // Ghi vào DB
            await supabase.from('notifications').insert({
                user_id: request.employee_id, title: notifTitle, message: notifMessage, link: notifLink
            });

            // Push Notification (Bọc try-catch độc lập)
            try {
                await sendPushToUser(request.employee_id, notifTitle, notifMessage, notifLink);
            } catch (pushErr) {
                console.error("[NOTIFY_PUSH_ERROR]", pushErr);
            }
        } catch (dbErr) {
            console.error("[NOTIFY_DB_ERROR]", dbErr);
        }

        return { success: true, message: "Đã cập nhật trạng thái đơn, đồng bộ bảng công và gửi thông báo." };
    } catch (error: any) {
        console.error("[SERVER_ERROR] Lỗi hàm updateAttendanceRequest:", error.message);
        return { success: false, error: "Lỗi hệ thống khi xử lý yêu cầu." };
    }
}

/**
 * 3. HR Xóa vĩnh viễn đơn từ (Hard Delete)
 * ĐÃ TÍCH HỢP PUSH NOTIFICATION & ROLLBACK ĐỒNG BỘ BẢNG CÔNG
 */
export async function deleteAttendanceRequest(id: string) {
    try {
        const supabase = await createSupabaseServerClient();

        // 1. QUAN TRỌNG: Lấy thông tin đơn TRƯỚC KHI XÓA
        const { data: request, error: reqError } = await supabase
            .from('attendance_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (reqError || !request) {
            return { success: false, error: "Không tìm thấy đơn từ để xóa." };
        }

        // 2. 🚀 XỬ LÝ ROLLBACK: Nếu đơn ĐÃ DUYỆT mà bị Xóa
        if (request.status === 'approved') {
            await rollbackAttendanceRecords(supabase, request.employee_id, request.start_date, request.end_date);
        }

        // 3. Thực hiện xóa (Hard Delete)
        const { error: deleteError } = await supabase
            .from('attendance_requests')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error("[DB_ERROR] Xóa đơn thất bại:", deleteError.message);
            return { success: false, error: "Không thể xóa đơn từ khỏi cơ sở dữ liệu." };
        }

        // 4. 🚀 XỬ LÝ BẮN THÔNG BÁO
        const reqTypeName = request.request_type === 'leave' ? 'nghỉ phép' : 'giải trình';
        const notifTitle = `⚠️ Đơn ${reqTypeName} đã bị xóa`;
        const notifMessage = `Đơn ${reqTypeName} (áp dụng ngày ${formatDate(request.start_date)}) của bạn đã bị Bộ phận Nhân sự xóa khỏi hệ thống. Vui lòng liên hệ trực tiếp nếu có thắc mắc.`;
        const notifLink = '/my-attendance';

        try {
            // Ghi DB
            await supabase.from('notifications').insert({
                user_id: request.employee_id, title: notifTitle, message: notifMessage, link: notifLink
            });

            // Push Notification (Bọc try-catch độc lập)
            try {
                await sendPushToUser(request.employee_id, notifTitle, notifMessage, notifLink);
            } catch (pushErr) {
                console.error("[NOTIFY_PUSH_ERROR]", pushErr);
            }
        } catch (dbErr) {
            console.error("[NOTIFY_DB_ERROR]", dbErr);
        }

        return { success: true, message: "Đã xóa đơn từ thành công, khôi phục bảng công và thông báo cho nhân viên." };
    } catch (error: any) {
        console.error("[SERVER_ERROR] Lỗi hàm deleteAttendanceRequest:", error.message);
        return { success: false, error: "Lỗi hệ thống khi xóa yêu cầu." };
    }
}

/**
 * NHÂN VIÊN TỰ SỬA ĐƠN (Chỉ áp dụng cho đơn Pending)
 * Đã bổ sung Notification cho Quản lý
 */
export async function updateMyRequest(id: string, payload: any) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Hết phiên đăng nhập." };

        // 1. Kiểm tra quyền sở hữu và trạng thái đơn
        const { data: request } = await supabase
            .from('attendance_requests')
            .select('status, employee_id, request_type')
            .eq('id', id)
            .single();

        if (!request || request.employee_id !== user.id) {
            return { success: false, error: "Bạn không có quyền thao tác trên đơn này." };
        }
        if (request.status !== 'pending') {
            return { success: false, error: "Chỉ có thể sửa đơn đang ở trạng thái Chờ duyệt." };
        }

        // 2. Thực hiện cập nhật
        const { error } = await supabase
            .from('attendance_requests')
            .update({
                sub_type: payload.sub_type,
                start_date: payload.start_date,
                end_date: payload.end_date || null,
                actual_in_time: payload.actual_in_time || null,
                actual_out_time: payload.actual_out_time || null,
                reason: payload.reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        // 3. 🚀 BẮN THÔNG BÁO CHO QUẢN LÝ (Người duyệt)
        const { data: employee } = await supabase.from('employees').select('name, manager_id').eq('auth_id', user.id).single();
        if (employee && employee.manager_id) {
            const { data: manager } = await supabase.from('employees').select('auth_id').eq('id', employee.manager_id).single();

            if (manager && manager.auth_id) {
                const reqTypeName = request.request_type === 'leave' ? 'Nghỉ phép' : 'Giải trình';
                const notifTitle = `📝 Đơn ${reqTypeName} vừa được cập nhật`;
                const notifMessage = `Nhân viên ${employee.name} vừa chỉnh sửa và gửi lại nội dung đơn ${reqTypeName} (áp dụng ngày ${formatDate(payload.start_date)}). Vui lòng kiểm tra lại.`;
                const notifLink = '/hrm/approvals';

                try {
                    await supabase.from('notifications').insert({
                        user_id: manager.auth_id, title: notifTitle, message: notifMessage, link: notifLink
                    });
                    try {
                        await sendPushToUser(manager.auth_id, notifTitle, notifMessage, notifLink);
                    } catch (pushErr) {
                        console.error("[NOTIFY_PUSH_ERROR]", pushErr);
                    }
                } catch (dbErr) {
                    console.error("[NOTIFY_DB_ERROR]", dbErr);
                }
            }
        }

        return { success: true, message: "Đã cập nhật thông tin và gửi thông báo cho Quản lý." };
    } catch (e: any) {
        console.error("[SERVER_ERROR] Lỗi sửa đơn cá nhân:", e);
        return { success: false, error: "Hệ thống đang bận, vui lòng thử lại sau." };
    }
}

/**
 * NHÂN VIÊN TỰ XÓA ĐƠN (Chỉ áp dụng cho đơn Pending)
 * Đã bổ sung Notification cho Quản lý
 */
export async function deleteMyRequest(id: string) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Hết phiên đăng nhập." };

        // 1. Kiểm tra quyền sở hữu và trạng thái đơn (Phải lấy type và date để làm thông báo)
        const { data: request } = await supabase
            .from('attendance_requests')
            .select('status, employee_id, request_type, start_date')
            .eq('id', id)
            .single();

        if (!request || request.employee_id !== user.id) {
            return { success: false, error: "Bạn không có quyền thao tác trên đơn này." };
        }
        if (request.status !== 'pending') {
            return { success: false, error: "Chỉ có thể xóa đơn đang ở trạng thái Chờ duyệt." };
        }

        // 2. Thực hiện xóa
        const { error } = await supabase.from('attendance_requests').delete().eq('id', id);
        if (error) throw error;

        // 3. 🚀 BẮN THÔNG BÁO CHO QUẢN LÝ
        const { data: employee } = await supabase.from('employees').select('name, manager_id').eq('auth_id', user.id).single();
        if (employee && employee.manager_id) {
            const { data: manager } = await supabase.from('employees').select('auth_id').eq('id', employee.manager_id).single();

            if (manager && manager.auth_id) {
                const reqTypeName = request.request_type === 'leave' ? 'Nghỉ phép' : 'Giải trình';
                const notifTitle = `🗑️ Nhân viên đã rút đơn`;
                const notifMessage = `Nhân viên ${employee.name} đã tự hủy đơn ${reqTypeName} (áp dụng ngày ${formatDate(request.start_date)}). Bạn không cần duyệt đơn này nữa.`;
                const notifLink = '/hrm/approvals';

                try {
                    await supabase.from('notifications').insert({
                        user_id: manager.auth_id, title: notifTitle, message: notifMessage, link: notifLink
                    });
                    try {
                        await sendPushToUser(manager.auth_id, notifTitle, notifMessage, notifLink);
                    } catch (pushErr) {
                        console.error("[NOTIFY_PUSH_ERROR]", pushErr);
                    }
                } catch (dbErr) {
                    console.error("[NOTIFY_DB_ERROR]", dbErr);
                }
            }
        }

        return { success: true, message: "Đã hủy đơn từ thành công." };
    } catch (e: any) {
        console.error("[SERVER_ERROR] Lỗi xóa đơn cá nhân:", e);
        return { success: false, error: "Hệ thống đang bận, vui lòng thử lại sau." };
    }
}

// ============================================================================
// HÀM HELPER: ROLLBACK BẢNG CÔNG VỀ TRẠNG THÁI GỐC (KHI HỦY/SỬA ĐƠN ĐÃ DUYỆT)
// ============================================================================
async function rollbackAttendanceRecords(supabase: any, employeeId: string, startDate: string, endDate: string | null) {
    let currDate = new Date(startDate);
    const lastDate = new Date(endDate || startDate);

    while (currDate <= lastDate) {
        const dateStr = currDate.toISOString().split('T')[0];

        // Lấy record của ngày đó
        const { data: record } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('date', dateStr)
            .maybeSingle();

        if (record) {
            const checkIn = record.check_in_time ? new Date(record.check_in_time) : null;
            const checkOut = record.check_out_time ? new Date(record.check_out_time) : null;

            if (!checkIn && !checkOut) {
                // Nếu ngày đó hoàn toàn không có giờ máy thực tế (Đơn xin nghỉ nguyên ngày)
                // -> Hủy đơn thì phải xóa luôn dòng chấm công này
                await supabase.from('attendance_records').delete().eq('id', record.id);
            } else {
                // Nếu có giờ máy -> Tính lại giờ làm việc theo máy (Bỏ qua giờ đã xin sửa)
                let wHoursToSave = 0;
                let calcStatus = 'Thiếu giờ';

                if (checkIn && checkOut) {
                    let diffMs = checkOut.getTime() - checkIn.getTime();
                    let wHours = diffMs / (1000 * 60 * 60);
                    if (wHours > 5) wHours -= 1.5; // Trừ giờ nghỉ trưa

                    wHours = Math.max(0, wHours);
                    wHoursToSave = parseFloat(wHours.toFixed(2));

                    if (wHoursToSave >= 8.5) calcStatus = 'Tăng ca (OT)';
                    else if (wHoursToSave >= 7.5) calcStatus = 'Đủ công';
                    else if (wHoursToSave >= 3.5) calcStatus = 'Nửa công';
                    else calcStatus = 'Thiếu giờ/Về sớm';
                } else if (checkIn) {
                    calcStatus = 'Đang làm việc'; // Hoặc Quên chấm ra
                }

                // Cập nhật lại record gốc
                await supabase.from('attendance_records').update({
                    status: calcStatus,
                    working_hours: wHoursToSave
                }).eq('id', record.id);
            }
        }
        currDate.setDate(currDate.getDate() + 1);
    }
}