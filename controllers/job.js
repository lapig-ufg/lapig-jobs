module.exports = function (app) {
    let Controller = {}
    const collectionsJobs = app.middleware.repository.collectionsJobs;
    Controller.create = function (request, response) {
        const { job } = request.body
        if(job){
            collectionsJobs.jobs.insertOne(job).then(result => {
                response.send({'data':result}).code(200);
                response.end();
            }).catch(error => {
                console.error(error)
                response.send({'msg': error}).code(400);
                response.end();
            })
        } else {
            console.error('JOB', job)
            response.send({'msg': 'JOB: ' + job}).code(400);
            response.end();
        }
    }

    return Controller;

}
