   // pages/api/project-logs.ts
        import type { NextApiRequest, NextApiResponse } from 'next';
        import { createSupabaseServerClient } from '@/lib/supabase/server';
        import { cookies } from 'next/headers';

        export default async function handler(req: NextApiRequest, res: NextApiResponse) {
            const cookieStore = await cookies();
            const token = cookieStore.get("sb-access-token")?.value || null;
            const supabase = createSupabaseServerClient(token);
            try {
                if (req.method === 'POST') {
                    const {
                        content,
                        section,
                        weather,
                        temperature,
                        images,
                        participants,
                        directive,
                        project_id,
                        log_date,
                    } = req.body;

                    if (!content || !section || !project_id || !log_date) {
                        return res.status(400).json({ error: 'Thiếu dữ liệu bắt buộc' });
                    }

                    const { data, error } = await supabase
                        .from('project_logs')
                        .insert([
                            {
                                content,
                                section,
                                weather,
                                temperature,
                                images,
                                participants,
                                directive,
                                project_id,
                                log_date,
                            },
                        ])
                        .select()
                        .single();

                    if (error) {
                        console.error('[Supabase] Insert error:', error.message);
                        return res.status(500).json({ error: error.message || 'Không thể tạo nhật ký' });
                    }

                    return res.status(201).json({ log: data });
                }

                return res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
            } catch (err: any) {
                console.error('[API] Lỗi không xác định:', err.message);
                return res.status(500).json({ error: err.message || 'Lỗi server nội bộ' });
            }
        }