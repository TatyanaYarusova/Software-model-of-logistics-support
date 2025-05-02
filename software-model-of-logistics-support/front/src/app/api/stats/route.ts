import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface RawEntry {
    timestamp: string;
    params: {
        speed: number;
        attackRisk: number;
        warehouseLoss: number;
        consumptionRate: number;
        experimentsCount: number;
        product: number;
        vehicleCount: number;
        vehicleCap: number;
    };
    routeSummary: string[];
    routeKm?: number;
    result: {
        rawTime: number;
        rawDelivered: number;
        rawLostWarehouse: number;
        rawLostTransit: number;
        rawConsumed: number;
        avgTime: number;
        avgDelivered: number;
        avgLostWarehouse: number;
        avgLostTransit: number;
        avgConsumed: number;
    };
}

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), "data", "stats.json");
        const raw = await fs.readFile(filePath, "utf8");
        const all: RawEntry[] = JSON.parse(raw);

        if (all.length === 0) {
            return NextResponse.json({ error: "Нет данных" }, { status: 404 });
        }

        const routesBuilt = all.length;
        let successfulDeliveries = 0;
        let failedDeliveries = 0;
        let freeTransport = 0;
        let sumRisk = 0;
        let sumTime = 0;
        let sumCount = 0;
        let longestRouteKm = 0;
        const dayMap: Record<string, number> = {};

        for (const e of all) {
            successfulDeliveries += e.result.avgDelivered;
            failedDeliveries     += (e.params.vehicleCount - e.result.avgDelivered);
            freeTransport        += (e.params.vehicleCount - e.result.avgDelivered);

            sumRisk += e.params.attackRisk ?? 0;
            sumTime += e.result.avgTime;
            sumCount++;

            if (e.routeKm != null && e.routeKm > longestRouteKm) {
                longestRouteKm = e.routeKm;
            }

            const day = new Date(e.timestamp).toLocaleDateString("ru-RU", { weekday: "short" });
            dayMap[day] = (dayMap[day] || 0) + e.result.avgDelivered;
        }

        const last = all[all.length - 1];
        const lastParams = last.params;
        const lastRun = {
            timestamp:     last.timestamp,
            time:          last.result.rawTime,
            delivered:     last.result.rawDelivered,
            lostWarehouse: last.result.rawLostWarehouse,
            lostTransit:   last.result.rawLostTransit,
            consumed:      last.result.rawConsumed,
        };

        const averageRiskPercent          = sumRisk / sumCount;
        const averageDeliveryTimeMinutes  = (sumTime / sumCount) * 60;
        const weeklySuccess = Object.entries(dayMap).map(([name, success]) => ({ name, success }));

        return NextResponse.json({
            routesBuilt,
            successfulDeliveries,
            failedDeliveries,
            freeTransport,
            averageRiskPercent,
            averageDeliveryTimeMinutes,
            longestRouteKm,
            weeklySuccess,
            lastParams,
            lastRun,
        });
    } catch (err: any) {
        console.error("API /api/stats error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}