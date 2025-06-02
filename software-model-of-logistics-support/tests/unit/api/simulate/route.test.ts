jest.mock("next/server", () => {
    return {
        NextRequest: class {
            private _body: any;
            constructor(init: any) { this._body = init; }
            async json() { return this._body; }
        },
        NextResponse: {
            json(body: any, opts?: { status: number }) {
                // эмулируем возвращаемый NextResponse
                return {
                    status: opts?.status ?? 200,
                    async json() { return body; }
                };
            }
        }
    };
});

// Мокаем StatsSaver, чтобы не писать в файл
jest.mock("@/util/stats/StatSaver", () => ({
    StatsSaver: { save: jest.fn() }
}));

// Теперь можно импортировать POST и все зависимости
import { POST } from "@/app/api/simulate/route";
import { Simulator } from "@/util/simulate/Simulator";
import { StatsSaver } from "@/util/stats/StatSaver";

describe("POST /api/simulate/route — ошибка внутри runOne", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Подменяем реализацию runOne, чтобы она бросала
        jest.spyOn(Simulator.prototype, "runOne").mockImplementation(() => {
            throw new Error("boom");
        });
        // determineStatus тоже нужно заглушить, иначе он вызовется до runOne
        jest.spyOn(Simulator, "determineStatus").mockReturnValue({ success: false, reason: null });
        // Заглушим console.error, чтобы тест не плевался стеком
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    it("должен вернуть 500 и не вызвать StatsSaver.save", async () => {
        // Тело запроса с корректным набором полей
        const body = {
            optimizedRoutes: [
                { nodes: [{ id: "W", lat: 0, lng: 0 }], load: 1 }
            ],
            speed: 1,
            attackRisk: 0,
            warehouseLoss: 0,
            consumptionRate: 1,
            experimentsCount: 1,
            product: 1,
            vehicleCount: 1,
            vehicleCap: 1
        };

        // Создаём “NextRequest” с нужным телом
        // @ts-ignore
        const req = new (require("next/server").NextRequest)(body);

        const res = await POST(req);
        // проверяем, что код 500
        expect(res.status).toBe(500);
        // проверяем тело
        expect(await res.json()).toEqual({ error: "boom" });
        // убедимся, что статистику не сохраняют
        expect(StatsSaver.save).not.toHaveBeenCalled();
    });
});
