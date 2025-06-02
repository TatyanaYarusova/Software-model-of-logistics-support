import { Haversine } from '@/util/simulate/haversine'

describe('Haversine.distance', () => {
    test('возвращает 0 для одинаковых точек', () => {
        const d = Haversine.distance([0, 0], [0, 0])
        expect(d).toBeCloseTo(0, 6)
    })

    test('расстояние между (0,0) и (0,1) примерно 111.19 км', () => {
        const d = Haversine.distance([0, 0], [0, 1])
        expect(d).toBeCloseTo(111.19, 2)
    })

    test('расстояние между (0,0) и (1,0) примерно 111.19 км', () => {
        const d = Haversine.distance([0, 0], [1, 0])
        expect(d).toBeCloseTo(111.19, 2)
    })

    test('симметричность: distance(A,B) === distance(B,A)', () => {
        const a: [number, number] = [51.5074, -0.1278]   // Лондон
        const b: [number, number] = [40.7128, -74.0060] // Нью-Йорк
        const d1 = Haversine.distance(a, b)
        const d2 = Haversine.distance(b, a)
        expect(d1).toBeCloseTo(d2, 6)
    })

    test('известное расстояние Лондон—Нью-Йорк ~5570 км', () => {
        const london: [number, number] = [51.5074, -0.1278]
        const ny: [number, number]     = [40.7128, -74.0060]
        const d = Haversine.distance(london, ny)
        expect(d).toBeCloseTo(5570, -2) // допускаем погрешность ±100 км
    })
})