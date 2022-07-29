module.exports = function (app) {

    let Controller = {}

    const collectionsJobs = app.middleware.repository.collectionsJobs;
    
    Controller.create = function (request, response) {
        const { job } = request.body
        if(job){
            collectionsJobs.jobs.insertOne(job).then(result => {
                response.status(200).json({'data':result})
                response.end();
            }).catch(error => {
                console.error(error)
                response.status(400).json({'msg': error})
                response.end();
            })
        } else {
            console.error('JOB', job)
            response.status(400).json({'msg': job})
            response.end();
        }
    }

    return Controller;
}