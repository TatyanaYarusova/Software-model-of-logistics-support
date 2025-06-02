import { promises as fs } from "fs";
import path from "path";
import { StatsSaver } from "@/util/stats/StatSaver";

jest.mock("fs", () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
    },
}));

describe("Класс StatsSaver", () => {
    const filePath = path.join(process.cwd(), "data", "stats.json");
    const mockEntry = { foo: "bar" };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("при отсутствии файла записывает новый массив с записью", async () => {
        // имитируем, что файл не найден
        (fs.readFile as jest.Mock).mockRejectedValue(new Error("ENOENT"));

        await StatsSaver.save(mockEntry);

        // ожидам попытки чтения
        expect(fs.readFile).toHaveBeenCalledWith(filePath, "utf8");
        // ожидам запись нового массива
        expect(fs.writeFile).toHaveBeenCalledWith(
            filePath,
            JSON.stringify([mockEntry], null, 2),
            "utf8"
        );
    });

    test("при наличии файла дописывает запись в существующий массив", async () => {
        const existing = [{ a: 1 }];
        // имитируем успешное чтение JSON
        (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existing));

        await StatsSaver.save(mockEntry);

        expect(fs.readFile).toHaveBeenCalledWith(filePath, "utf8");
        // должен прочитать, распарсить, добавить и записать обратно
        expect(fs.writeFile).toHaveBeenCalledWith(
            filePath,
            JSON.stringify([...existing, mockEntry], null, 2),
            "utf8"
        );
    });

    test("если файл содержит некорректный JSON, начинает с пустого массива", async () => {
        // чтение возвращает некорректный JSON
        (fs.readFile as jest.Mock).mockResolvedValue("not json");

        await StatsSaver.save(mockEntry);

        expect(fs.readFile).toHaveBeenCalledWith(filePath, "utf8");
        expect(fs.writeFile).toHaveBeenCalledWith(
            filePath,
            JSON.stringify([mockEntry], null, 2),
            "utf8"
        );
    });
});