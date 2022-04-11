const axios = require('axios')

module.exports = function (app) {
    let self = {}
    let Jobs = {};
    const collectionsJobs = app.middleware.repository.collectionsJobs;
    const mailerController = app.controllers.mailer;

    self.run = function () {
        collectionsJobs.jobs.find({ status: 'PENDING', application: 'ATLAS' }).limit(1).toArray().then(  (jobs) => {
            if (Array.isArray(jobs)) {
                jobs.forEach(job => {
                    mailerController.response(job)
                    console.log('ANALYSIS JOB ATLAS START AT: ', new Date(), 'JOB: ', job.name)
                    // Get all years for analysis
                    axios.get('https://atlasdaspastagens.ufg.br/service/upload/getpastureyears').then( resp => {
                     const years = resp.data
                        collectionsJobs.jobs.updateOne(
                            {"_id":job._id},
                            {$set: {"status": 'RUNNING', "startRunning": new Date()}}
                        ).then(() => {
                            //Send email notification
                        }).then(async () => {
                            let promisesPasture = [];
                            let promisesPastureQuality = [];

                            years.pasture.forEach(year => {
                                promisesPasture.push(axios.get(`https://atlasdaspastagens.ufg.br/service/upload/pastureforjob?year=${year}&token=${job.token}`))
                            })
                            years.pasture_quality.forEach(year => {
                                promisesPastureQuality.push(axios.get(`https://atlasdaspastagens.ufg.br/service/upload/pasturequalityforjob?year=${year}&token=${job.token}`))
                            })

                            const areaInfo = await axios.get(`https://atlasdaspastagens.ufg.br/service/upload/areainfo?token=${job.token}`);
                            const pasture = await axios.all(promisesPasture);
                            const pastureQuality = await axios.all(promisesPastureQuality);

                            console.log('areaInfo', areaInfo.data, 'pasture', pasture.data, 'pastureQuality', pastureQuality.data )

                            const finalPasture = pasture.data.filter(past => past.area_pastagem != null)
                            const finalpastureQuality = pasture.data.filter(pstQuality => pstQuality.area_pastagem != null)

                            const analysis = {
                                "regions_intersected": areaInfo.data.regions_intersected,
                                "shape_upload": areaInfo.data.shape_upload,
                                "pasture": finalPasture,
                                "pasture_quality": finalpastureQuality
                            }

                            console.log('analysis', analysis)

                            axios.post('https://atlasdaspastagens.ufg.br/service/upload/saveanalysis', {
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
