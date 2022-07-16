const winston = require('winston');

module.exports = function (app) {
    const logger = winston.createLogger({
        
        format: winston.format.combine(
            winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
        transports: [
            new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
            new winston.transports.File({ filename: 'logs/info.log', level: 'info'}),
        ],
    });
    
    if (process.env.NODE_ENV !== 'prod') {
        logger.add(new winston.transports.Console({
            
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp, stack }) => {
                    if (stack) {
                        // print log trace 
                        return `[ ${timestamp} ${level}]: ${message} \n ${stack}`;
                    }
                    return `[ ${timestamp} ${level}]: ${message}`;
                })
            )
            
        }));
    }
    return logger
}
 
