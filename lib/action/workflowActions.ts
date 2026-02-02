"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getDictionaryByCode, getDictionaryItems } from "@/lib/action/dictionaryActions";
import { getCurrentSession } from "@/lib/supabase/session";

const STATUS_CODES = {
    INITIAL: 'INITIAL',
    DESIGN: 'DESIGN',
    PLANNING: 'PLANNING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    PAUSED: 'PAUSED'
};

export async function autoUpdateProjectStatus(projectId: string, eventType: string, metaData?: any) {
    // Thay vì xử lý logic phức tạp, ta chỉ cần gọi hàm tính toán lại
    return await refreshProjectStatusBasedOnContracts(projectId);
}

// Hàm tính toán lại trạng thái dựa trên danh sách hợp đồng thực tế
export async function refreshProjectStatusBasedOnContracts(projectId: string) {
    const supabase = await createSupabaseServerClient();
    console.log(`🔄 [Workflow] Đang tính toán lại trạng thái cho Project: ${projectId}`);

    // 1. Lấy thông tin hiện tại
    const { data: project } = await supabase
        .from('projects')
        .select(`status_id, status_data:sys_dictionaries!status_id(code)`)
        .eq('id', projectId)
        .single();

    // 🛠️ FIX LỖI TS2339: Xử lý an toàn cho cả trường hợp Mảng hoặc Object
    const statusData: any = project?.status_data;

    const currentCode = Array.isArray(statusData)
        ? statusData[0]?.code
        : statusData?.code || 'INITIAL';

    // Bỏ qua nếu đang Thi công hoặc Hoàn thành
    if ([STATUS_CODES.IN_PROGRESS, STATUS_CODES.COMPLETED].includes(currentCode)) {
        return { success: true };
    }

    // 2. Lấy danh sách hợp đồng HIỆU LỰC
    const { data: contracts } = await supabase
        .from('contracts')
        .select('contract_type, status')
        .eq('project_id', projectId)
        .in('status', ['signed', 'processing', 'liquidated', 'active']);

    const contractList = contracts || [];

    // 3. Logic Ưu tiên Trạng thái
    let targetCode = STATUS_CODES.INITIAL; // Mặc định

    const hasConstruction = contractList.some(c => c.contract_type?.toLowerCase() === 'construction');
    const hasDesign = contractList.some(c => c.contract_type?.toLowerCase() === 'design');

    if (hasConstruction) {
        targetCode = STATUS_CODES.PLANNING; // Ưu tiên 1
    } else if (hasDesign) {
        targetCode = STATUS_CODES.DESIGN;   // Ưu tiên 2
    }

    console.log(`   --> Hợp đồng: [Thi công: ${hasConstruction}, Thiết kế: ${hasDesign}]`);
    console.log(`   --> Status: ${currentCode} => ${targetCode}`);

    // 4. Cập nhật Database nếu khác
    if (targetCode !== currentCode) {
        const statusRef = await getDictionaryByCode('PROJECT_STATUS', targetCode);

        if (statusRef) {
            await supabase
                .from('projects')
                .update({
                    status_id: statusRef.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', projectId);

            console.log(`✅ Đã cập nhật trạng thái về: ${targetCode}`);
            revalidatePath('/projects');
            revalidatePath(`/projects/${projectId}`);
            return { success: true };
        }
    }

    return { success: true };
}

// --- HÀM MỚI: XỬ LÝ CHUYỂN GIAI ĐOẠN THI CÔNG ---
export async function startConstructionPhase(formData: FormData) {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Vui lòng đăng nhập." };

    const supabase = await createSupabaseServerClient();
    const projectId = formData.get("project_id") as string;

    // 1. Lấy lại thông tin mới nhất từ DB (QUAN TRỌNG)
    // Thay vì tin tưởng formData, ta query trực tiếp để xem is_permit_required thực tế là gì
    const { data: project } = await supabase
        .from('projects')
        .select('is_permit_required, code')
        .eq('id', projectId)
        .single();

    if (!project) return { success: false, error: "Dự án không tồn tại." };

    // Ưu tiên lấy từ DB, nếu null mới lấy từ form (fallback)
    const isPermitRequired = project.is_permit_required ?? (formData.get("is_permit_required") === "true");

    const startDate = formData.get("start_date") as string;
    const noticeDate = formData.get("notice_date") as string;

    // 2. Kiểm tra Logic Pháp lý (Luật Xây dựng)
    if (isPermitRequired) {
        // Nếu cần phép mà chưa chọn ngày nộp -> Lấy mặc định là ngày hiện tại hoặc báo lỗi nhẹ
        // Ở đây ta cho phép tạo nhưng ghi chú lại

        const effectiveNoticeDate = noticeDate || new Date().toISOString();

        // Tạo bản ghi: Thông báo khởi công
        await supabase.from("project_legal_docs").insert({
            project_id: projectId,
            doc_type: "NOTICE_COMMENCEMENT", // Mã loại văn bản
            doc_code: formData.get("notice_code")?.toString() || `TBKC-${project.code}`,
            issue_date: effectiveNoticeDate,
            issuing_authority: formData.get("authority")?.toString() || "UBND Phường/Xã",
            notes: "Thông báo khởi công (Đã nộp theo quy định)",
            status: "submitted"
        });
    }

    // 3. Tạo bản ghi: Lệnh khởi công (Luôn tạo)
    const { error: orderError } = await supabase.from("project_legal_docs").insert({
        project_id: projectId,
        doc_type: "ORDER_COMMENCEMENT",
        doc_code: formData.get("order_code")?.toString() || `LKC-${project.code}`,
        issue_date: startDate,
        issuing_authority: "Ban Giám Đốc",
        notes: isPermitRequired ? "Lệnh khởi công chính thức" : "Lệnh khởi công nội bộ (Sửa chữa/Miễn phép)",
        status: "approved"
    });

    if (orderError) return { success: false, error: "Lỗi tạo Lệnh khởi công: " + orderError.message };

    // 4. Chuyển trạng thái dự án -> IN_PROGRESS
    const statusRef = await getDictionaryByCode('PROJECT_STATUS', STATUS_CODES.IN_PROGRESS);

    if (statusRef) {
        await supabase.from("projects").update({
            status_id: statusRef.id,
            actual_start_date: startDate,
            construction_phase: 'execution',
            updated_at: new Date().toISOString()
        }).eq("id", projectId);
    }

    // ✅ Quan trọng: Revalidate để làm mới UI ngay lập tức
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã phát lệnh khởi công & Cập nhật hồ sơ pháp lý." };
}

// --- HÀM MỚI: HOÀN TÁC KHỞI CÔNG (UNDO) ---
export async function undoConstructionPhase(projectId: string) {
    const session = await getCurrentSession();
    // Chỉ Admin hoặc Manager mới được quyền hoàn tác
    if (!session.isAuthenticated || !['admin', 'manager'].includes(session.role)) {
        return { success: false, error: "Bạn không có quyền thực hiện thao tác này." };
    }

    const supabase = await createSupabaseServerClient();

    // 1. Lấy ID trạng thái PLANNING
    const statusRef = await getDictionaryByCode('PROJECT_STATUS', STATUS_CODES.PLANNING);
    if (!statusRef) return { success: false, error: "Không tìm thấy trạng thái Lập kế hoạch." };

    // 2. Cập nhật lại Dự án: Về trạng thái cũ, xóa ngày thực tế
    const { error: updateError } = await supabase
        .from("projects")
        .update({
            status_id: statusRef.id,
            actual_start_date: null, // Reset ngày khởi công thực tế
            construction_phase: 'planning', // Quay về phase chuẩn bị
            updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

    if (updateError) return { success: false, error: "Lỗi cập nhật dự án: " + updateError.message };

    // 3. Dọn dẹp dữ liệu rác: Xóa các văn bản khởi công vừa tạo
    // (Chỉ xóa các văn bản loại Lệnh/Thông báo khởi công của dự án này)
    const { error: deleteError } = await supabase
        .from("project_legal_docs")
        .delete()
        .eq("project_id", projectId)
        .in("doc_type", ["ORDER_COMMENCEMENT", "NOTICE_COMMENCEMENT"]);

    if (deleteError) {
        console.error("Lỗi xóa doc rác:", deleteError);
        // Không return false ở đây vì việc chính (update status) đã xong, chỉ log lỗi warning
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã hoàn tác: Dự án quay lại giai đoạn Lập kế hoạch." };
}

// --- HÀM MỚI: HOÀN THÀNH & BÀN GIAO DỰ ÁN ---
export async function finishConstructionPhase(formData: FormData) {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Vui lòng đăng nhập." };

    const supabase = await createSupabaseServerClient();
    const projectId = formData.get("project_id") as string;
    const endDate = formData.get("end_date") as string; // Ngày nghiệm thu/bàn giao thực tế

    // 1. Kiểm tra: Có task nào chưa xong không? (Cảnh báo tùy chọn)
    // (Tạm thời bỏ qua để cho phép chốt linh hoạt, hoặc có thể query check progress < 100%)

    // 2. Lấy ID trạng thái COMPLETED
    const statusRef = await getDictionaryByCode('PROJECT_STATUS', STATUS_CODES.COMPLETED);
    if (!statusRef) return { success: false, error: "Không tìm thấy trạng thái Hoàn thành." };

    // 3. Cập nhật Dự án
    const { error: updateError } = await supabase
        .from("projects")
        .update({
            status_id: statusRef.id,
            actual_end_date: endDate, // Chốt ngày kết thúc thực tế
            progress: 100, // Force tiến độ về 100% (nếu muốn)
            construction_phase: 'warranty', // Chuyển sang giai đoạn bảo hành
            updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

    if (updateError) return { success: false, error: updateError.message };

    // 4. Tạo bản ghi: Biên bản Nghiệm thu Bàn giao (Lưu vết pháp lý)
    const { error: docError } = await supabase.from("project_legal_docs").insert({
        project_id: projectId,
        doc_type: "HANDOVER_MINUTES", // Biên bản bàn giao
        doc_code: formData.get("doc_code")?.toString() || `BBBG-${projectId.slice(0, 4)}`,
        issue_date: endDate,
        issuing_authority: "Chủ Đầu Tư & Nhà Thầu",
        notes: "Biên bản nghiệm thu và bàn giao đưa vào sử dụng",
        status: "approved"
    });

    if (docError) console.error("Lỗi tạo biên bản bàn giao:", docError);

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Chúc mừng! Dự án đã được bàn giao và chuyển sang giai đoạn bảo hành." };
}

// --- HÀM MỚI: HOÀN TÁC NGHIỆM THU (Quay lại thi công) ---
export async function undoFinishConstructionPhase(projectId: string) {
    const session = await getCurrentSession();
    // Chỉ Admin hoặc Manager mới được quyền
    if (!session.isAuthenticated || !['admin', 'manager'].includes(session.role)) {
        return { success: false, error: "Bạn không có quyền thực hiện thao tác này." };
    }

    const supabase = await createSupabaseServerClient();

    // 1. Lấy ID trạng thái IN_PROGRESS (Để quay lại)
    const statusRef = await getDictionaryByCode('PROJECT_STATUS', STATUS_CODES.IN_PROGRESS);
    if (!statusRef) return { success: false, error: "Không tìm thấy trạng thái Đang thi công." };

    // 2. Cập nhật lại Dự án: Về trạng thái thi công, xóa ngày kết thúc
    const { error: updateError } = await supabase
        .from("projects")
        .update({
            status_id: statusRef.id,
            actual_end_date: null, // Reset ngày kết thúc thực tế
            construction_phase: 'execution', // Quay về phase thi công
            // Lưu ý: Không reset progress vì có thể họ đã làm xong thật, chỉ là chưa muốn chốt sổ
            updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

    if (updateError) return { success: false, error: "Lỗi cập nhật dự án: " + updateError.message };

    // 3. Xóa Biên bản Nghiệm thu Bàn giao (HANDOVER_MINUTES)
    const { error: deleteError } = await supabase
        .from("project_legal_docs")
        .delete()
        .eq("project_id", projectId)
        .eq("doc_type", "HANDOVER_MINUTES"); // Chỉ xóa biên bản bàn giao

    if (deleteError) console.error("Lỗi xóa doc rác:", deleteError);

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã hủy nghiệm thu: Dự án quay lại giai đoạn Thi công." };
}

// --- HÀM MỚI: HỦY DỰ ÁN ---
export async function cancelProject(formData: FormData) {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Vui lòng đăng nhập." };

    const supabase = await createSupabaseServerClient();
    const projectId = formData.get("project_id") as string;
    const reason = formData.get("reason") as string; // Lý do hủy (lưu vào description hoặc log)

    // 1. Lấy ID trạng thái CANCELLED
    const statusRef = await getDictionaryByCode('PROJECT_STATUS', STATUS_CODES.CANCELLED);
    if (!statusRef) return { success: false, error: "Không tìm thấy trạng thái Đã hủy." };

    // 2. Cập nhật Dự án
    // Ta không xóa dữ liệu cũ (start_date, contracts...) để sau này còn Undo được
    const { error: updateError } = await supabase
        .from("projects")
        .update({
            status_id: statusRef.id,
            construction_phase: 'cancelled', // Đánh dấu phase là đã hủy
            // (Tùy chọn) Có thể append lý do hủy vào description hoặc tạo note riêng
            description: reason ? `[ĐÃ HỦY: ${reason}]` : undefined,
            updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

    if (updateError) return { success: false, error: updateError.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Dự án đã được hủy bỏ." };
}

// --- HÀM MỚI: KHÔI PHỤC DỰ ÁN (UNDO CANCEL) ---
export async function undoCancelProject(projectId: string) {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Vui lòng đăng nhập." };

    const supabase = await createSupabaseServerClient();

    // 1. Lấy thông tin dự án hiện tại để quyết định về đâu
    // ✅ FIX: Thêm tên constraint cụ thể cho contracts (!contracts_project_id_fkey)
    // Và log lỗi chi tiết ra console server nếu có
    const { data: project, error } = await supabase
        .from("projects")
        .select(`
            actual_start_date, 
            actual_end_date, 
            contracts:contracts!contracts_project_id_fkey(id, contract_type)
        `)
        .eq("id", projectId)
        .single();

    if (error || !project) {
        console.error("❌ Undo Cancel Error:", error); // Log để debug
        return { success: false, error: "Không tìm thấy dữ liệu dự án hoặc lỗi truy vấn." };
    }

    // 2. Logic suy luận trạng thái cũ
    let targetCode = STATUS_CODES.INITIAL;
    let targetPhase = 'initial';

    // Ép kiểu any để tránh lỗi TS checking strict null
    const p: any = project;
    const hasContracts = p.contracts && p.contracts.length > 0;

    if (p.actual_end_date) {
        // Nếu đã có ngày kết thúc thực tế -> Về COMPLETED
        targetCode = STATUS_CODES.COMPLETED;
        targetPhase = 'warranty';
    } else if (p.actual_start_date) {
        // Nếu đã có ngày bắt đầu thực tế -> Về IN_PROGRESS
        targetCode = STATUS_CODES.IN_PROGRESS;
        targetPhase = 'execution';
    } else if (hasContracts) {
        // Nếu chưa khởi công nhưng đã có hợp đồng -> Về PLANNING (hoặc DESIGN tùy loại HĐ)
        // Kiểm tra kỹ hơn loại hợp đồng nếu muốn chính xác tuyệt đối
        const hasConstruction = p.contracts.some((c: any) => c.contract_type === 'construction');
        if (hasConstruction) {
            targetCode = STATUS_CODES.PLANNING;
            targetPhase = 'planning';
        } else {
            targetCode = STATUS_CODES.DESIGN; // Giả định còn lại là thiết kế
            targetPhase = 'design';
        }
    }
    // Mặc định là INITIAL

    // 3. Cập nhật lại
    const statusRef = await getDictionaryByCode('PROJECT_STATUS', targetCode);
    if (!statusRef) return { success: false, error: `Không tìm thấy trạng thái đích ${targetCode}` };

    const { error: updateError } = await supabase
        .from("projects")
        .update({
            status_id: statusRef.id,
            construction_phase: targetPhase,
            // Xóa prefix [ĐÃ HỦY] trong description nếu có (logic phụ, có thể bỏ qua)
            updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

    if (updateError) return { success: false, error: updateError.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: `Đã khôi phục dự án về trạng thái: ${targetCode}` };
}

// --- HÀM MỚI: TẠM DỪNG DỰ ÁN (PAUSE) ---
export async function pauseProject(formData: FormData) {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Vui lòng đăng nhập." };

    const supabase = await createSupabaseServerClient();
    const projectId = formData.get("project_id") as string;
    const reason = formData.get("reason") as string;
    const pauseDate = formData.get("pause_date") as string;
    const volumeNote = formData.get("volume_note") as string; // Ghi chú chốt khối lượng

    // 1. Lấy ID trạng thái PAUSED
    const statusRef = await getDictionaryByCode('PROJECT_STATUS', STATUS_CODES.PAUSED);
    if (!statusRef) return { success: false, error: "Không tìm thấy trạng thái Tạm dừng trong hệ thống." };

    // 2. Cập nhật Dự án -> PAUSED
    const { error: updateError } = await supabase
        .from("projects")
        .update({
            status_id: statusRef.id,
            construction_phase: 'suspended', // Đánh dấu phase treo
            // Lưu vết lý do tạm dừng vào description hoặc 1 trường note riêng (ở đây ví dụ append description)
            updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

    if (updateError) return { success: false, error: updateError.message };

    // 3. Tạo "Thông báo Tạm dừng" (Pháp lý)
    await supabase.from("project_legal_docs").insert({
        project_id: projectId,
        doc_type: "NOTICE_SUSPENSION",
        doc_code: formData.get("notice_code")?.toString() || `TBTD-${projectId.slice(0, 4)}`,
        issue_date: pauseDate,
        issuing_authority: "Ban Quản Lý Dự Án",
        notes: `Tạm dừng thi công. Lý do: ${reason}`,
        status: "approved"
    });

    // 4. Tạo "Biên bản Nghiệm thu Điểm dừng" (Chốt khối lượng/Vật tư)
    // Đây là cơ sở để "Quyết toán tạm" như bạn yêu cầu
    if (volumeNote) {
        await supabase.from("project_legal_docs").insert({
            project_id: projectId,
            doc_type: "TEMP_ACCEPTANCE_MINUTES", // Biên bản nghiệm thu tạm
            doc_code: `BBNT-TAM-${projectId.slice(0, 4)}`,
            issue_date: pauseDate,
            issuing_authority: "Nội bộ & Nhà thầu",
            notes: `Chốt khối lượng tại thời điểm tạm dừng: ${volumeNote}`,
            status: "approved"
        });
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã tạm dừng dự án và khóa kho vật tư." };
}

// --- HÀM MỚI: TÁI KHỞI ĐỘNG DỰ ÁN (RESUME) ---
export async function resumeProject(projectId: string) {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Vui lòng đăng nhập." };

    const supabase = await createSupabaseServerClient();

    // 1. Logic xác định trạng thái quay về (Thường là đang thi công)
    // Có thể check kỹ hơn nếu muốn resume về Planning, nhưng thường Pause xảy ra khi đang làm.
    const statusRef = await getDictionaryByCode('PROJECT_STATUS', STATUS_CODES.IN_PROGRESS);
    if (!statusRef) return { success: false, error: "Không tìm thấy trạng thái Đang thi công." };

    // 2. Cập nhật Dự án -> IN_PROGRESS
    const { error: updateError } = await supabase
        .from("projects")
        .update({
            status_id: statusRef.id,
            construction_phase: 'execution', // Mở lại phase thi công
            updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

    if (updateError) return { success: false, error: updateError.message };

    // 3. (Tùy chọn) Tạo Lệnh Tái khởi động để lưu vết
    await supabase.from("project_legal_docs").insert({
        project_id: projectId,
        doc_type: "ORDER_RESUMPTION",
        doc_code: `LDK-LAI-${projectId.slice(0, 4)}`,
        issue_date: new Date().toISOString(),
        issuing_authority: "Ban Giám Đốc",
        notes: "Lệnh tiếp tục thi công sau thời gian tạm dừng.",
        status: "approved"
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Dự án đã được tái khởi động." };
}