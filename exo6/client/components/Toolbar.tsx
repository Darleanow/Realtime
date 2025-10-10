"use client";

import { Pencil, Eraser, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Socket } from "socket.io-client";

interface ToolbarProps {
    socket: Socket | null;
    isConnected: boolean;
    color: string;
    setColor: (color: string) => void;
    lineWidth: number;
    setLineWidth: (width: number) => void;
    tool: "pen" | "eraser";
    setTool: (tool: "pen" | "eraser") => void;
}

const COLORS = [
    "#ffffff", // Blanc
    "#ef4444", // Rouge
    "#f97316", // Orange
    "#eab308", // Jaune
    "#22c55e", // Vert
    "#3b82f6", // Bleu
    "#a855f7", // Violet
    "#ec4899", // Rose
    "#64748b", // Gris
];

export default function Toolbar({
    socket,
    isConnected,
    color,
    setColor,
    lineWidth,
    setLineWidth,
    tool,
    setTool,
}: ToolbarProps) {
    const handleClear = () => {
        if (!socket || !isConnected) return;

        if (confirm("Effacer tout le tableau ? Cette action est irréversible.")) {
            socket.emit("clear-canvas");
        }
    };

    const handleUndo = () => {
        if (!socket || !isConnected) return;
        socket.emit("undo");
    };

    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg shadow-xl p-4">
                <div className="flex items-center gap-6">
                    {/* Outils */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant={tool === "pen" ? "default" : "ghost"}
                            size="icon"
                            onClick={() => setTool("pen")}
                            className="relative"
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={tool === "eraser" ? "default" : "ghost"}
                            size="icon"
                            onClick={() => setTool("eraser")}
                        >
                            <Eraser className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Séparateur */}
                    <div className="h-8 w-px bg-zinc-700" />

                    {/* Palette de couleurs */}
                    <div className="flex items-center gap-2">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${color === c
                                        ? "border-white shadow-lg scale-110"
                                        : "border-zinc-700 hover:border-zinc-600"
                                    }`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>

                    {/* Séparateur */}
                    <div className="h-8 w-px bg-zinc-700" />

                    {/* Épaisseur */}
                    <div className="flex items-center gap-3 min-w-[140px]">
                        <span className="text-xs text-zinc-400 whitespace-nowrap">
                            {lineWidth}px
                        </span>
                        <Slider
                            value={[lineWidth]}
                            onValueChange={(value) => setLineWidth(value[0])}
                            min={1}
                            max={20}
                            step={1}
                            className="w-20"
                        />
                    </div>

                    {/* Séparateur */}
                    <div className="h-8 w-px bg-zinc-700" />

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleUndo}
                            disabled={!isConnected}
                            title="Annuler"
                        >
                            <Undo2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClear}
                            disabled={!isConnected}
                            title="Tout effacer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Indicateur de connexion */}
                <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                    <div
                        className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"
                            }`}
                    />
                    <span className="text-zinc-400">
                        {isConnected ? "Connecté" : "Déconnecté"}
                    </span>
                </div>
            </div>
        </div>
    );
}