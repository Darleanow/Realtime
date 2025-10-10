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
    const containerRef = useRef<HTMLDivElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [lastPoint, setLastPoint] = useState<Point | null>(null);
    const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
    const [localCursor, setLocalCursor] = useState<Point | null>(null);

    // Pan & Zoom state
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [panStart, setPanStart] = useState<Point | null>(null);
    const lastTouchDistance = useRef<number>(0);

    const lastCursorSendTime = useRef<number>(0);
    const drawingHistory = useRef<DrawEvent[]>([]);

    // Redessiner avec transformation
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.save();
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        drawingHistory.current.forEach((event) => {
            drawLine(ctx, event.x0, event.y0, event.x1, event.y1, event.color, event.width);
        });

        ctx.restore();
    }, [pan, zoom]);

    // Initialisation du canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const newWidth = rect.width;
            const newHeight = rect.height;

            if (canvas.width === newWidth && canvas.height === newHeight) {
                return;
            }

            canvas.width = newWidth;
            canvas.height = newHeight;

            redrawCanvas();
        };

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        redrawCanvas();

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
    }, [redrawCanvas]);

    // Redessiner quand pan ou zoom change
    useEffect(() => {
        redrawCanvas();
    }, [pan, zoom, redrawCanvas]);

    // Écouter les événements Socket.IO
    useEffect(() => {
        if (!socket) return;

        const handleRemoteDraw = (data: DrawEvent) => {
            drawingHistory.current.push(data);
            redrawCanvas();
        };

        const handleClearCanvas = () => {
            drawingHistory.current = [];
            redrawCanvas();
        };

        const handleDrawingHistory = (history: DrawEvent[]) => {
            drawingHistory.current = [...history];
            redrawCanvas();
        };

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
    }, [socket, redrawCanvas]);

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

    const getColorForUser = (pseudo: string) => {
        const colors = [
            "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
            "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
        ];
        const hash = pseudo.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

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

    const getCanvasCoordinates = (screenX: number, screenY: number): Point => {
        return {
            x: (screenX - pan.x) / zoom,
            y: (screenY - pan.y) / zoom,
        };
    };

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

    // MOUSE HANDLERS
    const handleMouseDown = (e: React.MouseEvent) => {
        const point = getCoordinates(e);

        // Middle click (molette) pour pan
        if (e.button === 1) {
            setIsPanning(true);
            setPanStart(point);
            e.preventDefault();
            return;
        }

        // Left click pour dessiner
        if (e.button === 0) {
            setIsDrawing(true);
            const canvasPoint = getCanvasCoordinates(point.x, point.y);
            setLastPoint(canvasPoint);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const point = getCoordinates(e);

        // Pan mode
        if (isPanning && panStart) {
            const dx = point.x - panStart.x;
            const dy = point.y - panStart.y;
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setPanStart(point);
            return;
        }

        // Cursor position
        const canvasPoint = getCanvasCoordinates(point.x, point.y);
        setLocalCursor(canvasPoint);
        sendCursorPosition(canvasPoint.x, canvasPoint.y);

        // Drawing mode
        if (isDrawing && lastPoint && socket && isConnected) {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const drawColor = tool === "eraser" ? "#000000" : color;

            const drawEvent: DrawEvent = {
                x0: lastPoint.x,
                y0: lastPoint.y,
                x1: canvasPoint.x,
                y1: canvasPoint.y,
                color: drawColor,
                width: lineWidth,
            };

            drawingHistory.current.push(drawEvent);

            ctx.save();
            ctx.translate(pan.x, pan.y);
            ctx.scale(zoom, zoom);
            drawLine(ctx, drawEvent.x0, drawEvent.y0, drawEvent.x1, drawEvent.y1, drawEvent.color, drawEvent.width);
            ctx.restore();

            socket.emit("draw", drawEvent);
            setLastPoint(canvasPoint);
        }
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
        setIsPanning(false);
        setLastPoint(null);
        setPanStart(null);
    };

    const handleMouseLeave = () => {
        setIsDrawing(false);
        setIsPanning(false);
        setLastPoint(null);
        setPanStart(null);
        setLocalCursor(null);
    };

    const handleMouseEnter = (e: React.MouseEvent) => {
        const point = getCoordinates(e);
        const canvasPoint = getCanvasCoordinates(point.x, point.y);
        setLocalCursor(canvasPoint);
    };

    // TOUCH HANDLERS
    const getTouchDistance = (e: React.TouchEvent): number => {
        if (e.touches.length < 2) return 0;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (e: React.TouchEvent): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const x = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const y = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        return { x, y };
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        // Deux doigts = pan
        if (e.touches.length === 2) {
            setIsPanning(true);
            const center = getTouchCenter(e);
            setPanStart(center);
            lastTouchDistance.current = getTouchDistance(e);
            return;
        }

        // Un doigt = dessin
        if (e.touches.length === 1) {
            setIsDrawing(true);
            const point = getCoordinates(e);
            const canvasPoint = getCanvasCoordinates(point.x, point.y);
            setLastPoint(canvasPoint);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        // Pan/Zoom avec deux doigts
        if (e.touches.length === 2 && isPanning && panStart) {
            const center = getTouchCenter(e);
            const dx = center.x - panStart.x;
            const dy = center.y - panStart.y;
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setPanStart(center);

            // Pinch to zoom
            const distance = getTouchDistance(e);
            if (lastTouchDistance.current > 0) {
                const delta = distance - lastTouchDistance.current;
                const zoomDelta = delta * 0.01;
                setZoom(prev => Math.min(Math.max(0.1, prev + zoomDelta), 10));
            }
            lastTouchDistance.current = distance;
            return;
        }

        // Dessin avec un doigt
        if (e.touches.length === 1 && isDrawing && lastPoint && socket && isConnected) {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const point = getCoordinates(e);
            const canvasPoint = getCanvasCoordinates(point.x, point.y);
            const drawColor = tool === "eraser" ? "#000000" : color;

            const drawEvent: DrawEvent = {
                x0: lastPoint.x,
                y0: lastPoint.y,
                x1: canvasPoint.x,
                y1: canvasPoint.y,
                color: drawColor,
                width: lineWidth,
            };

            drawingHistory.current.push(drawEvent);

            ctx.save();
            ctx.translate(pan.x, pan.y);
            ctx.scale(zoom, zoom);
            drawLine(ctx, drawEvent.x0, drawEvent.y0, drawEvent.x1, drawEvent.y1, drawEvent.color, drawEvent.width);
            ctx.restore();

            socket.emit("draw", drawEvent);
            sendCursorPosition(canvasPoint.x, canvasPoint.y);
            setLastPoint(canvasPoint);
        }
    };

    const handleTouchEnd = () => {
        setIsDrawing(false);
        setIsPanning(false);
        setLastPoint(null);
        setPanStart(null);
        lastTouchDistance.current = 0;
    };

    // Empêcher le menu contextuel sur clic molette
    const handleContextMenu = (e: React.MouseEvent) => {
        if (e.button === 1) {
            e.preventDefault();
        }
    };

    // Zoom avec la molette
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();

        const delta = -e.deltaY * 0.001;
        const newZoom = Math.min(Math.max(0.1, zoom + delta), 10);

        // Zoom vers la position de la souris
        const point = getCoordinates(e);
        const zoomRatio = newZoom / zoom;

        setPan(prev => ({
            x: point.x - (point.x - prev.x) * zoomRatio,
            y: point.y - (point.y - prev.y) * zoomRatio,
        }));

        setZoom(newZoom);
    };

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden">
            <canvas
                ref={canvasRef}
                className="w-full h-full cursor-none"
                style={{ touchAction: "none" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onMouseEnter={handleMouseEnter}
                onContextMenu={handleContextMenu}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            />

            {/* Curseur local */}
            {localCursor && (
                <div
                    className="absolute pointer-events-none transition-none"
                    style={{
                        left: localCursor.x * zoom + pan.x,
                        top: localCursor.y * zoom + pan.y,
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
                        left: cursor.x * zoom + pan.x,
                        top: cursor.y * zoom + pan.y,
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

            {/* Pan/Zoom indicator */}
            {isPanning && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="bg-background/90 backdrop-blur border rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-xs text-muted-foreground">🤚 Déplacement...</p>
                    </div>
                </div>
            )}

            {/* Zoom indicator */}
            <div className="absolute bottom-20 left-4 bg-background/90 backdrop-blur border rounded-lg px-3 py-2 shadow-lg">
                <p className="text-xs text-muted-foreground font-mono">
                    🔍 {Math.round(zoom * 100)}%
                </p>
            </div>
        </div>
    );
}