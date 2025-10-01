import React from 'react';

interface ProgressBarProps {
    /** Giá trị hiện tại của thanh tiến độ (0 - 100) */
    value: number;
    /** Tùy chọn class CSS cho màu sắc chính của thanh tiến độ. */
    colorClass?: string;
}

/**
 * Component hiển thị Thanh Tiến Độ (Progress Bar) tùy chỉnh.
 * Sử dụng Tailwind CSS.
 */
export default function ProgressBar({ value, colorClass = "bg-indigo-500" }: ProgressBarProps) {
    // Đảm bảo giá trị nằm trong khoảng [0, 100]
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
            <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`}
                style={{ width: `${clampedValue}%` }}
                role="progressbar"
                aria-valuenow={clampedValue}
                aria-valuemin={0}
                aria-valuemax={100}
            >
            </div>
        </div>
    );
}
