const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

class Logger {
    constructor(instanceId = 'SERVER') {
        this.instanceId = instanceId;
    }

    _formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const prefix = `[${this.instanceId}] [${timestamp}]`;

        let output = `${prefix} ${level} ${message}`;
        if (data) {
            output += `\n${JSON.stringify(data, null, 2)}`;
        }
        return output;
    }

    info(message, data = null) {
        console.log(
            `${colors.blue}ℹ${colors.reset} ${this._formatMessage('INFO', message, data)}`
        );
    }

    success(message, data = null) {
        console.log(
            `${colors.green}✓${colors.reset} ${this._formatMessage('SUCCESS', message, data)}`
        );
    }

    warn(message, data = null) {
        console.warn(
            `${colors.yellow}⚠${colors.reset} ${this._formatMessage('WARN', message, data)}`
        );
    }

    error(message, error = null) {
        const data = error ? {
            message: error.message,
            stack: error.stack
        } : null;
        console.error(
            `${colors.red}✖${colors.reset} ${this._formatMessage('ERROR', message, data)}`
        );
    }

    connection(pseudo, roomId, socketId) {
        console.log(
            `${colors.green}🟢${colors.reset} ${colors.cyan}${pseudo}${colors.reset} joined ${colors.magenta}${roomId}${colors.reset} ${colors.gray}[${socketId}]${colors.reset}`
        );
    }

    disconnection(pseudo, roomId) {
        console.log(
            `${colors.red}🔴${colors.reset} ${colors.cyan}${pseudo}${colors.reset} left ${colors.magenta}${roomId}${colors.reset}`
        );
    }

    event(eventName, pseudo, roomId) {
        console.log(
            `${colors.blue}📡${colors.reset} ${colors.gray}[${eventName}]${colors.reset} from ${colors.cyan}${pseudo}${colors.reset} in ${colors.magenta}${roomId}${colors.reset}`
        );
    }

    stats(stats) {
        console.log(`
${colors.cyan}╔═══════════════════════════════════════════╗
║              📊 SERVER STATS              ║
╠═══════════════════════════════════════════╣
║  Active Connections: ${String(stats.activeConnections).padEnd(20)}║
║  Events/min: ${String(stats.eventsPerMinute).padEnd(28)}║
║  Active Rooms: ${String(stats.roomCount).padEnd(26)}║
╚═══════════════════════════════════════════╝${colors.reset}
    `);
    }
}

module.exports = Logger;