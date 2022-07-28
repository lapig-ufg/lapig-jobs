module.exports = function(app) {
    let Jobs = {};

    Jobs.start = function () {
        try {
            if(collectionsJobs.jobs){
                app.utils.logger.debug('Init job send emails')
                setInterval(() => {
                    collectionsJobs.jobs.find( { status: 'RECEIVED' }).count().then( jobsRuning => {
                        if(jobsRuning < 1 ){
                            app.utils.logger.debug('Queue is empty')
                            self.run()
                        } else {
                            app.utils.logger.debug('Has job runing')
                        }
                    }).catch(error => {
                        app.utils.logger.error('Error in start server:',error=error)
                    })
                }, 1000)
            }
        } catch (e) {
            app.utils.logger.error('Not start server:',error=e)
        }
    }

    return Jobs;
}