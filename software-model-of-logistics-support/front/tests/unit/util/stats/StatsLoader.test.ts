import { promises as fs } from "fs";
import path from "path";
import { StatsLoader } from "@/util/stats/StatsLoader";
import { RawEntry } from "@/util/stats/RawEntry";

jest.mock("fs", () => ({
    promises: {
        readFile: jest.fn(),
    },
}));

describe("Класс StatsLoader", () => {
    const filePath = path.join(process.cwd(), "data", "stats.json");
    const sampleEntries: RawEntry[] = [
        {
            timestamp: "2025-05-05T12:00:00.000Z",
            params: {
                speed: 1,
                attackRisk: 0,
                warehouseLoss: 0,
                consumptionRate: 1,
                experimentsCount: 1,
                product: 1,
                vehicleCount: 1,
                vehicleCap: 1,
            },
            routeSummary: ["W1", "C1", "W1"],
            result: {
                rawTime: 1,
                rawDelivered: 1,
                rawLostWarehouse: 0,
                rawLostTransit: 0,
                rawConsumed: 1,
                avgTime: 1,
                avgDelivered: 1,
                avgLostWarehouse: 0,
                avgLostTransit: 0,
                avgConsumed: 1,
            },
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("возвращает массив записей, если файл существует и содержит валидный JSON", async () => {
        (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(sampleEntries));

        const result = await StatsLoader.loadAll();

        expect(fs.readFile).toHaveBeenCalledWith(filePath, "utf8");
        expect(result).toEqual(sampleEntries);
    });

    test("возвращает пустой массив, если файл не найден (throw)", async () => {
        (fs.readFile as jest.Mock).mockRejectedValue(new Error("ENOENT"));

        const result = await StatsLoader.loadAll();

        expect(fs.readFile).toHaveBeenCalledWith(filePath, "utf8");
        expect(result).toEqual([]);
    });

    test("возвращает пустой массив, если в файле некорректный JSON", async () => {
        (fs.readFile as jest.Mock).mockResolvedValue("not a json");

        const result = await StatsLoader.loadAll();

        expect(fs.readFile).toHaveBeenCalledWith(filePath, "utf8");
        expect(result).toEqual([]);
    });
});