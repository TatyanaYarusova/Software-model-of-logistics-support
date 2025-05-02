import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { Route as OptRoute } from "@/util/routeOptimizer";

interface SimReq {
    optimizedRoutes: OptRoute[];
    speed: number;
    attackRisk: number;
    warehouseLoss: number;
    consumptionRate: number;
    experimentsCount: number;
    product: number;
    vehicleCount: number;
    vehicleCap: number;
}

function haversine([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

type Event = { time: number; fromIdx: number; toIdx: number; };
class EventQueue {
    private heap: Event[] = [];
    push(e: Event) {
        this.heap.push(e);
        this.heap.sort((a, b) => a.time - b.time);
    }
    pop(): Event | undefined {
        return this.heap.shift();
    }
    isEmpty(): boolean {
        return this.heap.length === 0;
    }
}

function simulateOne(
    route: OptRoute,
    speed: number,
    attackRisk: number,
    warehouseLoss: number,
    consumptionRate: number,
    initialStock: number
) {
    const q = new EventQueue();
    let currentTime = 0;
    let delivered = 0,
        lostWarehouse = 0,
        lostTransit = 0,
        consumed = 0;
    let stock = initialStock;

    for (let i = 0; i < route.nodes.length - 1; i++) {
        const from = route.nodes[i];
        const to   = route.nodes[i + 1];
        const dist = haversine([from.lat, from.lng], [to.lat, to.lng]);
        const tseg = dist / speed;
        q.push({ time: currentTime + tseg, fromIdx: i, toIdx: i + 1 });
        currentTime += tseg;
    }

    currentTime = 0;

    while (!q.isEmpty() && stock > 0) {
        const e = q.pop()!;
        const dt = e.time - currentTime;
        consumed += consumptionRate * dt;
        currentTime = e.time;
        // при прибытии:
        stock--;
        const r = Math.random() * 100;
        if (r < warehouseLoss) {
            lostWarehouse++;
        } else if (r < warehouseLoss + attackRisk) {
            lostTransit++;
        } else {
            delivered++;
        }
    }

    return {
        time: Number(currentTime.toFixed(2)),
        delivered,
        lostWarehouse,
        lostTransit,
        consumed: Number(consumed.toFixed(2))
    };
}

async function saveStats(entry: any) {
    const file = path.join(process.cwd(), "data", "stats.json");
    let arr: any[] = [];
    try {
        arr = JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
        arr = [];
    }
    arr.push(entry);
    await fs.writeFile(file, JSON.stringify(arr, null, 2), "utf8");
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as SimReq;
        const {
            optimizedRoutes,
            speed,
            attackRisk,
            warehouseLoss,
            consumptionRate,
            experimentsCount,
            product,
            vehicleCount,
            vehicleCap
        } = body;

        if (!Array.isArray(optimizedRoutes) || optimizedRoutes.length === 0) {
            return NextResponse.json({ error: "optimizedRoutes должен быть непустым массивом" }, { status: 400 });
        }
        if (product <= 0) {
            return NextResponse.json({ error: "product должен быть > 0" }, { status: 400 });
        }

        let sumTime = 0,
            sumDel = 0,
            sumLostW = 0,
            sumLostT = 0,
            sumCons = 0;
        let raw = null as null | ReturnType<typeof simulateOne>;
        let successCount = 0;
        let failCount = 0;
        const events: string[] = [];

        for (let i = 0; i < experimentsCount; i++) {
            const res = simulateOne(
                optimizedRoutes[0],
                speed, attackRisk, warehouseLoss, consumptionRate, product
            );

            if (i === 0) {
                raw = res;
                events.push(
                    `#1: time=${res.time}, del=${res.delivered}, whLost=${res.lostWarehouse}, trLost=${res.lostTransit}, cons=${res.consumed}`
                );
            }

            sumTime    += res.time;
            sumDel     += res.delivered;
            sumLostW   += res.lostWarehouse;
            sumLostT   += res.lostTransit;
            sumCons    += res.consumed;

            if (res.delivered > 0) {
                successCount++;
            } else {
                failCount++;
            }
        }

        const avgTime = Number((sumTime / experimentsCount).toFixed(2));
        const avgDel  = Math.round(sumDel / experimentsCount);
        const avgLostW= Math.round(sumLostW / experimentsCount);
        const avgLostT= Math.round(sumLostT / experimentsCount);
        const avgCons = Number((sumCons / experimentsCount).toFixed(2));

        const result = {
            experimentsCount,
            rawTime: raw!.time,
            rawDelivered: raw!.delivered,
            rawLostWarehouse: raw!.lostWarehouse,
            rawLostTransit: raw!.lostTransit,
            rawConsumed: raw!.consumed,
            avgTime,
            avgDelivered: avgDel,
            avgLostWarehouse: avgLostW,
            avgLostTransit: avgLostT,
            avgConsumed: avgCons,
            successCount,
            failCount,
            events
        };

        await saveStats({
            timestamp: new Date().toISOString(),
            params:   { speed, attackRisk, warehouseLoss, consumptionRate, experimentsCount, product, vehicleCount, vehicleCap },
            route:    optimizedRoutes[0].nodes.map(n => n.id),
            result
        });

        return NextResponse.json(result);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}