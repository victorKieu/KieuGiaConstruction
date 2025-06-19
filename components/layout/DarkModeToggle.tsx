"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function DarkModeToggle() {
  const [dark, setDark] = useState(
    () =>
      typeof window !== "undefined"
        ? document.documentElement.classList.contains("dark")
        : false
  );

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    // Nếu user chọn "hệ thống", đồng bộ theo hệ điều hành
    const systemDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && systemDark)) setDark(true);
    if (saved === "light") setDark(false);
  }, []);

  return (
    <button
      onClick={() => setDark((v) => !v)}
      className="p-2 rounded-full border border-blue-100 dark:border-neutral-800 hover:bg-blue-50 dark:hover:bg-neutral-800 transition flex items-center justify-center"
      aria-label="Bật/tắt chế độ tối"
      title={dark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
    >
      {dark ? (
        <Moon className="w-5 h-5 text-blue-600 dark:text-blue-200" />
      ) : (
        <Sun className="w-5 h-5 text-yellow-500" />
      )}
    </button>
  );
}