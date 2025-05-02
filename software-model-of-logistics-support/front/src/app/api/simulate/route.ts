import { NextRequest, NextResponse } from "next/server";
import { Simulator, SimResult } from "@/util/simulate/Simulator";
import { StatsSaver }    from "@/util/stats/StatSaver";
import { Route as OptRoute } from "@/util/optimize/RouteOptimizer";

interface SimReq {
    optimizedRoutes: OptRoute[];
    speed: number; attackRisk: number; warehouseLoss: number;
    consumptionRate: number; experimentsCount: number;
    product: number; vehicleCount: number; vehicleCap: number;
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as SimReq;
        const {
            optimizedRoutes, speed, attackRisk, warehouseLoss,
            consumptionRate, experimentsCount, product,
            vehicleCount, vehicleCap
        } = body;

        // валидация
        if (!optimizedRoutes?.length) {
            return NextResponse.json({ error: "Нужен маршрут" }, { status: 400 });
        }
        if (product <= 0) {
            return NextResponse.json({ error: "product > 0" }, { status: 400 });
        }

        const route = optimizedRoutes[0];
        let sumTime = 0, sumDel = 0, sumLW = 0, sumLT = 0, sumCons = 0;
        let raw: SimResult | null = null;
        let successCount = 0, failCount = 0;
        const events: string[] = [];
        const reasons: (string | null)[] = [];

        // главный цикл экспериментов
        for (let i = 0; i < experimentsCount; i++) {
            const sim = new Simulator(
                route,
                speed, attackRisk, warehouseLoss,
                consumptionRate, product
            );
            const one = sim.runOne();
            const st = Simulator.determineStatus(one);

            if (i === 0) {
                raw = one;
                events.push(
                    `#1: time=${one.time}, del=${one.delivered}, whLost=${one.lostWarehouse}, trLost=${one.lostTransit}, cons=${one.consumed}`
                );
            }

            sumTime  += one.time;
            sumDel   += one.delivered;
            sumLW    += one.lostWarehouse;
            sumLT    += one.lostTransit;
            sumCons  += one.consumed;

            if (st.success) successCount++;
            else { failCount++; reasons.push(st.reason); }
        }

        // вычисляем средние
        const avgTime    = Number((sumTime / experimentsCount).toFixed(2));
        const avgDel     = Math.round(sumDel / experimentsCount);
        const avgLW      = Math.round(sumLW  / experimentsCount);
        const avgLT      = Math.round(sumLT  / experimentsCount);
        const avgCons    = Number((sumCons / experimentsCount).toFixed(2));

        const result = {
            experimentsCount,
            rawTime: raw!.time,
            rawDelivered: raw!.delivered,
            rawLostWarehouse: raw!.lostWarehouse,
            rawLostTransit: raw!.lostTransit,
            rawConsumed: raw!.consumed,
            avgTime,
            avgDelivered: avgDel,
            avgLostWarehouse: avgLW,
            avgLostTransit: avgLT,
            avgConsumed: avgCons,
            successCount,
            failCount,
            events,
            simulationStatus: successCount > 0 ? "Успешная" : "Неуспешная",
            failureReason: successCount > 0 ? null : reasons[0] ?? null
        };

        // записываем в stats.json
        await StatsSaver.save({
            timestamp: new Date().toISOString(),
            params:    { speed, attackRisk, warehouseLoss, consumptionRate, experimentsCount, product, vehicleCount, vehicleCap },
            route:     route.nodes.map(n => n.id),
            result
        });

        return NextResponse.json(result);
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}