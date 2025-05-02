import { NextRequest, NextResponse } from "next/server";
import { Route as OptRoute } from "@/util/routeOptimizer";

interface SimReq {
    optimizedRoutes: OptRoute[];
    speed: number;
    attackRisk: number;
    warehouseLoss: number;
    consumptionRate: number;
    experimentsCount: number;
}

function getRandom(): number {
    return Math.random();
}

export async function POST(req: NextRequest) {
    try {
        const {
            optimizedRoutes,
            speed,
            attackRisk,
            warehouseLoss,
            consumptionRate,
            experimentsCount,
        } = (await req.json()) as SimReq;

        if (!Array.isArray(optimizedRoutes)) {
            return NextResponse.json({ error: "optimizedRoutes должен быть массивом" }, { status: 400 });
        }

        let rawTime = 0, rawDelivered = 0, rawLostWarehouse = 0, rawLostTransit = 0, rawConsumed = 0;
        let sumTime = 0, sumDelivered = 0, sumLostWarehouse = 0, sumLostTransit = 0, sumConsumed = 0;
        const events: string[] = [];

        for (let exp = 0; exp < experimentsCount; exp++) {
            let currentTime = 0, delivered = 0, lostWarehouse = 0, lostTransit = 0, consumed = 0;

            for (const route of optimizedRoutes) {
                for (let i = 0; i < route.nodes.length - 1; i++) {
                    const dt = 1;
                    consumed += consumptionRate * dt;
                    currentTime += dt;

                    const r = getRandom();
                    if (r < warehouseLoss / 100) {
                        lostWarehouse++;
                    } else if (r < (warehouseLoss + attackRisk) / 100) {
                        lostTransit++;
                    } else {
                        delivered++;
                    }
                }
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
                    `#1: time=${currentTime.toFixed(2)}, del=${delivered}, whLost=${lostWarehouse}, ` +
                    `trLost=${lostTransit}, cons=${consumed.toFixed(2)}`
                );
            }
        }

        const avgTime = Number((sumTime / experimentsCount).toFixed(2));
        const avgDelivered = Number((sumDelivered / experimentsCount).toFixed(2));
        const avgLostWarehouse = Number((sumLostWarehouse / experimentsCount).toFixed(2));
        const avgLostTransit = Number((sumLostTransit / experimentsCount).toFixed(2));
        const avgConsumed = Number((sumConsumed / experimentsCount).toFixed(2));

        return NextResponse.json({
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
        });
    } catch (err: any) {
        console.error("SIMULATE ERROR:", err);
        return NextResponse.json({ error: err.message || "Unknown simulate error" }, { status: 500 });
    }
}