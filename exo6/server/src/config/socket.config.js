const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const Logger = require('../utils/logger');

class SocketConfig {
    constructor(httpServer, logger) {
        this.logger = logger;
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.CLIENT_URL || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: 60000,
            pingInterval: 25000
        });

        this.redisConfigured = false;
    }

    async setupRedisAdapter() {
        const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
        const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;
        const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

        try {
            this.logger.info('Connecting to Redis...', {
                host: REDIS_HOST,
                port: REDIS_PORT
            });

            const pubClient = createClient({
                socket: {
                    host: REDIS_HOST,
                    port: REDIS_PORT,
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            this.logger.error('Redis max reconnection attempts reached');
                            return new Error('Max reconnection attempts');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                },
                password: REDIS_PASSWORD || undefined
            });

            const subClient = pubClient.duplicate();

            pubClient.on('error', (err) => {
                this.logger.error('Redis Pub Client Error', err);
            });

            subClient.on('error', (err) => {
                this.logger.error('Redis Sub Client Error', err);
            });

            await pubClient.connect();
            await subClient.connect();

            this.io.adapter(createAdapter(pubClient, subClient));

            this.redisConfigured = true;
            this.logger.success('Redis adapter configured successfully', {
                host: REDIS_HOST,
                port: REDIS_PORT,
                instanceId: process.env.INSTANCE_ID || 'default'
            });

            return true;
        } catch (error) {
            this.logger.error('Failed to setup Redis adapter', error);
            this.logger.warn('Falling back to default in-memory adapter');
            this.redisConfigured = false;
            return false;
        }
    }

    getIO() {
        return this.io;
    }

    isRedisConfigured() {
        return this.redisConfigured;
    }
}

module.exports = SocketConfig;