import { NextRequest, NextResponse } from "next/server";

interface SimulationRequest {
    start: [number, number];
    end: [number, number];
    waypoints: [number, number][];
    speed: number;
    transport: number;
    attackRisk: number;
    warehouseLoss: number;
    consumptionRate: number;
    product: number;
    experimentsCount: number;
}

function getRandom(): number {
    return Math.random();
}

export async function POST(req: NextRequest) {
    const body = (await req.json()) as SimulationRequest;
    const {
        start, end, waypoints,
        speed, transport,
        attackRisk, warehouseLoss, consumptionRate,
        product, experimentsCount
    } = body;

    const toCoord = ([lat, lng]: [number, number]) => ({ lat, lng });
    const points = [start, ...waypoints, end].map(toCoord);

    if (points.length < 2) {
        return NextResponse.json({ status: "error", message: "Недостаточно точек" }, { status: 400 });
    }

    // Получаем полилинию через OSRM
    const coordStr = points.map(p => `${p.lng},${p.lat}`).join(";");
    const osrmRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`
    );
    const osrmData = await osrmRes.json();
    if (osrmData.code !== "Ok" || !osrmData.routes?.[0]) {
        return NextResponse.json({ status: "error", message: "Ошибка маршрута" }, { status: 500 });
    }

    const distanceKm = osrmData.routes[0].distance / 1000;
    const timePerTrip = distanceKm / speed;
    const routePolyline: [number, number][] = osrmData.routes[0].geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
    );

    // Для усреднения
    let sumTime = 0,
        sumDelivered = 0,
        sumLostWarehouse = 0,
        sumLostTransit = 0,
        sumConsumed = 0;

    // Параметры первого прогона
    let rawTime = 0,
        rawDelivered = 0,
        rawLostWarehouse = 0,
        rawLostTransit = 0,
        rawConsumed = 0;

    const events: string[] = [];

    for (let exp = 0; exp < experimentsCount; exp++) {
        let currentTime = 0;
        let stock = product;
        let avail = transport;
        let delivered = 0;
        let lostWarehouse = 0;
        let lostTransit = 0;
        let consumed = 0;

        while (stock > 0 && avail > 0) {
            const toConsume = consumptionRate * timePerTrip;
            const actual = Math.min(stock, toConsume);
            stock -= actual;
            consumed += actual;

            currentTime += timePerTrip;
            stock -= 1;
            avail -= 1;

            const r = getRandom();
            if (r < warehouseLoss / 100) {
                lostWarehouse++;
                continue;
            }
            if (r < (warehouseLoss + attackRisk) / 100) {
                lostTransit++;
                continue;
            }
            delivered++;
        }

        sumTime += currentTime;
        sumDelivered += delivered;
        sumLostWarehouse += lostWarehouse;
        sumLostTransit += lostTransit;
        sumConsumed += consumed;

        if (exp === 0) {
            rawTime = currentTime;
            rawDelivered = delivered;
            rawLostWarehouse = lostWarehouse;
            rawLostTransit = lostTransit;
            rawConsumed = consumed;
            events.push(
                `Эксперимент #1: время=${currentTime.toFixed(2)}, доставлено=${delivered}, ` +
                `склад=${lostWarehouse}, в пути=${lostTransit}, расход=${consumed.toFixed(2)}`
            );
        }
    }

    // Средние значения
    const avgTime = Number((sumTime / experimentsCount).toFixed(2));
    const avgDelivered = Number((sumDelivered / experimentsCount).toFixed(2));
    const avgLostWarehouse = Number((sumLostWarehouse / experimentsCount).toFixed(2));
    const avgLostTransit = Number((sumLostTransit / experimentsCount).toFixed(2));
    const avgConsumed = Number((sumConsumed / experimentsCount).toFixed(2));

    return NextResponse.json({
        status: "success",
        experimentsCount,
        rawTime: Number(rawTime.toFixed(2)),
        rawDelivered,
        rawLostWarehouse,
        rawLostTransit,
        rawConsumed: Number(rawConsumed.toFixed(2)),
        avgTime,
        avgDelivered,
        avgLostWarehouse,
        avgLostTransit,
        avgConsumed,
        events,
        routePolyline,
    });
}