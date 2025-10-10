class RoomService {
    constructor(logger) {
        this.logger = logger;
        this.rooms = new Map(); // roomId -> { users: Set, token: string, createdAt: Date }
        this.roomTokens = new Map(); // roomId -> token
        this.roomCleanupTimers = new Map(); // roomId -> timeoutId
    }

    /**
     * Crée ou vérifie une room avec son token
     */
    verifyRoomToken(roomId, token) {
        const storedToken = this.roomTokens.get(roomId);

        // Si la room n'existe pas, on la crée
        if (!storedToken) {
            return this.createRoom(roomId, token);
        }

        // Sinon on vérifie le token
        return storedToken === token;
    }

    /**
     * Crée une nouvelle room
     */
    createRoom(roomId, token) {
        this.roomTokens.set(roomId, token);
        this.rooms.set(roomId, {
            users: new Set(),
            token: token,
            createdAt: new Date(),
            drawingHistory: [] // Pour stocker l'historique temporaire
        });

        this.logger.success(`Room created: ${roomId}`, { token });
        return true;
    }

    /**
     * Ajoute un utilisateur à une room
     */
    addUserToRoom(roomId, pseudo) {
        const room = this.rooms.get(roomId);
        if (!room) {
            this.logger.warn(`Attempted to add user to non-existent room: ${roomId}`);
            return false;
        }

        room.users.add(pseudo);

        // Annuler le timer de suppression si la room redevient active
        if (this.roomCleanupTimers.has(roomId)) {
            clearTimeout(this.roomCleanupTimers.get(roomId));
            this.roomCleanupTimers.delete(roomId);
            this.logger.info(`Cleanup timer cancelled for room: ${roomId}`);
        }

        return true;
    }

    /**
     * Retire un utilisateur d'une room
     */
    removeUserFromRoom(roomId, pseudo) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.users.delete(pseudo);

        // Si la room est vide, programmer sa suppression
        if (room.users.size === 0) {
            this.scheduleRoomCleanup(roomId);
        }

        return true;
    }

    /**
     * Programme la suppression d'une room vide
     */
    scheduleRoomCleanup(roomId) {
        const CLEANUP_DELAY = 5 * 60 * 1000; // 5 minutes

        const timerId = setTimeout(() => {
            const room = this.rooms.get(roomId);
            if (room && room.users.size === 0) {
                this.rooms.delete(roomId);
                this.roomTokens.delete(roomId);
                this.roomCleanupTimers.delete(roomId);
                this.logger.info(`Room deleted (empty): ${roomId}`);
            }
        }, CLEANUP_DELAY);

        this.roomCleanupTimers.set(roomId, timerId);
        this.logger.info(`Cleanup scheduled for room: ${roomId} (in 5 minutes)`);
    }

    /**
     * Récupère les utilisateurs d'une room
     */
    getRoomUsers(roomId) {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room.users) : [];
    }

    /**
     * Récupère toutes les infos d'une room
     */
    getRoomInfo(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        return {
            roomId,
            users: Array.from(room.users),
            userCount: room.users.size,
            createdAt: room.createdAt,
            hasDrawingHistory: room.drawingHistory.length > 0
        };
    }

    /**
     * Récupère toutes les rooms actives
     */
    getAllRooms() {
        const roomsInfo = [];

        for (const [roomId, room] of this.rooms.entries()) {
            roomsInfo.push({
                roomId,
                userCount: room.users.size,
                users: Array.from(room.users),
                createdAt: room.createdAt,
                age: Date.now() - room.createdAt.getTime()
            });
        }

        return roomsInfo;
    }

    /**
     * Ajoute un dessin à l'historique de la room
     */
    addDrawingToHistory(roomId, drawingData) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        // Limiter l'historique à 1000 actions
        if (room.drawingHistory.length >= 1000) {
            room.drawingHistory.shift();
        }

        room.drawingHistory.push({
            ...drawingData,
            timestamp: Date.now()
        });

        return true;
    }

    /**
     * Récupère l'historique de dessin d'une room
     */
    getDrawingHistory(roomId) {
        const room = this.rooms.get(roomId);
        return room ? room.drawingHistory : [];
    }

    /**
     * Efface l'historique de dessin d'une room
     */
    clearDrawingHistory(roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.drawingHistory = [];
            return true;
        }
        return false;
    }

    /**
     * Statistiques globales
     */
    getStats() {
        return {
            totalRooms: this.rooms.size,
            totalUsers: Array.from(this.rooms.values())
                .reduce((sum, room) => sum + room.users.size, 0),
            rooms: this.getAllRooms()
        };
    }
}

module.exports = RoomService;