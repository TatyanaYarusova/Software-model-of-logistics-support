import { Simulator, SimResult, Status } from '@/util/simulate/Simulator'
import { Haversine } from '@/util/simulate/haversine'
import type { Route, Node } from '@/util/models'

jest.mock('@/util/simulate/haversine')
jest.unmock('@/util/simulate/EventQueue')

describe('Класс Simulator', () => {
    let route: Route
    let nodes: Node[]

    beforeEach(() => {
        // простой маршрут из склада в точку и обратно
        nodes = [
            { id: 'WH', lat: 0, lng: 0, },
            { id: 'C1', lat: 0, lng: 1, },
        ]
        route = { nodes, load: 0 }

        // фиксируем расстояние 100 км
        ;(Haversine.distance as jest.Mock).mockReturnValue(100)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    test('runOne: успешная доставка без потерь', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.9) // всегда > рисков
        const sim = new Simulator(route, 50, 0, 0, 2, 10)
        const res: SimResult = sim.runOne()
        expect(res.time).toBeCloseTo(2, 6)        // 100 км / 50 км/ч = 2 ч
        expect(res.consumed).toBeCloseTo(4, 6)    // 2 ч * 2 шт/ч = 4 шт
        expect(res.delivered).toBe(1)
        expect(res.lostWarehouse).toBe(0)
        expect(res.lostTransit).toBe(0)
    })

    test('runOne: учёт потерь на складе', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.1) // < warehouseLoss
        const sim = new Simulator(route, 100, 0, 50, 1, 5)
        const res = sim.runOne()
        expect(res.delivered).toBe(0)
        expect(res.lostWarehouse).toBe(1)
        expect(res.lostTransit).toBe(0)
    })

    test('runOne: учёт потерь в пути', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.6) // между warehouseLoss и warehouseLoss+attackRisk
        const sim = new Simulator(route, 100, 30, 50, 1, 5)
        const res = sim.runOne()
        expect(res.delivered).toBe(0)
        expect(res.lostWarehouse).toBe(0)
        expect(res.lostTransit).toBe(1)
    })

    test('runOne: остановка при отсутствии запаса', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5)
        const sim = new Simulator(route, 10, 0, 0, 1, 0)
        const res = sim.runOne()
        expect(res.delivered).toBe(0)
        expect(res.time).toBeCloseTo(0, 6)
        expect(res.consumed).toBeCloseTo(0, 6)
    })

    describe('Метод determineStatus', () => {
        test('возвращает успех при доставке > 0', () => {
            const status: Status = Simulator.determineStatus({ time:0, delivered:1, lostWarehouse:0, lostTransit:0, consumed:0 })
            expect(status).toEqual({ success: true, reason: null })
        })

        test('возвращает причину потерь на складе', () => {
            const status = Simulator.determineStatus({ time:0, delivered:0, lostWarehouse:2, lostTransit:0, consumed:0 })
            expect(status).toEqual({ success: false, reason: 'Потеря на складе' })
        })

        test('возвращает причину потерь в пути', () => {
            const status = Simulator.determineStatus({ time:0, delivered:0, lostWarehouse:0, lostTransit:3, consumed:0 })
            expect(status).toEqual({ success: false, reason: 'Потеря в пути' })
        })

        test('возвращает "Неизвестная ошибка" при отсутствии событий', () => {
            const status = Simulator.determineStatus({ time:0, delivered:0, lostWarehouse:0, lostTransit:0, consumed:0 })
            expect(status).toEqual({ success: false, reason: 'Неизвестная ошибка' })
        })
    })
})