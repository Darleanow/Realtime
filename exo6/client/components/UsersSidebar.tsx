"use client";

import { useState } from "react";
import { Users, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User } from "@/hooks/use-socket";

interface UsersSidebarProps {
    users: User[];
    roomId: string;
    token: string;
}

export default function UsersSidebar({ users, roomId, token }: UsersSidebarProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <>
            {/* Toggle button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="absolute top-6 right-6 z-10 bg-zinc-900/90 backdrop-blur border border-zinc-800 hover:bg-zinc-800"
            >
                {isOpen ? (
                    <ChevronRight className="w-4 h-4" />
                ) : (
                    <ChevronLeft className="w-4 h-4" />
                )}
            </Button>

            {/* Sidebar */}
            <div
                className={`absolute top-0 right-0 h-full bg-zinc-900/95 backdrop-blur border-l border-zinc-800 transition-transform duration-300 z-20 ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                style={{ width: "320px" }}
            >
                <div className="p-6 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-zinc-800 rounded-lg">
                            <Users className="w-5 h-5 text-zinc-300" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-100">
                                Participants
                            </h2>
                            <p className="text-sm text-zinc-400">{users.length} connecté{users.length > 1 ? "s" : ""}</p>
                        </div>
                    </div>

                    {/* Room info */}
                    <div className="mb-6 space-y-3">
                        <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-400">Board ID</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(roomId, "room")}
                                    className="h-6 w-6"
                                >
                                    {copiedField === "room" ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <Copy className="w-3 h-3" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-sm text-zinc-200 font-mono break-all">
                                {roomId}
                            </p>
                        </div>

                        <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-400">Access Token</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(token, "token")}
                                    className="h-6 w-6"
                                >
                                    {copiedField === "token" ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <Copy className="w-3 h-3" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-sm text-zinc-200 font-mono break-all">
                                {token}
                            </p>
                        </div>
                    </div>

                    {/* Users list */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="space-y-2">
                            {users.map((user, index) => (
                                <div
                                    key={`${user.pseudo}-${index}`}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${user.isMe
                                            ? "bg-blue-500/10 border border-blue-500/20"
                                            : "bg-zinc-800/50 hover:bg-zinc-800"
                                        }`}
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${user.isMe
                                                ? "bg-blue-500 text-white"
                                                : "bg-zinc-700 text-zinc-300"
                                            }`}
                                    >
                                        {user.pseudo.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-200 truncate">
                                            {user.pseudo}
                                            {user.isMe && (
                                                <span className="ml-2 text-xs text-blue-400">
                                                    (Vous)
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 text-center">
                            Partagez le Board ID et le Token pour inviter d&apos;autres
                            personnes
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}