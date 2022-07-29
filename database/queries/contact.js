module.exports = function(app) {
    let Query = {};

    Query.builder = function(params) {
        return [
            {
                source: 'lapig',
                id: 'encaminhamento',
                sql: "SELECT email FROM public.contato_encaminhamento where atlas_pastagem = true;",
                mantain: true
            },
            {
                source: 'lapig',
                id: 'menssagens',
                sql: "SELECT id, \"name\", email, subject, message, institution, status FROM public.contato_atlas where status = 'RECEIVED';",
                mantain: true
            }
        ]
    }

    /*Query.update = function(params) {
        let contactId = params['contatoId'];
    }*/

    return Query;

}