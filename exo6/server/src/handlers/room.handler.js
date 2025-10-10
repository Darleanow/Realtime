class RoomHandler {
    constructor(io, roomService, logger) {
        this.io = io;
        this.roomService = roomService;
        this.logger = logger;
    }

    /**
     * Gère la demande d'infos de la room
     */
    handleGetRoomInfo(socket) {
        const { roomId } = socket;
        const roomInfo = this.roomService.getRoomInfo(roomId);

        if (roomInfo) {
            socket.emit('room-info', roomInfo);
        } else {
            socket.emit('error', {
                type: 'room-not-found',
                message: 'Room not found'
            });
        }
    }

    /**
     * Gère la demande de liste des utilisateurs
     */
    handleGetUsers(socket) {
        const { roomId } = socket;
        const users = this.roomService.getRoomUsers(roomId);

        socket.emit('users-list', {
            roomId,
            users,
            userCount: users.length,
            timestamp: Date.now()
        });
    }

    /**
     * Gère l'événement de typing/drawing indicator
     */
    handleActivity(socket, data) {
        const { pseudo, roomId } = socket;
        const { type } = data; // 'typing', 'drawing', 'idle'

        // Diffuser l'activité aux autres utilisateurs
        socket.to(roomId).emit('user-activity', {
            pseudo,
            type,
            timestamp: Date.now()
        });
    }

    /**
     * Enregistre tous les handlers sur le socket
     */
    registerHandlers(socket) {
        socket.on('get-room-info', () => this.handleGetRoomInfo(socket));
        socket.on('get-users', () => this.handleGetUsers(socket));
        socket.on('user-activity', (data) => this.handleActivity(socket, data));
    }
}

module.exports = RoomHandler;