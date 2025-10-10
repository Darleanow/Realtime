"use client";

import { Pencil, Eraser, Trash2, Undo2, Palette, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Socket } from "socket.io-client";
import { useState } from "react";

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
    "#ffffff", "#ef4444", "#f97316", "#eab308",
    "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"
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
    const [isExpanded, setIsExpanded] = useState(true);

    const handleClear = () => {
        if (!socket || !isConnected) return;
        if (confirm("Effacer tout le tableau ?")) {
            socket.emit("clear-canvas");
        }
    };

    const handleUndo = () => {
        if (!socket || !isConnected) return;
        socket.emit("undo");
    };

    // Compact mode mobile
    if (!isExpanded) {
        return (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
                <Button
                    onClick={() => setIsExpanded(true)}
                    variant="outline"
                    className="gap-2"
                >
                    <Palette className="w-4 h-4" />
                    <span className="text-sm">Outils</span>
                    <ChevronDown className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-4xl">
            <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
                {/* Mobile: Stack vertically, Desktop: Horizontal */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">

                    {/* Tools */}
                    <div className="flex items-center gap-2 justify-center lg:justify-start">
                        <Button
                            variant={tool === "pen" ? "default" : "outline"}
                            size="icon"
                            onClick={() => setTool("pen")}
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={tool === "eraser" ? "destructive" : "outline"}
                            size="icon"
                            onClick={() => setTool("eraser")}
                        >
                            <Eraser className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Colors */}
                    <div className="flex items-center gap-2 justify-center flex-wrap">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-md border-2 transition-transform hover:scale-110 ${color === c ? "border-primary scale-110 ring-2 ring-primary/20" : "border-input"
                                    }`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    {/* Line Width */}
                    <div className="flex items-center gap-3 px-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {lineWidth}px
                        </span>
                        <Slider
                            value={[lineWidth]}
                            onValueChange={(v) => setLineWidth(v[0])}
                            min={1}
                            max={30}
                            className="w-24 lg:w-32"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 justify-center lg:justify-end lg:ml-auto">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleUndo}
                            disabled={!isConnected}
                        >
                            <Undo2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleClear}
                            disabled={!isConnected}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsExpanded(false)}
                            className="lg:hidden"
                        >
                            <ChevronUp className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
                    <span className="text-xs text-muted-foreground">
                        {isConnected ? "Connecté" : "Déconnecté"}
                    </span>
                </div>
            </div>
        </div>
    );
}