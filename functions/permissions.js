const functions = require("./functions");

let permissions = {
    checkPermission: async function (id_usuario, id_igreja) {
        const results = await functions.executeSQL(`
            SELECT
                CASE WHEN
                    ? = i.usuario_administrador OR u.app_owner = 1 THEN true
                ELSE
                    false
                END as administrador
            FROM
                igreja i
            LEFT JOIN
                usuario u
            ON
                u.id_usuario = ?
            WHERE
                i.id_igreja = ?`,
            [id_usuario, id_usuario, id_igreja]);

        if (results.length <= 0) {
            throw "Permissão negada";
        }

        const administrador = results[0].administrador > 0;
        if (administrador) {
            return {
                administrador: true,
                apenas_membro: false
            };
        }

        try {
            await this.isMember(id_usuario, id_igreja);
        } catch {
            throw "Permissão negada";
        }

        return {
            administrador: false,
            apenas_membro: true
        };
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
                    return;
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
