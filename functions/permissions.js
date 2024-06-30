const functions = require("./functions");

let permissions = {
    checkPermission: function (id_usuario, id_igreja) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                SELECT
                    CASE
                        WHEN ? = usuario_administrador THEN true
                    ELSE EXISTS (
                            SELECT 1
                            FROM metadados
                            WHERE 
                                tipo_metadado = "membro" AND metadados_id_igreja = 35 AND metadados_id_usuario = 9 AND confirmacao = 1
                        )
                    END as administrador_ou_membro
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