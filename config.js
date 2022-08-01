const appRoot = require('app-root-path');
const env = process.env;

module.exports = function (app) {

    const appProducao = env.APP_PRODUCAO;

    let config = {
        "appRoot": appRoot,
        "clientDir": appRoot + env.CLIENT_DIR,
        "downloadDataDir": appRoot + env.DOWNLOAD_DATA_DIR,
        "cacheTilesDir": env.CACHE_TILES_DIR,
        "pg_lapig": {
            "user": env.PG_USER,
            "host": env.PG_HOST,
            "database": env.PG_DATABASE_LAPIG,
            "password": env.PG_PASSWORD,
            "port": env.PG_PORT,
            "debug": env.PG_DEBUG,
            "max": 20,
            "idleTimeoutMillis": 0,
            "connectionTimeoutMillis": 0,
        },
        "pg_general": {
            "user": env.PG_USER,
            "host": env.PG_HOST,
            "database": env.PG_DATABASE_GENERAL,
            "password": env.PG_PASSWORD,
            "port": env.PG_PORT,
            "debug": env.PG_DEBUG,
            "max": 20,
            "idleTimeoutMillis": 0,
            "connectionTimeoutMillis": 0,
        },
        "mongo": {
            "host": env.MONGO_HOST,
            "port": env.MONGO_PORT,
            "dbname": env.MONGO_DATABASE,
            "url": env.MONGO_URL,
            "dbOwsName": env.MONGO_DATABASE_OWS,
            "dbLogs": env.MONGO_DATABASE_LOGS,
            "dbJobs": env.MONGO_DATABASE_JOBS
        },
        "jobsConfig": env.MONGO_JOBS_CONFIG,
        "port": env.PORT,
        "mailer": {
            "from": env.MAILER_FROM,
            "sender": env.MAILER_SENDER,
            "host": env.MAILER_HOST,
            "port": env.MAILER_PORT,
            "user": env.MAILER_USER,
            "password": env.MAILER_PASSWORD,
            "emailAtlas": env.EMAIL_ATLAS
        },
        "ows_host": env.OWS_HOST,
        "ows_local": env.OWS_LOCAL,
    };

    if (env.NODE_ENV === 'prod') {
        config['port'] = env.PORT;
        config["downloadDataDir"] = appProducao + env.DOWNLOAD_DATA_DIR;
    }

    return config;

}
