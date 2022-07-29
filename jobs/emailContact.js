const { error } = require("winston");
const ejs = require("ejs");
const path = require('path');

module.exports = function (app) {
    let self = {}
    let Jobs = {};
    const transporter = app.mailer.transporter;
    const config = app.config;
    const logger = app.utils.logger;
    const jobsCollection = app.middleware.repository.collectionsJobs;

    const client = app.database.client;
    
    self.start = function () {
        app.utils.logger.debug('Start emails job');
        client.poolLapig.query("SELECT id, \"name\", email, subject, message, institution, status FROM public.contato_atlas where status = 'RECEIVED';", (err, resultContacts) => {

            if (err !== null) {
                if(err != undefined){
                    app.utils.logger.error(err)
                }
            } else if (config['pg_lapig']['debug']) {
                app.utils.logger.debug('Executed query', error= { query, rows: resultContacts.rowCount })
            }

            client.poolLapig.query("SELECT email FROM public.contato_encaminhamento where atlas_pastagem = true;", (err, emailsResult) => {

                if (err !== null){
                    if(err != undefined){
                        app.utils.logger.error(err)
                    }
                } else if (config['pg_lapig']['debug']) {
                    app.utils.logger.error('Executed query', error = { query, rows: emailsResult.rowCount })
                }

                self.process({contacts: resultContacts.rows, emails: emailsResult.rows});
            });
        });
    }

    self.process = function (data) {
        jobsCollection.languages.find({"_id": "pt"}).toArray().then(translation => {
                data.contacts.forEach(function (contact) {
                    let title = translation[0].email.title
                    const text = translation[0].email.response

                    let email = {
                        title: text.subject.replace('{{subject}}', contact.subject),
                        hello: text.hello.replace('{{name}}', contact.name),
                        body: text.body.replace('{{message}}', contact.message),
                        url: '',
                        regards: text.regards,
                        team: text.team.replace('{{name}}', contact.name).replace('{{institution}}', contact.institution)
                    }
                    ejs.renderFile(path.resolve("./views/emails/response.ejs"), {email}, function (err, templeteHtml) {
                        if (err) {
                            app.util.logger.error('Render file', error= err);
                        } else {
                            logger.debug(`Email redenderizado com sucesso.`);
                            data.emails.forEach(function (emailObj) {
                                const mainOptions = {
                                    from: title + ' <' + config.mailer.from + '>',
                                    sender: config.mailer.sender,
                                    replyTo: config.mailer.sender,
                                    to: emailObj.email,
                                    subject: contact.subject,
                                    html: templeteHtml
                                };

                                transporter.sendMail(mainOptions, function (err, info) {
                                    if (err) {
                                        app.util.logger.error('Error send contact', error= err);
                                    } else {
                                        logger.info(`Email enviado com sucesso. Email:${emailObj.email}`);
                                        jobsCollection.jobs.updateOne(
                                            {"_id": job._id},
                                            {$set: {"sendedResponse": info}}
                                        )
                                    }
                                });
                            })
                        }
                    });
                });
            });
    }

    return self;
};
