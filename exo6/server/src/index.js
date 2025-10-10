require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');

// Configuration
const SocketConfig = require('./config/socket.config');

// Services
const RoomService = require('./services/room.service');
const MonitoringService = require('./services/monitoring.service');

// Middleware
const AuthMiddleware = require('./middleware/auth.middleware');

// Handlers
const ConnectionHandler = require('./handlers/connection.handler');
const DrawHandler = require('./handlers/draw.handler');
const RoomHandler = require('./handlers/room.handler');

// Utils
const Logger = require('./utils/logger');

// ============================================
// INITIALISATION
// ============================================
const app = express();
const server = http.createServer(app);

const instanceId = process.env.INSTANCE_ID || `SERVER-${process.pid}`;
const logger = new Logger(instanceId);

logger.info('Starting CollabBoard Server...', {
    instanceId,
    nodeVersion: process.version,
    port: process.env.PORT || 3001
});

// ============================================
// EXPRESS CONFIGURATION
// ============================================
app.use(cors());
app.use(express.json());

// ============================================
// SERVICES INITIALIZATION
// ============================================
const roomService = new RoomService(logger);
const monitoringService = new MonitoringService(logger);
const authMiddleware = new AuthMiddleware(roomService, logger);

// ============================================
// SOCKET.IO SETUP
// ============================================
const socketConfig = new SocketConfig(server, logger);
const io = socketConfig.getIO();

// Handlers initialization
const connectionHandler = new ConnectionHandler(io, roomService, monitoringService, logger);
const drawHandler = new DrawHandler(io, roomService, monitoringService, authMiddleware, logger);
const roomHandler = new RoomHandler(io, roomService, logger);

// Setup Redis Adapter
(async () => {
    await socketConfig.setupRedisAdapter();

    logger.info('Socket.IO configured', {
        redis: socketConfig.isRedisConfigured() ? 'enabled' : 'disabled'
    });
})();

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
io.use(authMiddleware.authenticate());

// ============================================
// SOCKET.IO EVENT HANDLERS
// ============================================
io.on('connection', (socket) => {
    // Gestion de la connexion
    connectionHandler.handleConnection(socket);

    // Enregistrement des handlers
    drawHandler.registerHandlers(socket);
    roomHandler.registerHandlers(socket);

    // Gestion de la déconnexion
    socket.on('disconnect', () => {
        connectionHandler.handleDisconnection(socket);
    });

    // Gestion des erreurs
    socket.on('error', (error) => {
        connectionHandler.handleConnectionError(socket, error);
    });
});

// ============================================
// REST API ENDPOINTS
// ============================================

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'CollabBoard Socket.IO Server',
        version: '1.0.0',
        instanceId,
        redis: socketConfig.isRedisConfigured()
    });
});

// Status & Monitoring
app.get('/status', (req, res) => {
    const monitoringStats = monitoringService.getStats();
    const roomStats = roomService.getStats();

    res.json({
        status: 'healthy',
        instanceId,
        uptime: monitoringStats.uptime,
        redis: socketConfig.isRedisConfigured(),
        stats: {
            ...monitoringStats,
            ...roomStats
        },
        rooms: roomStats.rooms,
        timestamp: new Date().toISOString()
    });
});

// Get specific room info (useful for debugging)
app.get('/api/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    const roomInfo = roomService.getRoomInfo(roomId);

    if (roomInfo) {
        res.json({
            success: true,
            room: roomInfo
        });
    } else {
        res.status(404).json({
            success: false,
            error: 'Room not found'
        });
    }
});

// Get all rooms
app.get('/api/rooms', (req, res) => {
    const rooms = roomService.getAllRooms();
    res.json({
        success: true,
        count: rooms.length,
        rooms
    });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
    logger.error('Express error', err);
    res.status(500).json({
        status: 'error',
        message: err.message || 'Internal server error'
    });
});

// ============================================
// SERVER START
// ============================================
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    logger.success(`Server started on port ${PORT}`, {
        instanceId,
        clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
        redisEnabled: socketConfig.isRedisConfigured()
    });

    console.log(`
╔═══════════════════════════════════════════╗
║   🎨 CollabBoard Server Running           ║
║                                           ║
║   Instance: ${instanceId.padEnd(27)}║
║   Port: ${String(PORT).padEnd(33)}║
║   Redis: ${(socketConfig.isRedisConfigured() ? 'Enabled' : 'Disabled').padEnd(32)}║
║                                           ║
║   📊 Endpoints:                           ║
║      GET  /                               ║
║      GET  /status                         ║
║      GET  /api/rooms                      ║
║      GET  /api/rooms/:roomId              ║
╚═══════════════════════════════════════════╝
  `);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, closing server gracefully');

    monitoringService.cleanup();

    server.close(() => {
        logger.success('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, closing server gracefully');

    monitoringService.cleanup();

    server.close(() => {
        logger.success('Server closed');
        process.exit(0);
    });
});

// ============================================
// PERIODIC STATS LOGGING
// ============================================
setInterval(() => {
    const stats = monitoringService.getStats();
    const roomStats = roomService.getStats();

    logger.stats({
        activeConnections: stats.activeConnections,
        eventsPerMinute: stats.eventsPerMinute,
        roomCount: roomStats.totalRooms
    });
}, 60000); // Every minute