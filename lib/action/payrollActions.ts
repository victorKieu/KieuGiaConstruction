"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/getUserProfile";

// Các Hằng số cấu hình Lương chuẩn (Có thể đưa vào DB sau này)
const STANDARD_WORKING_DAYS = 26; // Ngày công chuẩn trong tháng
const OT_RATE = 1.5; // Hệ số tăng ca (150%)
const INSURANCE_RATE = 0.105; // BHXH (8%) + BHYT (1.5%) + BHTN (1%) = 10.5%
const PERSONAL_DEDUCTION = 11000000; // Giảm trừ bản thân: 11 triệu VNĐ
const DEPENDENT_DEDUCTION = 4400000; // Giảm trừ người phụ thuộc: 4.4 triệu VNĐ

/**
 * Hàm tính Thuế Thu Nhập Cá Nhân (TNCN) theo biểu thuế lũy tiến từng phần
 * @param taxableIncome Thu nhập tính thuế (Gross - Bảo hiểm - Giảm trừ)
 */
function calculateTNCN(taxableIncome: number): number {
    if (taxableIncome <= 0) return 0;

    // Biểu thuế lũy tiến (Tính nhanh)
    if (taxableIncome <= 5000000) return taxableIncome * 0.05;
    if (taxableIncome <= 10000000) return taxableIncome * 0.10 - 250000;
    if (taxableIncome <= 18000000) return taxableIncome * 0.15 - 750000;
    if (taxableIncome <= 32000000) return taxableIncome * 0.20 - 1650000;
    if (taxableIncome <= 52000000) return taxableIncome * 0.25 - 3250000;
    if (taxableIncome <= 80000000) return taxableIncome * 0.30 - 5850000;
    return taxableIncome * 0.35 - 9850000;
}

/**
 * Lấy Bảng Lương Tổng Hợp theo Tháng / Năm
 */
export async function getPayrollByMonth(month: number, year: number) {
    const supabase = await createSupabaseServerClient();

    try {
        const userProfile = await getUserProfile();
        if (!userProfile || !userProfile.isAuthenticated) return { success: false, error: "Hết phiên đăng nhập", data: [] };

        const userRole = (userProfile.role || '').toLowerCase();
        const isHR = userRole === 'admin' || userRole === 'hr' || userRole === 'giám đốc';
        if (!isHR) return { success: false, error: "Bạn không có quyền truy cập bảng lương", data: [] };

        const startDate = new Date(year, month - 1, 1).toLocaleDateString('en-CA');
        const endDate = new Date(year, month, 0).toLocaleDateString('en-CA');

        // 1. KÉO DỮ LIỆU NHÂN SỰ: Đã đổi auth_id thành id
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select(`
                id, code, name, department_id, 
                basic_salary, base_salary, allowance_amount, dependents_count, is_insurance_active,
                department:sys_dictionaries!employees_department_id_fkey(name)
            `);

        if (empError) {
            console.error("[DB_EMP_ERROR]", empError.message);
            throw new Error(`Lỗi CSDL Nhân sự: ${empError.message}`);
        }
        if (!employees) throw new Error("Không có dữ liệu nhân sự");

        // 2. Kéo toàn bộ dữ liệu chấm công trong tháng
        const { data: attendanceRecords, error: attError } = await supabase
            .from('attendance_records')
            .select('employee_id, working_hours, status')
            .gte('date', startDate)
            .lte('date', endDate);

        if (attError) throw new Error("Lỗi lấy dữ liệu chấm công");

        const attendanceMap = new Map();
        for (const record of (attendanceRecords || [])) {
            if (!attendanceMap.has(record.employee_id)) {
                attendanceMap.set(record.employee_id, { actualDays: 0, otHours: 0 });
            }
            const empData = attendanceMap.get(record.employee_id);

            if (record.working_hours > 0) {
                const regularHours = Math.min(record.working_hours, 8);
                empData.actualDays += (regularHours / 8);

                if (record.working_hours > 8) {
                    empData.otHours += (record.working_hours - 8);
                }
            }
        }

        // 3. THUẬT TOÁN TÍNH LƯƠNG CHÍNH
        const payrollData = employees.map(emp => {
            // ✅ Đã đổi từ emp.auth_id thành emp.id
            const att = attendanceMap.get(emp.id) || { actualDays: 0, otHours: 0 };

            // PHÂN TÁCH RÕ RÀNG 2 LOẠI LƯƠNG
            const contractSalary = Number(emp.basic_salary) || 0; // Lương thực tế (Dùng chia ngày công)
            const insuranceSalary = Number(emp.base_salary) || 0; // Mức lương đóng BHXH (Dùng nhân 10.5%)

            const allowances = Number(emp.allowance_amount) || 0;
            const actualDays = parseFloat(att.actualDays.toFixed(2));
            const otHours = parseFloat(att.otHours.toFixed(2));

            // a. Lương thời gian (Tính trên LƯƠNG THỰC TẾ - basic_salary)
            const hourlyRate = contractSalary / STANDARD_WORKING_DAYS / 8;
            const dailyRate = contractSalary / STANDARD_WORKING_DAYS;

            const standardIncome = dailyRate * actualDays;
            const otIncome = otHours * hourlyRate * OT_RATE;

            // b. Tổng thu nhập (Gross)
            const grossSalary = Math.round(standardIncome + otIncome + allowances);

            // c. Tính Bảo Hiểm (Tính trên MỨC ĐÓNG BHXH - base_salary)
            let insuranceDeduction = 0;
            if (emp.is_insurance_active && insuranceSalary > 0) {
                insuranceDeduction = Math.round(insuranceSalary * INSURANCE_RATE);
            }

            // d. Tính Thuế TNCN
            const dependents = Number(emp.dependents_count) || 0;
            const totalDeductions = PERSONAL_DEDUCTION + (dependents * DEPENDENT_DEDUCTION) + insuranceDeduction;

            const taxableIncome = grossSalary - allowances - totalDeductions;
            const taxDeduction = Math.round(calculateTNCN(taxableIncome));

            const advancePayment = 0;

            // e. Thực lãnh (Net Pay)
            const netSalary = grossSalary - insuranceDeduction - taxDeduction - advancePayment;

            return {
                id: emp.id, // ✅ Trả về ID gốc cho UI key
                employeeCode: emp.code || 'N/A',
                name: emp.name || 'N/A',
                department: (Array.isArray(emp.department) ? emp.department[0]?.name : (emp.department as any)?.name) || 'Chưa phân bổ',
                baseSalary: contractSalary, // Trả về giao diện mức lương thực tế để HR dễ đối chiếu
                standardDays: STANDARD_WORKING_DAYS,
                actualDays: actualDays,
                otHours: otHours,
                allowances: allowances,
                grossSalary: grossSalary,
                insuranceDeduction: insuranceDeduction,
                taxDeduction: taxDeduction,
                advancePayment: advancePayment,
                netSalary: netSalary
            };
        });

        payrollData.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));

        return { success: true, data: payrollData };
    } catch (error: any) {
        console.error("[PAYROLL_ERROR]", error);
        return { success: false, error: "Lỗi hệ thống khi tính lương.", data: [] };
    }
}

/**
 * Lấy Bảng Công Tổng Hợp theo Tháng/Năm (Ma trận 31 ngày)
 */
export async function getMonthlyAttendanceBoard(month: number, year: number) {
    const supabase = await createSupabaseServerClient();

    try {
        const startDate = new Date(year, month - 1, 1).toLocaleDateString('en-CA');
        const endDate = new Date(year, month, 0).toLocaleDateString('en-CA');
        const daysInMonth = new Date(year, month, 0).getDate();

        // 1. Kéo toàn bộ nhân sự đang làm việc (Đã đổi auth_id thành id)
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select(`
                id, code, name, department_id, department:sys_dictionaries!employees_department_id_fkey(name)
            `);

        if (empError) throw new Error(`Lỗi CSDL Nhân sự: ${empError.message}`);

        // 2. Kéo toàn bộ dữ liệu chấm công trong tháng
        const { data: records, error: attError } = await supabase
            .from('attendance_records')
            .select('employee_id, date, status, working_hours')
            .gte('date', startDate)
            .lte('date', endDate);

        if (attError) throw new Error("Lỗi lấy dữ liệu chấm công");

        // 3. Hàm phụ trợ: Chuyển đổi trạng thái dài thành Ký hiệu viết tắt cho bảng công
        const getShortStatus = (status: string) => {
            if (!status) return '';
            const s = status.toLowerCase();
            if (s.includes('đủ công') || s.includes('tăng ca')) return 'X';
            if (s.includes('nửa công')) return 'X/2';
            if (s.includes('nghỉ (p)')) return 'P';
            if (s.includes('không lương') || s.includes('vắng') || s.includes('không phép')) return 'K';
            if (s.includes('công tác')) return 'CT';
            if (s.includes('muộn') || s.includes('về sớm')) return 'M';
            if (s.includes('đang làm việc')) return 'Đ';
            if (s.includes('nghỉ ca')) return 'NC'; // Thêm case nghỉ ca cho rõ
            return '?';
        };

        // 4. Ghép dữ liệu thành Ma trận (Matrix)
        const boardData = (employees || []).map(emp => {
            // ✅ Đã đổi từ emp.auth_id thành emp.id
            const empRecords = (records || []).filter(r => r.employee_id === emp.id);
            const dailyData: { [key: number]: { status: string, tooltip: string } } = {};

            let totalPaidDays = 0;
            let totalUnpaidDays = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                // Tạo chuỗi YYYY-MM-DD an toàn (bù số 0)
                const dStr = String(d).padStart(2, '0');
                const mStr = String(month).padStart(2, '0');
                const dateStr = `${year}-${mStr}-${dStr}`;

                const record = empRecords.find(r => r.date === dateStr);

                if (record) {
                    const symbol = getShortStatus(record.status);
                    dailyData[d] = { status: symbol, tooltip: record.status };

                    // Cộng dồn ngày công (X, CT, P được tính là công có lương)
                    if (['X', 'CT', 'P', 'M'].includes(symbol)) totalPaidDays += 1;
                    if (symbol === 'X/2') totalPaidDays += 0.5;
                    if (symbol === 'K') totalUnpaidDays += 1;
                } else {
                    dailyData[d] = { status: '', tooltip: 'Chưa có dữ liệu' };
                }
            }

            return {
                id: emp.id, // ✅ Trả về ID gốc cho UI key
                employeeCode: emp.code || 'N/A',
                name: emp.name || 'N/A',
                department: (Array.isArray(emp.department) ? emp.department[0]?.name : (emp.department as any)?.name) || 'Chưa phân bổ',
                dailyData,
                totalPaidDays,
                totalUnpaidDays
            };
        });

        // Sắp xếp theo tên / mã NV
        boardData.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));

        return { success: true, data: boardData, daysInMonth };
    } catch (error: any) {
        console.error("[BOARD_ERROR]", error);
        return { success: false, error: "Lỗi lấy dữ liệu bảng công", data: [], daysInMonth: 30 };
    }
}

export async function getAllowanceRecords(month: string, year: string) {
    const supabase = await createSupabaseServerClient();

    // 1. Lấy danh sách nhân viên và định mức
    const { data: employees } = await supabase
        .from('employees')
        .select('id, name, code, allowance_type, allowance_rate')
        .order('name');

    if (!employees) return [];

    // 2. Xác định khoảng thời gian trong tháng
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();

    // 3. Lấy tổng Km từ bảng checkpoints
    const { data: checkpoints } = await supabase
        .from('employee_checkpoints')
        .select('employee_id, travel_distance_km')
        .gte('check_in_time', startDate)
        .lte('check_in_time', endDate);

    // Gom nhóm tính tổng Km theo nhân viên
    const kmMap: Record<string, number> = {};
    checkpoints?.forEach(cp => {
        kmMap[cp.employee_id] = (kmMap[cp.employee_id] || 0) + (cp.travel_distance_km || 0);
    });

    // 4. Tổng hợp kết quả
    return employees.map(emp => {
        const totalKm = kmMap[emp.id] || 0;
        const type = emp.allowance_type || 'per_km';
        const rate = emp.allowance_rate || 0;

        let totalAmount = 0;
        if (type === 'flat_rate') {
            totalAmount = rate; // Khoán cố định
        } else {
            totalAmount = totalKm * rate; // Tính theo Km thực tế
        }

        return {
            id: emp.id,
            employeeCode: emp.code,
            name: emp.name,
            allowanceType: type,
            rate: rate,
            totalKm: parseFloat(totalKm.toFixed(2)),
            totalAmount: totalAmount
        };
    });
}

export async function syncTravelDistances(month: string, year: string) {
    try {
        const supabase = await createSupabaseServerClient();

        // 1. Lấy toàn bộ từ điển tuyến đường mới nhất
        const { data: routes } = await supabase.from('route_distances').select('*');
        if (!routes || routes.length === 0) return { success: false, error: "Từ điển tuyến đường đang trống." };

        // 2. Lấy toàn bộ Checkpoint trong tháng cần tính
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();

        const { data: checkpoints } = await supabase
            .from('employee_checkpoints')
            .select('*')
            .gte('check_in_time', startDate)
            .lte('check_in_time', endDate)
            .order('employee_id', { ascending: true })
            .order('check_in_time', { ascending: true });

        if (!checkpoints) return { success: true, message: "Không có dữ liệu di chuyển trong tháng." };

        let updatedCount = 0;

        // 3. Quét qua từng cặp Checkpoint liên tiếp của cùng 1 nhân viên trong cùng 1 ngày
        for (let i = 0; i < checkpoints.length - 1; i++) {
            const current = checkpoints[i];
            const next = checkpoints[i + 1];

            // Nếu cùng 1 người và cùng thuộc 1 ca làm (attendance_id)
            if (current.employee_id === next.employee_id && current.attendance_id === next.attendance_id) {
                const fromId = current.project_id;
                const toId = next.project_id;

                // Hàm tìm số Km trong từ điển
                const route = routes.find(r =>
                    (r.from_project_id === fromId && r.to_project_id === toId) ||
                    (r.from_project_id === toId && r.to_project_id === fromId)
                );

                const trueDistance = route ? route.distance_km : 0;

                // Nếu số Km bị sai lệch so với DB -> Cập nhật lại
                if (current.travel_distance_km !== trueDistance) {
                    await supabase.from('employee_checkpoints')
                        .update({ travel_distance_km: trueDistance })
                        .eq('id', current.id);
                    updatedCount++;
                }
            }
        }

        return { success: true, message: `Đã đồng bộ thành công! Cập nhật ${updatedCount} lượt di chuyển bị thiếu.` };
    } catch (error: any) {
        return { success: false, error: error.message || "Lỗi đồng bộ dữ liệu." };
    }
}