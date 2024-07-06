const functions = require("./functions");

let permissions = {
    checkPermission: function (id_usuario, id_igreja) {
        return new Promise((resolve, reject) => {
            let self = this;

            functions.executeSQL(`
                SELECT
                    CASE WHEN 
                        ? = usuario_administrador THEN true
                    ELSE 
                        false
                    END as administrador
                FROM
                    igreja
                WHERE
                    id_igreja = ?`,
                [id_usuario, id_igreja])
            .then((results) => {
                let administrador = false;
                let apenas_membro = true;

                if (results[0].administrador > 0) {
                    administrador = true;
                } else {
                    self.isMember(id_usuario, id_igreja).then().catch(() => {
                        apenas_membro = false;
                    })
                }

                let retorno = {
                    administrador: administrador,
                    apenas_membro: apenas_membro
                }

                resolve(retorno);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    isMember: function (id_usuario, id_igreja) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                SELECT 
                    count(id) AS count
                FROM
                    membros_igreja
                WHERE 
                    id_igreja = ? AND id_usuario = ?`,
                [id_igreja, id_usuario])
            .then((results) => {
                if (results[0].count == 0) {
                    reject("Você não é membro desta igreja");
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