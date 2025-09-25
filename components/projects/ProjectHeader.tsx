interface ProjectHeaderProps {
    title: string;
    status: string;
    onEdit: () => void;
    onDelete: () => void;
    onTasks: () => void;
}
export default function ProjectHeader({ title, status, onEdit, onDelete, onTasks }: ProjectHeaderProps) {
    return (
        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow">
            <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-sm text-gray-500">Trạng thái: {status}</p>
            </div>
            <div className="flex gap-2">
                <button onClick={onTasks} className="bg-blue-600 text-white px-4 py-2 rounded">Công việc</button>
                <button onClick={onEdit} className="bg-white border px-4 py-2 rounded">Chỉnh sửa</button>
                <button onClick={onDelete} className="bg-red-600 text-white px-4 py-2 rounded">Xóa dự án</button>
            </div>
        </div>
    );
}