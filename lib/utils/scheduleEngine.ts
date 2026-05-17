// lib/utils/scheduleEngine.ts
import { format, addDays, subDays, getDay } from 'date-fns';

export interface Holiday {
    date: string; // Định dạng 'YYYY-MM-DD' hoặc 'MM-DD'
    isYearly: boolean;
}

/**
 * 1. HÀM KIỂM TRA NGÀY LÀM VIỆC HỢP LỆ
 */
export function isWorkingDay(date: Date, holidays: Holiday[], allowWeekendWork: boolean): boolean {
    // Nếu bật công tắc Tăng ca/Làm xuyên Lễ -> Ngày nào cũng tính là ngày làm việc
    if (allowWeekendWork) return true;

    // Kiểm tra Chủ nhật (hàm getDay() của JS: 0 là Chủ nhật)
    if (getDay(date) === 0) return false;

    // Kiểm tra ngày Lễ/Tết
    const dateStr = format(date, 'yyyy-MM-dd');
    const monthDayStr = format(date, 'MM-dd');

    const isHoliday = holidays.some(h =>
        (h.isYearly && h.date.substring(5) === monthDayStr) || // Ngày lễ lặp lại hàng năm (VD: 05-01)
        (!h.isYearly && h.date === dateStr)                    // Ngày nghỉ bù/nghỉ đột xuất cụ thể
    );

    if (isHoliday) return false;

    return true;
}

/**
 * 2. ĐỘNG CƠ TỊNH TIẾN NGÀY (BỎ QUA NGÀY NGHỈ)
 */
export function shiftWorkingDays(startDate: Date | string, days: number, holidays: Holiday[], allowWeekendWork: boolean): Date {
    let current = new Date(startDate);

    // Nếu days = 0, chỉ cần đảm bảo ngày hiện tại là ngày làm việc hợp lệ (nếu lỡ rơi vào Chủ nhật thì đẩy sang Thứ 2)
    if (days === 0) {
        while (!isWorkingDay(current, holidays, allowWeekendWork)) {
            current = addDays(current, 1);
        }
        return current;
    }

    const step = days > 0 ? 1 : -1; // Xác định chiều tịnh tiến (Tiến lên hay Lùi lại)
    let remainingDays = Math.abs(days);

    while (remainingDays > 0) {
        current = step > 0 ? addDays(current, 1) : subDays(current, 1);
        // Chỉ đếm giảm remainingDays nếu ngày đó là ngày làm việc hợp lệ
        if (isWorkingDay(current, holidays, allowWeekendWork)) {
            remainingDays--;
        }
    }

    return current;
}

/**
 * 3. BỘ CHUYỂN ĐỔI: TÍNH NGÀY DỰA TRÊN 4 RÀNG BUỘC (FS, SS, FF, SF) VÀ LAG
 */
export function calculateTaskDates(
    pred: { startDate: Date; endDate: Date }, // Công việc đi trước (A)
    succDuration: number,                     // Thời lượng công việc đi sau (B)
    depType: 'FS' | 'SS' | 'FF' | 'SF',       // Loại ràng buộc
    lagDays: number,                          // Độ trễ (lag)
    holidays: Holiday[],                      // Danh sách ngày lễ
    allowWeekendWork: boolean                 // Công tắc làm cuối tuần của việc B
): { startDate: Date; endDate: Date } {

    let newStart: Date;
    let newEnd: Date;

    switch (depType) {
        case 'FS':
            // Finish to Start: Việc B bắt đầu sau khi Việc A kết thúc + Lag (Mặc định cần +1 để qua ngày hôm sau)
            newStart = shiftWorkingDays(pred.endDate, lagDays + 1, holidays, allowWeekendWork);
            newEnd = shiftWorkingDays(newStart, succDuration - 1, holidays, allowWeekendWork);
            break;
        case 'SS':
            // Start to Start: Bắt đầu của B = Bắt đầu của A + lag
            newStart = shiftWorkingDays(pred.startDate, lagDays, holidays, allowWeekendWork);
            newEnd = shiftWorkingDays(newStart, succDuration - 1, holidays, allowWeekendWork);
            break;
        case 'FF':
            // Finish to Finish: Kết thúc của B = Kết thúc của A + lag -> Từ đó tính ngược ra ngày bắt đầu
            newEnd = shiftWorkingDays(pred.endDate, lagDays, holidays, allowWeekendWork);
            newStart = shiftWorkingDays(newEnd, -(succDuration - 1), holidays, allowWeekendWork);
            break;
        case 'SF':
            // Start to Finish: Kết thúc của B = Bắt đầu của A + lag -> Từ đó tính ngược ra ngày bắt đầu
            newEnd = shiftWorkingDays(pred.startDate, lagDays, holidays, allowWeekendWork);
            newStart = shiftWorkingDays(newEnd, -(succDuration - 1), holidays, allowWeekendWork);
            break;
        default:
            newStart = shiftWorkingDays(pred.endDate, lagDays + 1, holidays, allowWeekendWork);
            newEnd = shiftWorkingDays(newStart, succDuration - 1, holidays, allowWeekendWork);
    }

    return { startDate: newStart, endDate: newEnd };
}