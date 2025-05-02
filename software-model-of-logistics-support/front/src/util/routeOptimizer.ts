export interface Node {
    id: string;
    lat: number;
    lng: number;
}

export interface Warehouse extends Node {
    stock: number;
    lossProb: number;
}

export interface Customer extends Node {
    demand: number;
}

export interface Route {
    nodes: Node[];
    load: number;
}

export async function buildMatrices(
    points: Node[]
): Promise<{ times: number[][]; risks: number[][] }> {
    const coords = points.map(p => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration,distance`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok") throw new Error("OSRM Table API error");

    const n = points.length;
    const times = Array.from({ length: n }, () => Array(n).fill(Infinity));
    const risks = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const dur = data.durations[i][j];
            const dist = data.distances[i][j];
            times[i][j] = dur / 3600;
            risks[i][j] = dist * 0.0001;
        }
    }
    return { times, risks };
}

export function computeCost(
    routes: Route[],
    times: number[][],
    risks: number[][],
    warehouses: Warehouse[],
    customers: Customer[],
    alpha = 1,
    beta = 1
): number {
    const points: Node[] = [...warehouses, ...customers];
    const idxMap = new Map<string, number>();
    points.forEach((p, i) => idxMap.set(p.id, i));

    const whMap = new Map<string, Warehouse>();
    warehouses.forEach(w => whMap.set(w.id, w));

    const custMap = new Map<string, number>();
    customers.forEach(c => custMap.set(c.id, c.demand));

    let totalT = 0, totalLoss = 0;

    for (const r of routes) {
        let load = r.load;
        for (let k = 0; k < r.nodes.length - 1; k++) {
            const from = r.nodes[k], to = r.nodes[k+1];
            const i = idxMap.get(from.id)!;
            const j = idxMap.get(to.id)!;

            totalT += times[i][j];

            if (whMap.has(from.id)) {
                const w = whMap.get(from.id)!;
                totalLoss += w.stock * w.lossProb;
            }

            totalLoss += load * risks[i][j];

            if (custMap.has(from.id)) {
                load -= custMap.get(from.id)!;
            }
        }
    }

    return alpha * totalT + beta * totalLoss;
}

export async function optimizeRoutes(
    warehouses: Warehouse[],
    customers: Customer[],
    vehicleCount: number,
    vehicleCap: number,
    alpha = 1,
    beta = 1
): Promise<Route[]> {
    const points: Node[] = [...warehouses, ...customers];
    const { times, risks } = await buildMatrices(points);

    const idxMap = new Map<string, number>();
    points.forEach((p, i) => idxMap.set(p.id, i));

    const remDemand = new Map(customers.map(c => [c.id, c.demand]));
    const remStock = new Map(warehouses.map(w => [w.id, w.stock]));

    const routes: Route[] = [];

    for (let v = 0; v < vehicleCount; v++) {
        const startId = Array.from(remStock.entries())
            .sort((a,b) => b[1] - a[1])[0]?.[0];
        if (!startId) break;

        const routeNodes: Node[] = [warehouses.find(w=>w.id===startId)!];
        let load = 0, cur = startId;

        while (true) {
            const cand = customers
                .filter(c => remDemand.get(c.id)! > 0 && load + c.demand <= vehicleCap)
                .map(c => ({
                    c,
                    dist: times[idxMap.get(cur)!][idxMap.get(c.id)!]
                }))
                .sort((a,b) => a.dist - b.dist)[0];
            if (!cand) break;

            routeNodes.push(cand.c);
            load += cand.c.demand;
            remDemand.set(cand.c.id, 0);
            cur = cand.c.id;
        }

        routeNodes.push(routeNodes[0]);  // возврат
        routes.push({ nodes: routeNodes, load });
    }

    function twoOpt(nodes: Node[], i: number, k: number): Node[] {
        return nodes.slice(0,i)
            .concat(nodes.slice(i,k+1).reverse())
            .concat(nodes.slice(k+1));
    }

    let bestCost = computeCost(routes, times, risks, warehouses, customers, alpha, beta);
    let improved = true;

    while (improved) {
        improved = false;
        for (let r = 0; r < routes.length; r++) {
            const nodes = routes[r].nodes;
            for (let i = 1; i < nodes.length - 2; i++) {
                for (let k = i+1; k < nodes.length - 1; k++) {
                    const newNodes = twoOpt(nodes, i, k);
                    const newRoutes = routes.map(rt => ({ ...rt }));
                    newRoutes[r].nodes = newNodes;
                    const cost = computeCost(newRoutes, times, risks, warehouses, customers, alpha, beta);
                    if (cost < bestCost) {
                        routes[r].nodes = newNodes;
                        bestCost = cost;
                        improved = true;
                        break;
                    }
                }
                if (improved) break;
            }
            if (improved) break;
        }
    }

    return routes;
}