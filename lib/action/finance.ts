"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { transactionSchema, TransactionFormValues } from "@/lib/schemas/finance";
import { startOfMonth, subMonths, format } from "date-fns";


// 1. Lấy danh sách danh mục
export async function getFinanceCategories() {
    const supabase = await createClient();
    const { data } = await supabase.from("finance_categories").select("*").order("name");
    return data || [];
}

// 2. TẠO GIAO DỊCH THU/CHI (Chung cho cả Nội bộ & Dự án)
export async function createTransactionAction(data: TransactionFormValues) {
    const supabase = await createClient();
    const validated = transactionSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Dữ liệu không hợp lệ." };
    const payload = validated.data;

    try {
        const { error } = await supabase.from("finance_transactions").insert({
            amount: payload.amount,
            type: payload.type, // 'income' hoặc 'expense'
            category_id: payload.category_id,
            transaction_date: payload.transaction_date.toISOString(),
            description: payload.description,
            project_id: payload.project_id || null,
            // customer_id: payload.customer_id || null, // Nếu có quản lý KH
            payment_method: "cash", // Mặc định hoặc thêm field chọn
            created_at: new Date().toISOString(),
        });

        if (error) throw new Error(error.message);

        revalidatePath("/finance");
        if (payload.project_id) revalidatePath(`/projects/${payload.project_id}`);
        return { success: true, message: "Đã tạo phiếu thành công!" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 3. LẤY DANH SÁCH GIAO DỊCH (Đã hợp nhất)
export async function getTransactions() {
    const supabase = await createClient();

    // Join: transactions -> projects -> customers
    const { data, error } = await supabase
        .from("finance_transactions")
        .select(`
            *, 
            category:finance_categories (id, name, color, type), 
            
            project:projects (
                id, name, code, address,
                customer:customers (name, contact_person, address) 
            ),
            
            invoice:procurement_invoices (
                invoice_number, 
                po:purchase_orders (
                    supplier:suppliers (name, address, contact_person)
                )
            )
        `)
        .order("transaction_date", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Lỗi getTransactions:", JSON.stringify(error, null, 2));
        return [];
    }
    return data || [];
}

// 4. Lấy thống kê Thu/Chi 6 tháng
export async function getMonthlyStats() {
    const supabase = await createClient();
    const startDate = startOfMonth(subMonths(new Date(), 5)).toISOString();

    const { data } = await supabase
        .from("finance_transactions")
        .select("amount, type, transaction_date")
        .gte("transaction_date", startDate)
        .order("transaction_date", { ascending: true });

    const monthlyData: Record<string, { name: string; income: number; expense: number }> = {};
    for (let i = 0; i < 6; i++) {
        const date = subMonths(new Date(), i);
        const key = format(date, "MM/yyyy");
        monthlyData[key] = { name: `T${format(date, "MM")}`, income: 0, expense: 0 };
    }

    data?.forEach((item) => {
        const key = format(new Date(item.transaction_date), "MM/yyyy");
        if (monthlyData[key]) {
            item.type === 'income' ? monthlyData[key].income += Number(item.amount) : monthlyData[key].expense += Number(item.amount);
        }
    });

    return Object.values(monthlyData).reverse();
}

// 5. Lấy danh sách dự án cho dropdown
export async function getProjectsForSelect() {
    const supabase = await createClient();
    const { data } = await supabase.from("projects").select("id, name, code, status_id").order("created_at", { ascending: false });
    return data || [];
}

// 6. Lấy thống kê tài chính dự án (CẬP NHẬT ĐỂ DÙNG BẢNG ĐÚNG)
export async function getProjectFinanceStats(projectId: string) {
    const supabase = await createClient();

    // 1. Doanh thu (Hợp đồng) - Giữ nguyên
    const { data: contracts } = await supabase
        .from('contracts')
        .select('value')
        .eq('project_id', projectId)
        .neq('status', 'cancelled');

    // 2. Thực thu (CẬP NHẬT: Lấy từ finance_transactions type='income')
    const { data: incomes } = await supabase
        .from('finance_transactions')
        .select('amount')
        .eq('project_id', projectId)
        .eq('type', 'income'); // ✅ Chỉ lấy khoản THU thực tế

    // 3. Thực chi (Lấy từ finance_transactions type='expense')
    const { data: expenses } = await supabase
        .from('finance_transactions')
        .select('amount')
        .eq('project_id', projectId)
        .eq('type', 'expense');

    // 4. Lấy thông tin nợ đọng (Milestones quá hạn)
    const today = new Date().toISOString();
    const { count: overdueCount } = await supabase
        .from('payment_milestones')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending') // Chưa thanh toán
        .lt('due_date', today)   // Quá hạn
        .not('due_date', 'is', null);

    // 5. Tính toán
    const totalRevenue = contracts?.reduce((sum, item) => sum + (Number(item.value) || 0), 0) || 0;

    // ✅ Tính tổng thu từ bảng giao dịch
    const actualReceived = incomes?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

    // ✅ Tính tổng chi từ bảng giao dịch
    const cashCost = expenses?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

    const profit = actualReceived - cashCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const remainingDebt = totalRevenue - actualReceived;

    return {
        totalRevenue,
        actualReceived,
        totalCost: cashCost,
        profit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        remainingDebt,
        overdueCount: overdueCount || 0,
        contractValue: totalRevenue
    };
}

// 7. Thanh toán nhanh đơn PO
export async function createPaymentForPO(poId: string, amount: number, paymentMethod: string, notes: string) {
    const supabase = await createClient();
    const { data: po } = await supabase.from('purchase_orders').select('id, code, project_id').eq('id', poId).single();
    if (!po) return { success: false, error: "Không tìm thấy đơn hàng" };

    const { error } = await supabase.from('finance_transactions').insert({
        amount, type: 'expense', transaction_date: new Date().toISOString(),
        description: `Thanh toán đơn hàng ${po.code}. ${notes}`,
        project_id: po.project_id, po_id: po.id, payment_method: paymentMethod, created_at: new Date().toISOString()
    });

    if (error) return { success: false, error: error.message };
    revalidatePath(`/procurement/orders/${poId}`);
    revalidatePath('/finance');
    return { success: true, message: "Đã thanh toán thành công!" };
}

// 8. Lấy danh sách PO chờ hóa đơn
export async function getPOsPendingInvoice() {
    const supabase = await createClient();
    const { data: pos } = await supabase
        .from('purchase_orders')
        .select(`id, code, created_at, total_amount, status, supplier:suppliers(name), invoices:procurement_invoices(id, total_amount)`)
        .in('status', ['received', 'partial_received'])
        .order('created_at', { ascending: false });

    if (!pos) return [];
    return pos.filter(po => {
        const invoicedTotal = po.invoices?.reduce((sum: any, inv: any) => sum + (Number(inv.total_amount) || 0), 0) || 0;
        return invoicedTotal < (Number(po.total_amount) || 0);
    });
}

// 9. Lấy danh sách Hóa đơn công nợ
export async function getPayableInvoices() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('procurement_invoices')
        .select(`*, po:purchase_orders(code, project_id, project:projects(name)), supplier:purchase_orders(supplier:suppliers(name, bank_name, bank_account))`)
        .order('created_at', { ascending: false });
    return data || [];
}

// 10. Tạo hóa đơn đầu vào
export async function createSupplierInvoiceAction(payload: any) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        let employeeId = null;
        if (user) {
            const { data: emp } = await supabase.from('employees').select('id').eq('auth_id', user.id).single();
            employeeId = emp?.id || null;
        }

        // 1. Lưu Hóa đơn vào bảng theo dõi
        const { data: invoice, error: invErr } = await supabase.from('procurement_invoices').insert({
            po_id: payload.po_id,
            invoice_number: payload.invoice_number,
            invoice_date: payload.invoice_date,
            invoice_type: payload.invoice_type,
            subtotal: payload.subtotal,
            vat_percent: payload.vat_percent,
            vat_amount: payload.vat_amount,
            total_amount: payload.total_amount,
            paid_amount: 0,
            payment_status: 'pending'
        }).select().single();

        if (invErr) throw new Error("Lỗi tạo hóa đơn: " + invErr.message);

        // 2. Kéo thông tin PO để lấy ID Dự án & ID Nhà cung cấp
        const { data: po } = await supabase.from('purchase_orders').select('project_id, supplier_id').eq('id', payload.po_id).single();

        // =========================================================
        // 3. HẠCH TOÁN KẾ TOÁN (BÚT TOÁN GHI NHẬN CÔNG NỢ)
        // NỢ TK 154: Chi phí dự án (Tạm gộp cả VAT vào chi phí)
        // CÓ TK 331: Phải trả người bán
        // =========================================================
        const { data: acc154 } = await supabase.from('accounting_accounts').select('id').eq('code', '154').single();
        const { data: acc331 } = await supabase.from('accounting_accounts').select('id').eq('code', '331').single();

        if (acc154 && acc331) {
            const jeCode = `AP-${Date.now().toString().slice(-6)}`;
            const { data: je } = await supabase.from('journal_entries').insert({
                entry_number: jeCode,
                entry_date: payload.invoice_date,
                description: `Ghi nhận công nợ vật tư theo HĐ ${payload.invoice_number}`,
                project_id: po?.project_id,
                reference_type: 'invoice',
                reference_id: invoice.id,
                created_by: employeeId
            }).select().single();

            if (je) {
                // Dòng NỢ (Tăng chi phí)
                await supabase.from('journal_entry_lines').insert({
                    journal_entry_id: je.id,
                    account_id: acc154.id,
                    debit: payload.total_amount,
                    credit: 0,
                    description: `Chi phí vật tư theo HĐ ${payload.invoice_number}`,
                    partner_type: 'supplier',
                    partner_id: po?.supplier_id,
                    project_id: po?.project_id
                });

                // Dòng CÓ (Tăng công nợ)
                await supabase.from('journal_entry_lines').insert({
                    journal_entry_id: je.id,
                    account_id: acc331.id,
                    debit: 0,
                    credit: payload.total_amount,
                    description: `Phải trả NCC theo HĐ ${payload.invoice_number}`,
                    partner_type: 'supplier',
                    partner_id: po?.supplier_id,
                    project_id: po?.project_id
                });
            }
        }

        return { success: true, message: "Đã lưu Hóa đơn và Hạch toán Công nợ vào Sổ cái!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 11. Thanh toán hóa đơn
export async function createPaymentToSupplierAction(payload: any) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        let employeeId = null;
        if (user) {
            const { data: emp } = await supabase.from('employees').select('id').eq('auth_id', user.id).single();
            employeeId = emp?.id || null;
        }

        // 1. Kéo thông tin Invoice và PO
        const { data: inv } = await supabase.from('procurement_invoices').select('*, po:po_id(project_id, supplier_id)').eq('id', payload.invoice_id).single();
        if (!inv) throw new Error("Không tìm thấy hóa đơn");

        // 2. Cập nhật trạng thái thanh toán trên Invoice
        const newPaid = Number(inv.paid_amount || 0) + Number(payload.amount);
        const newStatus = newPaid >= Number(inv.total_amount) ? 'paid' : 'partial';

        await supabase.from('procurement_invoices').update({ paid_amount: newPaid, payment_status: newStatus }).eq('id', inv.id);

        // =========================================================
        // 3. HẠCH TOÁN KẾ TOÁN (BÚT TOÁN THANH TOÁN TIỀN)
        // NỢ TK 331: Phải trả người bán (Giảm công nợ)
        // CÓ TK 111/112: Tiền mặt / Tiền gửi (Giảm quỹ)
        // =========================================================
        const accCashCode = payload.payment_method === 'transfer' ? '112' : '111';
        const { data: accCash } = await supabase.from('accounting_accounts').select('id').eq('code', accCashCode).single();
        const { data: acc331 } = await supabase.from('accounting_accounts').select('id').eq('code', '331').single();

        if (accCash && acc331) {
            const jeCode = `PC-${Date.now().toString().slice(-6)}`;
            const { data: je } = await supabase.from('journal_entries').insert({
                entry_number: jeCode,
                entry_date: payload.payment_date,
                description: payload.notes || `Thanh toán HĐ ${inv.invoice_number}`,
                project_id: inv.po?.project_id,
                reference_type: 'payment',
                reference_id: inv.id,
                created_by: employeeId
            }).select().single();

            if (je) {
                // NỢ 331: Giảm nợ
                await supabase.from('journal_entry_lines').insert({
                    journal_entry_id: je.id,
                    account_id: acc331.id,
                    debit: payload.amount,
                    credit: 0,
                    description: `Thanh toán HĐ ${inv.invoice_number} (Giảm nợ)`,
                    partner_type: 'supplier',
                    partner_id: inv.po?.supplier_id,
                    project_id: inv.po?.project_id
                });

                // CÓ 111/112: Giảm quỹ
                await supabase.from('journal_entry_lines').insert({
                    journal_entry_id: je.id,
                    account_id: accCash.id,
                    debit: 0,
                    credit: payload.amount,
                    description: payload.notes || `Chi tiền thanh toán HĐ ${inv.invoice_number}`,
                    partner_type: 'supplier',
                    partner_id: inv.po?.supplier_id,
                    project_id: inv.po?.project_id
                });
            }
        }

        return { success: true, message: "Đã chi tiền và Hạch toán giảm nợ thành công!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// =========================================================
// PHẦN BỔ SUNG: QUẢN LÝ TIẾN ĐỘ THANH TOÁN (ĐÃ FIX: DÙNG CONTRACT_PAYMENT_MILESTONES)
// =========================================================

// 12. Lấy Danh sách Hợp đồng & Milestones
export async function getProjectContracts(projectId: string) {
    const supabase = await createClient();

    const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
            id, 
            contract_number, 
            title,
            value, 
            signed_at,
            is_addendum,
            parent_id,
            payment_milestones (
                id,
                name,
                percentage,
                amount,
                due_date,
                status,
                paid_date,
                note
            )
        `)
        .eq('project_id', projectId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Lỗi lấy hợp đồng:", error);
        return [];
    }

    return contracts || [];
}

// 13. Upsert Milestone (Vào bảng payment_milestones)
export async function upsertPaymentMilestone(data: any, projectId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('payment_milestones')
        .upsert({
            id: data.id || undefined,
            contract_id: data.contract_id,
            name: data.name,
            percentage: data.percentage,
            amount: data.amount,
            due_date: data.due_date,
            status: data.status,
            paid_date: data.paid_date
        });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// 14. Xóa Milestone
export async function deletePaymentMilestone(id: string, projectId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('payment_milestones').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// 15. Đổi trạng thái thanh toán (Toggle status string)
export async function toggleMilestoneStatus(id: string, projectId: string, newStatus: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('payment_milestones')
        .update({
            status: newStatus,
            paid_date: newStatus === 'paid' ? new Date().toISOString() : null
        })
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// 16. Lấy tất cả các khoản phải thu (Pending Milestones) cho trang Tài chính
export async function getAllReceivables() {
    const supabase = await createClient();

    // ✅ FIX: Chỉ định rõ relationship 'projects!contracts_project_id_fkey'
    // Để Supabase biết ta muốn join qua cột 'project_id' của bảng contracts
    const { data, error } = await supabase
        .from('payment_milestones')
        .select(`
            *,
            contracts (
                id, 
                contract_number, 
                projects!contracts_project_id_fkey (
                    id, 
                    name
                )
            )
        `)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

    if (error) {
        console.error("Lỗi lấy khoản phải thu:", JSON.stringify(error, null, 2));
        return [];
    }
    return data || [];
}

// BỔ SUNG: Hàm cập nhật giao dịch (Hiệu chỉnh phiếu)
export async function updateTransactionAction(id: string, data: any) {
    const supabase = await createClient();

    try {
        const { error } = await supabase
            .from('finance_transactions')
            .update({
                description: data.description,
                transaction_date: data.transaction_date,
                amount: data.amount, // Cho phép sửa số tiền nếu cần
                // Nếu DB có cột recipient_name, recipient_address thì thêm vào đây
            })
            .eq('id', id);

        if (error) throw new Error(error.message);

        revalidatePath('/finance');
        return { success: true, message: "Đã cập nhật phiếu!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// =====================================================================
// [CASHBOOK] 1. KÉO DỮ LIỆU ĐỀ NGHỊ & TÀI KHOẢN KẾ TOÁN
// =====================================================================
export async function getAccountingAccounts() {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.from('accounting_accounts').select('*').eq('is_active', true).order('code');
    return data || [];
}

export async function getPaymentRequests() {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Kéo các Đề nghị thu chi kèm theo thông tin người lập và dự án
    const { data } = await supabase
        .from('payment_requests')
        .select(`
            *,
            project:project_id(id, name, code),
            requester:requester_id(id, name)
        `)
        .order('created_at', { ascending: false });
    return data || [];
}

// =====================================================================
// [CASHBOOK] 2. BƯỚC 1: LẬP ĐỀ NGHỊ THU/CHI (NHÂN VIÊN)
// =====================================================================
export async function createPaymentRequestAction(payload: any) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        const { data: emp } = await supabase.from('employees').select('id').eq('auth_id', user?.id).single();
        const prefix = payload.type === 'payment' ? 'DNC' : payload.type === 'receipt' ? 'DNT' : 'TU';
        const requestCode = `${prefix}-${Date.now().toString().slice(-6)}`;

        const { error } = await supabase.from('payment_requests').insert({
            request_code: requestCode,
            request_type: payload.type,
            amount: payload.amount,
            description: payload.description,
            partner_name: payload.partner_name,
            project_id: payload.project_id || null,
            status: 'pending_approval', // Vừa tạo xong là chờ sếp duyệt luôn
            requester_id: emp?.id
        });

        if (error) throw new Error(error.message);
        return { success: true, message: "Đã gửi Đề nghị thành công, chờ Phê duyệt!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// =====================================================================
// [CASHBOOK] 3. BƯỚC 2: PHÊ DUYỆT / TỪ CHỐI (GIÁM ĐỐC / KẾ TOÁN TRƯỞNG)
// =====================================================================
export async function processPaymentRequestAction(requestId: string, status: 'approved' | 'rejected') {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        const { data: emp } = await supabase.from('employees').select('id').eq('auth_id', user?.id).single();

        const { error } = await supabase.from('payment_requests').update({
            status: status,
            approver_id: emp?.id,
            approved_at: new Date().toISOString()
        }).eq('id', requestId);

        if (error) throw new Error(error.message);
        return { success: true, message: status === 'approved' ? "Đã PHÊ DUYỆT đề nghị!" : "Đã TỪ CHỐI đề nghị!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// =====================================================================
// [CASHBOOK] 4. BƯỚC 3: GIẢI NGÂN & SINH BÚT TOÁN (THỦ QUỸ)
// =====================================================================
export async function executePaymentRequestAction(requestId: string, debitAccId: string, creditAccId: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        const { data: emp } = await supabase.from('employees').select('id').eq('auth_id', user?.id).single();

        // 1. Kéo thông tin phiếu
        const { data: req } = await supabase.from('payment_requests').select('*').eq('id', requestId).single();
        if (!req) throw new Error("Không tìm thấy Phiếu yêu cầu!");
        if (req.status !== 'approved') throw new Error("Phiếu này chưa được duyệt hoặc đã xử lý!");

        // 2. Tạo Header Chứng từ (Sổ Nhật ký chung)
        const prefix = req.request_type === 'receipt' ? 'PT' : 'PC'; // Phiếu Thu / Phiếu Chi
        const jeCode = `${prefix}-${Date.now().toString().slice(-6)}`;

        const { data: je, error: jeErr } = await supabase.from('journal_entries').insert({
            entry_number: jeCode,
            entry_date: new Date().toISOString(),
            description: req.description,
            project_id: req.project_id,
            reference_type: 'payment_request',
            reference_id: req.id,
            created_by: emp?.id
        }).select().single();

        if (jeErr) throw new Error("Lỗi tạo Bút toán: " + jeErr.message);

        // 3. Đổ 2 dòng Nợ / Có vào chi tiết Bút toán
        if (je) {
            // Dòng NỢ
            await supabase.from('journal_entry_lines').insert({
                journal_entry_id: je.id,
                account_id: debitAccId,
                debit: req.amount,
                credit: 0,
                description: req.description,
                project_id: req.project_id
            });

            // Dòng CÓ
            await supabase.from('journal_entry_lines').insert({
                journal_entry_id: je.id,
                account_id: creditAccId,
                debit: 0,
                credit: req.amount,
                description: req.description,
                project_id: req.project_id
            });
        }

        // 4. Khóa Phiếu yêu cầu lại thành "completed"
        await supabase.from('payment_requests').update({
            status: 'completed',
            executor_id: emp?.id,
            executed_at: new Date().toISOString(),
            journal_entry_id: je?.id
        }).eq('id', requestId);

        return { success: true, message: "Đã giải ngân và Ghi Sổ Cái thành công!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// =====================================================================
// [JOURNAL] KÉO DỮ LIỆU SỔ NHẬT KÝ CHUNG (KÈM CHI TIẾT NỢ/CÓ)
// =====================================================================
export async function getJournalEntries() {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data } = await supabase
        .from('journal_entries')
        .select(`
            id, entry_number, entry_date, description, reference_type,
            project:project_id(id, name, code),
            creator:created_by(id, name),
            lines:journal_entry_lines(
                id, debit, credit, description,
                account:account_id(code, name)
            )
        `)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

    return data || [];
}

// =====================================================================
// [TAX] KÉO DỮ LIỆU HÓA ĐƠN GTGT (ĐẦU VÀO & ĐẦU RA)
// =====================================================================
export async function getVatInvoices() {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // 1. Kéo Hóa đơn ĐẦU VÀO (Mua hàng) có thuế VAT
    const { data: inputVat } = await supabase
        .from('procurement_invoices')
        .select(`
            id, invoice_number, invoice_date, subtotal, vat_percent, vat_amount, total_amount,
            po:po_id(
                supplier:supplier_id(name, tax_code)
            )
        `)
        .eq('invoice_type', 'VAT')
        .order('invoice_date', { ascending: false });

    // 2. Kéo Hóa đơn ĐẦU RA (Bán hàng) - Tạm thời trả mảng rỗng nếu anh chưa có bảng sales_invoices
    // Nếu anh có bảng xuất hóa đơn cho CĐT, có thể query tương tự ở đây.
    const outputVat: any[] = [];

    return {
        inputVat: inputVat || [],
        outputVat: outputVat
    };
}

// =====================================================================
// [REPORTS] KÉO DỮ LIỆU BÁO CÁO LÃI LỖ (P&L) TỪ SỔ CÁI
// =====================================================================
export async function getPnLReport(projectId?: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        let query = supabase.from('journal_entry_lines').select(`
            debit, credit,
            account:account_id(code, name, account_type)
        `);

        // Nếu có lọc theo dự án (để tính lãi/lỗ riêng cho công trình đó)
        if (projectId && projectId !== 'all') {
            query = query.eq('project_id', projectId);
        }

        const { data: lines, error } = await query;
        if (error) throw new Error(error.message);

        // Khởi tạo các nhóm báo cáo
        let revenue = 0;      // 511: Doanh thu
        let directCost = 0;   // 154, 632: Chi phí trực tiếp công trình (vật tư, nhân công)
        let overheadCost = 0; // 642: Chi phí quản lý doanh nghiệp (văn phòng, tiếp khách)

        const accountDetails: Record<string, { code: string, name: string, balance: number }> = {};

        // Phân tích sâu định khoản
        (lines || []).forEach((line: any) => {
            const accCode = line.account?.code;
            if (!accCode) return;

            // Cộng dồn theo từng mã tài khoản
            if (!accountDetails[accCode]) {
                accountDetails[accCode] = { code: accCode, name: line.account.name, balance: 0 };
            }

            // Với Doanh thu (511): Tăng bên Có, Giảm bên Nợ
            if (accCode.startsWith('511')) {
                const amount = Number(line.credit) - Number(line.debit);
                revenue += amount;
                accountDetails[accCode].balance += amount;
            }

            // Với Chi phí (154, 632, 642): Tăng bên Nợ, Giảm bên Có
            else if (accCode.startsWith('154') || accCode.startsWith('632') || accCode.startsWith('642')) {
                const amount = Number(line.debit) - Number(line.credit);
                if (accCode.startsWith('642')) {
                    overheadCost += amount;
                } else {
                    directCost += amount;
                }
                accountDetails[accCode].balance += amount;
            }
        });

        // Tính toán các chỉ số
        const grossProfit = revenue - directCost; // Lợi nhuận gộp (Lãi công trình)
        const netProfit = grossProfit - overheadCost; // Lợi nhuận ròng (Lãi thực tế)
        const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0; // Biên biên LN gộp

        return {
            success: true,
            data: {
                revenue,
                directCost,
                overheadCost,
                grossProfit,
                netProfit,
                grossMargin,
                details: Object.values(accountDetails).sort((a, b) => a.code.localeCompare(b.code))
            }
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// =====================================================================
// [DASHBOARD] KÉO CÁC CHỈ SỐ TỔNG QUAN (TIỀN, CÔNG NỢ) TỪ SỔ CÁI
// =====================================================================
export async function getFinanceDashboardData() {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        // Kéo danh mục tài khoản để map ID -> Code
        const { data: accounts } = await supabase.from('accounting_accounts').select('id, code');
        const accMap = (accounts || []).reduce((acc: any, curr: any) => {
            acc[curr.id] = curr.code;
            return acc;
        }, {});

        // Kéo toàn bộ phát sinh Nợ/Có
        const { data: lines } = await supabase.from('journal_entry_lines').select('account_id, debit, credit');

        let totalCash = 0; // Quỹ tiền (111, 112)
        let totalAR = 0;   // Phải thu KH (131)
        let totalAP = 0;   // Phải trả NCC (331)

        (lines || []).forEach((line: any) => {
            const code = accMap[line.account_id];
            if (!code) return;

            const debit = Number(line.debit || 0);
            const credit = Number(line.credit || 0);

            // Tiền: Số dư Nợ (Nợ - Có)
            if (code.startsWith('111') || code.startsWith('112')) {
                totalCash += (debit - credit);
            }
            // Phải thu: Số dư Nợ (Nợ - Có)
            else if (code.startsWith('131')) {
                totalAR += (debit - credit);
            }
            // Phải trả: Số dư Có (Có - Nợ)
            else if (code.startsWith('331')) {
                totalAP += (credit - debit);
            }
        });

        return { success: true, data: { totalCash, totalAR, totalAP } };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}