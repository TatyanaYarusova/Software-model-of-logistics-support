import { StatsAggregator } from '@/util/stats/StatsAggregator'
import type { RawEntry } from '@/util/stats/RawEntry'
import type { StatsDTO, WeeklyDatum, LastParams, LastRun } from '@/util/stats/StatsAggregator'

describe('Класс StatsAggregator', () => {
    const commonParams = {
        speed: 10,
        attackRisk: 2,
        warehouseLoss: 3,
        consumptionRate: 4,
        experimentsCount: 5,
        product: 6,
        vehicleCount: 2,
        vehicleCap: 10,
    }

    const entry1: RawEntry = {
        timestamp: '2025-05-05T10:00:00Z', // понедельник
        params: commonParams,
        routeSummary: ['WH', 'C1', 'WH'],
        routeKm: 100,
        result: {
            rawTime: 1,
            rawDelivered: 1,
            rawLostWarehouse: 0,
            rawLostTransit: 0,
            rawConsumed: 2,
            avgTime: 1.5,
            avgDelivered: 1,
            avgLostWarehouse: 0,
            avgLostTransit: 0,
            avgConsumed: 2,
        },
    }

    const entry2: RawEntry = {
        timestamp: '2025-05-06T12:00:00Z', // вторник
        params: commonParams,
        routeSummary: ['WH', 'C2', 'WH'],
        routeKm: 200,
        result: {
            rawTime: 2,
            rawDelivered: 0,
            rawLostWarehouse: 1,
            rawLostTransit: 1,
            rawConsumed: 3,
            avgTime: 2.5,
            avgDelivered: 0,
            avgLostWarehouse: 1,
            avgLostTransit: 1,
            avgConsumed: 3,
        },
    }

    test('aggregate выбрасывает ошибку на пустом массиве', () => {
        expect(() => new StatsAggregator([]).aggregate()).toThrowError('Нет данных для агрегации')
    })

    test('aggregate корректно считает метрики', () => {
        const agg = new StatsAggregator([entry1, entry2])
        const stats: StatsDTO = agg.aggregate()

        // Проверяем числовые поля
        expect(stats.routesBuilt).toBe(2)
        expect(stats.successfulDeliveries).toBe(1)  // 1 + 0
        expect(stats.failedDeliveries).toBe(1)      // одна запись с avgDelivered=0
        expect(stats.freeTransport).toBe( (2-1) + (2-0) ) // 1 + 2 = 3

        expect(stats.averageRiskPercent).toBe((2 + 2) / 2)  // attackRisk одинаковый
        // (1.5 + 2.5)/2 * 60 = 2 * 60 = 120
        expect(stats.averageDeliveryTimeMinutes).toBeCloseTo(120, 6)

        expect(stats.longestRouteKm).toBe(200)

        // Проверяем weeklySuccess
        const monday = new Date(entry1.timestamp).toLocaleDateString('ru-RU', { weekday: 'short' })
        const tuesday = new Date(entry2.timestamp).toLocaleDateString('ru-RU', { weekday: 'short' })
        const expectedWeekly: WeeklyDatum[] = [
            { name: monday, success: 1 },
            { name: tuesday, success: 0 },
        ]
        expect(stats.weeklySuccess).toEqual(
            expect.arrayContaining(expectedWeekly)
        )

        // Проверяем lastParams и lastRun
        const expectedLastParams: LastParams = commonParams
        expect(stats.lastParams).toEqual(expectedLastParams)

        const expectedLastRun: LastRun = {
            timestamp: entry2.timestamp,
            time: entry2.result.rawTime,
            delivered: entry2.result.rawDelivered,
            lostWarehouse: entry2.result.rawLostWarehouse,
            lostTransit: entry2.result.rawLostTransit,
            consumed: entry2.result.rawConsumed,
        }
        expect(stats.lastRun).toEqual(expectedLastRun)
    })
})