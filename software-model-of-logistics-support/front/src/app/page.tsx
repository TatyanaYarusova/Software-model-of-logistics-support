"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function MainPage() {
    const router = useRouter();

    const [start, setStart] = useState(null);
    const [end, setEnd] = useState(null);
    const [waypoints, setWaypoints] = useState([]);

    const [speed, setSpeed] = useState();
    const [transport, setTransport] = useState();
    const [attackRisk, setAttackRisk] = useState();
    const [successRate, setSuccessRate] = useState();
    const [warehouseLoss, setWarehouseLoss] = useState();

    const handleWaypointChange = (updated) => setWaypoints(updated);

    const handleRemoveWaypoint = (index) => {
        const updated = [...waypoints];
        updated.splice(index, 1);
        setWaypoints(updated);
    };

    const handleReset = () => {
        setStart(null);
        setEnd(null);
        setWaypoints([]);
        setSpeed(undefined);
        setTransport(undefined);
        setAttackRisk(undefined);
        setSuccessRate(undefined);
        setWarehouseLoss(undefined);
    };

    return (
        <div className="flex flex-col h-screen w-full">
            <div className="w-full bg-gray-300 p-4 flex justify-between border-b">
                <div className="flex space-x-4">
                    <button className="font-semibold">Главная</button>
                    <button className="font-semibold" onClick={() => router.push("/dashboard")}>Дашбоард</button>
                </div>
            </div>
            <div className="flex flex-grow">
                <div className="w-1/4 bg-gray-200 p-4 flex flex-col gap-2 overflow-y-auto">
                    <div className="flex flex-col space-y-2">
                        <label className="font-semibold">Начальная точка (выберите на карте)</label>
                        <input
                            type="text"
                            value={start ? `${start[0].toFixed(5)}, ${start[1].toFixed(5)}` : "Не выбрана"}
                            disabled
                            className="p-2 border rounded-md bg-gray-100 text-gray-500"
                        />

                        <label className="font-semibold">Конечная точка (выберите на карте)</label>
                        <input
                            type="text"
                            value={end ? `${end[0].toFixed(5)}, ${end[1].toFixed(5)}` : "Не выбрана"}
                            disabled
                            className="p-2 border rounded-md bg-gray-100 text-gray-500"
                        />

                        <label className="font-semibold">Промежуточные точки (выберите на карте)</label>
                        {waypoints.map((wp, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={wp ? `${wp[0].toFixed(5)}, ${wp[1].toFixed(5)}` : ""}
                                    disabled
                                    className="p-2 border rounded-md bg-gray-100 text-gray-500 flex-grow"
                                />
                                <button
                                    onClick={() => handleRemoveWaypoint(index)}
                                    className="text-red-500 hover:text-red-700 font-bold text-xl"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}

                        <label className="font-semibold">Средняя скорость движения (км/ч)</label>
                        <input
                            type="number"
                            value={speed ?? ""}
                            onChange={(e) => setSpeed(Math.max(0, Math.min(300, Number(e.target.value))))}
                            className="p-2 border rounded-md"
                        />

                        <label className="font-semibold">Количество свободного транспорта</label>
                        <input
                            type="number"
                            value={transport ?? ""}
                            onChange={(e) => setTransport(Math.max(0, Math.min(1000, Number(e.target.value))))}
                            className="p-2 border rounded-md"
                        />

                        <label className="font-semibold">Вероятность атаки на маршруте (%)</label>
                        <input
                            type="number"
                            value={attackRisk ?? ""}
                            onChange={(e) => setAttackRisk(Math.max(0, Math.min(100, Number(e.target.value))))}
                            className="p-2 border rounded-md"
                        />

                        <label className="font-semibold">Вероятность успешной доставки (%)</label>
                        <input
                            type="number"
                            value={successRate ?? ""}
                            onChange={(e) => setSuccessRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                            className="p-2 border rounded-md"
                        />

                        <label className="font-semibold">Вероятность уничтожения товара на складе (%)</label>
                        <input
                            type="number"
                            value={warehouseLoss ?? ""}
                            onChange={(e) => setWarehouseLoss(Math.max(0, Math.min(100, Number(e.target.value))))}
                            className="p-2 border rounded-md"
                        />
                    </div>
                    <div className="flex justify-between gap-2 mt-4">
                        <button
                            onClick={handleReset}
                            className="bg-red-400 text-white py-3 px-6 rounded-lg hover:bg-red-500 text-lg"
                        >
                            Сбросить
                        </button>
                        <button className="bg-gray-400 text-white py-3 px-6 rounded-lg hover:bg-gray-500 text-lg">
                            Рассчитать
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
                    />
                </div>
            </div>
        </div>
    );
}