import React from "react";

export default function AppSidebar({ onToggle }: { onToggle: () => void }) {
  // Đây là placeholder đơn giản, hãy thay bằng code thật nếu bạn có sẵn
  return (
    <aside>
      <button onClick={onToggle}>Toggle Sidebar</button>
      <div>App Sidebar Content</div>
    </aside>
  );
}