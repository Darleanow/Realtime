class AuthMiddleware {
    constructor(roomService, logger) {
        this.roomService = roomService;
        this.logger = logger;
    }

    /**
     * Middleware d'authentification Socket.IO
     */
    authenticate() {
        return (socket, next) => {
            const { pseudo, roomId, token } = socket.handshake.auth;

            // Validation des champs requis
            if (!pseudo || typeof pseudo !== 'string' || pseudo.trim().length === 0) {
                this.logger.warn('Authentication failed: missing or invalid pseudo', {
                    socketId: socket.id
                });
                return next(new Error('Pseudo is required'));
            }

            if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
                this.logger.warn('Authentication failed: missing or invalid roomId', {
                    socketId: socket.id
                });
                return next(new Error('Room ID is required'));
            }

            if (!token || typeof token !== 'string' || token.trim().length === 0) {
                this.logger.warn('Authentication failed: missing or invalid token', {
                    socketId: socket.id
                });
                return next(new Error('Access token is required'));
            }

            // Validation de la longueur
            if (pseudo.trim().length > 50) {
                return next(new Error('Pseudo too long (max 50 characters)'));
            }

            if (roomId.trim().length > 50) {
                return next(new Error('Room ID too long (max 50 characters)'));
            }

            // Vérification du token
            if (!this.roomService.verifyRoomToken(roomId, token)) {
                this.logger.warn('Authentication failed: invalid token', {
                    pseudo: pseudo.trim(),
                    roomId: roomId.trim(),
                    socketId: socket.id
                });
                return next(new Error('Invalid access token'));
            }

            // Stocker les informations dans le socket
            socket.pseudo = pseudo.trim();
            socket.roomId = roomId.trim();

            this.logger.info('User authenticated', {
                pseudo: socket.pseudo,
                roomId: socket.roomId,
                socketId: socket.id
            });

            next();
        };
    }

    /**
     * Validation des données de dessin
     */
    validateDrawData(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Invalid data format' };
        }

        const { x0, y0, x1, y1, color, width } = data;

        // Validation des coordonnées
        if (
            typeof x0 !== 'number' ||
            typeof y0 !== 'number' ||
            typeof x1 !== 'number' ||
            typeof y1 !== 'number'
        ) {
            return { valid: false, error: 'Invalid coordinates' };
        }

        // Validation des limites (canvas max 10000x10000)
        if (
            Math.abs(x0) > 10000 || Math.abs(y0) > 10000 ||
            Math.abs(x1) > 10000 || Math.abs(y1) > 10000
        ) {
            return { valid: false, error: 'Coordinates out of bounds' };
        }

        // Validation de la couleur (hex format)
        if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return { valid: false, error: 'Invalid color format' };
        }

        // Validation de la largeur
        if (width && (typeof width !== 'number' || width < 1 || width > 50)) {
            return { valid: false, error: 'Invalid line width' };
        }

        return { valid: true };
    }

    /**
     * Validation des données de curseur
     */
    validateCursorData(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Invalid data format' };
        }

        const { x, y } = data;

        if (typeof x !== 'number' || typeof y !== 'number') {
            return { valid: false, error: 'Invalid cursor coordinates' };
        }

        if (Math.abs(x) > 10000 || Math.abs(y) > 10000) {
            return { valid: false, error: 'Cursor position out of bounds' };
        }

        return { valid: true };
    }
}

module.exports = AuthMiddleware;