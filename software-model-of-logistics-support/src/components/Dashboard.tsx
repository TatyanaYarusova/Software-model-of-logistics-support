"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

interface WeeklyDatum {
    name: string;
    success: number;
}
interface LastRun {
    timestamp: string;
    time: number;
    delivered: number;
    lostWarehouse: number;
    lostTransit: number;
    consumed: number;
}
interface LastParams {
    speed: number;
    attackRisk: number;
    warehouseLoss: number;
    consumptionRate: number;
    experimentsCount: number;
    product: number;
    vehicleCount: number;
    vehicleCap: number;
}
interface Stats {
    routesBuilt: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    freeTransport: number;
    averageRiskPercent: number;
    averageDeliveryTimeMinutes: number;
    longestRouteKm: number;
    weeklySuccess: WeeklyDatum[];
    lastParams: LastParams;
    lastRun: LastRun;
    successCount: number;
    failCount:    number;
}

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/stats")
            .then((res) => {
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return res.json();
            })
            .then((data: Stats) => setStats(data))
            .catch(() => setError("Не удалось загрузить статистику"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center justify-center h-screen">Загрузка…</div>;
    if (error || !stats) return (
        <div className="p-6">
            <button onClick={() => router.push("/")} className="underline">← Главная</button>
            <p className="text-red-500 mt-4">{error}</p>
        </div>
    );

    const { lastParams, lastRun } = stats;
    const lastDate = new Date(lastRun.timestamp).toLocaleString();

    return (
        <div className="flex flex-col h-screen w-full">
            <header className="bg-gray-200 p-4">
                <nav className="flex space-x-6">
                    <button onClick={() => router.push("/")} className="font-semibold">Главная</button>
                    <button className="font-semibold">Дашбоард</button>
                </nav>
            </header>

            <main className="flex-grow bg-gray-100 p-6 overflow-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatCard label="Маршрутов построено" value={stats.routesBuilt} />
                    <StatCard label="Успешных доставок" value={stats.successfulDeliveries} color="green" />
                    <StatCard label="Провалов доставки" value={stats.failedDeliveries ?? 0} color="red" />
                    <div className="bg-white p-4 rounded-xl shadow text-center">
                        <div className="text-sm text-gray-500">Последнее моделирование</div>
                        <div className="mt-1 text-gray-700">{lastDate}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl shadow">
                        <div className="text-sm text-gray-500 mb-2">Параметры последнего прогона</div>
                        <ul className="grid grid-cols-2 gap-2 text-gray-800">
                            <li>🚀 Скорость: <b>{lastParams.speed} км/ч</b></li>
                            <li>🚚 Машин: <b>{lastParams.vehicleCount}</b></li>
                            <li>📦 Товар: <b>{lastParams.product} шт.</b></li>
                            <li>⚔ Риск атаки: <b>{lastParams.attackRisk}%</b></li>
                            <li>🏭 Потери на складе: <b>{lastParams.warehouseLoss}%</b></li>
                            <li>⏳ Расход: <b>{lastParams.consumptionRate} шт./ч</b></li>
                            <li>🔄 Прогонов: <b>{lastParams.experimentsCount}</b></li>
                        </ul>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow">
                        <div className="text-sm text-gray-500 mb-2">Результаты последнего прогона</div>
                        <ul className="space-y-1 text-gray-800">
                            <li>⏱ Время: <b>{lastRun.time.toFixed(2)} ч</b></li>
                            <li>✅ Доставлено: <b>{lastRun.delivered} шт.</b></li>
                            <li>📦 Потеряно на складе: <b>{lastRun.lostWarehouse} шт.</b></li>
                            <li>🚚 Потеряно в пути: <b>{lastRun.lostTransit} шт.</b></li>
                            <li>🔄 Израсходовано: <b>{lastRun.consumed.toFixed(2)} шт.</b></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <StatCardWide
                            label="Средний риск маршрутов"
                            value={`${stats.averageRiskPercent.toFixed(1)}%`}
                            color="yellow"
                        />
                        <div className="grid grid-cols-1 gap-4">
                            <StatCard label="Среднее время доставки" value={`${stats.averageDeliveryTimeMinutes.toFixed(2)} мин`} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow">
                    <div className="text-sm text-gray-500 mb-2">Успешность за неделю</div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.weeklySuccess}>
                                <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} />
                                <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(v: number) => v.toFixed(0)} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({
                      label,
                      value,
                      color,
                  }: {
    label: string;
    value: number | string;
    color?: "green" | "red" | "yellow";
}) {
    const colorClass =
        color === "green"
            ? "text-green-600"
            : color === "red"
                ? "text-red-500"
                : color === "yellow"
                    ? "text-yellow-500"
                    : "text-gray-800";
    return (
        <div className="bg-white p-4 rounded-xl shadow text-center">
            <div className="text-sm text-gray-500">{label}</div>
            <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
        </div>
    );
}

function StatCardWide({
                          label,
                          value,
                          color,
                      }: {
    label: string;
    value: string;
    color?: "yellow";
}) {
    const colorClass = color === "yellow" ? "text-yellow-500" : "text-gray-800";
    return (
        <div className="bg-white p-4 rounded-xl shadow text-center">
            <div className="text-sm text-gray-500">{label}</div>
            <div className={`mt-2 text-2xl font-bold ${colorClass}`}>{value}</div>
        </div>
    );
}