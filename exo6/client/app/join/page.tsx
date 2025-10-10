"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function JoinBoard() {
    const router = useRouter();
    const [pseudo, setPseudo] = useState("");
    const [roomId, setRoomId] = useState("");
    const [token, setToken] = useState("");
    const [error, setError] = useState("");

    const handleJoin = () => {
        if (!pseudo.trim()) {
            setError("Name is required");
            return;
        }
        if (!roomId.trim()) {
            setError("Board ID is required");
            return;
        }
        if (!token.trim()) {
            setError("Access token is required");
            return;
        }

        localStorage.setItem(
            "boardConfig",
            JSON.stringify({
                pseudo: pseudo.trim(),
                token: token.trim(),
                isCreator: false,
            })
        );

        router.push(`/board/${roomId.trim()}`);
    };

    return (
        <div className="dark min-h-screen bg-[#1a1a1a]">
            <main className="flex min-h-screen flex-col items-center justify-center relative z-10 px-4">
                <div className="absolute top-6 left-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Link>
                </div>

                <div className="w-full max-w-md">
                    <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold tracking-tight text-zinc-200">
                                Join Board
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Enter the details shared by the board creator
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="pseudo"
                                    className="text-sm font-medium text-zinc-300"
                                >
                                    Your name
                                </Label>
                                <Input
                                    id="pseudo"
                                    placeholder="Bob"
                                    value={pseudo}
                                    onChange={(e) => setPseudo(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleJoin()}
                                    className="bg-zinc-800/50 border-zinc-700 focus:border-zinc-600 text-zinc-100"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="roomId"
                                    className="text-sm font-medium text-zinc-300"
                                >
                                    Board ID
                                </Label>
                                <Input
                                    id="roomId"
                                    placeholder="a3b4c5"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleJoin()}
                                    className="bg-zinc-800/50 border-zinc-700 focus:border-zinc-600 text-zinc-100"
                                />
                                <p className="text-xs text-muted-foreground">
                                    The board ID shared by the creator
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="token"
                                    className="text-sm font-medium text-zinc-300"
                                >
                                    Access token
                                </Label>
                                <Input
                                    id="token"
                                    type="password"
                                    placeholder="Enter token"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleJoin()}
                                    className="bg-zinc-800/50 border-zinc-700 focus:border-zinc-600 text-zinc-100"
                                />
                                <p className="text-xs text-muted-foreground">
                                    The token provided by the board creator
                                </p>
                            </div>

                            {error && (
                                <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded border border-red-500/20">
                                    {error}
                                </p>
                            )}

                            <Button
                                onClick={handleJoin}
                                className="w-full"
                                size="lg"
                            >
                                Join Board
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}