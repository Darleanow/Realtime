"use client";

import { Sparkles } from "lucide-react";

interface RoomBadgeProps {
    roomId: string;
}

export default function RoomBadge({ roomId }: RoomBadgeProps) {
    return (
        <div className="fixed bottom-6 left-6 z-30">
            <div className="group bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/50 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden transition-all duration-300 hover:scale-105">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative px-5 py-3.5 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl shadow-lg">
                        <Sparkles className="w-4 h-4 text-zinc-100" />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">
                            Board actif
                        </p>
                        <p className="text-sm text-zinc-100 font-mono font-semibold">
                            {roomId}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}