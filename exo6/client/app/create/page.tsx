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
import { ArrowLeft, Sparkles, Copy, Check } from "lucide-react";

export default function CreateBoard() {
    const router = useRouter();
    const [pseudo, setPseudo] = useState("");
    const [roomName, setRoomName] = useState("");
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const generateRoomId = () => {
        return Math.random().toString(36).substring(2, 8);
    };

    const generateToken = () => {
        return Math.random().toString(36).substring(2, 10);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCreate = () => {
        if (!pseudo.trim()) {
            setError("Pseudo required");
            return;
        }

        const roomId = roomName.trim() || generateRoomId();
        const roomToken = token.trim() || generateToken();

        localStorage.setItem(
            "boardConfig",
            JSON.stringify({
                pseudo: pseudo.trim(),
                token: roomToken,
                isCreator: true,
            })
        );

        router.push(`/board/${roomId}`);
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
                                Create Board
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Set up your collaborative drawing space
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
                                    placeholder="Alice"
                                    value={pseudo}
                                    onChange={(e) => setPseudo(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleCreate()}
                                    className="bg-zinc-800/50 border-zinc-700 focus:border-zinc-600 text-zinc-100"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="room"
                                    className="text-sm font-medium text-zinc-300"
                                >
                                    Board name{" "}
                                    <span className="text-muted-foreground font-normal">
                                        (optional)
                                    </span>
                                </Label>
                                <Input
                                    id="room"
                                    placeholder="project-x, brainstorm..."
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleCreate()}
                                    className="bg-zinc-800/50 border-zinc-700 focus:border-zinc-600 text-zinc-100"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave empty for auto-generated name
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="token"
                                    className="text-sm font-medium text-zinc-300"
                                >
                                    Access token{" "}
                                    <span className="text-muted-foreground font-normal">
                                        (optional)
                                    </span>
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="token"
                                        type="text"
                                        placeholder="12345"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && handleCreate()}
                                        className="bg-zinc-800/50 border-zinc-700 focus:border-zinc-600 text-zinc-100"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            const newToken = generateToken();
                                            setToken(newToken);
                                        }}
                                        className="border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Required for others to join your board
                                </p>
                            </div>

                            {error && (
                                <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded border border-red-500/20">
                                    {error}
                                </p>
                            )}

                            <Button
                                onClick={handleCreate}
                                className="w-full"
                                size="lg"
                            >
                                Create Board
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}