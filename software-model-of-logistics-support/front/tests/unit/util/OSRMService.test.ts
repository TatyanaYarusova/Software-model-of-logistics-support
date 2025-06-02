import { OSRMService } from "@/util/OSRMService";
import { Node } from "@/util/models";

describe("Класс OSRMService", () => {
    const nodes: Node[] = [
        { id: "A", lat: 0, lng: 0 },
        { id: "B", lat: 1, lng: 1 },
    ];

    beforeEach(() => {
        // Полифилл fetch на global
        (global as any).fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete (global as any).fetch;
    });

    describe("buildMatrices", () => {
        it("корректно переводит durations и distances в матрицы times и risks", async () => {
            const fakeApiResponse = {
                code: "Ok",
                durations: [
                    [3600, 1800],
                    [1800, 3600],
                ],
                distances: [
                    [1000, 2000],
                    [2000, 1000],
                ],
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                json: async () => fakeApiResponse,
            });

            const { times, risks } = await OSRMService.buildMatrices(nodes);

            expect(times).toEqual([
                [1, 0.5],
                [0.5, 1],
            ]);
            expect(risks).toEqual([
                [0.1, 0.2],
                [0.2, 0.1],
            ]);
            expect(global.fetch).toHaveBeenCalledWith(
                "https://router.project-osrm.org/table/v1/driving/0,0;1,1?annotations=duration,distance"
            );
        });

        it("выбрасывает ошибку при неверном коде ответа", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: async () => ({ code: "Error" }),
            });

            await expect(OSRMService.buildMatrices(nodes)).rejects.toThrow(
                "OSRM Table API error"
            );
        });
    });

    describe("fetchRouteGeometry", () => {
        it("возвращает геометрию маршрута в формате [lat, lng]", async () => {
            const fakeApiResponse = {
                code: "Ok",
                routes: [
                    {
                        geometry: {
                            coordinates: [
                                [10, 20],
                                [30, 40],
                            ],
                        },
                    },
                ],
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                json: async () => fakeApiResponse,
            });

            const geom = await OSRMService.fetchRouteGeometry(nodes);

            expect(geom).toEqual([
                [20, 10],
                [40, 30],
            ]);
            expect(global.fetch).toHaveBeenCalledWith(
                "https://router.project-osrm.org/route/v1/driving/0,0;1,1?overview=full&geometries=geojson"
            );
        });

        it("выбрасывает ошибку при неверном коде ответа", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: async () => ({ code: "NotOk" }),
            });

            await expect(OSRMService.fetchRouteGeometry(nodes)).rejects.toThrow(
                "OSRM route API error"
            );
        });
    });
});