import { Warehouse, Customer, Route, Node } from "../models"
import { OSRMService } from "../OSRMService"

function orOpt(nodes: Node[], i: number, len: number, j: number): Node[] {
    const block = nodes.slice(i, i + len)
    const rest = [...nodes.slice(0, i), ...nodes.slice(i + len)]
    return [...rest.slice(0, j), ...block, ...rest.slice(j)]
}

export class RouteOptimizer {
    constructor(
        private warehouses: Warehouse[],
        private customers: Customer[],
        private vehicleCount: number,
        private vehicleCap: number,
        private alpha = 1,
        private beta = 1,
        private multiStarts = 5
    ) {}

    private async costMatrices() {
        const all: Node[] = [...this.warehouses, ...this.customers]
        const { times, risks } = await OSRMService.buildMatrices(all)
        return { all, times, risks }
    }

    private computeCost(routes: Route[], times: number[][], risks: number[][], all: Node[]): number {
        let totalT = 0, totalLoss = 0
        const idx = new Map<string,number>(all.map((p,i) => [p.id,i]))

        for (const r of routes) {
            let load = r.load
            for (let k = 0; k < r.nodes.length - 1; k++) {
                const from = r.nodes[k], to = r.nodes[k+1]
                const i = idx.get(from.id)!, j = idx.get(to.id)!
                totalT += times[i][j]
                const wh = this.warehouses.find(w => w.id === from.id)
                if (wh) totalLoss += wh.stock * wh.lossProb
                totalLoss += load * risks[i][j]
                load -= (to as Customer).demand ?? 0
            }
        }
        return this.alpha * totalT + this.beta * totalLoss
    }

    private singleStart(startIdx: number, all: Node[], times: number[][], risks: number[][]): Route[] {
        const rem = new Map(this.customers.map(c => [c.id,c.demand]))
        const routes: Route[] = []

        for (let v = 0; v < this.vehicleCount; v++) {
            const wh = this.warehouses[startIdx % this.warehouses.length]
            const nodes: Node[] = [wh]
            let load = 0, currId = wh.id

            while (true) {
                const cand = this.customers
                    .filter(c => (rem.get(c.id)! > 0) && load + c.demand <= this.vehicleCap)
                    .map(c => ({
                        c,
                        cost: times[ all.findIndex(p=>p.id===currId) ][ all.findIndex(p=>p.id===c.id) ]
                    })).sort((a,b)=>a.cost-b.cost)[0]

                if (!cand) break
                nodes.push(cand.c)
                load += cand.c.demand
                rem.set(cand.c.id, 0)
                currId = cand.c.id
            }

            nodes.push(wh)
            routes.push({ nodes, load })
        }

        let bestCost = this.computeCost(routes, times, risks, all)
        let improved: boolean
        do {
            improved = false
            outer: for (const r of routes) {
                const n = r.nodes.length
                for (let i=1;i<n-2 && !improved;i++) {
                    for (let k=i+1;k<n-1;k++) {
                        const newNodes = [
                            ...r.nodes.slice(0,i),
                            ...r.nodes.slice(i,k+1).reverse(),
                            ...r.nodes.slice(k+1)
                        ]
                        const cand = routes.map(rt=>({...rt, nodes: rt===r?newNodes:rt.nodes}))
                        const cost = this.computeCost(cand,times,risks,all)
                        if (cost<bestCost) {
                            r.nodes=newNodes; bestCost=cost; improved=true; break outer
                        }
                    }
                }
                for (let len=1;len<=2 && !improved;len++) {
                    for (let i=1;i+len<n-1;i++) {
                        for (let j=1;j<n-len;j++) {
                            if (j>=i && j<=i+len) continue
                            const newNodes = orOpt(r.nodes,i,len,j)
                            const cand = routes.map(rt=>({...rt, nodes: rt===r?newNodes:rt.nodes}))
                            const cost = this.computeCost(cand,times,risks,all)
                            if(cost < bestCost) {
                                r.nodes = newNodes; bestCost=cost; improved=true; break outer
                            }
                        }
                    }
                }
            }
        } while(improved)

        return routes
    }

    public async optimize(): Promise<Route[]> {
        const { all, times, risks } = await this.costMatrices()
        let best: Route[] = [], bestCost = Infinity
        for (let s=0; s<this.multiStarts; s++) {
            const cand = this.singleStart(s, all, times, risks)
            const cost = this.computeCost(cand, times, risks, all)
            if (cost < bestCost) { bestCost = cost; best = cand }
        }
        return best
    }
}