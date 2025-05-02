export class Haversine {
    private static toRad(d: number) { return (d * Math.PI) / 180; }
    public static distance([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }
}