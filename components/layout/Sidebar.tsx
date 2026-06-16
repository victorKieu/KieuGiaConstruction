"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Settings, Building2, Package, BarChart3, ShieldAlert, ChevronDown, ChevronRight, Activity, DollarSign, Truck, Handshake, Menu as MenuIcon, Calculator} from "lucide-react";
import Image from "next/image";

// ==== Menu List (Giữ nguyên gốc, chỉ thêm Dự Toán) ====
const navItems = [
    {
        title: "Tổng quan",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: null,
    },
    // ✅ THÊM PHÂN HỆ DỰ TOÁN & BÁO GIÁ VÀO ĐÂY
    
    {
        title: "Dự Án",
        href: "/projects",
        icon: Building2,
        permission: "project:view",
        children: [
            { title: "Danh sách dự án", href: "/projects" },
            { title: "Nhật ký công trình", href: "/projects/logs" },
            { title: "Bảo hành", href: "/projects/warranty" },
        ],
    },
    {
        title: "Dự toán & Báo giá",
        href: "/estimations",
        icon: Calculator,
        permission: "estimation:view",
        children: [
            { title: "Hồ sơ dự toán", href: "/estimations" },
        ],
    },
    {
        title: "CRM",
        href: "/crm",
        icon: Handshake,
        permission: "customer:view",
        children: [
            { title: "Dashboard CRM", href: "/crm" },
            { title: "Khách hàng", href: "/crm/customers" },
            { title: "Cơ hội bán hàng", href: "/crm/opportunities" },
            { title: "Hợp đồng", href: "/crm/contracts" },
            { title: "Hoạt động", href: "/crm/activities" },
        ],
    },
    {
        title: "Tài chính",
        href: "/finance",
        icon: DollarSign,
        permission: "finance:view",
        children: [
            { title: "Thu/ Chi", href: "/finance/accounting" },
            { title: "QL Thanh Toán NCC", href: "/finance/payables" },
        ],
    },
    {
        title: "Quản lý kho",
        href: "/inventory",
        icon: Package,
        permission: "material:view",
        children: [
            { title: "Quản lý hàng hóa", href: "/inventory/catalog" },
            { title: "Quản lý kho", href: "/inventory" },
        ],
    },
    {
        title: "HRM",
        href: "/hrm",
        icon: Users,
        permission: "employee:view",
        children: [
            { title: "Danh sách nhân viên", href: "/hrm/employees" },
            { title: "Chấm công", href: "/hrm/attendance" },
            { title: "Duyệt đơn từ", href: "/hrm/approvals" },
            { title: "Bảng lương", href: "/hrm/payroll" },
            { title: "Tài sản nhân viên", href: "/hrm/assets" },
            { title: "KPIs & Đánh giá", href: "/hrm/kpis" },
            { title: "Báo cáo nhân sự", href: "/hrm/reports" },
            { title: "Cài đặt HRM", href: "/hrm/settings" },
        ],
    },
    {
        title: "Trung tâm Mua hàng",
        href: "/procurement",
        icon: Truck,
        // Thêm logic roles vào đây
        roles: ["admin", "procurement"],
        children: [
            { title: "Danh sách nhà cung cấp", href: "/procurement/suppliers" },
            { title: "QL Đấu Thầu", href: "/procurement/rfq" },
            { title: "QL Nhu Cầu Mua Hàng", href: "/procurement/orders" },
        ],
    },
    {
        title: "Báo cáo",
        href: "/reports",
        icon: BarChart3,
        permission: "report:view",
    },
    {
        title: "Admin",
        href: "/admin",
        icon: ShieldAlert,
        permission: "permission:view",
        roles: ["admin"],
        children: [
            { title: "Thông Tin Công Ty", href: "/admin/settings/company" },
            { title: "Từ điển nhóm dữ liệu", href: "/admin/dictionaries/categories" },
            { title: "Từ điển dữ liệu", href: "/admin/dictionaries/system" },
            { title: "Định mức khối lượng", href: "/admin/dictionaries/norms" },
            { title: "Danh Mục Công Tác", href: "/admin/dictionaries/templates" },
        ],
    },
    {
        title: "Trạng thái hệ thống",
        href: "/system-status",
        icon: Activity,
        permission: null,
    },
    {
        title: "Cài đặt",
        href: "/settings",
        icon: Settings,
        permission: null,
    },
];

const LogoFallback = () => (
    <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center rounded-md text-white font-bold text-xl shadow-lg">KG</div>
);

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative flex items-center">
            <div
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                className="flex items-center"
            >
                {children}
            </div>
            <div
                className={`pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[120] px-3 py-1 rounded bg-popover text-popover-foreground text-xs whitespace-nowrap shadow-xl transition-all duration-300 border border-border
        ${show ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}
        `}
            >
                {text}
            </div>
        </div>
    );
}

interface SidebarProps {
    user?: any;
    className?: string;
}

export default function Sidebar({ user, className }: SidebarProps) {
    const pathname = usePathname();
    const [expanded, setExpanded] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const collapsed = !expanded && !mobileOpen && !className;

    useEffect(() => {
        navItems.forEach((item) => {
            if (
                item.children &&
                item.children.some((child) => pathname.startsWith(child.href))
            ) {
                setExpandedItems((prev) => ({
                    ...prev,
                    [item.href]: true,
                }));
            }
        });
    }, [pathname]);

    const toggleExpand = (href: string) => {
        setExpandedItems((prev) => ({
            ...prev,
            [href]: !prev[href],
        }));
    };

    const isActive = (href: string) => {
        if (href === "/dashboard" && pathname === "/") return true;
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const sidebarWidth = collapsed ? 64 : 252;

    const sidebarContent = (
        <aside
            className={`
        h-screen bg-card border-r border-border shadow-2xl
        flex flex-col transition-all duration-300
        ${collapsed ? "w-16 min-w-16 max-w-16" : "w-[252px] min-w-[252px] max-w-[252px]"}
        
        ${!className && isMobile ? "fixed z-[100] left-0 top-0" : ""}
        
        ${!className && isMobile && mobileOpen ? "translate-x-0" : !className && isMobile ? "-translate-x-full" : "translate-x-0"}
        ${className || ""} 
      `}
            style={{
                width: className ? "100%" : sidebarWidth,
                minWidth: className ? "100%" : sidebarWidth,
                maxWidth: className ? "100%" : sidebarWidth
            }}
            onMouseEnter={() => !isMobile && !className && setExpanded(true)}
            onMouseLeave={() => !isMobile && !className && setExpanded(false)}
        >
            <div className="flex items-center gap-3 h-20 px-4 border-b border-border relative bg-muted/30">
                <div className="relative w-10 h-10 flex-shrink-0 drop-shadow-md">
                    {logoError ? (
                        <LogoFallback />
                    ) : (
                        <Image
                            src="/images/logo.png"
                            alt="Kieu Gia Logo"
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-contain"
                            onError={() => setLogoError(true)}
                            priority
                        />
                    )}
                </div>
                {!collapsed && (
                    <div>
                        <div className="font-bold text-xl text-primary tracking-wide">Kieu Gia</div>
                        <div className="text-xs text-muted-foreground font-medium">Construction</div>
                    </div>
                )}

                {/* Nút đóng Sidebar trên Mobile */}
                {!className && isMobile && !mobileOpen && (
                    <button
                        className="fixed top-3 left-3 z-[110] bg-background/90 shadow-xl p-2 rounded-full md:hidden border border-border backdrop-blur-md transition-all hover:bg-accent"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Mở menu"
                    >
                        <MenuIcon className="w-6 h-6 text-foreground" />
                    </button>
                )}
            </div>

            <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                {navItems
                    // BƯỚC 1: LỌC MENU THEO ROLE CỦA USER
                    .filter((item) => {
                        if (item.roles && user?.role) {
                            return item.roles.includes(user.role);
                        }
                        return true; // Nếu menu không yêu cầu role cụ thể, hiển thị cho mọi user
                    })
                    .map((item) =>
                        item.children ? (
                            <div key={item.href} className="mb-1">
                                {/* Phần hiển thị menu có con (giữ nguyên logic của anh) */}
                                {collapsed ? (
                                    <Tooltip text={item.title}>
                                        <button
                                            onClick={() => toggleExpand(item.href)}
                                            className={`group flex items-center w-full px-4 py-2 rounded-r-full transition-all ${isActive(item.href)
                                                    ? "bg-primary/10 text-primary font-semibold scale-110 shadow-sm border-r-4 border-primary"
                                                    : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                                }`}
                                        >
                                            <item.icon className="w-5 h-5 min-w-5 group-hover:animate-bounce" />
                                        </button>
                                    </Tooltip>
                                ) : (
                                    <button
                                        onClick={() => toggleExpand(item.href)}
                                        className={`group flex items-center w-full px-4 py-2 rounded-r-full transition-all ${isActive(item.href)
                                                ? "bg-primary/10 text-primary font-semibold shadow-sm border-r-4 border-primary"
                                                : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                            }`}
                                    >
                                        <item.icon className="w-5 h-5 min-w-5 mr-2 group-hover:animate-bounce" />
                                        <span className="flex-grow truncate text-left">{item.title}</span>
                                        {expandedItems[item.href] ? (
                                            <ChevronDown className="ml-auto w-4 h-4 flex-shrink-0 transition-transform duration-300 rotate-180" />
                                        ) : (
                                            <ChevronRight className="ml-auto w-4 h-4 flex-shrink-0 transition-transform duration-300" />
                                        )}
                                    </button>
                                )}
                                <div
                                    className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedItems[item.href] && !collapsed ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                                        }`}
                                    style={{ pointerEvents: expandedItems[item.href] && !collapsed ? "auto" : "none" }}
                                >
                                    <div className="ml-6 pl-2 border-l border-border">
                                        {item.children.map((child) => (
                                            <Link
                                                key={child.href}
                                                href={child.href}
                                                className={`flex items-center px-4 py-2 text-sm rounded-r-full my-1 transition-all ${isActive(child.href)
                                                        ? "bg-primary/10 text-primary font-bold scale-105 shadow-sm border-r-2 border-primary"
                                                        : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                                    }`}
                                            >
                                                {child.title}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group flex items-center px-4 py-2 rounded-r-full transition-all mb-1 ${isActive(item.href)
                                        ? "bg-primary/10 text-primary font-semibold scale-105 shadow-sm border-r-4 border-primary"
                                        : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                    }`}
                            >
                                {collapsed ? (
                                    <Tooltip text={item.title}>
                                        <item.icon className="w-5 h-5 min-w-5 group-hover:animate-bounce" />
                                    </Tooltip>
                                ) : (
                                    <>
                                        <item.icon className="w-5 h-5 min-w-5 mr-2 group-hover:animate-bounce" />
                                        <span className="flex-grow truncate text-left">{item.title}</span>
                                    </>
                                )}
                            </Link>
                        )
                    )}
            </nav>
        </aside>
    );

    return (
        <>
            {!className && isMobile && !mobileOpen && (
                <button
                    className="fixed top-3 left-3 z-[110] bg-background/90 shadow-xl p-2 rounded-full md:hidden border border-border backdrop-blur-md transition-all hover:bg-accent"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Mở menu"
                >
                    <MenuIcon className="w-6 h-6 text-foreground" />
                </button>
            )}

            {sidebarContent}

            {!className && isMobile && mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-[2px] transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {!isMobile && !className && (
                <div
                    style={{ width: sidebarWidth, minWidth: sidebarWidth }}
                    className="shrink-0 transition-all"
                />
            )}
        </>
    );
}