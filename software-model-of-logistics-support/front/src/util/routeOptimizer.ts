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

export async function buildMatrices(points: Node[]) {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration,distance`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok") throw new Error("OSRM Table API error");

    const n = points.length;
    const times: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
    const risks: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            times[i][j] = data.durations[i][j] / 3600;
            risks[i][j] = data.distances[i][j] * 0.0001;
        }
    }
    return { times, risks };
}

export function computeCost(
    routes: Route[],
    times: number[][],
    risks: number[][],
    allPoints: Node[],
    warehouses: Warehouse[],
    alpha = 1,
    beta = 1
): number {
    let totalT = 0;
    let totalLoss = 0;

    const idxMap = new Map<string, number>();
    allPoints.forEach((p, i) => idxMap.set(p.id, i));

    for (const r of routes) {
        let load = r.load;
        for (let k = 0; k < r.nodes.length - 1; k++) {
            const from = r.nodes[k], to = r.nodes[k + 1];
            const i = idxMap.get(from.id)!;
            const j = idxMap.get(to.id)!;

            totalT += times[i][j];

            const wh = warehouses.find((w) => w.id === from.id);
            if (wh) totalLoss += wh.stock * wh.lossProb;

            totalLoss += load * risks[i][j];

            if ((to as Customer).demand != null) {
                load -= (to as Customer).demand;
            }
        }
    }

    return alpha * totalT + beta * totalLoss;
}

function orOpt(nodes: Node[], i: number, len: number, j: number): Node[] {
    const block = nodes.slice(i, i + len);
    const rest = nodes.slice(0, i).concat(nodes.slice(i + len));
    return rest.slice(0, j).concat(block).concat(rest.slice(j));
}

export async function optimizeRoutes(
    warehouses: Warehouse[],
    customers: Customer[],
    vehicleCount: number,
    vehicleCap: number,
    alpha = 1,
    beta = 1,
    multiStarts = 5
): Promise<Route[]> {
    const allPoints: Node[] = [...warehouses, ...customers];
    const { times, risks } = await buildMatrices(allPoints);

    const idxMap = new Map<string, number>();
    allPoints.forEach((p, i) => idxMap.set(p.id, i));

    function singleStart(startIdx: number): Route[] {
        const remDemand = new Map(customers.map((c) => [c.id, c.demand]));
        const routes: Route[] = [];

        for (let v = 0; v < vehicleCount; v++) {
            const startW = warehouses[startIdx % warehouses.length];
            const routeNodes: Node[] = [startW];
            let load = 0;
            let currId = startW.id;

            while (true) {
                const candidate = customers
                    .filter(
                        (c) => remDemand.get(c.id)! > 0 && load + c.demand <= vehicleCap
                    )
                    .map((c) => ({
                        c,
                        dist: times[idxMap.get(currId)!][idxMap.get(c.id)!],
                    }))
                    .sort((a, b) => a.dist - b.dist)[0];
                if (!candidate) break;
                routeNodes.push(candidate.c);
                load += candidate.c.demand;
                remDemand.set(candidate.c.id, 0);
                currId = candidate.c.id;
            }

            routeNodes.push(startW);
            routes.push({ nodes: routeNodes, load });
        }

        let bestCost = computeCost(routes, times, risks, allPoints, warehouses, alpha, beta);
        let improved = true;

        while (improved) {
            improved = false;
            for (let rIdx = 0; rIdx < routes.length; rIdx++) {
                const r = routes[rIdx];
                const n = r.nodes.length;

                for (let i = 1; i < n - 2 && !improved; i++) {
                    for (let k = i + 1; k < n - 1; k++) {
                        const newNodes = r.nodes
                            .slice(0, i)
                            .concat(r.nodes.slice(i, k + 1).reverse())
                            .concat(r.nodes.slice(k + 1));
                        const newRoutes = routes.map((rt) => ({
                            nodes: rt.nodes.slice(),
                            load: rt.load,
                        }));
                        newRoutes[rIdx].nodes = newNodes;
                        const cost = computeCost(
                            newRoutes,
                            times,
                            risks,
                            allPoints,
                            warehouses,
                            alpha,
                            beta
                        );
                        if (cost < bestCost) {
                            routes[rIdx].nodes = newNodes;
                            bestCost = cost;
                            improved = true;
                            break;
                        }
                    }
                }
                if (improved) break;

                for (let len = 1; len <= 2 && !improved; len++) {
                    for (let i = 1; i + len < n - 1 && !improved; i++) {
                        for (let j = 1; j < n - len && !improved; j++) {
                            if (j >= i && j <= i + len) continue;
                            const newNodes = orOpt(r.nodes, i, len, j);
                            const newRoutes = routes.map((rt) => ({
                                nodes: rt.nodes.slice(),
                                load: rt.load,
                            }));
                            newRoutes[rIdx].nodes = newNodes;
                            const cost = computeCost(
                                newRoutes,
                                times,
                                risks,
                                allPoints,
                                warehouses,
                                alpha,
                                beta
                            );
                            if (cost < bestCost) {
                                routes[rIdx].nodes = newNodes;
                                bestCost = cost;
                                improved = true;
                                break;
                            }
                        }
                    }
                }
                if (improved) break;
            }
        }

        return routes;
    }

    let bestRoutes: Route[] = [];
    let bestGlobalCost = Infinity;
    for (let s = 0; s < multiStarts; s++) {
        const candidate = singleStart(s);
        const cost = computeCost(candidate, times, risks, allPoints, warehouses, alpha, beta);
        if (cost < bestGlobalCost) {
            bestGlobalCost = cost;
            bestRoutes = candidate;
        }
    }

    return bestRoutes;
}