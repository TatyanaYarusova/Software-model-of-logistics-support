import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Software model of MTO",
    description: "A software model for logistics and supply chain management",
};

export default function RootLayout(
    {children}: Readonly<
        { children: React.ReactNode; }
    >
) {
    return (
        <html lang="ru">
        <body className="antialiased bg-gray-100 text-gray-900">
        {children}
        </body>
        </html>
    );
}