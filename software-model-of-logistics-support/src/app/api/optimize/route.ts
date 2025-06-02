import {NextRequest, NextResponse} from "next/server"
import {RouteOptimizer} from "@/util/optimize/RouteOptimizer"
import {Customer, Warehouse} from "@/util/models";

export async function POST(req: NextRequest) {
    const {warehouses, customers, vehicleCount, vehicleCap, alpha, beta} = await req.json() as {
        warehouses: Warehouse[];
        customers: Customer[];
        vehicleCount: number;
        vehicleCap: number;
        alpha?: number;
        beta?: number;
    };

    if (!Array.isArray(warehouses) || !Array.isArray(customers)) {
        return NextResponse.json({error: "Bad input"}, {status: 400});
    }

    try {
        const optimizer = new RouteOptimizer(warehouses, customers, vehicleCount, vehicleCap, alpha ?? 1, beta ?? 1)
        const routes = await optimizer.optimize()
        return NextResponse.json({routes})
    } catch (e: any) {
        return NextResponse.json({error: e.message}, {status: 500})
    }
}