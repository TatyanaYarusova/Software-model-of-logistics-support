"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

const Map = () => {

    function ResizeMap() {
        const map = useMap();
        useEffect(() => {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }, []);
        return null;
    }

    return (
        <MapContainer
            center={[55.7422, 37.5719]}
            zoom={11}
            style={{ width: "100%", height: "100%" }}
            className="z-0"
        >
            <ResizeMap />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </MapContainer>
    );
};

export default Map;