"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket, Notification } from "@/hooks/use-socket";
import CollaborativeCanvas from "@/components/CollaborativeCanvas";
import Toolbar from "@/components/Toolbar";
import UsersSidebar from "@/components/UsersSidebar";
import { toast, Toaster } from "sonner";
import { Loader2 } from "lucide-react";

interface PageProps {
    params: Promise<{ roomId: string }>;
}

export default function BoardPage({ params }: PageProps) {
    const router = useRouter();
    const resolvedParams = use(params);
    const roomId = resolvedParams.roomId;

    const [config, setConfig] = useState<{
        pseudo: string;
        token: string;
    } | null>(null);

    const [color, setColor] = useState("#ffffff");
    const [lineWidth, setLineWidth] = useState(3);
    const [tool, setTool] = useState<"pen" | "eraser">("pen");

    useEffect(() => {
        const storedConfig = localStorage.getItem("boardConfig");

        if (!storedConfig) {
            toast.error("Configuration manquante");
            setTimeout(() => router.push("/"), 2000);
            return;
        }

        try {
            setConfig(JSON.parse(storedConfig));
        } catch (error) {
            toast.error("Configuration invalide: " + error);
            setTimeout(() => router.push("/"), 2000);
        }
    }, [router]);

    const { socket, isConnected, users } = useSocket({
        pseudo: config?.pseudo || "",
        roomId: roomId || "",
        token: config?.token || "",
        serverUrl: process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
    });

    useEffect(() => {
        if (!socket || !config) return;

        const handleNotification = (data: Notification) => {
            if (data.type === "user-joined" && data.pseudo !== config.pseudo) {
                toast.success(`${data.pseudo} a rejoint le board`);
            } else if (data.type === "user-left") {
                toast.info(`${data.pseudo} a quitté le board`);
            }
        };

        socket.on("notification", handleNotification);
        
        return () => {
            socket.off("notification", handleNotification);
        };
    }, [socket, config]);

    if (!config || !roomId) {
        return (
            <div className="dark min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dark min-h-screen bg-background overflow-hidden">
            <Toaster position="bottom-center" theme="dark" />

            <div className="w-full h-screen">
                <CollaborativeCanvas
                    socket={socket}
                    isConnected={isConnected}
                    color={color}
                    lineWidth={lineWidth}
                    tool={tool}
                />
            </div>

            <Toolbar
                socket={socket}
                isConnected={isConnected}
                color={color}
                setColor={setColor}
                lineWidth={lineWidth}
                setLineWidth={setLineWidth}
                tool={tool}
                setTool={setTool}
            />

            <UsersSidebar users={users} roomId={roomId} token={config.token} />

            {/* Room badge - responsive */}
            <div className="fixed bottom-4 left-4 z-30 hidden sm:block">
                <div className="bg-background/95 backdrop-blur border rounded-lg px-4 py-2 shadow-lg">
                    <p className="text-sm text-muted-foreground">
                        Board: <span className="font-mono font-medium text-foreground">{roomId}</span>
                    </p>
                </div>
            </div>

            {/* Connection status mobile */}
            <div className="fixed bottom-4 right-4 z-30 sm:hidden">
                <div className={`w-3 h-3 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                } animate-pulse`} />
            </div>
        </div>
    );
}