module.exports = function (app) {
    const job = app.controllers.job;
    app.post('/service/job/create', job.create);
}
