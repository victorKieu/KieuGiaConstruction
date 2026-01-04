"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Settings,
    Building2,
    Package,
    BarChart3,
    ShieldAlert,
    ChevronDown,
    ChevronRight,
    Activity,
    DollarSign,
    Truck,
    Handshake,
    Menu as MenuIcon,
    X as CloseIcon,
    Database
} from "lucide-react";
import Image from "next/image";

// ==== Menu List giữ nguyên ====
const navItems = [
    {
        title: "Tổng quan",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: null,
    },
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
            { title: "Công nợ", href: "/finance/debts" },
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
            { title: "Nghỉ phép", href: "/hrm/leave" },
            { title: "Bảng lương", href: "/hrm/payroll" },
            { title: "Tài sản nhân viên", href: "/hrm/assets" },
            { title: "KPIs & Đánh giá", href: "/hrm/kpis" },
            { title: "Báo cáo nhân sự", href: "/hrm/reports" },
            { title: "Cài đặt HRM", href: "/hrm/settings" },
        ],
    },
    {
        title: "Thu Mua",
        href: "/procurement",
        icon: Truck,
        //permission: "procurement:view",
        children: [
            { title: "Danh sách nhà cung cấp", href: "/procurement/suppliers" },
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
            { title: "Từ điển dữ liệu", href: "/admin/dictionaries" },
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

// Logo fallback
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
                className={`pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-3 py-1 rounded bg-black/90 text-white text-xs whitespace-nowrap shadow-xl transition-all duration-300
        ${show ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}
        `}
            >
                {text}
            </div>
        </div>
    );
}

// 👇 1. Thêm Interface Props
interface SidebarProps {
    className?: string; // Để nhận class từ Shadcn Sheet
}

// 👇 2. Cập nhật component nhận props
export function Sidebar({ className }: SidebarProps) {
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

    // Nếu có className (tức là đang nằm trong Sheet), ta coi như không collapsed
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

    // Sidebar width
    const sidebarWidth = collapsed ? 64 : 252;

    const sidebarContent = (
        <aside
            className={`
        h-screen bg-white dark:bg-neutral-900 border-r border-blue-100 dark:border-neutral-800 shadow-2xl
        flex flex-col transition-all duration-300
        ${collapsed ? "w-16 min-w-16 max-w-16" : "w-[252px] min-w-[252px] max-w-[252px]"}
        ${/* Nếu có className (trong Sheet), ta bỏ logic fixed/absolute của Sidebar đi */ ""}
        ${!className && isMobile ? "fixed z-50 left-0 top-0" : ""}
        ${!className && isMobile && mobileOpen ? "translate-x-0" : !className && isMobile ? "-translate-x-full" : "translate-x-0"}
        ${className || ""} 
      `}
            style={{
                // Nếu đang trong Sheet (có className), ta force width 100% để khớp với sheet
                width: className ? "100%" : sidebarWidth,
                minWidth: className ? "100%" : sidebarWidth,
                maxWidth: className ? "100%" : sidebarWidth
            }}
            onMouseEnter={() => !isMobile && !className && setExpanded(true)}
            onMouseLeave={() => !isMobile && !className && setExpanded(false)}
        >
            {/* Header logo */}
            <div className="flex items-center gap-3 h-20 px-4 border-b border-blue-100 dark:border-neutral-800 relative bg-gradient-to-tr from-blue-50 to-white dark:from-neutral-900 dark:to-neutral-800">
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
                        <div className="font-bold text-xl text-blue-700 dark:text-blue-200 tracking-wide">Kieu Gia</div>
                        <div className="text-xs text-gray-500 dark:text-gray-300 font-medium">Construction</div>
                    </div>
                )}
                {/* Chỉ hiện nút đóng nếu không có className (tức là mode tự quản lý mobile cũ) */}
                {!className && isMobile && !mobileOpen && (
                    <button
                        // 👇 THAY ĐỔI: Đổi z-50 thành z-[100]
                        className="fixed top-3 left-3 z-[100] bg-white/90 dark:bg-neutral-900 shadow-xl p-2 rounded-full md:hidden border border-blue-100 dark:border-neutral-800 backdrop-blur-md transition-all hover:bg-blue-50"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Mở menu"
                    >
                        <MenuIcon className="w-6 h-6 text-blue-600 dark:text-blue-200" />
                    </button>
                )}
            </div>
            {/* Menu */}
            <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
                {navItems.map((item) =>
                    item.children ? (
                        <div key={item.href} className="mb-1">
                            {collapsed ? (
                                <Tooltip text={item.title}>
                                    <button
                                        onClick={() => toggleExpand(item.href)}
                                        className={`
                      group flex items-center w-full px-4 py-2 rounded-r-full transition-all
                      ${isActive(item.href)
                                                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold scale-110 shadow"
                                                : "hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-200 text-gray-700 dark:text-gray-200"}
                    `}
                                    >
                                        <item.icon className="w-5 h-5 min-w-5 group-hover:animate-bounce" />
                                    </button>
                                </Tooltip>
                            ) : (
                                <button
                                    onClick={() => toggleExpand(item.href)}
                                    className={`
                    group flex items-center w-full px-4 py-2 rounded-r-full transition-all
                    ${isActive(item.href)
                                            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold shadow"
                                            : "hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-200 text-gray-700 dark:text-gray-200"}
                  `}
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
                            {/* Menu sub */}
                            <div
                                className={`
                  transition-all duration-300 ease-in-out overflow-hidden
                  ${expandedItems[item.href] && !collapsed ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
                `}
                                style={{ pointerEvents: expandedItems[item.href] && !collapsed ? "auto" : "none" }}
                            >
                                <div className="ml-6 pl-2 border-l border-blue-100 dark:border-neutral-800">
                                    {item.children.map((child) => (
                                        <Link
                                            key={child.href}
                                            href={child.href}
                                            className={`
                        flex items-center px-4 py-2 text-sm rounded-r-full my-1 transition-all
                        ${isActive(child.href)
                                                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-bold scale-105 shadow"
                                                    : "hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-200 text-blue-700 dark:text-blue-200"}
                      `}
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
                            className={`
                group flex items-center px-4 py-2 rounded-r-full transition-all mb-1
                ${isActive(item.href)
                                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold scale-105 shadow"
                                    : "hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-200 text-gray-700 dark:text-gray-200"}
              `}
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

    // --- MOBILE overlay ---
    return (
        <>
            {/* Chỉ hiện nút Menu nội bộ nếu KHÔNG có className (tức là không dùng Sheet của AppHeader) */}
            {!className && isMobile && !mobileOpen && (
                <button
                    className="fixed top-4 left-4 z-50 bg-white/90 dark:bg-neutral-900 shadow-xl p-2 rounded-full md:hidden border border-blue-100 dark:border-neutral-800 backdrop-blur-md transition-all"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Mở menu"
                >
                    <MenuIcon className="w-6 h-6 text-blue-600 dark:text-blue-200" />
                </button>
            )}

            {/* Sidebar Content */}
            {sidebarContent}

            {/* Chỉ hiện Overlay nội bộ nếu KHÔNG có className */}
            {!className && isMobile && mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px] transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Placeholder giữ chỗ cho desktop (Chỉ hiện khi không dùng Sheet) */}
            {!isMobile && !className && (
                <div
                    style={{ width: sidebarWidth, minWidth: sidebarWidth }}
                    className="shrink-0 transition-all"
                />
            )}
        </>
    );
}