const { Client } = require('pg')

module.exports = function(app) {
    
    var Internal = {}
    var ClientDb = {}

    const config = app.config;
    Internal['client-lapig'] = new Client(config['pg_lapig'])

    ClientDb.init = function(callback) {

        Internal['client-lapig']
            .connect()
            .then(() => {
                console.log('connected')
                callback()
            })
            .catch(err => console.error('connection error', err.stack))
    }

    return ClientDb
}
