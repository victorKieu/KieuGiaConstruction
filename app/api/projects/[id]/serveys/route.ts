import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const {
        method,
        query: { id }
    } = req;

    if (method === 'POST') {
        const {
            content, staff, evaluation, results,
            coordinates, houseOrientation, terrainType,
            buildingRegulations, landLength, landWidth,
            projectLength, projectWidth, analysisReport
        } = req.body;

        try {
            // Lưu khảo sát mới vào cơ sở dữ liệu
            const newSurvey = await db.surveys.create({
                data: {
                    content,
                    staff,
                    evaluation,
                    results,
                    coordinates,
                    houseOrientation,
                    terrainType,
                    buildingRegulations,
                    landLength: parseFloat(landLength),
                    landWidth: parseFloat(landWidth),
                    projectLength: parseFloat(projectLength),
                    projectWidth: parseFloat(projectWidth),
                    analysisReport,
                    projectId: id // Liên kết với dự án
                }
            });
            res.status(201).json(newSurvey);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Something went wrong' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
}
