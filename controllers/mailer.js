module.exports = function (app) {
    let Controller = {}
    let self = {}

    Controller.notification = function (request, response) {

        const rows = request.queryResult['largest_cities'];
        const rows2 = request.queryResult['teste'];

        response.send({ db1: rows, db2: rows2 });
        response.end();

    }

    Controller.response = function (request, response) {

        const rows = request.queryResult['largest_cities'];
        const rows2 = request.queryResult['teste'];

        response.send({ db1: rows, db2: rows2 });
        response.end();

    }

    return Controller;

}
