import { Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PlaceholderPage() {
    return (
        <div className="flex h-[80vh] items-center justify-center p-4">
            <Card className="w-full max-w-md border-dashed shadow-sm bg-slate-50">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                    <div className="p-4 bg-blue-100 rounded-full">
                        <Wrench className="h-10 w-10 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Đang phát triển</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Tính năng này đang được xây dựng và sẽ sớm ra mắt.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}