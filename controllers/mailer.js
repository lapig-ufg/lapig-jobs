const ejs = require("ejs");
const path = require('path');

module.exports = function (app) {
    let Controller = {}
    const transporter = app.mailer.transporter;
    const config = app.config;
    const jobsCollection = app.middleware.repository.collectionsJobs;

    Controller.notification = function (job) {
        jobsCollection.languages.find({ "_id": job.lang }).toArray().then( translation => {
            const title = translation[0].email.title
            const text = translation[0].email.notification
            let email = {
                title: text.subject,
                hello: text.hello.replace('{{name}}', job.name),
                body:  text.body,
                regards: text.regards,
                team: text.team
            }
            ejs.renderFile(path.resolve( "./views/emails/notification.ejs"), {email}, function (err, data) {
                if (err) {
                    console.log(err);
                } else {
                    const mainOptions = {
                        from: title + ' <' + config.mailer.from + '>',
                        to: job.email,
                        subject: text.subject,
                        html: data
                    };
                    transporter.sendMail(mainOptions, function (err, info) {
                        if (err) {
                            console.error(err)
                        } else {
                            jobsCollection.jobs.updateOne(
                                {"_id":job._id},
                                {$set: { "sendedNotification": info}}
                            )
                        }
                    });
                }
            });
        })
    }

    Controller.response = function (job) {
        jobsCollection.languages.find({"_id": job.lang}).toArray().then(translation => {
            const title = translation[0].email.title
            const text = translation[0].email.response
            let email = {
                title: text.subject,
                hello: text.hello.replace('{{name}}', job.name),
                body: text.body,
                url: 'https://atlasdaspastagens.ufg.br/map/' + job.token,
                regards: text.regards,
                team: text.team
            }
            ejs.renderFile(path.resolve("./views/emails/response.ejs"), {email}, function (err, data) {
                if (err) {
                    console.log(err);
                } else {
                    const mainOptions = {
                        from: title + ' <' + config.mailer.from + '>',
                        to: job.email,
                        subject: text.subject,
                        html: data
                    };
                    transporter.sendMail(mainOptions, function (err, info) {
                        if (err) {
                            console.error(err)
                        } else {
                            jobsCollection.jobs.updateOne(
                                {"_id": job._id},
                                {$set: {"sendedResponse": info}}
                            )
                        }
                    });
                }
            });
        })
    }

    return Controller;

}
