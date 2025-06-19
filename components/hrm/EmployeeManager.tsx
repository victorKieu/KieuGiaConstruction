"use client";
import { useState } from "react";

export default function EmployeeManager({ employees: initialEmployees }) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [form, setForm] = useState({ name: "", email: "", position: "" });
  const [editId, setEditId] = useState(null);

  async function handleAdd() {
    const res = await fetch("/api/employees", {
      method: "POST",
      body: JSON.stringify(form),
    });
    const { data } = await res.json();
    setEmployees([...employees, ...data]);
    setForm({ name: "", email: "", position: "" });
  }

  async function handleEdit(id) {
    setEditId(id);
    const emp = employees.find(e => e.id === id);
    setForm({ name: emp.name, email: emp.email, position: emp.position });
  }

  async function handleUpdate() {
    const res = await fetch(`/api/employees/${editId}`, {
      method: "PUT",
      body: JSON.stringify(form),
    });
    const { data } = await res.json();
    setEmployees(employees.map(e => (e.id === editId ? data[0] : e)));
    setForm({ name: "", email: "", position: "" });
    setEditId(null);
  }

  async function handleDelete(id) {
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    setEmployees(employees.filter(e => e.id !== id));
  }

  return (
    <div>
      <h2>Quản lý nhân viên</h2>
      <input placeholder="Tên" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      <input placeholder="Chức vụ" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
      {editId ? (
        <button onClick={handleUpdate}>Cập nhật</button>
      ) : (
        <button onClick={handleAdd}>Thêm</button>
      )}
      <ul>
        {employees.map(emp => (
          <li key={emp.id}>
            {emp.name} ({emp.position}) - {emp.email}
            <button onClick={() => handleEdit(emp.id)}>Sửa</button>
            <button onClick={() => handleDelete(emp.id)}>Xóa</button>
          </li>
        ))}
      </ul>
    </div>
  );
}