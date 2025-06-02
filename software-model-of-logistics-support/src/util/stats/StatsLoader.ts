import { promises as fs } from "fs";
import path from "path";
import { RawEntry } from "./RawEntry";

export class StatsLoader {
    private static filePath = path.join(process.cwd(), "data", "stats.json");

    public static async loadAll(): Promise<RawEntry[]> {
        try {
            const text = await fs.readFile(this.filePath, "utf8");
            const arr = JSON.parse(text) as RawEntry[];
            return arr;
        } catch {
            return [];  // если нет файла или он пустой
        }
    }
}