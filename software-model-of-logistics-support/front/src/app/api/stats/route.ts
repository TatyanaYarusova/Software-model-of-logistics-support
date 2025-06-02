import { NextResponse } from "next/server";
import { StatsLoader }     from "@/util/stats/StatsLoader";
import { StatsAggregator } from "@/util/stats/StatsAggregator";

export async function GET() {
    try {
        const entries = await StatsLoader.loadAll();
        if (entries.length === 0) {
            return NextResponse.json({ error: "Нет данных" }, { status: 404 });
        }

        const stats = new StatsAggregator(entries).aggregate();
        return NextResponse.json(stats);
    } catch (err: any) {
        console.error("API /api/stats error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}