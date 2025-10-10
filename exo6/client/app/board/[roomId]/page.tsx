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
    const [lineWidth, setLineWidth] = useState(2);
    const [tool, setTool] = useState<"pen" | "eraser">("pen");

    // Log pour debug
    useEffect(() => {
        console.log('🔗 URL roomId:', roomId);
    }, [roomId]);

    // Récupérer la config depuis localStorage
    useEffect(() => {
        console.log('🔍 Loading config from localStorage...');
        const storedConfig = localStorage.getItem("boardConfig");

        if (!storedConfig) {
            console.error('❌ No config found in localStorage');
            toast.error("Configuration manquante. Redirection...");
            setTimeout(() => router.push("/"), 2000);
            return;
        }

        try {
            const parsed = JSON.parse(storedConfig);
            console.log('✅ Config loaded:', {
                pseudo: parsed.pseudo,
                token: parsed.token,
                hasToken: !!parsed.token
            });
            setConfig(parsed);
        } catch (error) {
            console.error('❌ Failed to parse config:', error);
            toast.error("Configuration invalide. Redirection...");
            setTimeout(() => router.push("/"), 2000);
        }
    }, [router]);

    // ✅ TOUJOURS appeler useSocket (jamais de manière conditionnelle)
    // Le hook gère lui-même le cas où les params sont vides
    const { socket, isConnected, error, users } = useSocket({
        pseudo: config?.pseudo || "",
        roomId: roomId || "",
        token: config?.token || "",
        serverUrl: process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
    });

    // Notifications
    useEffect(() => {
        if (!socket || !config) return;

        const handleNotification = (data: Notification) => {
            if (data.type === "user-joined" && data.pseudo !== config.pseudo) {
                toast.success(`${data.pseudo} a rejoint le board`, {
                    duration: 3000,
                });
            } else if (data.type === "user-left") {
                toast.info(`${data.pseudo} a quitté le board`, {
                    duration: 3000,
                });
            }
        };

        socket.on("notification", handleNotification);

        return () => {
            socket.off("notification", handleNotification);
        };
    }, [socket, config]);

    // Erreur de connexion
    useEffect(() => {
        if (error) {
            toast.error(`Erreur de connexion: ${error}`, {
                duration: 5000,
            });
        }
    }, [error]);

    // Debug logs détaillés
    useEffect(() => {
        console.log('🔍 Board State:', {
            roomId,
            hasConfig: !!config,
            pseudo: config?.pseudo,
            token: config?.token,
            isConnected,
            hasSocket: !!socket,
            error,
            usersCount: users.length
        });
    }, [roomId, config, isConnected, socket, error, users]);

    // Loading state
    if (!config || !roomId) {
        return (
            <div className="dark min-h-screen bg-[#1a1a1a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                    <p className="text-zinc-400">
                        {!roomId ? 'Chargement de la room...' : 'Chargement de la configuration...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="dark min-h-screen bg-[#1a1a1a] overflow-hidden">
            <Toaster position="bottom-center" theme="dark" />

            {/* Canvas */}
            <div className="w-full h-screen">
                <CollaborativeCanvas
                    socket={socket}
                    isConnected={isConnected}
                    color={color}
                    lineWidth={lineWidth}
                    tool={tool}
                />
            </div>

            {/* Toolbar */}
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

            {/* Users Sidebar */}
            <UsersSidebar users={users} roomId={roomId} token={config.token} />

            {/* Room name */}
            <div className="absolute bottom-6 left-6 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg px-4 py-2">
                <p className="text-sm text-zinc-400">
                    Board:{" "}
                    <span className="text-zinc-200 font-medium font-mono">{roomId}</span>
                </p>
            </div>
        </div>
    );
}