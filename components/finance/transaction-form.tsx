"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
// 👇 Import thêm icon cho Combobox
import { CalendarIcon, Loader2, Save, Building2, Check, ChevronsUpDown, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge"; // Thêm Badge để hiển thị loại dự án
// 👇 Import bộ Command để làm tính năng tìm kiếm
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

import { transactionSchema, TransactionFormValues } from "@/lib/schemas/finance";
import { createTransactionAction } from "@/lib/action/finance";
import { cn } from "@/lib/utils/utils";

interface Category {
    id: string;
    name: string;
    type: string;
}

interface Project {
    id: string;
    name: string;
    code?: string; // Mã dự án (có thể null)
    type?: string; // Loại dự án
}

interface TransactionFormProps {
    categories: Category[];
    projects: Project[];
}

export function TransactionForm({ categories, projects }: TransactionFormProps) {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
    const [openProject, setOpenProject] = useState(false); // State mở/đóng Combobox

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            amount: 0,
            type: "expense",
            description: "",
            transaction_date: new Date(),
            category_id: "",
            project_id: "",
        },
    });

    const filteredCategories = categories.filter((c) => c.type === activeTab);

    async function onSubmit(data: TransactionFormValues) {
        setLoading(true);
        // Logic: Nếu project_id rỗng thì gửi null
        const payload = {
            ...data,
            project_id: (!data.project_id) ? null : data.project_id
        };

        try {
            const res = await createTransactionAction(payload);
            if (res.success) {
                toast.success(res.message);
                form.reset({
                    amount: 0,
                    type: activeTab,
                    description: "",
                    transaction_date: new Date(),
                    category_id: "",
                    project_id: "",
                });
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Lỗi hệ thống");
        } finally {
            setLoading(false);
        }
    }

    const onTabChange = (value: string) => {
        const newType = value as "income" | "expense";
        setActiveTab(newType);
        form.setValue("type", newType);
        form.setValue("category_id", "");
    };

    // Helper tìm tên dự án đang chọn để hiển thị ra ngoài
    const selectedProject = projects.find(p => p.id === form.watch("project_id"));

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="income" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                        PHIẾU THU
                    </TabsTrigger>
                    <TabsTrigger value="expense" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                        PHIẾU CHI
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border p-4 rounded-lg bg-card">

                    {/* Số tiền */}
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base font-semibold">Số tiền (VNĐ)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        className={cn(
                                            "text-2xl font-bold h-12",
                                            activeTab === 'income' ? "text-green-600" : "text-red-600"
                                        )}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* --- COMBOBOX CHỌN DỰ ÁN (NÂNG CẤP) --- */}
                    <FormField
                        control={form.control}
                        name="project_id"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="flex items-center gap-1">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    Dự án / Công trình
                                </FormLabel>
                                <Popover open={openProject} onOpenChange={setOpenProject}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openProject}
                                                className={cn(
                                                    "w-full justify-between h-auto py-2", // h-auto để text dài tự xuống dòng
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    <div className="flex flex-col items-start text-left">
                                                        <span className="font-semibold text-sm">
                                                            {selectedProject?.code ? `[${selectedProject.code}] ` : ""}
                                                            {selectedProject?.name}
                                                        </span>
                                                        {selectedProject?.type && (
                                                            <span className="text-[10px] text-muted-foreground uppercase">{selectedProject.type}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    "🔍 Tìm kiếm theo tên, mã dự án..."
                                                )}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Nhập mã hoặc tên dự án..." />
                                            <CommandList>
                                                <CommandEmpty>Không tìm thấy dự án nào.</CommandEmpty>
                                                <CommandGroup>
                                                    {/* Option: Không gắn dự án */}
                                                    <CommandItem
                                                        value="no-project"
                                                        onSelect={() => {
                                                            form.setValue("project_id", "");
                                                            setOpenProject(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                                        <div className="flex flex-col">
                                                            <span>Chi phí chung (Văn phòng)</span>
                                                            <span className="text-[10px] text-muted-foreground">Không gắn vào công trình cụ thể</span>
                                                        </div>
                                                    </CommandItem>

                                                    {/* List Projects */}
                                                    {projects.map((project) => (
                                                        <CommandItem
                                                            key={project.id}
                                                            value={`${project.code || ""} ${project.name} ${project.type || ""}`} // String này dùng để search
                                                            onSelect={() => {
                                                                form.setValue("project_id", project.id);
                                                                setOpenProject(false);
                                                            }}
                                                            className="border-b last:border-0 py-2"
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    project.id === field.value ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col w-full">
                                                                <div className="flex justify-between items-center w-full">
                                                                    <span className="font-medium">
                                                                        {project.code && <span className="text-blue-600 mr-1">[{project.code}]</span>}
                                                                        {project.name}
                                                                    </span>
                                                                    {project.type && <Badge variant="secondary" className="text-[10px] h-5">{project.type}</Badge>}
                                                                </div>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {/* -------------------------------------- */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Hạng mục */}
                        <FormField
                            control={form.control}
                            name="category_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hạng mục</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chọn hạng mục..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {filteredCategories.length > 0 ? (
                                                filteredCategories.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))
                                            ) : (
                                                <div className="p-2 text-sm text-muted-foreground">Chưa có danh mục</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Ngày giao dịch */}
                        <FormField
                            control={form.control}
                            name="transaction_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Ngày ghi nhận</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                >
                                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Diễn giải */}
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Diễn giải / Ghi chú</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="VD: Thanh toán tiền cát san lấp..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        className={cn("w-full", activeTab === 'income' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {activeTab === 'income' ? 'Lưu Phiếu Thu' : 'Lưu Phiếu Chi'}
                    </Button>
                </form>
            </Form>
        </div>
    );
}