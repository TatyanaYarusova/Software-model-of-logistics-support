import { promises as fs } from "fs";
import path from "path";

export class StatsSaver {
    private static filePath = path.join(process.cwd(), "data", "stats.json");

    public static async save(entry: any) {
        let arr: any[] = [];
        try {
            const txt = await fs.readFile(this.filePath, "utf8");
            arr = JSON.parse(txt);
        } catch {
            arr = [];
        }
        arr.push(entry);
        await fs.writeFile(this.filePath, JSON.stringify(arr, null, 2), "utf8");
    }
}
