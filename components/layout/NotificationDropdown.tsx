"use client";
import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";

const notifications = [
  { title: "Dự án ABC vừa được phê duyệt", time: "2 giờ trước" },
  { title: "Khách hàng mới đã đăng ký", time: "5 giờ trước" },
  { title: "Có 1 sự cố cần xử lý", time: "1 ngày trước" },
];

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Thông báo"
        className="relative p-2 rounded-full hover:bg-gray-100"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="w-6 h-6 text-gray-500" />
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold px-1 rounded-full">
          {notifications.length}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-xl rounded-lg z-20">
          <div className="p-4 border-b font-bold">Thông báo mới</div>
          <ul className="max-h-64 overflow-auto">
            {notifications.map((n, i) => (
              <li key={i} className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                <div className="text-sm">{n.title}</div>
                <div className="text-xs text-gray-400 mt-1">{n.time}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}