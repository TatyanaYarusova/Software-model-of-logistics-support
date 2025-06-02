import { Node } from "./models"

export class OSRMService {
    static async buildMatrices(points: Node[]): Promise<{ times: number[][], risks: number[][] }> {
        const coords = points.map(p => `${p.lng},${p.lat}`).join(";")
        const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration,distance`
        const res = await fetch(url)
        const data = await res.json()
        if (data.code !== "Ok") throw new Error("OSRM Table API error")

        const n = points.length
        const times: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity))
        const risks: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                times[i][j] = data.durations[i][j] / 3600    // в часах
                risks[i][j] = data.distances[i][j] * 0.0001 // доп. риск = км * 0.0001
            }
        }
        return { times, risks }
    }

    static async fetchRouteGeometry(points: Node[]): Promise<[number, number][]> {
        const coords = points.map(p => `${p.lng},${p.lat}`).join(";")
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
        const res = await fetch(url)
        const json = await res.json()
        if (json.code !== "Ok") throw new Error("OSRM route API error")
        return json.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]])
    }
}