const functions = require("./functions");

let permissions = {
    checkPermission: function (id_usuario, id_igreja) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                SELECT
                    CASE
                        WHEN ? = usuario_administrador THEN true
                    ELSE
                        false
                    END as administrador
                FROM
                    igreja
                WHERE
                    id_igreja = ?`,
                [id_usuario, id_igreja])
            .then((results) => {
                if (results.length <= 0 || results[0].administrador == 0) {
                    reject("Você não tem permissão para acessar essa igreja");
                }

                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        })
        
    }
}

module.exports = permissions;