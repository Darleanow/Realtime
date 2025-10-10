class DrawHandler {
    constructor(io, roomService, monitoringService, authMiddleware, logger) {
        this.io = io;
        this.roomService = roomService;
        this.monitoringService = monitoringService;
        this.authMiddleware = authMiddleware;
        this.logger = logger;
    }

    /**
     * Gère l'événement de dessin
     */
    handleDraw(socket, data) {
        const { pseudo, roomId } = socket;

        // Validation des données
        const validation = this.authMiddleware.validateDrawData(data);
        if (!validation.valid) {
            this.logger.warn(`Invalid draw data from ${pseudo}`, {
                error: validation.error,
                data
            });
            socket.emit('error', {
                type: 'validation-error',
                message: validation.error
            });
            return;
        }

        // Mise à jour des stats
        this.monitoringService.incrementEvent('draw');

        // Ajouter à l'historique
        const drawingData = {
            ...data,
            pseudo,
            type: 'draw'
        };
        this.roomService.addDrawingToHistory(roomId, drawingData);

        // Diffuser le dessin à tous les autres utilisateurs de la room
        socket.to(roomId).emit('draw', {
            ...data,
            pseudo,
            timestamp: Date.now()
        });

        // Log minimal (pas à chaque trait pour éviter le spam)
        // this.logger.event('draw', pseudo, roomId);
    }

    /**
     * Gère l'effacement du canvas
     */
    handleClearCanvas(socket) {
        const { pseudo, roomId } = socket;

        // Mise à jour des stats
        this.monitoringService.incrementEvent('clear');

        // Log
        this.logger.event('clear-canvas', pseudo, roomId);

        // Effacer l'historique
        this.roomService.clearDrawingHistory(roomId);

        // Diffuser à tous les utilisateurs de la room (y compris l'émetteur)
        this.io.to(roomId).emit('clear-canvas', {
            pseudo,
            timestamp: Date.now()
        });
    }

    /**
     * Gère le mouvement du curseur
     */
    handleCursorMove(socket, data) {
        const { pseudo, roomId } = socket;

        // Validation des données
        const validation = this.authMiddleware.validateCursorData(data);
        if (!validation.valid) {
            return; // Pas besoin de logger les erreurs de curseur
        }

        // Mise à jour des stats
        this.monitoringService.incrementEvent('cursor');

        // Diffuser la position du curseur aux autres
        socket.to(roomId).emit('cursor-move', {
            pseudo,
            x: data.x,
            y: data.y,
            timestamp: Date.now()
        });
    }

    /**
     * Gère l'annulation (undo)
     */
    handleUndo(socket) {
        const { pseudo, roomId } = socket;

        // Mise à jour des stats
        this.monitoringService.incrementEvent('undo');

        // Log
        this.logger.event('undo', pseudo, roomId);

        // Récupérer l'historique
        const history = this.roomService.getDrawingHistory(roomId);

        // Retirer la dernière action de cet utilisateur
        const lastUserActionIndex = history
            .map((action, index) => ({ action, index }))
            .reverse()
            .find(({ action }) => action.pseudo === pseudo)?.index;

        if (lastUserActionIndex !== undefined) {
            history.splice(lastUserActionIndex, 1);

            // Diffuser à tous les utilisateurs
            this.io.to(roomId).emit('undo', {
                pseudo,
                timestamp: Date.now(),
                history // Envoyer l'historique mis à jour
            });
        }
    }

    /**
     * Enregistre tous les handlers sur le socket
     */
    registerHandlers(socket) {
        socket.on('draw', (data) => this.handleDraw(socket, data));
        socket.on('clear-canvas', () => this.handleClearCanvas(socket));
        socket.on('cursor-move', (data) => this.handleCursorMove(socket, data));
        socket.on('undo', () => this.handleUndo(socket));
    }
}

module.exports = DrawHandler;