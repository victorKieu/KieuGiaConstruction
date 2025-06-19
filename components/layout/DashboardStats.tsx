export function DashboardStats() {
  const stats = [
    { label: "Dự án đang thực hiện", value: 8, icon: "🏗️", color: "bg-blue-50 text-blue-700" },
    { label: "Hợp đồng mới/tháng", value: 4, icon: "📑", color: "bg-green-50 text-green-700" },
    { label: "Doanh thu năm", value: "15 tỷ", icon: "💰", color: "bg-yellow-50 text-yellow-700" },
    { label: "Khách hàng", value: 32, icon: "🤝", color: "bg-purple-50 text-purple-700" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {stats.map((s, i) => (
        <div key={i} className={`rounded-xl flex items-center gap-4 p-6 shadow-sm ${s.color}`}>
          <span className="text-3xl">{s.icon}</span>
          <div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}