"use client";

import { useState } from "react";
import { Users, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User } from "@/hooks/use-socket";

interface UsersSidebarProps {
    users: User[];
    roomId: string;
    token: string;
}

export default function UsersSidebar({ users, roomId, token }: UsersSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <>
            {/* Toggle Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    variant="outline"
                    size="icon"
                    className="fixed top-4 right-4 z-40"
                >
                    <div className="relative">
                        <Users className="w-5 h-5" />
                        {users.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                                {users.length}
                            </span>
                        )}
                    </div>
                </Button>
            )}

            {/* Backdrop (mobile) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-background border-l shadow-lg z-50 transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="font-semibold">Participants</h2>
                                <p className="text-sm text-muted-foreground">
                                    {users.length} connecté{users.length > 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Room Info */}
                    <div className="p-4 space-y-3 border-b">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-muted-foreground">Board ID</label>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(roomId, "room")}
                                >
                                    {copiedField === "room" ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <Copy className="w-3 h-3" />
                                    )}
                                </Button>
                            </div>
                            <div className="text-sm font-mono bg-muted p-2 rounded border break-all">
                                {roomId}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-muted-foreground">Token</label>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(token, "token")}
                                >
                                    {copiedField === "token" ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <Copy className="w-3 h-3" />
                                    )}
                                </Button>
                            </div>
                            <div className="text-sm font-mono bg-muted p-2 rounded border break-all">
                                {token}
                            </div>
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-2">
                            {users.map((user, index) => (
                                <div
                                    key={`${user.pseudo}-${index}`}
                                    className={`flex items-center gap-3 p-3 rounded-lg border ${user.isMe ? "bg-primary/5 border-primary/20" : "bg-muted/50"
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${user.isMe ? "bg-primary text-primary-foreground" : "bg-background"
                                        }`}>
                                        {user.pseudo.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                            {user.pseudo}
                                            {user.isMe && (
                                                <span className="text-xs text-muted-foreground ml-2">(Vous)</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t">
                        <p className="text-xs text-muted-foreground text-center">
                            Partagez le Board ID et le Token pour inviter d&apos;autres personnes
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}