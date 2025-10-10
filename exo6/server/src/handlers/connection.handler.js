class ConnectionHandler {
    constructor(io, roomService, monitoringService, logger) {
        this.io = io;
        this.roomService = roomService;
        this.monitoringService = monitoringService;
        this.logger = logger;
    }

    /**
     * Gère la connexion d'un utilisateur
     */
    handleConnection(socket) {
        const { pseudo, roomId } = socket;

        // Mise à jour des stats
        this.monitoringService.incrementConnection();

        // Log de connexion
        this.logger.connection(pseudo, roomId, socket.id);

        // Rejoindre la room Socket.IO
        socket.join(roomId);

        // Ajouter l'utilisateur à la room
        this.roomService.addUserToRoom(roomId, pseudo);

        // Récupérer les infos de la room
        const roomInfo = this.roomService.getRoomInfo(roomId);

        // Notifier tous les utilisateurs de la room
        this.io.to(roomId).emit('notification', {
            type: 'user-joined',
            pseudo: pseudo,
            message: `${pseudo} has joined the board`,
            timestamp: Date.now(),
            users: roomInfo ? roomInfo.users : []
        });

        // Envoyer les infos de la room au nouveau connecté
        socket.emit('room-info', {
            roomId: roomId,
            users: roomInfo ? roomInfo.users : [],
            userCount: roomInfo ? roomInfo.userCount : 0,
            createdAt: roomInfo ? roomInfo.createdAt : null
        });

        // Envoyer l'historique de dessin au nouveau connecté
        const drawingHistory = this.roomService.getDrawingHistory(roomId);
        if (drawingHistory.length > 0) {
            socket.emit('drawing-history', drawingHistory);
            this.logger.info(`Sent drawing history to ${pseudo}`, {
                actions: drawingHistory.length
            });
        }
    }

    /**
     * Gère la déconnexion d'un utilisateur
     */
    handleDisconnection(socket) {
        const { pseudo, roomId } = socket;

        // Mise à jour des stats
        this.monitoringService.incrementDisconnection();

        // Log de déconnexion
        this.logger.disconnection(pseudo, roomId);

        // Retirer l'utilisateur de la room
        this.roomService.removeUserFromRoom(roomId, pseudo);

        // Récupérer les utilisateurs restants
        const remainingUsers = this.roomService.getRoomUsers(roomId);

        // Notifier les autres utilisateurs
        this.io.to(roomId).emit('notification', {
            type: 'user-left',
            pseudo: pseudo,
            message: `${pseudo} has left the board`,
            timestamp: Date.now(),
            users: remainingUsers
        });
    }

    /**
     * Gère les erreurs de connexion
     */
    handleConnectionError(socket, error) {
        this.logger.error('Connection error', error);
        socket.emit('error', {
            message: error.message || 'Connection failed',
            timestamp: Date.now()
        });
    }
}

module.exports = ConnectionHandler;