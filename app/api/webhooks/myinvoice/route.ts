import { NextResponse } from 'next/server';
import { syncMyInvoiceDataAction } from '@/lib/action/finance';

export async function POST(request: Request) {
    try {
        // 1. Nhận Payload từ MyInvoice.vn đẩy về
        const payload = await request.json();

        // Xác thực bảo mật (Ví dụ kiểm tra Secret Token trong Header nếu anh có cài đặt bên MyInvoice)
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.MYINVOICE_WEBHOOK_SECRET}`) {
            // Mở comment dòng dưới nếu anh muốn bật bảo mật Webhook
            // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Định dạng lại Payload nếu cần (Giả sử MyInvoice trả về 1 Object hóa đơn đơn lẻ)
        // Chúng ta đưa nó vào mảng để dùng chung hàm syncMyInvoiceDataAction
        const invoiceDataArray = Array.isArray(payload) ? payload : [payload];

        // 3. Gọi hàm xử lý hạch toán
        const result = await syncMyInvoiceDataAction(invoiceDataArray);

        if (result.success) {
            return NextResponse.json({
                status: 'success',
                message: 'Đã nhận và hạch toán hóa đơn thành công'
            });
        } else {
            return NextResponse.json({
                status: 'error',
                message: result.error
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Lỗi xử lý Webhook MyInvoice:", error);
        return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
    }
}

// =====================================================================
// [AR] GỌI API MYINVOICE LẤY DỮ LIỆU VÀ ĐỒNG BỘ
// =====================================================================
export async function fetchAndSyncFromMyInvoiceAction(fromDate: string, toDate: string) {
    try {
        // 1. Gọi API của MyInvoice (Đây là URL và cấu trúc giả định, anh cần thay bằng Document API chuẩn của họ)
        const myInvoiceApiUrl = `https://api.myinvoice.vn/v1/invoices?fromDate=${fromDate}&toDate=${toDate}`;

        const response = await fetch(myInvoiceApiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.MYINVOICE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Không thể kết nối đến máy chủ MyInvoice");

        const responseData = await response.json();

        // Trích xuất mảng dữ liệu hóa đơn từ response (Tùy cấu trúc API của họ trả về)
        const invoicesList = responseData.data || [];

        if (invoicesList.length === 0) {
            return { success: true, message: "Không có hóa đơn mới nào trong khoảng thời gian này." };
        }

        // 2. Tái sử dụng lại hàm đồng bộ và hạch toán kế toán kép ở trên
        const syncResult = await syncMyInvoiceDataAction(invoicesList);

        return syncResult;

    } catch (error: any) {
        console.error("Lỗi đồng bộ MyInvoice:", error);
        return { success: false, error: error.message };
    }
}