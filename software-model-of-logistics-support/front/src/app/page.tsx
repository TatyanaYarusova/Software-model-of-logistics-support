import Map from "@/components/Map";

export default function MainPage() {
    return (
        <div className="flex flex-col h-screen w-full">
            <div className="w-full bg-gray-300 p-4 flex justify-between border-b">
                <div className="flex space-x-4">
                    <button className="font-semibold">Главная</button>
                    <button className="font-semibold">Склады</button>
                </div>
            </div>
            <div className="flex flex-grow">
                <div className="w-1/4 bg-gray-200 p-4 flex flex-col gap-2">
                    <div className="flex flex-col flex-grow space-y-2">
                        {[...Array(8)].map((_, index) => (
                            <input
                                key={index}
                                type="text"
                                placeholder="*Параметр"
                                className="p-2 border rounded-md"
                            />
                        ))}
                    </div>
                    <button className="mt-4 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500">
                        Рассчитать
                    </button>
                </div>
                <div className="w-3/4 h-full">
                    <Map/>
                </div>
            </div>
        </div>
    );
}