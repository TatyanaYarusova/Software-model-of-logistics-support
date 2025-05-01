"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function MainPage() {
    const router = useRouter();

    const [start, setStart] = useState<[number, number] | null>(null);
    const [end, setEnd] = useState<[number, number] | null>(null);
    const [waypoints, setWaypoints] = useState<[number, number][]>([]);

    const [speed, setSpeed] = useState<number>();
    const [transport, setTransport] = useState<number>();
    const [product, setProduct] = useState<number>();
    const [attackRisk, setAttackRisk] = useState<number>();
    const [warehouseLoss, setWarehouseLoss] = useState<number>();
    const [consumptionRate, setConsumptionRate] = useState<number>();
    const [experimentsCount, setExperimentsCount] = useState<number>(10);

    const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);

    const handleWaypointChange = (updated: [number, number][]) => setWaypoints(updated);
    const handleRemoveWaypoint = (i: number) => {
        const upd = [...waypoints];
        upd.splice(i, 1);
        setWaypoints(upd);
    };

    const handleReset = () => {
        setStart(null);
        setEnd(null);
        setWaypoints([]);
        setSpeed(undefined);
        setTransport(undefined);
        setProduct(undefined);
        setAttackRisk(undefined);
        setWarehouseLoss(undefined);
        setConsumptionRate(undefined);
        setExperimentsCount(10);
        setRoutePolyline([]);
    };

    const handleSimulate = async () => {
        if (
            !start ||
            !end ||
            speed == null ||
            transport == null ||
            product == null ||
            attackRisk == null ||
            warehouseLoss == null ||
            consumptionRate == null ||
            experimentsCount == null
        ) {
            alert(
                "Заполните все поля:\n" +
                "• Начальную и конечную точку\n" +
                "• Скорость, транспорт, товар\n" +
                "• Риск атаки, потери на складе\n" +
                "• Скорость расхода\n" +
                "• Количество экспериментов"
            );
            return;
        }

        try {
            const res = await fetch("/api/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    start,
                    end,
                    waypoints,
                    speed,
                    transport,
                    attackRisk,
                    warehouseLoss,
                    consumptionRate,
                    product,
                    experimentsCount,
                }),
            });
            const result = await res.json();
            setRoutePolyline(result.routePolyline);

            alert(
                `Экспериментов: ${result.experimentsCount}\n\n` +
                `Первый прогон:\n` +
                `  Время: ${result.rawTime} ч\n` +
                `  Доставлено: ${result.rawDelivered}\n` +
                `  Потеряно на складе: ${result.rawLostWarehouse}\n` +
                `  Уничтожено в пути: ${result.rawLostTransit}\n` +
                `  Израсходовано: ${result.rawConsumed}\n\n` +
                `Среднее по ${result.experimentsCount}:\n` +
                `  ⌀ Время: ${result.avgTime} ч\n` +
                `  ⌀ Доставлено: ${result.avgDelivered}\n` +
                `  ⌀ Потеряно на складе: ${result.avgLostWarehouse}\n` +
                `  ⌀ Уничтожено в пути: ${result.avgLostTransit}\n` +
                `  ⌀ Израсходовано: ${result.avgConsumed}\n\n`
            );
        } catch (e) {
            console.error(e);
            alert("Ошибка при симуляции");
        }
    };

    return (
        <div className="flex flex-col h-screen w-full">
            <div className="w-full bg-gray-300 p-4 flex justify-between border-b">
                <div className="flex space-x-4">
                    <button className="font-semibold">Главная</button>
                    <button className="font-semibold" onClick={() => router.push("/dashboard")}>
                        Дашбоард
                    </button>
                </div>
            </div>
            <div className="flex flex-grow">
                <div className="w-1/4 bg-gray-200 p-4 flex flex-col gap-2 overflow-y-auto">
                    {/* Выбор точек */}
                    <label className="font-semibold">Начальная точка (клик на карте)</label>
                    <input
                        type="text"
                        value={start ? `${start[0].toFixed(5)}, ${start[1].toFixed(5)}` : "Не выбрана"}
                        disabled
                        className="p-2 border rounded-md bg-gray-100 text-gray-500"
                    />

                    <label className="font-semibold">Конечная точка (клик на карте)</label>
                    <input
                        type="text"
                        value={end ? `${end[0].toFixed(5)}, ${end[1].toFixed(5)}` : "Не выбрана"}
                        disabled
                        className="p-2 border rounded-md bg-gray-100 text-gray-500"
                    />

                    <label className="font-semibold">Промежуточные точки</label>
                    {waypoints.map((wp, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={`${wp[0].toFixed(5)}, ${wp[1].toFixed(5)}`}
                                disabled
                                className="p-2 border rounded-md bg-gray-100 text-gray-500 flex-grow"
                            />
                            <button
                                onClick={() => handleRemoveWaypoint(idx)}
                                className="text-red-500 hover:text-red-700 font-bold text-xl"
                            >
                                ✕
                            </button>
                        </div>
                    ))}

                    <label className="font-semibold">Средняя скорость (км/ч)</label>
                    <input
                        type="number"
                        value={speed ?? ""}
                        onChange={e => setSpeed(Math.max(0, Math.min(300, Number(e.target.value))))}
                        className="p-2 border rounded-md"
                    />

                    <label className="font-semibold">Доступный транспорт (шт.)</label>
                    <input
                        type="number"
                        value={transport ?? ""}
                        onChange={e => setTransport(Math.max(0, Math.min(1000, Number(e.target.value))))}
                        className="p-2 border rounded-md"
                    />

                    <label className="font-semibold">Товар на складе (шт.)</label>
                    <input
                        type="number"
                        value={product ?? ""}
                        onChange={e => setProduct(Math.max(0, Math.min(10000, Number(e.target.value))))}
                        className="p-2 border rounded-md"
                    />

                    <label className="font-semibold">Риск атаки (%)</label>
                    <input
                        type="number"
                        value={attackRisk ?? ""}
                        onChange={e => setAttackRisk(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="p-2 border rounded-md"
                    />

                    <label className="font-semibold">Потери на складе (%)</label>
                    <input
                        type="number"
                        value={warehouseLoss ?? ""}
                        onChange={e => setWarehouseLoss(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="p-2 border rounded-md"
                    />

                    <label className="font-semibold">Скорость расхода (шт./ч)</label>
                    <input
                        type="number"
                        value={consumptionRate ?? ""}
                        onChange={e => setConsumptionRate(Math.max(0, Number(e.target.value)))}
                        className="p-2 border rounded-md"
                    />

                    <label className="font-semibold">Кол-во экспериментов</label>
                    <input
                        type="number"
                        value={experimentsCount}
                        onChange={e => setExperimentsCount(Math.max(1, Number(e.target.value)))}
                        className="p-2 border rounded-md"
                    />

                    <div className="flex justify-between gap-2 mt-4">
                        <button
                            onClick={handleReset}
                            className="bg-red-400 text-white py-3 px-6 rounded-lg hover:bg-red-500 text-lg"
                        >
                            Сбросить
                        </button>
                        <button
                            onClick={handleSimulate}
                            className="bg-gray-400 text-white py-3 px-6 rounded-lg hover:bg-gray-500 text-lg"
                        >
                            Смоделировать
                        </button>
                    </div>
                </div>
                <div className="w-3/4 h-full">
                    <Map
                        start={start}
                        end={end}
                        waypoints={waypoints}
                        onStartChange={setStart}
                        onEndChange={setEnd}
                        onWaypointChange={handleWaypointChange}
                        routePolyline={routePolyline}
                    />
                </div>
            </div>
        </div>
    );
}