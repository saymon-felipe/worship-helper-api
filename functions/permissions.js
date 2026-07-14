const functions = require("./functions");
const { ALL_PERMISSIONS, getPermissionParent, parsePermissions } = require("./permissionKeys");

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
                apenas_membro: false,
                permissions: ALL_PERMISSIONS
            };
        }

        try {
            await this.isMember(id_usuario, id_igreja);
        } catch {
            throw "Permissão negada";
        }

        const functionRows = await functions.executeSQL(`
            SELECT
                fi.permissoes
            FROM
                funcoes_usuario fu
            INNER JOIN
                funcoes_igreja fi
            ON
                fi.id_funcoes_igreja = fu.id_funcoes_referencia
            WHERE
                fu.id_funcoes_igreja_id_igreja = ?
            AND
                fu.id_funcoes_igreja_id_usuario = ?
        `, [id_igreja, id_usuario]);

        const permissions = [
            ...new Set(functionRows.flatMap((row) => parsePermissions(row.permissoes)))
        ];

        return {
            administrador: false,
            apenas_membro: true,
            permissions
        };
    },
    hasPermission: function (permissionObj, permissionKey) {
        if (!permissionObj) {
            return false;
        }

        if (permissionObj.administrador) {
            return true;
        }

        const permissions = Array.isArray(permissionObj.permissions) ? permissionObj.permissions : [];
        if (!permissions.includes(permissionKey)) {
            return false;
        }

        const parent = getPermissionParent(permissionKey);
        return !parent || permissions.includes(parent);
    },
    requirePermission: async function (id_usuario, id_igreja, permissionKey) {
        const permission = await this.checkPermission(id_usuario, id_igreja);
        if (!this.hasPermission(permission, permissionKey)) {
            throw "Acesso negado";
        }

        return permission;
    },
    isEventParticipantOrCreator: async function (event_id, user_id) {
        const results = await functions.executeSQL(`
            SELECT
                e.id_criador,
                me.id_usuario AS participante
            FROM
                eventos e
            LEFT JOIN
                membros_eventos me
            ON
                me.id_evento = e.id
            AND
                me.id_usuario = ?
            WHERE
                e.id = ?
            LIMIT 1
        `, [user_id, event_id]);

        if (results.length <= 0) {
            return false;
        }

        return results[0].id_criador == user_id || results[0].participante == user_id;
    },
    canEditEvent: async function (event_id, id_igreja, user_id) {
        const permission = await this.checkPermission(user_id, id_igreja);
        if (this.hasPermission(permission, "events.edit")) {
            return true;
        }

        const results = await functions.executeSQL(`
            SELECT id_criador
            FROM eventos
            WHERE id = ? AND id_igreja = ?
        `, [event_id, id_igreja]);

        return results.length > 0 && results[0].id_criador == user_id;
    },
    eventBelongsToChurch: async function (event_id, id_igreja) {
        const results = await functions.executeSQL(`
            SELECT id
            FROM eventos
            WHERE id = ? AND id_igreja = ?
        `, [event_id, id_igreja]);

        return results.length > 0;
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
