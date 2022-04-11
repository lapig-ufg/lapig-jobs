const nodemailer = require('nodemailer');
module.exports = function (app) {
    const config = app.config;
    const transport = {
        host: config.mailer.host,
        auth: {
            user: config.mailer.user,
            pass: config.mailer.password
        }
    }
    return nodemailer.createTransport(transport)
}
