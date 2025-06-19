"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const data = [
  { name: "Dự án A", "Thiết kế": 100, "Giám sát": 80, "Thi công": 60 },
  { name: "Dự án B", "Thiết kế": 100, "Giám sát": 90, "Thi công": 85 },
  { name: "Dự án C", "Thiết kế": 100, "Giám sát": 60, "Thi công": 40 },
  { name: "Dự án D", "Thiết kế": 100, "Giám sát": 100, "Thi công": 100 },
];

export function ProjectProgressChart() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="font-bold mb-4">Tiến độ dự án</div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis unit="%" />
          <Tooltip />
          <Legend />
          <Bar dataKey="Thiết kế" stackId="a" fill="#38bdf8" />
          <Bar dataKey="Giám sát" stackId="a" fill="#fde047" />
          <Bar dataKey="Thi công" stackId="a" fill="#22d3ee" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}