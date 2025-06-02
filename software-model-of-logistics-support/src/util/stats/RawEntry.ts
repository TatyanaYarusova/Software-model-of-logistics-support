export interface RawEntry {
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
        failCount?: number;
    };
}