const winston = require('winston');
const DiscordTransport = require('winston-discord-transport').default;


module.exports = function (app) {
    
    const format =  winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack }) => {
            if (typeof message === 'object') {
                message = JSON.stringify(message, null, 3);
            }
            if(timestamp === undefined){
                timestamp = ''
            }
            if (stack) {
                // print log trace 
                return `[${timestamp} ${level}]: ${message} \n ${stack}`;
            }
            return `[${timestamp} ${level}]: ${message}`;
        })
    )

    const logger = winston.createLogger({
        
        format: format,
        transports: [
            new DiscordTransport({
                webhook:process.env.ERROR_LOGGER_URL ,
                defaultMeta: { service: "Lapig Jobs Report" },
                level: "error"
              }),
            new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
            new winston.transports.File({ filename: 'logs/info.log', level: 'info'}),
        ],
    });
    
    if (process.env.NODE_ENV !== 'prod') {
        logger.add(new winston.transports.Console({
            format: format,
            level: 'debug' 
            
        },));
    }
    return logger
}
 
