"use client";

import { useRouter } from "next/navigation";
import {
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const data = [
    { name: "Пн", success: 3 },
    { name: "Вт", success: 4 },
    { name: "Ср", success: 2 },
    { name: "Чт", success: 5 },
    { name: "Пт", success: 6 },
    { name: "Сб", success: 4 },
    { name: "Вс", success: 3 },
];

export default function LogisticsDashboard() {
    const router = useRouter();

    return (
        <div className="flex flex-col h-screen w-full">
            <div className="w-full bg-gray-300 p-4 flex justify-between border-b">
                <div className="flex space-x-4">
                    <button className="font-semibold" onClick={() => router.push("/")}>Главная</button>
                    <button className="font-semibold">Дашбоард</button>
                </div>
            </div>
            <div className="flex flex-grow bg-gray-100 p-6 overflow-auto">
                <div className="flex flex-col gap-6 w-full">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl text-center shadow">
                            <div className="text-sm text-gray-500">Маршрутов построено</div>
                            <div className="text-3xl font-bold text-gray-800">17</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl text-center shadow">
                            <div className="text-sm text-gray-500">Успешных доставок</div>
                            <div className="text-3xl font-bold text-green-600">14</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl text-center shadow">
                            <div className="text-sm text-gray-500">Провалов доставки</div>
                            <div className="text-3xl font-bold text-red-500">3</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl text-center shadow">
                            <div className="text-sm text-gray-500">Свободный транспорт</div>
                            <div className="text-3xl font-bold text-gray-800">9</div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="col-span-2 bg-white p-4 rounded-xl shadow">
                            <div className="text-sm text-gray-500">Уровень риска маршрутов</div>
                            <div className="h-32 flex items-center justify-center text-2xl font-bold text-yellow-500">
                                Средний риск: 12%
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl text-center shadow">
                            <div className="text-sm text-gray-500">Среднее время доставки</div>
                            <div className="text-2xl font-bold text-gray-800">38 мин</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl text-center shadow">
                            <div className="text-sm text-gray-500">Самый длинный маршрут</div>
                            <div className="text-2xl font-bold text-gray-800">74 км</div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl h-72 shadow">
                        <div className="text-sm text-gray-500 mb-2">График успешности маршрутов за неделю</div>
                        <div className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                                    <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} />
                                    <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
