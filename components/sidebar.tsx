"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,Users,Settings,Building2,Package,BarChart3,ShieldAlert,ChevronDown,ChevronRight,
    DollarSign,Truck,Handshake,Menu,X,} from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import Image from "next/image"
import { useIsMobile } from "@/hooks/use-mobile"
import {Sidebar,SidebarContent,SidebarHeader,SidebarMenu,SidebarMenuButton,SidebarMenuItem,SidebarMenuSub,SidebarMenuSubButton,
    SidebarMenuSubItem,SidebarProvider,useSidebar,SidebarRail,} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

// Menu cấu trúc
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
            {
                title: "Danh sách dự án",
                href: "/projects",
            },
            {
                title: "Nhật ký công trình",
                href: "/projects/logs",
            },
            {
                title: "Bảo hành",
                href: "/projects/warranty",
            },
        ],
    },
    {
        title: "CRM",
        href: "/crm",
        icon: Handshake,
        permission: "customer:view",
        children: [
            {
                title: "Dashboard CRM",
                href: "/crm",
            },
            {
                title: "Khách hàng",
                href: "/crm/customers",
            },
            {
                title: "Cơ hội bán hàng",
                href: "/crm/opportunities",
            },
            {
                title: "Hợp đồng",
                href: "/crm/contracts",
            },
            {
                title: "Hoạt động",
                href: "/crm/activities",
            },
        ],
    },
    {
        title: "Tài chính",
        href: "/finance",
        icon: DollarSign,
        permission: "finance:view",
        children: [
            {
                title: "Nghiệp vụ kế toán",
                href: "/finance/accounting",
            },
            {
                title: "Công nợ",
                href: "/finance/debts",
            },
        ],
    },
    {
        title: "Quản lý kho",
        href: "/inventory",
        icon: Package,
        permission: "material:view",
        children: [
            {
                title: "Danh sách mã hàng hóa",
                href: "/inventory/items",
            },
            {
                title: "Danh sách kho",
                href: "/inventory/warehouses",
            },
        ],
    },
    {
        title: "HRM",
        href: "/hrm",
        icon: Users,
        permission: "employee:view",
        children: [
            {
                title: "Danh sách nhân viên",
                href: "/hrm/employees",
            },
            {
                title: "Chấm công",
                href: "/hrm/attendance",
            },
            {
                title: "Nghỉ phép",
                href: "/hrm/leave",
            },
            {
                title: "Bảng lương",
                href: "/hrm/payroll",
            },
            {
                title: "Tài sản nhân viên",
                href: "/hrm/assets",
            },
            {
                title: "KPIs & Đánh giá",
                href: "/hrm/kpis",
            },
            {
                title: "Báo cáo nhân sự",
                href: "/hrm/reports",
            },
            {
                title: "Cài đặt HRM",
                href: "/hrm/settings",
            },
        ],
    },
    {
        title: "Nhà cung cấp",
        href: "/suppliers",
        icon: Truck,
        permission: "supplier:view",
        children: [
            {
                title: "Danh sách nhà cung cấp",
                href: "/suppliers",
            },
            {
                title: "Hợp đồng",
                href: "/suppliers/contracts",
            },
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
    },
    {
        title: "Cài đặt hệ thống",
        href: "/admin/settings",
        icon: Settings,
        roles: ["admin"],
        children: [
            {
                title: "Quản lý danh mục",
                href: "/admin/dictionary",
            },
            {
                title: "Quản lý trạng thái dự án",
                href: "/admin/project-status",
            },
            {
                title: "Quản lý vai trò",
                href: "/admin/roles",
            },
            {
                title: "Quản lý thông báo",
                href: "/admin/notifications",
            },
        ],
    },
]

// Logo fallback khi không thể tải logo từ server
const LogoFallback = () => (
    <div className="w-10 h-10 bg-gold flex items-center justify-center rounded-md text-white font-bold text-lg">KG</div>
)

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile()
    const [sidebarState, setSidebarState] = useState<"expanded" | "collapsed">("expanded")

    useEffect(() => {
        const savedState = localStorage.getItem("sidebarState")
        if (savedState === "collapsed" || savedState === "expanded") {
            setSidebarState(savedState)
        } else if (isMobile) {
            setSidebarState("collapsed")
        }
    }, [isMobile])

    const toggleSidebar = useCallback(() => {
        const newState = sidebarState === "expanded" ? "collapsed" : "expanded"
        setSidebarState(newState)
        localStorage.setItem("sidebarState", newState)
    }, [sidebarState])

    return (
        <div className="flex h-full w-full overflow-hidden">
            <SidebarProvider defaultOpen={!isMobile} defaultState={sidebarState === "expanded" ? "expanded" : "collapsed"}>
                {isMobile ? <MobileSidebar /> : <AppSidebar onToggle={toggleSidebar} />}
                <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out">{children}</div>
            </SidebarProvider>
        </div>
    )
}

function MobileSidebar() {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const [logoError, setLogoError] = useState(false)

    useEffect(() => {
        setOpen(false)
    }, [pathname])

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="fixed top-3 left-3 z-50 md:hidden">
                <Button variant="outline" size="icon" className="rounded-full">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Mở menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] sm:w-[350px]">
                <div className="h-full bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] overflow-y-auto scrollbar-thin">
                    <div className="flex items-center justify-between border-b border-[hsl(var(--sidebar-border))] py-4 px-4">
                        <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 flex-shrink-0">
                                {logoError ? (
                                    <LogoFallback />
                                ) : (
                                    <Image
                                        src="/images/logo.png"
                                        alt="Kieu Gia Logo"
                                        fill
                                        className="object-contain"
                                        onError={() => setLogoError(true)}
                                    />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold leading-tight">Kieu Gia</h1>
                                <h2 className="text-sm font-medium leading-tight">Construction</h2>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                            <X className="h-5 w-5" />
                            <span className="sr-only">Đóng menu</span>
                        </Button>
                    </div>
                    <MobileSidebarContent />
                </div>
            </SheetContent>
        </Sheet>
    )
}

function MobileSidebarContent() {
    const pathname = usePathname()
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

    const toggleExpand = (href: string) => {
        setExpandedItems((prev) => ({
            ...prev,
            [href]: !prev[href],
        }))
    }

    const isActive = (href: string) => {
        if (href === "/dashboard" && pathname === "/") return true
        return pathname === href || pathname.startsWith(`${href}/`)
    }

    useEffect(() => {
        navItems.forEach((item) => {
            if (item.children && item.children.some((child) => isActive(child.href))) {
                setExpandedItems((prev) => ({
                    ...prev,
                    [item.href]: true,
                }))
            }
        })
    }, [pathname])

    return (
        <div className="py-2">
            {navItems.map((item) =>
                item.children ? (
                    <div key={item.href} className="mb-1">
                        <button
                            onClick={() => toggleExpand(item.href)}
                            className={`flex items-center w-full px-4 py-2 text-sm rounded-md transition-colors ${isActive(item.href)
                                    ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] font-semibold"
                                    : "hover:bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]"
                                }`}
                        >
                            <item.icon className="w-5 h-5 min-w-5 mr-2" />
                            <span className="flex-grow truncate">{item.title}</span>
                            {expandedItems[item.href] ? (
                                <ChevronDown className="ml-auto w-4 h-4 flex-shrink-0" />
                            ) : (
                                <ChevronRight className="ml-auto w-4 h-4 flex-shrink-0" />
                            )}
                        </button>
                        {expandedItems[item.href] && (
                            <div className="ml-6 pl-4 border-l border-[hsl(var(--sidebar-border))]">
                                {item.children.map((child) => (
                                    <Link
                                        key={child.href}
                                        href={child.href}
                                        className={`flex items-center px-4 py-2 text-sm rounded-md transition-colors ${isActive(child.href)
                                                ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] font-semibold"
                                                : "hover:bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]"
                                            }`}
                                    >
                                        {child.title}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-4 py-2 text-sm mb-1 rounded-md transition-colors ${isActive(item.href)
                                ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] font-semibold"
                                : "hover:bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]"
                            }`}
                    >
                        <item.icon className="w-5 h-5 min-w-5 mr-2" />
                        <span className="flex-grow truncate">{item.title}</span>
                    </Link>
                ),
            )}
        </div>
    )
}

interface AppSidebarProps {
    onToggle: () => void
}

export function AppSidebar({ onToggle }: AppSidebarProps) {
    const pathname = usePathname()
    const { user } = useAuth()
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
    const { state, setOpen } = useSidebar()
    const [isHovering, setIsHovering] = useState(false)
    const [logoError, setLogoError] = useState(false)

    // Hiển thị tất cả menu
    const filteredNavItems = navItems

    if (!user && pathname !== "/login") {
        return null
    }

    const toggleExpand = (href: string) => {
        setExpandedItems((prev) => ({
            ...prev,
            [href]: !prev[href],
        }))
    }

    const isActive = (href: string) => {
        if (href === "/dashboard" && pathname === "/") return true
        return pathname === href || pathname.startsWith(`${href}/`)
    }

    const handleMouseEnter = () => {
        setIsHovering(true)
        if (state === "collapsed") {
            setOpen(true)
        }
    }

    const handleMouseLeave = () => {
        setIsHovering(false)
        if (isHovering && state === "expanded") {
            setOpen(false)
        }
    }

    return (
        <Sidebar
            className="h-full bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] transition-all duration-300 ease-in-out"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            collapsible="icon"
            style={{
                width: state === "collapsed" ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
                minWidth: state === "collapsed" ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
                maxWidth: state === "collapsed" ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
            }}
        >
            <SidebarHeader className="border-b border-[hsl(var(--sidebar-border))] py-4">
                <div className="flex items-center justify-between gap-3 px-4">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 flex-shrink-0">
                            {logoError ? (
                                <LogoFallback />
                            ) : (
                                <Image
                                    src="/images/logo.png"
                                    alt="Kieu Gia Logo"
                                    fill
                                    className="object-contain"
                                    onError={() => setLogoError(true)}
                                />
                            )}
                        </div>
                        {state === "expanded" && (
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold leading-tight">Kieu Gia</h1>
                                <h2 className="text-sm font-medium leading-tight">Construction</h2>
                            </div>
                        )}
                    </div>
                    {state === "expanded" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggle}
                            className="hover:bg-[hsl(var(--sidebar-accent))]"
                            aria-label="Thu gọn sidebar"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    )}
                    {state === "collapsed" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggle}
                            className="hover:bg-[hsl(var(--sidebar-accent))]"
                            aria-label="Mở rộng sidebar"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </SidebarHeader>
            <SidebarContent className="scrollbar-thin">
                <SidebarMenu>
                    {filteredNavItems.map((item) =>
                        item.children ? (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                    onClick={() => toggleExpand(item.href)}
                                    isActive={isActive(item.href)}
                                    tooltip={item.title}
                                    className={`flex items-center justify-start rounded-md transition-colors ${isActive(item.href)
                                            ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] font-semibold"
                                            : "hover:bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]"
                                        }`}
                                >
                                    <item.icon className="w-5 h-5 min-w-5 mr-2" />
                                    <span className="flex-grow truncate">{item.title}</span>
                                    {expandedItems[item.href] ? (
                                        <ChevronDown className="ml-auto w-4 h-4 flex-shrink-0" />
                                    ) : (
                                        <ChevronRight className="ml-auto w-4 h-4 flex-shrink-0" />
                                    )}
                                </SidebarMenuButton>
                                {expandedItems[item.href] && (
                                    <SidebarMenuSub>
                                        {item.children.map((child) => (
                                            <SidebarMenuSubItem key={child.href}>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={isActive(child.href)}
                                                    className={`rounded-md px-4 py-2 transition-colors ${isActive(child.href)
                                                            ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] font-semibold"
                                                            : "hover:bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]"
                                                        }`}
                                                >
                                                    <Link href={child.href}>{child.title}</Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                )}
                            </SidebarMenuItem>
                        ) : (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive(item.href)}
                                    tooltip={item.title}
                                    className={`flex items-center justify-start rounded-md transition-colors ${isActive(item.href)
                                            ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] font-semibold"
                                            : "hover:bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]"
                                        }`}
                                >
                                    <Link href={item.href} className="flex items-center w-full">
                                        <item.icon className="w-5 h-5 min-w-5 mr-2" />
                                        <span className="flex-grow truncate">{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ),
                    )}
                </SidebarMenu>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}

function ChevronLeft(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="m15 18-6-6 6-6" />
        </svg>
    )
}

export default function SidebarComponent() {
    return (
        <SidebarProvider defaultOpen={true}>
            <AppSidebar onToggle={() => { }} />
        </SidebarProvider>
    )
}