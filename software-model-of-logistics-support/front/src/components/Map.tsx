"use client";

import { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Polyline,
    useMapEvents,
    useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetina.src,
    iconUrl: iconUrl.src,
    shadowUrl: shadowUrl.src,
});

interface MapProps {
    start: [number, number] | null;
    end: [number, number] | null;
    waypoints: [number, number][];
    onStartChange: (val: [number, number]) => void;
    onEndChange: (val: [number, number]) => void;
    onWaypointChange: (val: [number, number][]) => void;
    routePolyline: [number, number][];
    routeIds: string[];
    routeNodesPos: [number, number][];
}

export default function Map({
                                start,
                                end,
                                waypoints,
                                onStartChange,
                                onEndChange,
                                onWaypointChange,
                                routePolyline,
                                routeIds,
                                routeNodesPos,
                            }: MapProps) {
    const [localStart, setLocalStart] = useState(start);
    const [localEnd, setLocalEnd] = useState(end);
    const [localWaypoints, setLocalWaypoints] = useState(waypoints);

    useEffect(() => setLocalStart(start), [start]);
    useEffect(() => setLocalEnd(end), [end]);
    useEffect(() => setLocalWaypoints(waypoints), [waypoints]);

    function ResizeMap() {
        const map = useMap();
        useEffect(() => {
            setTimeout(() => map.invalidateSize(), 100);
        }, []);
        return null;
    }

    function ClickHandler() {
        useMapEvents({
            click(e) {
                const latlng: [number, number] = [e.latlng.lat, e.latlng.lng];
                if (!localStart) {
                    setLocalStart(latlng);
                    onStartChange(latlng);
                } else if (!localEnd) {
                    setLocalEnd(latlng);
                    onEndChange(latlng);
                } else {
                    const upd = [...localWaypoints, latlng];
                    setLocalWaypoints(upd);
                    onWaypointChange(upd);
                }
            },
        });
        return null;
    }

    const createNumberedIcon = (n: number) =>
        new L.DivIcon({
            html: `<div style="
        background:#3880ff;
        color:white;
        width:24px;height:24px;
        line-height:24px;
        text-align:center;
        border-radius:50%;
        font-weight:bold;
      ">${n}</div>`,
            className: "",
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });

    return (
        <MapContainer
            center={[55.7422, 37.5719]}
            zoom={13}
            style={{ width: "100%", height: "100%" }}
        >
            <ResizeMap />
            <ClickHandler />

            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {localStart && <Marker position={localStart} />}
            {localEnd && <Marker position={localEnd} />}
            {localWaypoints.map((pt, i) => (
                <Marker key={`wp-${i}`} position={pt} />
            ))}

            {routePolyline.length > 1 && (
                <Polyline positions={routePolyline} color="blue" />
            )}

            {routeIds.map((id, idx) => {
                const pos = routeNodesPos[idx];
                if (!pos) return null;
                return (
                    <Marker
                        key={id}
                        position={pos}
                        icon={createNumberedIcon(idx + 1)}
                        title={id}
                    />
                );
            })}
        </MapContainer>
    );
}