"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
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
    code?: string;
    type?: string;
}

interface TransactionFormProps {
    categories: Category[];
    projects: Project[];
}

export function TransactionForm({ categories, projects }: TransactionFormProps) {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
    const [openProject, setOpenProject] = useState(false);

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

    const selectedProject = projects.find(p => p.id === form.watch("project_id"));

    return (
        <div className="space-y-6 transition-colors duration-500">
            <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 dark:bg-slate-900">
                    <TabsTrigger value="income" className="data-[state=active]:bg-green-600 data-[state=active]:text-white dark:text-slate-400">
                        PHIẾU THU
                    </TabsTrigger>
                    <TabsTrigger value="expense" className="data-[state=active]:bg-red-600 data-[state=active]:text-white dark:text-slate-400">
                        PHIẾU CHI
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border dark:border-slate-800 p-6 rounded-xl bg-white dark:bg-slate-900 shadow-sm transition-colors">

                    {/* Số tiền */}
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Số tiền (VNĐ)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        className={cn(
                                            "text-2xl font-black h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-2 transition-all",
                                            activeTab === 'income' ? "text-green-600 dark:text-green-500 focus:ring-green-500" : "text-red-600 dark:text-red-500 focus:ring-red-500"
                                        )}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* COMBOBOX CHỌN DỰ ÁN */}
                    <FormField
                        control={form.control}
                        name="project_id"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    <Building2 className="h-4 w-4" />
                                    Dự án / Công trình
                                </FormLabel>
                                <Popover open={openProject} onOpenChange={setOpenProject}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between h-auto py-3 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-200 transition-colors",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    <div className="flex flex-col items-start text-left">
                                                        <span className="font-bold text-sm">
                                                            {selectedProject?.code ? `[${selectedProject.code}] ` : ""}
                                                            {selectedProject?.name}
                                                        </span>
                                                        {selectedProject?.type && (
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">{selectedProject.type}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    "🔍 Tìm kiếm theo tên, mã dự án..."
                                                )}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 dark:bg-slate-900 dark:border-slate-800" align="start">
                                        <Command className="dark:bg-slate-900">
                                            <CommandInput placeholder="Nhập mã hoặc tên dự án..." className="dark:text-slate-200" />
                                            <CommandList>
                                                <CommandEmpty className="dark:text-slate-400">Không tìm thấy dự án nào.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        value="no-project"
                                                        onSelect={() => {
                                                            form.setValue("project_id", "");
                                                            setOpenProject(false);
                                                        }}
                                                        className="dark:hover:bg-slate-800 dark:text-slate-300"
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold">Chi phí chung (Văn phòng)</span>
                                                            <span className="text-[10px] text-muted-foreground">Không gắn vào công trình cụ thể</span>
                                                        </div>
                                                    </CommandItem>

                                                    {projects.map((project) => (
                                                        <CommandItem
                                                            key={project.id}
                                                            value={`${project.code || ""} ${project.name} ${project.type || ""}`}
                                                            onSelect={() => {
                                                                form.setValue("project_id", project.id);
                                                                setOpenProject(false);
                                                            }}
                                                            className="border-b dark:border-slate-800 last:border-0 py-3 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    project.id === field.value ? "opacity-100 text-blue-500" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col w-full">
                                                                <div className="flex justify-between items-center w-full">
                                                                    <span className="font-bold">
                                                                        {project.code && <span className="text-blue-600 dark:text-blue-400 mr-1">[{project.code}]</span>}
                                                                        {project.name}
                                                                    </span>
                                                                    {project.type && <Badge variant="secondary" className="text-[10px] h-5 dark:bg-slate-800 dark:text-slate-300">{project.type}</Badge>}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Hạng mục */}
                        <FormField
                            control={form.control}
                            name="category_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hạng mục</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-11 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
                                                <SelectValue placeholder="Chọn hạng mục..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                            {filteredCategories.length > 0 ? (
                                                filteredCategories.map((c) => (
                                                    <SelectItem key={c.id} value={c.id} className="dark:text-slate-200">{c.name}</SelectItem>
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
                                    <FormLabel className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ngày ghi nhận</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn("w-full h-11 pl-3 text-left font-normal dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200", !field.value && "text-muted-foreground")}
                                                >
                                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 dark:bg-slate-900 dark:border-slate-800" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                                className="dark:bg-slate-900 dark:text-slate-200"
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
                                <FormLabel className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Diễn giải / Ghi chú</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="VD: Thanh toán tiền cát san lấp..."
                                        className="min-h-[100px] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 transition-colors"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        className={cn(
                            "w-full h-12 text-lg font-bold shadow-md transition-all active:scale-[0.98]",
                            activeTab === 'income'
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                        )}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        {activeTab === 'income' ? 'Ghi nhận Phiếu Thu' : 'Ghi nhận Phiếu Chi'}
                    </Button>
                </form>
            </Form>
        </div>
    );
}