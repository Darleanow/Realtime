"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { DrawEvent } from "@/hooks/use-socket";

interface CollaborativeCanvasProps {
    socket: Socket | null;
    isConnected: boolean;
    color: string;
    lineWidth: number;
    tool: "pen" | "eraser";
}

interface Point {
    x: number;
    y: number;
}

interface RemoteCursor {
    pseudo: string;
    x: number;
    y: number;
    color: string;
    lastUpdate: number;
}

export default function CollaborativeCanvas({
    socket,
    isConnected,
    color,
    lineWidth,
    tool,
}: CollaborativeCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPoint, setLastPoint] = useState<Point | null>(null);
    const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(
        new Map()
    );
    const [localCursor, setLocalCursor] = useState<Point | null>(null);
    const lastCursorSendTime = useRef<number>(0);

    // 🔥 HISTORIQUE LOCAL pour redessiner lors du resize
    const drawingHistory = useRef<DrawEvent[]>([]);

    // Initialisation du canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Resize avec redessinage complet de l'historique
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const newWidth = rect.width;
            const newHeight = rect.height;

            // Si les dimensions n'ont pas changé, ne rien faire
            if (canvas.width === newWidth && canvas.height === newHeight) {
                return;
            }

            console.log('🔄 Canvas resize:', { from: `${canvas.width}x${canvas.height}`, to: `${newWidth}x${newHeight}` });

            // Changer les dimensions
            canvas.width = newWidth;
            canvas.height = newHeight;

            // Fond noir
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 🎨 REDESSINER TOUT L'HISTORIQUE
            console.log('🎨 Redrawing history:', drawingHistory.current.length, 'strokes');
            drawingHistory.current.forEach((event) => {
                drawLine(ctx, event.x0, event.y0, event.x1, event.y1, event.color, event.width);
            });
        };

        // Initial resize
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Debounce resize
        let resizeTimeout: NodeJS.Timeout;
        const debouncedResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resize, 100);
        };

        window.addEventListener("resize", debouncedResize);

        return () => {
            window.removeEventListener("resize", debouncedResize);
            clearTimeout(resizeTimeout);
        };
    }, []);

    // Écouter les événements Socket.IO
    useEffect(() => {
        if (!socket) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Dessiner un trait reçu
        const handleRemoteDraw = (data: DrawEvent) => {
            // Ajouter à l'historique local
            drawingHistory.current.push(data);

            // Dessiner
            drawLine(ctx, data.x0, data.y0, data.x1, data.y1, data.color, data.width);
        };

        // Effacer le canvas
        const handleClearCanvas = () => {
            // Vider l'historique
            drawingHistory.current = [];

            // Effacer visuellement
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        };

        // Historique de dessin (à la connexion)
        const handleDrawingHistory = (history: DrawEvent[]) => {
            console.log('📥 Received drawing history:', history.length, 'strokes');

            // Remplacer l'historique local
            drawingHistory.current = [...history];

            // Redessiner tout
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            history.forEach((event) => {
                drawLine(ctx, event.x0, event.y0, event.x1, event.y1, event.color, event.width);
            });
        };

        // Curseur distant
        const handleRemoteCursor = (data: { pseudo: string; x: number; y: number }) => {
            setRemoteCursors((prev) => {
                const newMap = new Map(prev);
                newMap.set(data.pseudo, {
                    pseudo: data.pseudo,
                    x: data.x,
                    y: data.y,
                    color: getColorForUser(data.pseudo),
                    lastUpdate: Date.now(),
                });
                return newMap;
            });
        };

        socket.on("draw", handleRemoteDraw);
        socket.on("clear-canvas", handleClearCanvas);
        socket.on("drawing-history", handleDrawingHistory);
        socket.on("cursor-move", handleRemoteCursor);

        return () => {
            socket.off("draw", handleRemoteDraw);
            socket.off("clear-canvas", handleClearCanvas);
            socket.off("drawing-history", handleDrawingHistory);
            socket.off("cursor-move", handleRemoteCursor);
        };
    }, [socket]);

    // Cleanup des curseurs inactifs
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setRemoteCursors((prev) => {
                const newMap = new Map(prev);
                for (const [pseudo, cursor] of newMap.entries()) {
                    if (now - cursor.lastUpdate > 5000) {
                        newMap.delete(pseudo);
                    }
                }
                return newMap;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Fonction pour dessiner une ligne
    const drawLine = (
        ctx: CanvasRenderingContext2D,
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        drawColor: string,
        width: number
    ) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
    };

    // Couleur unique par utilisateur
    const getColorForUser = (pseudo: string) => {
        const colors = [
            "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
            "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
        ];
        const hash = pseudo.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    // Convertir les coordonnées
    const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        if ("touches" in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    // Throttle pour curseurs
    const sendCursorPosition = useCallback(
        (x: number, y: number) => {
            if (!socket || !isConnected) return;

            const now = Date.now();
            if (now - lastCursorSendTime.current < 60) return;

            lastCursorSendTime.current = now;
            socket.emit("cursor-move", { x, y });
        },
        [socket, isConnected]
    );

    // Début du dessin
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        const point = getCoordinates(e);
        setLastPoint(point);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        const point = getCoordinates(e);
        setLastPoint(point);
    };

    // Mouvement
    const handleMouseMove = (e: React.MouseEvent) => {
        const currentPoint = getCoordinates(e);

        setLocalCursor(currentPoint);
        sendCursorPosition(currentPoint.x, currentPoint.y);

        if (!isDrawing || !lastPoint || !socket || !isConnected) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const drawColor = tool === "eraser" ? "#000000" : color;

        // Créer l'événement de dessin
        const drawEvent: DrawEvent = {
            x0: lastPoint.x,
            y0: lastPoint.y,
            x1: currentPoint.x,
            y1: currentPoint.y,
            color: drawColor,
            width: lineWidth,
        };

        // Ajouter à l'historique local
        drawingHistory.current.push(drawEvent);

        // Dessiner localement
        drawLine(ctx, drawEvent.x0, drawEvent.y0, drawEvent.x1, drawEvent.y1, drawEvent.color, drawEvent.width);

        // Envoyer au serveur
        socket.emit("draw", drawEvent);

        setLastPoint(currentPoint);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDrawing || !lastPoint || !socket || !isConnected) return;

        e.preventDefault();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const currentPoint = getCoordinates(e);
        const drawColor = tool === "eraser" ? "#000000" : color;

        const drawEvent: DrawEvent = {
            x0: lastPoint.x,
            y0: lastPoint.y,
            x1: currentPoint.x,
            y1: currentPoint.y,
            color: drawColor,
            width: lineWidth,
        };

        drawingHistory.current.push(drawEvent);
        drawLine(ctx, drawEvent.x0, drawEvent.y0, drawEvent.x1, drawEvent.y1, drawEvent.color, drawEvent.width);
        socket.emit("draw", drawEvent);
        sendCursorPosition(currentPoint.x, currentPoint.y);

        setLastPoint(currentPoint);
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
        setLastPoint(null);
    };

    const handleMouseLeave = () => {
        setIsDrawing(false);
        setLastPoint(null);
        setLocalCursor(null);
    };

    const handleMouseEnter = (e: React.MouseEvent) => {
        const point = getCoordinates(e);
        setLocalCursor(point);
    };

    return (
        <div className="relative w-full h-full">
            <canvas
                ref={canvasRef}
                className="w-full h-full cursor-none touch-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onMouseEnter={handleMouseEnter}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
            />

            {/* Curseur local */}
            {localCursor && (
                <div
                    className="absolute pointer-events-none transition-none"
                    style={{
                        left: localCursor.x,
                        top: localCursor.y,
                        transform: "translate(2px, 2px)",
                    }}
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="drop-shadow-lg"
                    >
                        <path
                            d="M5.65376 12.3673L14.3632 3.65785C14.8591 3.16195 15.6814 3.16195 16.1773 3.65785L20.3423 7.82279C20.8382 8.31869 20.8382 9.14099 20.3423 9.63689L11.6328 18.3464C11.137 18.8423 10.3146 18.8423 9.81874 18.3464L5.65376 14.1815C5.15786 13.6856 5.15786 12.8632 5.65376 12.3673Z"
                            fill={tool === "eraser" ? "#ef4444" : color}
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            )}

            {/* Curseurs distants */}
            {Array.from(remoteCursors.values()).map((cursor) => (
                <div
                    key={cursor.pseudo}
                    className="absolute pointer-events-none transition-all duration-100 ease-out"
                    style={{
                        left: cursor.x,
                        top: cursor.y,
                        transform: "translate(2px, 2px)",
                    }}
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="drop-shadow-lg"
                    >
                        <path
                            d="M5.65376 12.3673L14.3632 3.65785C14.8591 3.16195 15.6814 3.16195 16.1773 3.65785L20.3423 7.82279C20.8382 8.31869 20.8382 9.14099 20.3423 9.63689L11.6328 18.3464C11.137 18.8423 10.3146 18.8423 9.81874 18.3464L5.65376 14.1815C5.15786 13.6856 5.15786 12.8632 5.65376 12.3673Z"
                            fill={cursor.color}
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>

                    <div
                        className="mt-1 px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap shadow-lg"
                        style={{
                            backgroundColor: cursor.color,
                            color: "white",
                        }}
                    >
                        {cursor.pseudo}
                    </div>
                </div>
            ))}
        </div>
    );
}