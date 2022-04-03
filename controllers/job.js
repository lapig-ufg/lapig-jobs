module.exports = function (app) {
    let Controller = {}
    let Internal = {}

    Controller.create = function (request, response) {
        response.send({'ok': 'ok'});
        response.end();
    }

    return Controller;

}
