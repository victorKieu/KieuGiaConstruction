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
    try {
        const supabase = await createSupabaseServerClient();

        // 1. LẤY ĐỊNH MỨC CHUNG (TỪ SYS_QUOTAS)
        const { data: quotas } = await supabase.from('sys_quotas')
            .select('code, value')
            .in('code', ['MEAL_RATE', 'PHONE_RATE']);

        let defaultMealRate = 35000;
        let defaultPhoneRate = 200000;

        quotas?.forEach(q => {
            if (q.code === 'MEAL_RATE') defaultMealRate = q.value;
            if (q.code === 'PHONE_RATE') defaultPhoneRate = q.value;
        });

        // 2. LẤY DỮ LIỆU NHÂN VIÊN (Bao gồm các trường Phụ cấp mới)
        const { data: employees } = await supabase
            .from('employees')
            .select(`
                id, code, name, basic_salary, allowance_amount,
                is_insurance_active, dependents_count,
                is_meal_allowance_active, meal_allowance_rate,
                is_phone_allowance_active, phone_allowance_rate,
                department:department_id(name)
            `);

        if (!employees) return { success: false, error: "Không thể tải danh sách nhân viên." };

        // 3. LẤY DỮ LIỆU CHẤM CÔNG TRONG THÁNG
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

        const { data: attendanceRecords } = await supabase
            .from('attendance_records')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

        // 4. TIẾN HÀNH TÍNH LƯƠNG CHO TỪNG NGƯỜI
        const payrollData = employees.map(emp => {
            const empRecords = attendanceRecords?.filter(r => r.employee_id === emp.id) || [];

            // A. TÍNH NGÀY CÔNG & TĂNG CA
            let actualDays = 0;
            let otHours = 0;
            let workedDaysOnly = 0; // Chỉ đếm số ngày có đi làm thực tế (để nhân tiền cơm)

            empRecords.forEach(r => {
                if (r.working_hours > 0) {
                    // Nếu làm >= 4 tiếng thì được tính là 1 ngày đi làm để nhận tiền cơm
                    if (r.working_hours >= 4) workedDaysOnly += 1;

                    if (r.working_hours >= 8) actualDays += 1;
                    else if (r.working_hours >= 4) actualDays += 0.5;

                    if (r.working_hours > 8) {
                        otHours += (r.working_hours - 8);
                    }
                }
                // Ngày nghỉ có lương (Không tính tiền cơm nhưng vẫn tính lương)
                if (r.status === 'Nghỉ (P)' || r.status.includes('Nghỉ lễ')) {
                    actualDays += 1;
                }
            });

            // B. TÍNH TOÁN CÁC KHOẢN PHỤ CẤP
            const baseAllowance = emp.allowance_amount || 0; // Phụ cấp cố định (tiền trách nhiệm...)

            // Tiền cơm: Số ngày đi làm thực tế * Đơn giá (Riêng hoặc Mặc định)
            const mealRate = emp.meal_allowance_rate || defaultMealRate;
            const mealAllowance = emp.is_meal_allowance_active ? (workedDaysOnly * mealRate) : 0;

            // Tiền điện thoại: Cố định theo tháng (Riêng hoặc Mặc định)
            const phoneRate = emp.phone_allowance_rate || defaultPhoneRate;
            const phoneAllowance = emp.is_phone_allowance_active ? phoneRate : 0;

            // -> TỔNG PHỤ CẤP
            const totalAllowances = baseAllowance + mealAllowance + phoneAllowance;

            // C. TÍNH LƯƠNG CƠ BẢN & OT
            const basicSalary = emp.basic_salary || 0;
            const salaryPerDay = basicSalary / STANDARD_WORKING_DAYS;
            const baseEarned = salaryPerDay * actualDays;
            const otAmount = (salaryPerDay / 8) * OT_RATE * otHours;

            // D. TỔNG THU NHẬP (GROSS)
            const grossSalary = baseEarned + otAmount + totalAllowances;

            // E. CÁC KHOẢN TRỪ (BẢO HIỂM & THUẾ)
            const insuranceDeduction = emp.is_insurance_active ? (basicSalary * INSURANCE_RATE) : 0;
            const taxDeduction = calculateTNCN(
                grossSalary - insuranceDeduction - PERSONAL_DEDUCTION - ((emp.dependents_count || 0) * DEPENDENT_DEDUCTION)
            );

            // F. THỰC LÃNH (NET)
            const netSalary = grossSalary - insuranceDeduction - taxDeduction;

            return {
                id: emp.id,
                employeeCode: emp.code,
                name: emp.name,
                department: (Array.isArray(emp.department) ? emp.department[0]?.name : (emp.department as any)?.name) || 'Chưa phân bổ',
                basicSalary: basicSalary,
                actualDays: parseFloat(actualDays.toFixed(2)),
                otHours: parseFloat(otHours.toFixed(2)),
                otAmount: Math.round(otAmount),
                allowances: Math.round(totalAllowances),
                bonus: 0,
                grossSalary: Math.round(grossSalary),
                insuranceDeduction: Math.round(insuranceDeduction),
                taxDeduction: Math.round(taxDeduction),
                netSalary: Math.round(netSalary)
            };
        });

        return { success: true, data: payrollData };
    } catch (error: any) {
        return { success: false, error: "Lỗi hệ thống tính lương: " + error.message };
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
    try {
        const supabase = await createSupabaseServerClient();

        // 1. Lấy cấu hình định mức chung (Dùng in() để chỉ lấy đúng 2 mã cần thiết)
        const { data: quotas } = await supabase.from('sys_quotas')
            .select('code, value')
            .in('code', ['ALLOWANCE_KM', 'ALLOWANCE_FLAT']);

        let defaultKmRate = 2000;
        let defaultFlatRate = 1500000;

        quotas?.forEach(q => {
            if (q.code === 'ALLOWANCE_KM') defaultKmRate = q.value;
            if (q.code === 'ALLOWANCE_FLAT') defaultFlatRate = q.value;
        });

        // 2. Lấy danh sách nhân viên
        const { data: employees } = await supabase
            .from('employees')
            .select('id, name, code, allowance_type, allowance_rate')
            .order('name');

        if (!employees) return [];

        // 3. Tính Tổng Km trong tháng
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();

        const { data: checkpoints } = await supabase
            .from('employee_checkpoints')
            .select('employee_id, travel_distance_km')
            .gte('check_in_time', startDate)
            .lte('check_in_time', endDate);

        const kmMap: Record<string, number> = {};
        checkpoints?.forEach(cp => {
            kmMap[cp.employee_id] = (kmMap[cp.employee_id] || 0) + (cp.travel_distance_km || 0);
        });

        // 4. Tổng hợp & Tính tiền
        return employees.map(emp => {
            const totalKm = kmMap[emp.id] || 0;
            const type = emp.allowance_type || 'per_km';

            // Ưu tiên: Lương riêng (nếu có) -> Định mức chung công ty
            let appliedRate = 0;
            if (emp.allowance_rate && emp.allowance_rate > 0) {
                appliedRate = emp.allowance_rate;
            } else {
                appliedRate = type === 'flat_rate' ? defaultFlatRate : defaultKmRate;
            }

            let totalAmount = 0;
            if (type === 'flat_rate') {
                totalAmount = appliedRate;
            } else {
                totalAmount = totalKm * appliedRate;
            }

            return {
                id: emp.id,
                employeeCode: emp.code,
                name: emp.name,
                allowanceType: type,
                rate: appliedRate,
                totalKm: parseFloat(totalKm.toFixed(2)),
                totalAmount: totalAmount
            };
        });
    } catch (e) {
        return [];
    }
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