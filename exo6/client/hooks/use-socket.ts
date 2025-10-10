import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketProps {
    pseudo: string;
    roomId: string;
    token: string;
    serverUrl?: string;
}

interface SocketState {
    socket: Socket | null;
    isConnected: boolean;
    error: string | null;
}

export interface User {
    pseudo: string;
    isMe?: boolean;
}

export interface Notification {
    type: 'user-joined' | 'user-left';
    pseudo: string;
    message: string;
    timestamp: number;
    users: string[];
}

export interface DrawEvent {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    color: string;
    width: number;
    pseudo?: string;
    timestamp?: number;
}

export function useSocket({ pseudo, roomId, token, serverUrl = 'http://localhost:3001' }: UseSocketProps) {
    const [socketState, setSocketState] = useState<SocketState>({
        socket: null,
        isConnected: false,
        error: null
    });

    const [users, setUsers] = useState<User[]>([]);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // ⚠️ NE PAS SE CONNECTER SI LES PARAMÈTRES SONT VIDES
        if (!pseudo || !roomId || !token) {
            console.log('⏳ Waiting for valid credentials...');
            return;
        }

        console.log('🔌 Connecting to server...', { pseudo, roomId });

        // Créer la connexion Socket.IO
        const socket = io(serverUrl, {
            auth: {
                pseudo,
                roomId,
                token
            },
            transports: ['websocket', 'polling']
        });

        socketRef.current = socket;

        // Événements de connexion
        socket.on('connect', () => {
            console.log('✅ Connected to server:', socket.id);
            setSocketState({
                socket,
                isConnected: true,
                error: null
            });
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error.message);
            setSocketState((prev) => ({
                ...prev,
                isConnected: false,
                error: error.message
            }));
        });

        socket.on('disconnect', () => {
            console.log('🔴 Disconnected from server');
            setSocketState((prev) => ({
                ...prev,
                isConnected: false
            }));
        });

        // Événement room-info (à la connexion)
        socket.on('room-info', (data: { users: string[]; userCount: number }) => {
            console.log('📊 Room info received:', data);
            const usersList = data.users.map((user) => ({
                pseudo: user,
                isMe: user === pseudo
            }));
            setUsers(usersList);
        });

        // Événement notification (join/leave)
        socket.on('notification', (data: Notification) => {
            console.log('📢 Notification:', data);
            const usersList = data.users.map((user) => ({
                pseudo: user,
                isMe: user === pseudo
            }));
            setUsers(usersList);
        });

        // Cleanup
        return () => {
            console.log('🔌 Disconnecting socket...');
            socket.disconnect();
        };
    }, [pseudo, roomId, token, serverUrl]);

    return {
        socket: socketState.socket,
        isConnected: socketState.isConnected,
        error: socketState.error,
        users
    };
}