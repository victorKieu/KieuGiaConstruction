// pages/api/customers.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    if (req.method === 'POST') {
        // Thêm mới khách hàng
        const { name, type, contact_person, email, phone, address, tax_code, birthday, gender, status, tag_id, owner_id, note, source, website, facebook, zalo, avatar_url } = req.body;

        const { data, error } = await supabase
            .from('customers')
            .insert([
                {
                    name,
                    type,
                    contact_person,
                    email,
                    phone,
                    address,
                    tax_code,
                    birthday,
                    gender,
                    status,
                    tag_id,
                    owner_id,
                    note,
                    source,
                    website,
                    facebook,
                    zalo,
                    avatar_url
                },
            ]);

        if (error) {
            console.error("Error creating customer:", error);
            return res.status(500).json({ error: error.message });
        }

        return res.status(201).json(data);
    } else if (req.method === 'PUT') {
        // Cập nhật khách hàng
        const { id, ...updateData } = req.body;

        const { error } = await supabase
            .from('customers')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error("Error updating customer:", error);
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ message: "Customer updated successfully" });
    } else if (req.method === 'DELETE') {
        // Xóa khách hàng
        const { id } = req.body;

        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting customer:", error);
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ message: "Customer deleted successfully" });
    } else {
        // Chỉ cho phép các phương thức POST, PUT, DELETE
        res.setHeader('Allow', ['POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}