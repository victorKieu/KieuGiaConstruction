"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { transactionSchema, TransactionFormValues } from "@/lib/schemas/finance";
import { startOfMonth, subMonths, format } from "date-fns";
import { getUserProfile } from "@/lib/supabase/getUserProfile";


// 1. Lấy danh sách dự án cho dropdown
export async function getProjectsForSelect() {
    const supabase = await createClient();
    const { data } = await supabase.from("projects").select("id, name, code, status_id").order("created_at", { ascending: false });
    return data || [];
}

// 2. Lấy danh sách PO chờ hóa đơn
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

// 3. Lấy danh sách Hóa đơn công nợ
export async function getPayableInvoices() {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('procurement_invoices')
            .select(`
                *,
                suppliers (name),
                projects (name),
                po:purchase_orders (
                    code,
                    projects (name),
                    suppliers (name)
                ),
                payment_requests (amount, status)  // <--- THÊM DÒNG NÀY ĐỂ LẤY CÁC PHIẾU ĐANG CHỜ
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Lỗi kéo dữ liệu hóa đơn:", error.message);
            return [];
        }

        return data || [];
    } catch (e: any) {
        console.error("Lỗi hệ thống khi lấy hóa đơn:", e.message);
        return [];
    }
}

// 4. Tạo hóa đơn đầu vào
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

// 5. Thanh toán hóa đơn
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

// 6. Lấy Danh sách Hợp đồng & Milestones
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

// 7. Upsert Milestone (Vào bảng payment_milestones)
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

// 8. Xóa Milestone
export async function deletePaymentMilestone(id: string, projectId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('payment_milestones').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// 9. Đổi trạng thái thanh toán (Toggle status string)
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

// 10. Lấy tất cả các khoản phải thu (Pending Milestones) cho trang Tài chính
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
                    customer:customer_id(id, name, tax_code),
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
            invoice_id: payload.invoice_id || null, // BỔ SUNG: Lưu ID hóa đơn để sau này đối chiếu
            status: 'pending_approval',
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
export async function executePaymentRequestAction(requestId: string, debitAccId: string, creditAccId: string, actualAmount?: number) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        let employeeId = null;
        if (user) {
            const { data: emp } = await supabase.from('employees').select('id').eq('auth_id', user.id).limit(1).maybeSingle();
            employeeId = emp?.id || null;
        }

        // 1. Kéo thông tin phiếu đề nghị lên
        const { data: req } = await supabase.from('payment_requests').select('*').eq('id', requestId).single();
        if (!req) throw new Error("Không tìm thấy phiếu đề nghị!");
        if (req.status === 'executed' || req.status === 'paid') throw new Error("Phiếu này đã được giải ngân trước đó!");

        // Chốt số tiền thực tế (Nếu Frontend không gửi thì lấy số gốc)
        const finalAmount = (actualAmount !== undefined && actualAmount > 0) ? actualAmount : Number(req.amount);

        // 2. Chuyển trạng thái phiếu thành "Đã giải ngân" & Cập nhật lại số tiền đúng với thực tế
        await supabase.from('payment_requests').update({
            status: 'executed',
            executed_at: new Date().toISOString(),
            amount: finalAmount // <--- Ghi đè lại số tiền thực tế thủ quỹ đã chi
        }).eq('id', requestId);

        // 3. GHI SỔ CÁI (DÙNG SỐ TIỀN THỰC TẾ finalAmount)
        const { data: je } = await supabase.from('journal_entries').insert({
            entry_number: `PT-${Date.now().toString().slice(-6)}`,
            entry_date: new Date().toISOString().split('T')[0],
            description: `Giải ngân phiếu: ${req.request_code} - ${req.description}`,
            status: 'posted',
            reference_type: 'payment_request',
            reference_id: req.id,
            project_id: req.project_id,
            created_by: employeeId
        }).select().single();

        if (je) {
            await supabase.from('journal_entry_lines').insert({
                journal_entry_id: je.id, account_id: debitAccId, debit: finalAmount, credit: 0,
                description: req.description, project_id: req.project_id
            });
            await supabase.from('journal_entry_lines').insert({
                journal_entry_id: je.id, account_id: creditAccId, debit: 0, credit: finalAmount,
                description: req.description, project_id: req.project_id
            });
        }

        // 4. CẤN TRỪ CÔNG NỢ HÓA ĐƠN (DÙNG SỐ TIỀN THỰC TẾ finalAmount)
        if (req.invoice_id) {
            const { data: inv } = await supabase.from('procurement_invoices').select('paid_amount, total_amount').eq('id', req.invoice_id).single();

            if (inv) {
                const newPaidAmount = Number(inv.paid_amount || 0) + Number(finalAmount);
                let newStatus = 'partial';

                if (newPaidAmount >= Number(inv.total_amount)) {
                    newStatus = 'paid';
                }

                await supabase.from('procurement_invoices').update({
                    paid_amount: newPaidAmount,
                    payment_status: newStatus
                }).eq('id', req.invoice_id);
            }
        }

        return { success: true, message: `Giải ngân thành công ${new Intl.NumberFormat('vi-VN').format(finalAmount)}đ và đã ghi sổ cái!` };
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

    // 1. Kéo Hóa đơn ĐẦU VÀO
    const { data: inputVat } = await supabase
        .from('procurement_invoices')
        .select(`
            id, invoice_number, invoice_date, subtotal, vat_percent, vat_amount, total_amount,
            direct_supplier:supplier_id(name, tax_code),
            po:po_id(
                supplier:supplier_id(name, tax_code)
            )
        `)
        .eq('invoice_type', 'VAT')
        .order('invoice_date', { ascending: false });

    // 2. Kéo Hóa đơn ĐẦU RA (Như anh đã viết)
    const { data: outputVat } = await supabase
        .from('sales_invoices')
        .select(`id, invoice_number, invoice_date, subtotal, vat_percent, vat_amount, total_amount, customer:customer_id(name, tax_code)`)
        .order('invoice_date', { ascending: false });

    return { inputVat: inputVat || [], outputVat: outputVat || [] };
}

// =====================================================================
// [REPORTS] KÉO DỮ LIỆU BÁO CÁO LÃI LỖ (P&L) TỪ SỔ CÁI
// =====================================================================
export async function getPnLReport(projectId?: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        // 1. Kéo toàn bộ các bút toán Sổ cái (ĐÃ DUYỆT)
        // JOIN qua journal_entries để lấy status và account_id để phân loại
        let query = supabase
            .from('journal_entry_lines')
            .select(`
                debit,
                credit,
                project_id,
                accounting_accounts!inner(code, name),
                journal_entries!inner(status)
            `)
            .eq('journal_entries.status', 'posted'); // CHỈ LẤY BÚT TOÁN ĐÃ GHI SỔ

        // 2. Lọc theo dự án (Nếu có)
        if (projectId && projectId !== 'all') {
            query = query.eq('project_id', projectId);
        }

        const { data: lines, error } = await query;

        if (error) {
            console.error("Lỗi truy vấn Sổ cái:", error.message);
            throw error;
        }

        // 3. Khởi tạo các biến chứa (Chạy vòng lặp cộng dồn)
        let revenue = 0;       // TK 511
        let directCost = 0;    // TK 154 (Chi phí trực tiếp)
        let overheadCost = 0;  // TK 642 (Chi phí quản lý DN)

        // Dùng một Object để gom nhóm số tiền theo từng mã Tài khoản
        const detailsMap: Record<string, { code: string, name: string, balance: number }> = {};

        (lines || []).forEach((line: any) => {
            const code = line.accounting_accounts.code;
            const name = line.accounting_accounts.name;
            const debit = Number(line.debit) || 0;
            const credit = Number(line.credit) || 0;

            if (!detailsMap[code]) {
                detailsMap[code] = { code, name, balance: 0 };
            }

            // --- NGUYÊN LÝ KẾ TOÁN ---
            if (code.startsWith('511')) {
                // DOANH THU: Tăng ghi Có, Giảm ghi Nợ
                const netAmount = credit - debit;
                revenue += netAmount;
                detailsMap[code].balance += netAmount;
            }
            else if (code.startsWith('154')) {
                // CHI PHÍ TRỰC TIẾP: Tăng ghi Nợ, Giảm ghi Có
                const netAmount = debit - credit;
                directCost += netAmount;
                detailsMap[code].balance += netAmount;
            }
            else if (code.startsWith('642') || code.startsWith('811')) {
                // CHI PHÍ QUẢN LÝ / KHÁC: Tăng ghi Nợ, Giảm ghi Có
                const netAmount = debit - credit;
                overheadCost += netAmount;
                detailsMap[code].balance += netAmount;
            }
        });

        // 4. Tính toán các chỉ số KPI tài chính (P&L)
        const grossProfit = revenue - directCost;                 // Lợi nhuận gộp
        const netProfit = grossProfit - overheadCost;             // Lợi nhuận ròng
        const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0; // Biên LN Gộp (%)

        // 5. Ép Object detailsMap thành Mảng và chỉ hiển thị TK có phát sinh tiền
        const details = Object.values(detailsMap)
            .filter(d => d.balance !== 0) // Lọc bỏ TK dư 0đ
            .sort((a, b) => a.code.localeCompare(b.code)); // Sắp xếp theo mã TK (154 -> 511 -> 642)

        return {
            success: true,
            data: {
                revenue,
                directCost,
                overheadCost,
                grossProfit,
                netProfit,
                grossMargin,
                details
            }
        };

    } catch (e: any) {
        console.error("Lỗi tính toán Báo cáo P&L:", e.message);
        // Trả về số 0 nếu lỗi để giao diện không bị sập
        return {
            success: false,
            data: { revenue: 0, directCost: 0, overheadCost: 0, grossProfit: 0, netProfit: 0, grossMargin: 0, details: [] }
        };
    }
}

// =====================================================================
// [DASHBOARD] KÉO CÁC CHỈ SỐ TỔNG QUAN (TIỀN, CÔNG NỢ) TỪ SỔ CÁI
// =====================================================================
export async function getFinanceDashboardData() {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        // =========================================================
        // PHẦN 1: TÍNH TOÁN 4 CHỈ SỐ TỔNG QUAN (GIỮ NGUYÊN LOGIC CŨ LÀ CHUẨN NHẤT)
        // =========================================================
        const { data: accounts } = await supabase.from('accounting_accounts').select('id, code');
        const accMap = (accounts || []).reduce((acc: any, curr: any) => {
            acc[curr.id] = curr.code;
            return acc;
        }, {});

        const { data: lines } = await supabase.from('journal_entry_lines').select('account_id, debit, credit');

        let totalCash = 0; // Quỹ tiền (111, 112)
        let totalAR = 0;   // Phải thu KH (131)
        let totalAP = 0;   // Phải trả NCC (331)

        (lines || []).forEach((line: any) => {
            const code = accMap[line.account_id];
            if (!code) return;

            const debit = Number(line.debit || 0);
            const credit = Number(line.credit || 0);

            if (code.startsWith('111') || code.startsWith('112')) {
                totalCash += (debit - credit);
            } else if (code.startsWith('131')) {
                totalAR += (debit - credit);
            } else if (code.startsWith('331')) {
                totalAP += (credit - debit);
            }
        });

        // =========================================================
        // PHẦN 2: TÍNH TOÁN DỮ LIỆU BIỂU ĐỒ (LUÂN CHUYỂN DÒNG TIỀN)
        // =========================================================

        // Kéo các phiếu thu/chi đã hoàn tất
        const { data: requests } = await supabase
            .from('payment_requests')
            .select('amount, request_type, status, created_at, executed_at')
            .in('status', ['executed', 'approved', 'paid', 'completed', 'success']);

        // Khởi tạo mảng 6 tháng gần nhất cho biểu đồ
        const monthlyMap = new Map<string, { name: string, income: number, expense: number }>();
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthName = `T${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
            monthlyMap.set(monthKey, { name: monthName, income: 0, expense: 0 });
        }

        // Đổ dữ liệu vào các tháng tương ứng
        (requests || []).forEach((req: any) => {
            const typeStr = req.request_type?.toLowerCase() || '';
            const isIncome = ['income', 'thu', 'receipt', 'ar'].includes(typeStr);
            const isExpense = ['expense', 'chi', 'payment', 'ap'].includes(typeStr);

            const amount = Number(req.amount || 0);
            // Ưu tiên ngày thực chi/thu, nếu không có thì lấy ngày tạo phiếu
            const dateToUse = req.executed_at || req.created_at;

            if (!dateToUse) return;

            const d = new Date(dateToUse);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            if (monthlyMap.has(monthKey)) {
                const m = monthlyMap.get(monthKey)!;
                if (isIncome) m.income += amount;
                if (isExpense) m.expense += amount;
            }
        });

        // Trả về cấu trúc mà UI của anh đang chờ đợi
        return {
            success: true,
            data: {
                stats: { totalCash, totalAR, totalAP },
                monthlyStats: Array.from(monthlyMap.values())
            }
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// =====================================================================
// [TAX / AP] ĐỒNG BỘ HÀNG LOẠT HÓA ĐƠN XML VÀO SỔ CÁI (KẾ TOÁN KÉP)
// =====================================================================
export async function syncXMLEntriesAction(invoices: any[], projectId?: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        // 1. Lấy employeeId an toàn (không dùng .single() để tránh crash nếu user là GUEST)
        let employeeId = null;
        if (user) {
            const { data: emp } = await supabase.from('employees').select('id').eq('auth_id', user.id).limit(1).maybeSingle();
            employeeId = emp?.id || null;
        }

        const { data: acc154 } = await supabase.from('accounting_accounts').select('id').eq('code', '154').maybeSingle();
        const { data: acc331 } = await supabase.from('accounting_accounts').select('id').eq('code', '331').maybeSingle();

        if (!acc154 || !acc331) throw new Error("Hệ thống chưa cấu hình Tài khoản 154 hoặc 331!");

        let syncSuccessCount = 0;
        let duplicateCount = 0;
        let errorMessages: string[] = []; // Túi chứa lỗi để báo cáo ra màn hình

        for (const inv of invoices) {
            const uniqueEntryNumber = `HDDV-${inv.invoiceNumber}`;
            const { data: existingJE } = await supabase.from('journal_entries').select('id').eq('entry_number', uniqueEntryNumber).maybeSingle();

            if (existingJE) {
                duplicateCount++;
                continue;
            }

            // 2. TẠO HOẶC TÌM NHÀ CUNG CẤP (SUPPLIER) an toàn
            let supplierId = null;

            // Ép kiểu an toàn sang String để chống lỗi "trim is not a function"
            const safeTaxCode = inv.sellerTaxCode ? String(inv.sellerTaxCode).trim() : '';

            if (safeTaxCode !== '') {
                // Dùng limit(1) để tránh crash nếu có nhiều NCC bị trùng MST
                const { data: supplier, error: findSuppErr } = await supabase
                    .from('suppliers')
                    .select('id')
                    .eq('tax_code', safeTaxCode)
                    .limit(1)
                    .maybeSingle();

                if (supplier) {
                    supplierId = supplier.id;
                } else {
                    const tempCode = `NCC-${Date.now().toString().slice(-6)}`;
                    const { data: newSupp, error: suppErr } = await supabase.from('suppliers').insert({
                        name: inv.sellerName ? String(inv.sellerName).trim() : "NCC từ Hóa đơn XML",
                        tax_code: safeTaxCode,
                        code: tempCode
                    }).select().single();

                    if (suppErr) {
                        errorMessages.push(`Lỗi tạo NCC [${inv.sellerName}]: ${suppErr.message}`);
                    }
                    supplierId = newSupp?.id || null;
                }
            }

            // 3. GÁN DỰ ÁN
            const finalProjectId = inv.project_id || projectId || null;

            // 4. TẠO HÓA ĐƠN (Đã dọn dẹp các cột gây nhiễu)
            const invoicePayload: any = {
                invoice_number: inv.invoiceNumber,
                invoice_date: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString() : new Date().toISOString(),
                invoice_type: 'VAT',
                subtotal: inv.subtotal,
                vat_percent: 10,
                vat_amount: inv.vatAmount,
                total_amount: inv.totalAmount,
                paid_amount: 0,
                payment_status: 'pending',
                supplier_id: supplierId,
                project_id: finalProjectId
            };

            const { data: newInvoice, error: invErr } = await supabase.from('procurement_invoices').insert(invoicePayload).select().single();

            // Nếu Hóa đơn lỗi -> Báo lỗi ra túi chứa và bỏ qua
            if (invErr) {
                errorMessages.push(`Lỗi tạo Hóa đơn [${inv.invoiceNumber}]: ${invErr.message}`);
                continue;
            }

            // 5. GHI NHẬN SỔ CÁI (KẾ TOÁN KÉP)
            const { data: je, error: jeErr } = await supabase.from('journal_entries').insert({
                entry_number: uniqueEntryNumber,
                entry_date: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                description: `Hạch toán HĐ đầu vào ${inv.invoiceNumber} - MST: ${inv.sellerTaxCode}`,
                status: 'posted',
                reference_type: 'invoice',
                reference_id: newInvoice?.id,
                project_id: finalProjectId,
                created_by: employeeId
            }).select().single();

            // Nếu Sổ cái lỗi -> Phải Thu hồi (Xóa) Hóa đơn vừa tạo để tránh rác DB
            if (jeErr) {
                errorMessages.push(`Lỗi ghi Sổ cái [${inv.invoiceNumber}]: ${jeErr.message}`);
                await supabase.from('procurement_invoices').delete().eq('id', newInvoice.id);
                continue;
            }

            if (je) {
                await supabase.from('journal_entry_lines').insert({
                    journal_entry_id: je.id, account_id: acc154.id, debit: inv.totalAmount, credit: 0,
                    description: `Chi phí HĐ ${inv.invoiceNumber}`, partner_type: 'supplier', partner_id: supplierId,
                    project_id: finalProjectId
                });
                await supabase.from('journal_entry_lines').insert({
                    journal_entry_id: je.id, account_id: acc331.id, debit: 0, credit: inv.totalAmount,
                    description: `Phải trả HĐ ${inv.invoiceNumber}`, partner_type: 'supplier', partner_id: supplierId,
                    project_id: finalProjectId
                });
                syncSuccessCount++;
            }
        }

        // KẾT LUẬN: Nếu có bất kỳ lỗi ngầm nào, ném toàn bộ ra Frontend
        if (errorMessages.length > 0) {
            return {
                success: false,
                error: `Đồng bộ được ${syncSuccessCount} hóa đơn. CÁC LỖI GẶP PHẢI:\n` + errorMessages.join("\n")
            };
        }

        let returnMessage = `Đồng bộ hoàn tất! Thành công: ${syncSuccessCount} hóa đơn.`;
        if (duplicateCount > 0) returnMessage += ` Bỏ qua ${duplicateCount} hóa đơn đã tồn tại.`;
        return { success: true, message: returnMessage };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// =====================================================================
// [CASHBOOK] 5. SỬA ĐỀ NGHỊ THU/CHI (Chỉ áp dụng khi chưa duyệt)
// =====================================================================
export async function updatePaymentRequestAction(id: string, payload: any) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        // 1. Lấy Profile từ hàm trung tâm
        const profile = await getUserProfile();
        if (!profile || !profile.isAuthenticated) throw new Error("Vui lòng đăng nhập lại!");

        const role = profile.role || '';
        const isAdmin = role === 'ADMIN' || role === 'DIRECTOR';

        // 2. Kiểm tra trạng thái hiện tại của phiếu
        const { data: req } = await supabase.from('payment_requests').select('status').eq('id', id).single();
        if (!req) throw new Error("Không tìm thấy phiếu!");

        const isLocked = ['executed', 'approved', 'paid', 'completed'].includes(req.status?.toLowerCase());

        // 3. CHỐT CHẶN BẢO MẬT
        if (isLocked && !isAdmin) {
            throw new Error(`Phiếu đã chốt! Quyền hiện tại của bạn (${role}) không được phép sửa số liệu.`);
        }

        // 4. Thực hiện cập nhật 
        const { error } = await supabase.from('payment_requests').update({
            request_type: payload.request_type || payload.type,
            amount: payload.amount,
            description: payload.description,
            partner_name: payload.partner_name,
            project_id: payload.project_id || null,
            created_at: payload.created_at ? new Date(payload.created_at).toISOString() : undefined
        }).eq('id', id);

        if (error) throw new Error(error.message);

        return { success: true, message: "Đã cập nhật số liệu phiếu thành công!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// =====================================================================
// [CASHBOOK] 6. XÓA ĐỀ NGHỊ THU/CHI (Chỉ áp dụng khi chưa duyệt)
// =====================================================================
export async function deletePaymentRequestAction(id: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        const { data: req } = await supabase.from('payment_requests').select('status').eq('id', id).single();
        if (!req) throw new Error("Không tìm thấy phiếu!");
        if (req.status === 'completed') throw new Error("Không thể xóa phiếu đã Ghi sổ cái!");

        const { error } = await supabase.from('payment_requests').delete().eq('id', id);
        if (error) throw new Error(error.message);

        return { success: true, message: "Đã xóa phiếu thành công!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// =====================================================================
// [AR] ĐỒNG BỘ HÓA ĐƠN ĐẦU RA TỪ MYINVOICE.VN VÀ HẠCH TOÁN DOANH THU
// =====================================================================
export async function syncMyInvoiceDataAction(myInvoiceData: any[]) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        const { data: acc131 } = await supabase.from('accounting_accounts').select('id').eq('code', '131').single();
        const { data: acc511 } = await supabase.from('accounting_accounts').select('id').eq('code', '511').single();
        const { data: acc3331 } = await supabase.from('accounting_accounts').select('id').eq('code', '3331').single();

        if (!acc131 || !acc511 || !acc3331) {
            throw new Error("Thiếu cấu hình tài khoản 131, 511 hoặc 3331 trong danh mục kế toán!");
        }

        let syncCount = 0;
        let skipCount = 0;

        for (const inv of myInvoiceData) {
            // 1. Kiểm tra hóa đơn đã tồn tại chưa (Dựa vào Mã tra cứu hoặc Số hóa đơn)
            const { data: existing } = await supabase
                .from('sales_invoices')
                .select('id')
                .eq('lookup_code', inv.LookupCode) // Mã tra cứu từ MyInvoice
                .maybeSingle();

            if (existing) {
                skipCount++;
                continue;
            }

            // 2. Tìm ID Khách hàng qua Mã số thuế
            let customerId = null;
            if (inv.BuyerTaxCode) {
                const { data: customer } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('tax_code', inv.BuyerTaxCode)
                    .maybeSingle();
                customerId = customer?.id || null;
            }

            // 3. Insert vào bảng sales_invoices
            const { data: newInvoice, error: invErr } = await supabase.from('sales_invoices').insert({
                invoice_number: inv.InvoiceNo,
                invoice_date: new Date(inv.IssueDate).toISOString(),
                customer_id: customerId,
                subtotal: inv.TotalBeforeTax || 0,
                vat_amount: inv.TaxAmount || 0,
                total_amount: inv.TotalAmount || 0,
                vat_percent: inv.TaxRate || 10,
                tct_code: inv.TaxAuthorityCode, // Mã CQT
                lookup_code: inv.LookupCode,    // Mã tra cứu
                e_invoice_provider: 'MyInvoice',
                xml_url: inv.XmlUrl || null,
                pdf_url: inv.PdfUrl || null,
                issue_status: 'issued', // Đã phát hành thành công
                payment_status: 'pending',
                paid_amount: 0
            }).select().single();

            if (invErr) {
                console.error("Lỗi insert hóa đơn AR:", invErr);
                continue;
            }

            // 4. Hạch toán Kế toán Kép (Nợ 131 / Có 511 / Có 3331)
            if (newInvoice) {
                const jeCode = `AR-${Date.now().toString().slice(-6)}`;
                const { data: je } = await supabase.from('journal_entries').insert({
                    entry_number: jeCode,
                    entry_date: new Date(inv.IssueDate).toISOString(),
                    description: `Ghi nhận doanh thu HĐ ${inv.InvoiceNo} - Cấp mã TCT: ${inv.TaxAuthorityCode}`,
                    reference_type: 'sales_invoice',
                    reference_id: newInvoice.id,
                }).select().single();

                if (je) {
                    // DÒNG NỢ 131 (Tổng tiền)
                    await supabase.from('journal_entry_lines').insert({
                        journal_entry_id: je.id, account_id: acc131.id,
                        debit: newInvoice.total_amount, credit: 0,
                        description: `Phải thu CĐT theo HĐ ${inv.InvoiceNo}`,
                        partner_type: 'customer', partner_id: customerId
                    });

                    // DÒNG CÓ 511 (Doanh thu chưa thuế)
                    await supabase.from('journal_entry_lines').insert({
                        journal_entry_id: je.id, account_id: acc511.id,
                        debit: 0, credit: newInvoice.subtotal,
                        description: `Doanh thu công trình HĐ ${inv.InvoiceNo}`,
                        partner_type: 'customer', partner_id: customerId
                    });

                    // DÒNG CÓ 3331 (Thuế đầu ra)
                    if (newInvoice.vat_amount > 0) {
                        await supabase.from('journal_entry_lines').insert({
                            journal_entry_id: je.id, account_id: acc3331.id,
                            debit: 0, credit: newInvoice.vat_amount,
                            description: `Thuế GTGT đầu ra HĐ ${inv.InvoiceNo}`,
                            partner_type: 'customer', partner_id: customerId
                        });
                    }
                }
                syncCount++;
            }
        }

        return {
            success: true,
            message: `Đồng bộ thành công ${syncCount} hóa đơn. Bỏ qua ${skipCount} hóa đơn đã tồn tại.`
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// =====================================================================
// [TAX / AR] ĐỒNG BỘ HÀNG LOẠT HÓA ĐƠN ĐẦU RA TỪ XML (MANUAL FALLBACK)
// =====================================================================
export async function syncXMLSalesEntriesAction(invoices: any[], projectId?: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        let employeeId = null;
        if (user) {
            const { data: emp } = await supabase.from('employees').select('id').eq('auth_id', user.id).limit(1).maybeSingle();
            employeeId = emp?.id || null;
        }

        // 1. KÉO CÁC TÀI KHOẢN KẾ TOÁN DÀNH CHO ĐẦU RA
        const { data: acc131 } = await supabase.from('accounting_accounts').select('id').eq('code', '131').maybeSingle();
        const { data: acc511 } = await supabase.from('accounting_accounts').select('id').eq('code', '511').maybeSingle();
        const { data: acc3331 } = await supabase.from('accounting_accounts').select('id').eq('code', '3331').maybeSingle();

        if (!acc131 || !acc511) throw new Error("Hệ thống chưa cấu hình Tài khoản 131 hoặc 511!");

        let syncSuccessCount = 0;
        let errorMessages: string[] = [];

        for (const inv of invoices) {
            // Kiểm tra trùng lặp Hóa đơn Đầu ra
            const uniqueEntryNumber = `HDBR-${inv.invoiceNumber}`;
            const { data: existingJE } = await supabase.from('journal_entries').select('id').eq('entry_number', uniqueEntryNumber).maybeSingle();

            if (existingJE) {
                errorMessages.push(`Hóa đơn số [${inv.invoiceNumber}] đã tồn tại trong hệ thống.`);
                continue;
            }

            // 2. TÌM HOẶC TẠO KHÁCH HÀNG (CUSTOMER) an toàn
            let customerId = null;
            const safeTaxCode = inv.partnerTaxCode ? String(inv.partnerTaxCode).trim() : '';

            if (safeTaxCode) {
                const { data: customer } = await supabase.from('customers').select('id').eq('tax_code', safeTaxCode).limit(1).maybeSingle();
                if (customer) {
                    customerId = customer.id;
                } else {
                    const tempCode = `KH-${Date.now().toString().slice(-6)}`;
                    const { data: newCus, error: cusErr } = await supabase.from('customers').insert({
                        name: inv.partnerName ? String(inv.partnerName).trim() : "Khách hàng từ Hóa đơn XML",
                        tax_code: safeTaxCode,
                        code: tempCode
                    }).select().single();

                    if (cusErr) errorMessages.push(`Lỗi tạo KH mới: ${cusErr.message}`);
                    customerId = newCus?.id || null;
                }
            }

            const finalProjectId = inv.project_id || projectId || null;

            // LƯU Ý QUAN TRỌNG: Lấy CHUẨN NGÀY LẬP HÓA ĐƠN từ XML
            // (Nếu không đọc được thì mới lấy ngày hôm nay làm backup)
            const finalInvoiceDate = inv.invoiceDate ? new Date(inv.invoiceDate).toISOString() : new Date().toISOString();

            // 3. TẠO HÓA ĐƠN BÁN RA (Vào bảng sales_invoices)
            const invoicePayload: any = {
                invoice_number: inv.invoiceNumber,
                invoice_date: finalInvoiceDate,
                invoice_type: 'VAT',
                subtotal: inv.subtotal,
                vat_percent: 10,
                vat_amount: inv.vatAmount,
                total_amount: inv.totalAmount,
                customer_id: customerId,
                project_id: finalProjectId,
                description: `Hóa đơn GTGT Bán ra cho ${inv.partnerName}`
            };

            const { data: newInvoice, error: invErr } = await supabase.from('sales_invoices').insert(invoicePayload).select().single();

            if (invErr) {
                errorMessages.push(`Lỗi tạo Hóa đơn [${inv.invoiceNumber}]: ${invErr.message}`);
                continue;
            }

            // 4. GHI SỔ CÁI (KẾ TOÁN KÉP 3 DÒNG)
            const { data: je, error: jeErr } = await supabase.from('journal_entries').insert({
                entry_number: uniqueEntryNumber,
                entry_date: finalInvoiceDate.split('T')[0], // GHI CHUẨN THEO NGÀY XML
                description: `Doanh thu HĐ Bán ra ${inv.invoiceNumber} - MST: ${safeTaxCode}`,
                status: 'posted',
                reference_type: 'sales_invoice',
                reference_id: newInvoice?.id,
                project_id: finalProjectId,
                created_by: employeeId
            }).select().single();

            if (jeErr) {
                errorMessages.push(`Lỗi ghi Sổ cái [${inv.invoiceNumber}]: ${jeErr.message}`);
                await supabase.from('sales_invoices').delete().eq('id', newInvoice.id);
                continue;
            }

            if (je) {
                // DÒNG 1: NỢ 131 (Tổng tiền hóa đơn)
                await supabase.from('journal_entry_lines').insert({
                    journal_entry_id: je.id, account_id: acc131.id, debit: inv.totalAmount, credit: 0,
                    description: `Phải thu HĐ ${inv.invoiceNumber}`, partner_type: 'customer', partner_id: customerId, project_id: finalProjectId
                });

                // DÒNG 2: CÓ 511 (Doanh thu chưa thuế)
                await supabase.from('journal_entry_lines').insert({
                    journal_entry_id: je.id, account_id: acc511.id, debit: 0, credit: inv.subtotal,
                    description: `Doanh thu HĐ ${inv.invoiceNumber}`, partner_type: 'customer', partner_id: customerId, project_id: finalProjectId
                });

                // DÒNG 3: CÓ 3331 (Tiền thuế GTGT) - Nếu có phát sinh thuế
                if (acc3331 && inv.vatAmount > 0) {
                    await supabase.from('journal_entry_lines').insert({
                        journal_entry_id: je.id, account_id: acc3331.id, debit: 0, credit: inv.vatAmount,
                        description: `Thuế GTGT HĐ ${inv.invoiceNumber}`, partner_type: 'customer', partner_id: customerId, project_id: finalProjectId
                    });
                } else if (!acc3331 && inv.vatAmount > 0) {
                    errorMessages.push(`CẢNH BÁO: Không tìm thấy TK 3331 trong hệ thống. Tiền thuế HĐ ${inv.invoiceNumber} không thể hạch toán độc lập.`);
                }

                syncSuccessCount++;
            }
        }

        // Báo cáo chi tiết nếu có lỗi ngầm
        if (errorMessages.length > 0) {
            return {
                success: false,
                error: `Đồng bộ được ${syncSuccessCount} hóa đơn. CÁC LỖI:\n` + errorMessages.join("\n")
            };
        }

        return { success: true, message: `Hạch toán chuẩn xác ${syncSuccessCount} hóa đơn bán ra!` };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// =====================================================================
// [TAX / AR] XÓA HÓA ĐƠN VÀ SÔ SÁCH KẾ TOÁN LIÊN QUAN (CHỈ XÓA KHI CHƯA THANH TOÁN)
// =====================================================================

export async function deleteSupplierInvoiceAction(invoiceId: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        // 1. Kiểm tra hóa đơn xem có tồn tại và đã thanh toán chưa
        const { data: inv } = await supabase.from('procurement_invoices').select('paid_amount').eq('id', invoiceId).single();

        if (!inv) throw new Error("Không tìm thấy hóa đơn!");
        if (Number(inv.paid_amount) > 0) {
            throw new Error("Tuyệt đối không thể xóa hóa đơn đã được thanh toán (dù chỉ 1 phần)! Hãy hủy phiếu chi trước.");
        }

        // 2. Tìm Sổ cái (Journal Entry) liên quan đến hóa đơn này
        const { data: je } = await supabase
            .from('journal_entries')
            .select('id')
            .eq('reference_id', invoiceId)
            .eq('reference_type', 'invoice')
            .maybeSingle();

        // 3. Xóa Bút toán Sổ cái (Xóa lines trước, xóa header sau)
        if (je) {
            await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', je.id);
            await supabase.from('journal_entries').delete().eq('id', je.id);
        }

        // 4. Xóa Hóa đơn
        const { error } = await supabase.from('procurement_invoices').delete().eq('id', invoiceId);

        if (error) throw new Error(error.message);

        return { success: true, message: "Đã xóa Hóa đơn và thu hồi bút toán Sổ cái thành công!" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 1. LẤY TÀI KHOẢN ĐANG HẠCH TOÁN HIỆN TẠI CỦA PHIẾU ĐÃ CHI
export async function getExecutedAccountsAction(requestId: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        const { data: je } = await supabase
            .from('journal_entries')
            .select('id')
            .eq('reference_id', requestId)
            .eq('reference_type', 'payment_request')
            .maybeSingle();

        if (!je) return { success: false, error: "Giao dịch này chưa được thực thi ghi sổ cái!" };

        const { data: lines } = await supabase
            .from('journal_entry_lines')
            .select('account_id, debit, credit')
            .eq('journal_entry_id', je.id);

        const debitLine = lines?.find(l => Number(l.debit) > 0);
        const creditLine = lines?.find(l => Number(l.credit) > 0);

        return {
            success: true,
            debitAccId: debitLine?.account_id || "",
            creditAccId: creditLine?.account_id || ""
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 2. CẬP NHẬT ĐỊNH KHOẢN MỚI VÀO SỔ CÁI
export async function updateExecutedAccountingAction(requestId: string, newDebitAccId: string, newCreditAccId: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    try {
        const { data: je } = await supabase
            .from('journal_entries')
            .select('id')
            .eq('reference_id', requestId)
            .eq('reference_type', 'payment_request')
            .maybeSingle();

        if (!je) throw new Error("Không tìm thấy bút toán Sổ cái tương ứng!");

        // Cập nhật dòng Nợ (Dòng có tiền debit > 0)
        const { error: debitErr } = await supabase
            .from('journal_entry_lines')
            .update({ account_id: newDebitAccId })
            .eq('journal_entry_id', je.id)
            .gt('debit', 0);

        if (debitErr) throw new Error("Lỗi sửa tài khoản Nợ: " + debitErr.message);

        // Cập nhật dòng Có (Dòng có tiền credit > 0)
        const { error: creditErr } = await supabase
            .from('journal_entry_lines')
            .update({ account_id: newCreditAccId })
            .eq('journal_entry_id', je.id)
            .gt('credit', 0);

        if (creditErr) throw new Error("Lỗi sửa tài khoản Có: " + creditErr.message);

        return { success: true, message: "Điều chỉnh định khoản thành công! Dữ liệu P&L đã được cập nhật lại tự động." };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}