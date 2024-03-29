require('dotenv').config();

const { Console } = require('console');
const express = require('express'),
    load = require('express-load'),
    util = require('util'),
    compression = require('compression'),
    requestTimeout = require('express-timeout'),
    responseTime = require('response-time'),
    bodyParser = require('body-parser'),
    parseCookie = require('cookie-parser'),
    requestParam = require('request-param'),
    morgan = require('morgan'),
    cors = require('cors');


const app = express();
const http = require('http').Server(app);
const cookie = parseCookie('LAPIG-JOBS')

load('config.js', {'verbose': false})
    .then('utils')
    .then('database')
    .then('mailer')
    .then('middleware')
    .into(app);

const allowedOrigins = [
    'http://localhost:4200',
    'https://atlasdaspastagens.ufg.br',
    'https://covidgoias.ufg.br',
    'https://maps.lapig.iesa.ufg.br',
    'https://cepf.lapig.iesa.ufg.br',
    'https://araticum.lapig.iesa.ufg.br',
    'http://localhost:3000'
];

const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Origin not allowed by CORS on LAPIG-JOBS'));
        }
    },
};

app.options('*', cors(corsOptions));
app.all('*', cors(corsOptions));

app.database.client.init(function () {
    app.middleware.repository.init(() => {
        app.database.client.init_general(() => {
            app.mailer.transporter.verify((error, success) => {
                if (error) {
                    app.utils.logger.error('Timeout: ' + error)
                    console.error(error);
                } else {

                    app.use(cookie);
                    app.use(compression());

                    app.use(requestTimeout({
                        'timeout': 2000 * 60 * 30 * 24,
                        'callback': function (err, options) {
                            let response = options.res;
                            if (err) {
                                app.utils.logger.error('Timeout: ' + err)
                                console.log('Timeout: ' + err.stack);
                            }
                            response.end();
                        }
                    }));

                    app.use(responseTime());
                    app.use(requestParam());
                    app.use(morgan('tiny'));

                    app.use(bodyParser.urlencoded({extended: true}));
                    app.use(bodyParser.json({limit: '1gb'}));

                    app.use(function (error, request, response, next) {
                        console.log('ServerError: ', error.stack);
                        app.utils.logger.error('ServerError: ', error.stack)
                        next();
                    });

                    load('controllers')
                        .then('routes')
                        .then('jobs')
                        .into(app);

                    const analysisAtlas = app.jobs.analysisAtlas;
                    const emailContact = app.jobs.emailContact;
                    
                    const httpServer = http.listen(app.config.port, function () {
                        app.utils.logger.error('Start Lapig Jobs')
                        app.utils.logger.info(`LAPIG-JOBS Server @ [port ${app.config.port}] [pid ${process.pid.toString()}]` );
                        if(success){
                            app.utils.logger.info('Mailer is ready to send messages');
                        }

                        emailContact.start();
                        analysisAtlas.start();
                    });

                    [`exit`, `uncaughtException`].forEach((event) => {
                        if (event === 'uncaughtException') {
                            process.on(event, (e) => {
                            })
                        } else {
                            process.on(event, (e) => {
                                httpServer.close(() => process.exit())
                            })
                        }
                    })
                }
            });
        });
    });
})
