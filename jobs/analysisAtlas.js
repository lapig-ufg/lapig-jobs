const fs = require("fs");
const cron = require('node-cron');
const got = require('got');
const string = require('./string');

module.exports = function (app) {
    let self = {}
    let Jobs = {};
    const config = app.config;
    const collections = app.middleware.repository.collections;
    const collectionsOws = app.middleware.repository.collectionsOws;
    const collectionsJobs = app.middleware.repository.collectionsJobs;
    const collectionsLogs = app.middleware.repository.collectionsLogs;

    self.requestFileFromMapServer = function (req) {
        const startProcess = new Date();
        let file = fs.createWriteStream(req.filePath + ".zip");

        const downloadPromise = new Promise((resolve, reject) => {
                request({
                    uri: req.url,
                    gzip: true
                }).pipe(file).on('finish', () => {
                    const stats = fs.statSync(req.filePath + '.zip');
                    if (stats.size < 400) {
                        reject('Error on mapserver');
                        fs.unlinkSync(req.filePath + '.zip');
                    }
                    if (req.typeDownload !== 'csv') {
                        const url = `${config.ows_local}?request=GetStyles&layers=${req.layerName}&service=wms&version=1.1.1`;
                        http.get(url, (resp) => {
                            let data = '';

                            // A chunk of data has been received.
                            resp.on('data', (chunk) => {
                                data += chunk;
                            });

                            // The whole response has been received. Print out the result.
                            resp.on('end', () => {
                                let zip = new AdmZip(req.filePath + '.zip');
                                zip.addFile(req.layerName + ".sld", Buffer.from(data, "utf8"), "Styled Layer Descriptor (SLD) of " + req.layerName);
                                zip.writeZip(req.filePath + '.zip');
                                resolve();
                            });

                        }).on("error", (err) => {
                            reject(err);
                        });
                    } else {
                        resolve();
                    }
                }).on('error', (error) => {
                    reject(error);
                })
            }
        );

        downloadPromise.then(result => {
            const endProcess = new Date();
            collections.requests.updateOne(
                {"_id": req._id},
                { $set: {"status": 2, updated_at: new Date(), "startProcess": startProcess, "endProcess": endProcess}}
            );
        }).catch(error => {
            collectionsLogs.cache.insertOne({
                origin: config.jobsConfig,
                msg: error.toString(),
                type: 'download',
                "request": req,
                date: new Date()
            })
        });
    };
    self.busyTimeCondition = function () {
        let hour = new Date().getHours();
        let day = new Date().getDay();
        return ((day === 6) || (day === 0) || (hour >= 8 && hour <= 19))
    }
    self.processCacheDownload = function (request) {
        request['url'] = request.url.replace('ows_url', config.ows_local);
        request['filePath'] = config.downloadDataDir + request.filePath;
        const directory = config.downloadDataDir + request.regionType + '/' + string.normalize(request.region) + '/' + request.typeDownload + '/' + request.layerName;
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, {recursive: true});
        }
        self.requestFileFromMapServer(request);
    }
    self.processCacheTile = function (request) {
        const startProcess = new Date();
        const url = request.url.includes('ows_url/ows') ? request.url.replace('ows_url/ows', config.ows_local) : request.url.replace('ows_url', config.ows_local);
        http.get(url, (resp) => {
            resp.on('end', () => {
                const endProcess = new Date();
                collections.requests.updateOne(
                    {"_id": request._id},
                    {$set: {"status": 2, updated_at: new Date(), "startProcess": startProcess, "endProcess": endProcess}}
                );
            });

        }).on("error", (err) => {
            collectionsLogs.cache.insertOne({
                origin: config.jobsConfig,
                msg: err.toString(),
                request: request,
                type: 'tile',
                date: new Date()
            })
        });

    }
    self.startCacheDownloads = function (cache) {
        const parallelRequestsLimit = self.busyTimeCondition() ? cache.parallelRequestsBusyTime : cache.parallelRequestsDawnTime;

        collections.requests.distinct("priority", {
            status: 0,
            type: 'download',
            priority: {$gt: 0}
        }).then(priorities => {

            let filter = {status: 0, type: 'download'};
            if (Array.isArray(priorities)) {
                if (priorities.length > 0) {
                    const temp = priorities.sort().reverse();
                    filter['priority'] = temp[0];
                }
            }

            collections.requests.aggregate([
                {$match: {status: 0, type: 'download'}},
                {$sample: {size: parseInt(parallelRequestsLimit)}}
            ]).toArray().then(requests => {
                if (Array.isArray(requests)) {
                    const operations = requests.map(req => {
                        return {
                            updateOne: {
                                "filter": {"_id": req._id},
                                "update": {$set: {"status": 1, updated_at: new Date()}}
                            }
                        };
                    });

                    if(operations.length > 0){
                        collections.requests.bulkWrite(operations).then(response => {
                            requests.forEach(req => {
                                self.processCacheDownload(req);
                            })
                        }).catch(e => collectionsLogs.cache.insertOne({
                            origin: config.jobsConfig,
                            msg: e.stack.toString(),
                            type: 'querying_requests_downloads',
                            date: new Date()
                        }));
                    }
                }
            });
        }).catch(e => collectionsLogs.cache.insertOne({
            origin: config.jobsConfig,
            msg: e.stack.toString(),
            type: 'querying_priority_requests_tiles',
            date: new Date()
        }));
    }
    self.run = function () {
        collectionsJobs.jobs.find({ status: 'PENDING' }).limit(1).toArray().then(  (jobs) => {
            if (Array.isArray(jobs)) {
                jobs.forEach(job => {
                    console.log('ANALYSIS JOB ATLAS START AT: ', new Date(), 'JOB: ', job)
                    // Get all years for analysis
                    got('https://atlasdaspastagens.ufg.br/service/upload/getpastureyears').json().then( years => {
                        collectionsJobs.jobs.updateOne(
                            {"_id":job._id},
                            {$set: {"status": 'RUNNING', "startRunning": new Date()}}
                        ).then(() => {
                            //Send email notification
                        })
                        .then(() => {
                            console.log(years )
                            let promisesPasture = [];
                            let promisesPastureQuality = [];

                            years.pasture.forEach(year => {
                                promisesPasture.push(got(`https://atlasdaspastagens.ufg.br/service/upload/pastureforjob?year=${year}&token=${job.token}`).json())
                            })
                            years.pasture_quality.forEach(year => {
                                promisesPastureQuality.push(got(`https://atlasdaspastagens.ufg.br/service/upload/pasturequalityforjob?year=${year}&token=${job.token}`).json())
                            })

                            const areaInfo = got(`https://atlasdaspastagens.ufg.br/service/upload/areainfo?token=${job.token}`).json();
                            const allPromises = [
                                ...promisesPasture,
                                ...promisesPastureQuality,
                                areaInfo
                            ]

                            Promise.all(allPromises).then(result => {
                                const pasture =  result.slice(0, 35);
                                let pasture_quality = result.slice(36, 55);
                                pasture_quality = pasture_quality.map(array => array[0]);

                                const  areaInfo = result[result.length - 1];
                                console.log('pasture', pasture, 'pasture_quality', pasture_quality, 'areaInfo', areaInfo);
                                const analysis = {
                                    "regions_intersected": areaInfo.regions_intersected,
                                    "shape_upload": areaInfo.shape_upload,
                                    "pasture": pasture,
                                    "pasture_quality": pasture_quality
                                }

                                got.post('https://atlasdaspastagens.ufg.br/service/upload/saveanalysis', {
                                        json: {
                                            token: job.token,
                                            analysis: analysis,
                                            origin: job.application
                                        }
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
                            }).catch(error => {
                                collectionsJobs.jobs.updateOne(
                                    {"_id":job._id},
                                    {$set: {"status": 'FAILED', "endRunning": new Date(), "failedMsgGetAnalysis": error}}
                                )
                            })

                        });

                    });
                })
            }
        });
    }

    Jobs.start = function () {
        try {
            if(collectionsJobs.jobsConfig){
                collectionsJobs.jobsConfig.findOne({config_id: config.jobsConfig}).then(config => {
                    Jobs['task'] = cron.schedule(config.jobs.cron, () => {
                        collectionsJobs.jobs.find( { status: 'RUNNING' }).count().then( jobsRuning => {
                            console.log(jobsRuning);
                            if(jobsRuning < 1){
                                self.run()
                            }
                        })
                    }, {
                        scheduled: config.jobs.scheduled,
                        timezone: config.jobs.timezone
                    });
                }).catch(e => {
                    console.error(e)
                });
            }
        } catch (e) {
            console.error(e)
        }
    }

    return Jobs;
};
