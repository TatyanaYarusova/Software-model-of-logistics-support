import { RawEntry } from "./RawEntry";

export interface WeeklyDatum {
    name: string;
    success: number;
}

export interface LastParams {
    speed: number;
    attackRisk: number;
    warehouseLoss: number;
    consumptionRate: number;
    experimentsCount: number;
    product: number;
    vehicleCount: number;
    vehicleCap: number;
}

export interface LastRun {
    timestamp: string;
    time: number;
    delivered: number;
    lostWarehouse: number;
    lostTransit: number;
    consumed: number;
}

export interface StatsDTO {
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
}

export class StatsAggregator {
    constructor(private entries: RawEntry[]) {}

    public aggregate(): StatsDTO {
        if (this.entries.length === 0) {
            throw new Error("Нет данных для агрегации");
        }

        let successfulDeliveries = 0;
        let failedDeliveries     = 0;
        let freeTransport        = 0;
        let sumRisk              = 0;
        let sumTime              = 0;
        let sumCount             = 0;
        let longestRouteKm       = 0;
        const dayMap: Record<string, number> = {};

        for (const e of this.entries) {
            successfulDeliveries += e.result.avgDelivered;
            // провал считаем, когда avgDelivered == 0
            failedDeliveries     += e.result.avgDelivered === 0 ? 1 : 0;
            freeTransport        += e.params.vehicleCount - e.result.avgDelivered;

            sumRisk  += e.params.attackRisk;
            sumTime  += e.result.avgTime;
            sumCount++;

            if ((e.routeKm ?? 0) > longestRouteKm) {
                longestRouteKm = e.routeKm!;
            }

            const day = new Date(e.timestamp)
                .toLocaleDateString("ru-RU", { weekday: "short" });
            dayMap[day] = (dayMap[day] || 0) + e.result.avgDelivered;
        }

        // последний прогоны
        const last = this.entries[this.entries.length - 1];
        const lastParams: LastParams = last.params;
        const lastRun: LastRun = {
            timestamp:     last.timestamp,
            time:          last.result.rawTime,
            delivered:     last.result.rawDelivered,
            lostWarehouse: last.result.rawLostWarehouse,
            lostTransit:   last.result.rawLostTransit,
            consumed:      last.result.rawConsumed,
        };

        const averageRiskPercent         = sumRisk / sumCount;
        const averageDeliveryTimeMinutes = (sumTime / sumCount) * 60;
        const weeklySuccess: WeeklyDatum[] = Object.entries(dayMap)
            .map(([name, success]) => ({ name, success }));

        return {
            routesBuilt: this.entries.length,
            successfulDeliveries,
            failedDeliveries,
            freeTransport,
            averageRiskPercent,
            averageDeliveryTimeMinutes,
            longestRouteKm,
            weeklySuccess,
            lastParams,
            lastRun,
        };
    }
}