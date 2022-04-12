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

                            const areaInfo = await axios.get(`${url}/service/upload/areainfo?token=${job.token}`);
                            const pasture = await Promise.all(promisesPasture);
                            const pastureQuality = await Promise.all(promisesPastureQuality);

                            pasture.forEach(past => console.log(past.data))
                            pastureQuality.forEach(pstQuality => console.log(pstQuality.data))

                            const finalPasture = pasture.filter(past => past.data[0].area_pastagem != null)
                            const finalpastureQuality = pastureQuality.filter(pstQuality => pstQuality.data[0].area_pastagem != null)

                            const analysis = {
                                "regions_intersected": areaInfo.data.regions_intersected,
                                "shape_upload": areaInfo.data.shape_upload,
                                "pasture": finalPasture,
                                "pasture_quality": finalpastureQuality
                            }

                            console.log('analysis', analysis)

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

                        });

                    });
                })
            }
        });
    }

    Jobs.start = function () {
        try {
            if(collectionsJobs.jobs){
                console.log('Init')
                setInterval(() => {
                    collectionsJobs.jobs.find( { status: 'RUNNING' }).count().then( jobsRuning => {
                        if(jobsRuning < 1){
                            self.run()
                        } else {
                            console.log('Has job runing or queue empty', jobsRuning)
                        }
                    })
                }, 30000);
            }
        } catch (e) {
            console.error(e)
        }
    }

    return Jobs;
};
