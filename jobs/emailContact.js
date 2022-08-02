const { error } = require("winston");
const ejs = require("ejs");
const path = require('path');
const { env } = require("process");

module.exports = function (app) {
    var statusJobs = false;
    
    let self = {};
    let Jobs = {};
    const transporter = app.mailer.transporter;
    const config = app.config;
    const logger = app.utils.logger;
    const jobsCollection = app.middleware.repository.collectionsJobs;

    const client = app.database.client;

    Jobs.start = function () {

        logger.debug('Init email sender');

        setInterval(() => {
            if(!statusJobs) {
                logger.info('Começando envio de emails');
                self.run();
            }else {
                logger.info('Já estou trabalho nos emails.');
            }
        }, 60000);
    }
    
    self.run = function () {
        logger.debug(statusJobs);

        logger.debug('Start emails job');
        client.poolLapig.query("SELECT id, \"name\", email, subject, message, institution, status FROM public.contato_atlas where status = 'RECEIVED';", (err, resultContacts) => {

            if (err !== null) {
                if(err !== undefined){
                    statusJobs = false;
                    logger.error(err);
                }
            }

            logger.debug(`rows: ${resultContacts.rowCount}`);

            self.process({contacts: resultContacts.rows});
        });
    }

    self.process = function (data) {
        logger.debug(data);
        if(data.contacts.length > 0) {
            statusJobs = true;
        }else {
            statusJobs = false;
        }
        jobsCollection.languages.find({"_id": "pt"}).toArray().then(translation => {
                data.contacts.forEach(function (contact) {
                    let title = translation[0].email.title
                    const text = translation[0].email.contact

                    let email = {
                        title: text.subject.replace('{{subject}}', contact.subject).replace('{{name}}', contact.name),
                        body: text.body.replace('{{message}}', contact.message),
                        team: text.team.replace('{{name}}', contact.name).replace('{{institution}}', contact.institution).replace('{{email}}', contact.email)
                    }

                    ejs.renderFile(path.resolve("./views/emails/contact.ejs"), {email}, function (err, templeteHtml) {
                        if (err) {
                            statusJobs = false;
                            logger.error('Render file');
                        } else {
                            logger.debug(`Email redenderizado com sucesso.`);
                            const mainOptions = {
                                from: title + ' <' + config.mailer.from + '>',
                                sender: config.mailer.sender,
                                replyTo: config.mailer.sender,
                                to: config.mailer.emailAtlas,
                                subject: `[ATLAS] ${contact.name} | ${contact.subject}`,
                                html: templeteHtml
                            };

                            transporter.sendMail(mainOptions, function (err, info) {

                                if (err) {
                                    statusJobs = false;
                                    logger.error('Error send contact', error= err);
                                } else {
                                    logger.info(`Email enviado com sucesso. Email:${config.mailer.emailAtlas}`);
                                    logger.debug(`contato_atlas id: ${contact.id}`);
                                    client.poolLapig.query(
                                        `UPDATE public.contato_atlas SET status='EMAIL_SENDED' WHERE id=${contact.id};`, 
                                        (err, resultContacts) => {
                                            if(err) {
                                                logger.error('Não deu pra atualizar o banco de dados, mas o email foi enviado.', error= err);
                                            }
                                            statusJobs = false;
                                    });
                                }
                            });
                        }
                    });
                });
            });
    }

    return Jobs;
};

