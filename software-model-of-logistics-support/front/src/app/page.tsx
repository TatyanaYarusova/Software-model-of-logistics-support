"use client";

import dynamic from "next/dynamic";
import {useState} from "react";
import {useRouter} from "next/navigation";

const Map = dynamic(() => import("@/components/Map"), {ssr: false});

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
    const [routeIds, setRouteIds] = useState<string[]>([]);
    const [routeNodesPos, setRouteNodesPos] = useState<[number, number][]>([]);

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
        setRouteIds([]);
        setRouteNodesPos([]);
    };

    const handleRemoveWaypoint = (i: number) => {
        const w = [...waypoints];
        w.splice(i, 1);
        setWaypoints(w);
    };

    const handleSimulate = async () => {
        if (
            !start ||
            !end ||
            speed == null ||
            product == null ||
            attackRisk == null ||
            warehouseLoss == null ||
            consumptionRate == null ||
            experimentsCount == null
        ) {
            alert("Заполните все поля перед симуляцией");
            return;
        }

        const customers = [
            { id: "END", lat: end[0], lng: end[1], demand: 1 },
            ...waypoints.map((wp, i) => ({
                id: `WP${i}`,
                lat: wp[0],
                lng: wp[1],
                demand: 1,
            })),
        ];

        const optRes = await fetch("/api/optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                warehouses: [
                    {
                        id: "WH",
                        lat: start[0],
                        lng: start[1],
                        stock: product,
                        lossProb: warehouseLoss / 100,
                    },
                ],
                customers,
                vehicleCount: 1,
                vehicleCap: customers.length + 1,
                alpha: 1,
                beta: 1,
            }),
        });
        if (!optRes.ok) {
            alert(`Ошибка оптимизации: ${await optRes.text()}`);
            return;
        }
        const { routes } = await optRes.json();
        const fullRoute = routes[0]; // [WH, END, WP0, …, WH]

        const visitOrder = fullRoute.nodes.slice(0, -1);
        setRouteIds(visitOrder.map((n) => n.id));
        setRouteNodesPos(
            visitOrder.map((n) => [n.lat, n.lng] as [number, number])
        );

        const coordString = visitOrder
            .map((n) => `${n.lng},${n.lat}`)
            .join(";");
        const osrmRes = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`
        );
        const osrmData = await osrmRes.json();
        if (osrmData.code !== "Ok") {
            alert("Ошибка получения полилинии у OSRM");
            return;
        }
        const geo = osrmData.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
        );
        setRoutePolyline(geo);

        const simRes = await fetch("/api/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                optimizedRoutes: [{ nodes: fullRoute.nodes, load: fullRoute.load }],
                speed,
                attackRisk,
                warehouseLoss,
                consumptionRate,
                experimentsCount,
            }),
        });
        if (!simRes.ok) {
            alert(`Ошибка симуляции: ${await simRes.text()}`);
            return;
        }
        const result = await simRes.json();

        const log = Array.isArray(result.events)
            ? result.events.join("\n")
            : result.events;
        alert(
            `Экспериментов: ${result.experimentsCount}\n\n` +
            `Маршрут:\n${visitOrder
                .map((n, i) => `${i + 1}: ${n.id}`)
                .join(" → ")}\n\n` +
            `Первый: time=${result.rawTime}, del=${result.rawDelivered}, ` +
            `whLost=${result.rawLostWarehouse}, trLost=${result.rawLostTransit}, cons=${result.rawConsumed}\n` +
            `Среднее: time=${result.avgTime}, del=${result.avgDelivered}, ` +
            `whLost=${result.avgLostWarehouse}, trLost=${result.avgLostTransit}, cons=${result.avgConsumed}\n\n` +
            `Лог первого:\n${log}`
        );
    }

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
                        onWaypointChange={setWaypoints}
                        routePolyline={routePolyline}
                        routeIds={routeIds}
                        routeNodesPos={routeNodesPos}
                    />
                </div>
            </div>
        </div>
    );
}