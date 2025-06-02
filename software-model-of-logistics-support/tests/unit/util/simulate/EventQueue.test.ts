import { EventQueue } from '@/util/simulate/EventQueue'
type Event = { time: number; fromIdx: number; toIdx: number };

describe('EventQueue', () => {
    let q: EventQueue

    beforeEach(() => {
        q = new EventQueue()
    })

    test('isEmpty() на новой очереди возвращает true, pop() — undefined', () => {
        expect(q.isEmpty()).toBe(true)
        expect(q.pop()).toBeUndefined()
    })

    test('push() и pop() выдают события в порядке возрастания time', () => {
        const events: Event[] = [
            { time: 5, fromIdx: 0, toIdx: 1 },
            { time: 1, fromIdx: 1, toIdx: 2 },
            { time: 3, fromIdx: 2, toIdx: 3 },
        ]

        // вставим в произвольном порядке
        q.push(events[0])
        q.push(events[1])
        q.push(events[2])

        // первое должно быть самое маленькое time=1
        const first = q.pop()
        expect(first).toEqual({ time: 1, fromIdx: 1, toIdx: 2 })
        // затем time=3
        const second = q.pop()
        expect(second).toEqual({ time: 3, fromIdx: 2, toIdx: 3 })
        // затем time=5
        const third = q.pop()
        expect(third).toEqual({ time: 5, fromIdx: 0, toIdx: 1 })
        // после извлечения всех — пусто
        expect(q.isEmpty()).toBe(true)
        expect(q.pop()).toBeUndefined()
    })

    test('после частичного извлечения isEmpty() становится false до опустошения', () => {
        q.push({ time: 2, fromIdx: 0, toIdx: 0 })
        q.push({ time: 4, fromIdx: 0, toIdx: 1 })

        expect(q.isEmpty()).toBe(false)
        q.pop()
        // один элемент остался
        expect(q.isEmpty()).toBe(false)
        q.pop()
        // теперь пусто
        expect(q.isEmpty()).toBe(true)
    })

    test('поддерживает одинаковые time, pop() отдаёт их в порядке вставки', () => {
        const e1 = { time: 10, fromIdx: 1, toIdx: 1 }
        const e2 = { time: 10, fromIdx: 2, toIdx: 2 }
        q.push(e1)
        q.push(e2)
        // оба имеют time=10, сорт будет стабильным для JS sort, но shift вернёт e1, затем e2
        expect(q.pop()).toBe(e1)
        expect(q.pop()).toBe(e2)
        expect(q.isEmpty()).toBe(true)
    })
})