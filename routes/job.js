module.exports = function (app) {

    const dataInjector = app.middleware.dataInjector;
    const job = app.controllers.job;

    app.get('/api/job/create', job.create);


}
