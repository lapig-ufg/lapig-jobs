const axios = require('axios')

module.exports = function (app) {
    let self = {}
    let Jobs = {};
    const collectionsJobs = app.middleware.repository.collectionsJobs;
    const mailerController = app.controllers.mailer;
    const url= 'https://atlasdaspastagens.ufg.br';
    // const url= 'http://localhost:3000'
    self.run = function () {
        collectionsJobs.jobs.find({ status: 'PENDING', application: 'ATLAS' }).limit(1).toArray().then(  (jobs) => {
            if (Array.isArray(jobs)) {
                jobs.forEach(job => {
                    console.log('ANALYSIS JOB ATLAS START AT: ', new Date(), 'JOB: ', job.name)
                    // Get all years for analysis
                    axios.get(url + '/service/upload/getpastureyears').then( resp => {
                     const years = resp.data
                        collectionsJobs.jobs.updateOne(
                            {"_id":job._id},
                            {$set: {"status": 'RUNNING', "startRunning": new Date()}}
                        ).then(() => {
                            //Send email notification
                            mailerController.notification(job)
                        }).then(async () => {
                            let promisesPasture = [];
                            let promisesPastureQuality = [];

                            years.pasture.forEach(year => {
                                
                                promisesPasture.push(axios.get(`${url}/service/upload/pastureforjob?year=${year}&token=${job.token}`))
                            })
                            years.pasture_quality.forEach(year => {
                                
                                promisesPastureQuality.push(axios.get(`${url}/service/upload/pasturequalityforjob?year=${year}&token=${job.token}`))
                            })

                            try{
                                const areaInfo = await axios.get(`${url}/service/upload/areainfo?token=${job.token}`)

                                app.utils.logger.info(`Service uploaded ${areaInfo.data}`);

                                Promise.all(promisesPasture).then(pasture => {

                                    Promise.all(promisesPastureQuality).then(pastureQuality => {
                                        const finalPasture = pasture.map(past => past.data[0])
                                        const finalpastureQuality = pastureQuality.map(pstQuality => pstQuality.data)

                                        const analysis = {
                                            "regions_intersected": areaInfo.data.regions_intersected,
                                            "shape_upload": areaInfo.data.shape_upload,
                                            "pasture": finalPasture,
                                            "pasture_quality": finalpastureQuality
                                        }

                                        axios.post(`${url}/service/upload/saveanalysis`, {
                                                token: job.token,
                                                analysis: analysis,
                                                origin: job.application
                                            }
                                        ).then(result => {
                                            collectionsJobs.jobs.updateOne(
                                                {"_id":job._id},
                                                {$set: {"status": 'DONE', "endRunning": new Date()}}
                                            ).then(() => {
                                                // Send email response
                                                mailerController.response(job)
                                            })
                                        }).catch( e => {
                                            collectionsJobs.jobs.updateOne(
                                                {"_id":job._id},
                                                {$set: {"status": 'FAILED', "endRunning": new Date(), "failedMsgSaveAnalysis": e}}
                                            )
                                        });

                                    }).catch(err => {
                                        collectionsJobs.jobs.updateOne(
                                            {"_id":job._id},
                                            {$set: {"status": 'FAILED', "endRunning": new Date(), "failedMsgSaveAnalysis": `Error in promisesPastureQuality: ${err.message}`}}
                                        )
                                        app.utils.logger.error(`Error in promisesPastureQuality {_id:${job._id}}:`, error= err);
                                    })

                                }).catch(err => {
                                    collectionsJobs.jobs.updateOne(
                                        {"_id":job._id},
                                        {$set: {"status": 'FAILED', "endRunning": new Date(), "failedMsgSaveAnalysis": `Error in  promisesPasture: ${err.message}`}}
                                    )
                                    app.utils.logger.error(`Error in  promisesPasture {_id:${job._id}}:`, error= err);
                                })
                                
                            }catch(err){
                                app.utils.logger.error(`Service upload error areainfo {_id:${job._id}}:`, error= err);
                                collectionsJobs.jobs.updateOne(
                                    {"_id":job._id},
                                    {$set: {"status": 'FAILED', "endRunning": new Date(), "failedMsgSaveAnalysis": `Error in  areainfo: ${err.message}`}}
                                )
                            }    
                            
                        });

                    }).catch( e => {
                        console.log('Service error: ' + e.message);
                    });
                })
            }
        });
    }

    Jobs.start = function () {
        try {
            if(collectionsJobs.jobs){
                app.utils.logger.debug('Init ' )
                setInterval(() => {
                    collectionsJobs.jobs.find( { status: 'RUNNING' }).count().then( jobsRuning => {
                        if(jobsRuning < 1 ){
                            app.utils.logger.debug('Queue is empty')
                            self.run()
                        } else {
                            app.utils.logger.debug('Has job runing')
                        }
                    }).catch(error => {
                        app.utils.logger.error('Error in start server:',error=error)
                    })
                }, 30000);
            }
        } catch (e) {
            app.utils.logger.error('Not start server:',error=e)
        }
    }

    return Jobs;
};
