class MonitoringService {
    constructor(logger) {
        this.logger = logger;
        this.stats = {
            startTime: Date.now(),
            totalConnections: 0,
            activeConnections: 0,
            totalDisconnections: 0,
            eventCounter: 0,
            eventsPerMinute: 0,
            events: {
                draw: 0,
                clear: 0,
                cursor: 0,
                undo: 0
            }
        };

        // Reset counter every minute
        this.eventCounterInterval = setInterval(() => {
            this.stats.eventsPerMinute = this.stats.eventCounter;
            this.stats.eventCounter = 0;
        }, 60000);

        // Log stats every minute
        this.statsLogInterval = setInterval(() => {
            this.logStats();
        }, 60000);
    }

    incrementConnection() {
        this.stats.totalConnections++;
        this.stats.activeConnections++;
        this.stats.eventCounter++;
    }

    incrementDisconnection() {
        this.stats.activeConnections--;
        this.stats.totalDisconnections++;
        this.stats.eventCounter++;
    }

    incrementEvent(eventName = 'generic') {
        this.stats.eventCounter++;

        if (this.stats.events[eventName] !== undefined) {
            this.stats.events[eventName]++;
        }
    }

    getUptime() {
        return Math.floor((Date.now() - this.stats.startTime) / 1000);
    }

    getStats() {
        return {
            uptime: this.getUptime(),
            totalConnections: this.stats.totalConnections,
            activeConnections: this.stats.activeConnections,
            totalDisconnections: this.stats.totalDisconnections,
            eventsPerMinute: this.stats.eventsPerMinute,
            eventBreakdown: { ...this.stats.events }
        };
    }

    logStats() {
        this.logger.stats({
            activeConnections: this.stats.activeConnections,
            eventsPerMinute: this.stats.eventsPerMinute,
            roomCount: 0 // Will be updated by RoomService
        });
    }

    cleanup() {
        if (this.eventCounterInterval) {
            clearInterval(this.eventCounterInterval);
        }
        if (this.statsLogInterval) {
            clearInterval(this.statsLogInterval);
        }
    }
}

module.exports = MonitoringService;