export interface Node {
    id: string
    lat: number
    lng: number
}

export interface Warehouse extends Node {
    stock: number
    lossProb: number
}

export interface Customer extends Node {
    demand: number
}

export interface Route {
    nodes: Node[]
    load: number
}