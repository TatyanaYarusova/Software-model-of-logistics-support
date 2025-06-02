import { Haversine } from "./haversine";
import { EventQueue } from "./EventQueue";
import { Route as OptRoute, Node } from "@/util/optimize/RouteOptimizer";

export interface SimResult {
    time: number;
    delivered: number;
    lostWarehouse: number;
    lostTransit: number;
    consumed: number;
}

export interface Status {
    success: boolean;
    reason: string | null;
}

export class Simulator {
    constructor(
        private route: OptRoute,
        private speed: number,
        private attackRisk: number,
        private warehouseLoss: number,
        private consumptionRate: number,
        private initialStock: number
    ) {}

    public runOne(): SimResult {
        const q = new EventQueue();
        let currentTime = 0;
        let delivered = 0, lostWarehouse = 0, lostTransit = 0, consumed = 0;
        let stock = this.initialStock;

        // Расписание событий
        for (let i = 0; i < this.route.nodes.length - 1; i++) {
            const from = this.route.nodes[i], to = this.route.nodes[i + 1];
            const dist = Haversine.distance([from.lat, from.lng], [to.lat, to.lng]);
            const tseg = dist / this.speed;
            q.push({ time: currentTime + tseg, fromIdx: i, toIdx: i + 1 });
            currentTime += tseg;
        }
        currentTime = 0;

        // Обработка событий
        while (!q.isEmpty() && stock > 0) {
            const e = q.pop()!;
            const dt = e.time - currentTime;
            consumed += this.consumptionRate * dt;
            currentTime = e.time;
            stock--;
            const r = Math.random() * 100;
            if (r < this.warehouseLoss) {
                lostWarehouse++;
            } else if (r < this.warehouseLoss + this.attackRisk) {
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

    public static determineStatus(res: SimResult): Status {
        if (res.delivered > 0) return { success: true, reason: null };
        if (res.lostWarehouse > 0) return { success: false, reason: "Потеря на складе" };
        if (res.lostTransit   > 0) return { success: false, reason: "Потеря в пути"    };
        return { success: false, reason: "Неизвестная ошибка" };
    }
}