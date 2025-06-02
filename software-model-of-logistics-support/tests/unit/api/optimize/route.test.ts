import { POST } from "@/app/api/optimize/route";

jest.mock("next/server", () => {
    return {
        NextRequest: class {
            // в тестах мы заполняем req._body, а json() отдаёт его
            constructor(init?: any) { Object.assign(this, init); }
            json() { return Promise.resolve((this as any)._body); }
        },
        NextResponse: {
            json: (body: any, init?: { status?: number }) => {
                return {
                    status: init?.status ?? 200,
                    json: async () => body
                };
            }
        }
    };
});

// Мокаем оптимизатор, чтобы тестировался только хендлер
import { RouteOptimizer } from "@/util/optimize/RouteOptimizer";
jest.mock("@/util/optimize/RouteOptimizer");

describe("POST /api/optimize/route", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("должен вернуть 400 при bad input", async () => {
        // NextRequest конструктору передаем { _body: ... }
        const req: any = new (require("next/server").NextRequest)({ _body: { warehouses: null, customers: null } });
        const res = await POST(req);
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: "Bad input" });
    });

    it("должен вызвать RouteOptimizer и вернуть маршруты", async () => {
        const fakeInput = {
            warehouses: [{ id: "W1", lat: 0, lng: 0, stock: 5, lossProb: 0 }],
            customers:  [{ id: "C1", lat: 1, lng: 1, demand: 2 }],
            vehicleCount: 2, vehicleCap: 5,
            alpha: 10, beta: 20
        };
        const req: any = new (require("next/server").NextRequest)({ _body: fakeInput });
        const fakeRoutes = [{ nodes: [], load: 0 }];
        // Подмена конструктора
        // @ts-ignore
        RouteOptimizer.mockImplementation(function(w,c,vc,cap,a,b) {
            expect(w).toEqual(fakeInput.warehouses);
            expect(c).toEqual(fakeInput.customers);
            expect(vc).toBe(2);
            expect(cap).toBe(5);
            expect(a).toBe(10);
            expect(b).toBe(20);
            return { optimize: () => Promise.resolve(fakeRoutes) };
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ routes: fakeRoutes });
    });

    it("должен подставить alpha=1,beta=1 по умолчанию", async () => {
        const fakeInput = {
            warehouses: [{ id: "W1", lat: 0, lng: 0, stock: 5, lossProb: 0 }],
            customers:  [{ id: "C1", lat: 1, lng: 1, demand: 2 }],
            vehicleCount: 1, vehicleCap: 5
        };
        const req: any = new (require("next/server").NextRequest)({ _body: fakeInput });
        // @ts-ignore
        RouteOptimizer.mockImplementation(function(_,__,___,____,a,b) {
            expect(a).toBe(1);
            expect(b).toBe(1);
            return { optimize: () => Promise.resolve([]) };
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ routes: [] });
    });

    it("должен вернуть 500 при ошибке оптимизатора", async () => {
        const fakeInput = {
            warehouses: [{ id: "W1", lat: 0, lng: 0, stock: 5, lossProb: 0 }],
            customers:  [{ id: "C1", lat: 1, lng: 1, demand: 2 }],
            vehicleCount: 1, vehicleCap: 5
        };
        const req: any = new (require("next/server").NextRequest)({ _body: fakeInput });
        // @ts-ignore
        RouteOptimizer.mockImplementation(() => {
            return { optimize: () => Promise.reject(new Error("oops")) };
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: "oops" });
    });
});
