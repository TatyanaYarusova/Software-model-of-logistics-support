import { NextRequest, NextResponse } from "next/server";
import { Warehouse, Customer, optimizeRoutes } from "@/util/routeOptimizer";

export async function POST(req: NextRequest) {
    try {
        const {
            warehouses,
            customers,
            vehicleCount,
            vehicleCap,
            alpha,
            beta,
        } = (await req.json()) as {
            warehouses: Warehouse[];
            customers: Customer[];
            vehicleCount: number;
            vehicleCap: number;
            alpha?: number;
            beta?: number;
        };

        if (!Array.isArray(warehouses) || !Array.isArray(customers)) {
            return NextResponse.json({ error: "Bad input" }, { status: 400 });
        }

        const routes = await optimizeRoutes(
            warehouses,
            customers,
            vehicleCount,
            vehicleCap,
            alpha ?? 1,
            beta ?? 1
        );

        return NextResponse.json({ routes });
    } catch (err: any) {
        console.error("OPTIMIZE ERROR:", err);
        return NextResponse.json({ error: err.message || "Unknown optimize error" }, { status: 500 });
    }
}