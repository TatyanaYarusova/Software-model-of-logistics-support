type Event = { time: number; fromIdx: number; toIdx: number };
export class EventQueue {
    private heap: Event[] = [];
    public push(e: Event) {
        this.heap.push(e);
        this.heap.sort((a, b) => a.time - b.time);
    }
    public pop(): Event | undefined {
        return this.heap.shift();
    }
    public isEmpty(): boolean {
        return this.heap.length === 0;
    }
}
