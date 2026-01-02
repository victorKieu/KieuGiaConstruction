"use client";
import { useState } from "react";

export default function EmployeeManager({ employees: initialEmployees }) {
    const [employees, setEmployees] = useState(initialEmployees);
    const [form, setForm] = useState({ name: "", email: "", position: "" });
    const [editId, setEditId] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // Thêm trạng thái loading
    const [error, setError] = useState(""); // Thêm trạng thái báo lỗi

    // Hàm helper để reset form
    const resetForm = () => {
        setForm({ name: "", email: "", position: "" });
        setEditId(null);
        setError("");
    };

    async function handleAdd() {
        if (!form.name || !form.email) return alert("Vui lòng điền đủ thông tin");

        setIsLoading(true);
        try {
            const res = await fetch("/api/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" }, // QUAN TRỌNG: Phải có dòng này
                body: JSON.stringify(form),
            });

            if (!res.ok) throw new Error("Lỗi khi thêm nhân viên");

            const { data } = await res.json();

            // Giả sử API trả về đối tượng nhân viên mới trong `data`
            // Nếu API trả về mảng, hãy dùng [...employees, ...data]
            setEmployees([...employees, data]);
            resetForm();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    function handleEdit(id) {
        const emp = employees.find((e) => e.id === id);
        if (emp) {
            setEditId(id);
            setForm({ name: emp.name, email: emp.email, position: emp.position });
            setError("");
        }
    }

    async function handleUpdate() {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/employees/${editId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" }, // QUAN TRỌNG
                body: JSON.stringify(form),
            });

            if (!res.ok) throw new Error("Lỗi khi cập nhật");

            const { data } = await res.json();

            // Cập nhật danh sách local ngay lập tức
            setEmployees(employees.map((e) => (e.id === editId ? { ...e, ...form } : e)));
            resetForm();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm("Bạn có chắc muốn xóa?")) return;

        setIsLoading(true);
        try {
            const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Lỗi khi xóa");

            setEmployees(employees.filter((e) => e.id !== id));
        } catch (err) {
            alert(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div style={{ padding: "20px", maxWidth: "600px" }}>
            <h2>Quản lý nhân viên</h2>

            {error && <p style={{ color: "red" }}>{error}</p>}

            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <input
                    placeholder="Tên"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    disabled={isLoading}
                />
                <input
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    disabled={isLoading}
                />
                <input
                    placeholder="Chức vụ"
                    value={form.position}
                    onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                    disabled={isLoading}
                />

                {editId ? (
                    <>
                        <button onClick={handleUpdate} disabled={isLoading}>
                            {isLoading ? "Đang lưu..." : "Cập nhật"}
                        </button>
                        <button onClick={resetForm} disabled={isLoading}>Hủy</button>
                    </>
                ) : (
                    <button onClick={handleAdd} disabled={isLoading}>
                        {isLoading ? "Đang thêm..." : "Thêm"}
                    </button>
                )}
            </div>

            <ul style={{ listStyle: "none", padding: 0 }}>
                {employees.map((emp) => (
                    <li key={emp.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px", borderBottom: "1px solid #ccc" }}>
                        <span>
                            <strong>{emp.name}</strong> ({emp.position}) - {emp.email}
                        </span>
                        <div>
                            <button onClick={() => handleEdit(emp.id)} disabled={isLoading} style={{ marginRight: "5px" }}>
                                Sửa
                            </button>
                            <button onClick={() => handleDelete(emp.id)} disabled={isLoading} style={{ color: "red" }}>
                                Xóa
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}