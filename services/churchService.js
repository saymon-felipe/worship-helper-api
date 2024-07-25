const functions = require("../functions/functions.js");
const multer = require("multer");
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const _permissions = require("../functions/permissions.js");

let churchService = {
    returnChurches: function () {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                SELECT
                    igreja.id_igreja,
                    igreja.nome_igreja,
                    igreja.imagem_igreja,
                    igreja.usuario_administrador,
                    CASE
                        WHEN usuario.id_usuario = igreja.usuario_administrador THEN true
                    ELSE
                        false
                    END as administrador
                FROM
                    igreja
                LEFT JOIN
                    usuario
                ON usuario.id_usuario = igreja.usuario_administrador`, [])
            .then((results) => {
                if (results.length == 0) {
                    reject("Nenhuma igreja cadastrada");
                }

                let lista_igrejas = results.map(igreja => {
                    return {
                        id_igreja: igreja.id_igreja,
                        nome_igreja: igreja.nome_igreja,
                        imagem_igreja: igreja.imagem_igreja,
                        usuario_administrador: {
                            id_usuario: igreja.id_usuario,
                            nome_usuario: igreja.nome_usuario,
                            descricao_usuario: igreja.descricao_usuario,
                            app_owner: igreja.app_owner,
                            imagem_usuario: igreja.imagem_usuario
                        },
                        administrador: igreja.administrador
                    }
                })

                for (let i = 0; i < lista_igrejas.length; i++) {
                    functions.returnChurchMembers(lista_igrejas[i].id_igreja, true).then((results2) => {
                        lista_igrejas[i].quantidade_membros = results2.size;

                        if (i == lista_igrejas.length - 1) {
                            resolve(lista_igrejas);
                        }
                    }).catch((error2) => {
                        reject(error2);
                    })
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    createTag: function (company_id, new_tag) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                INSERT INTO
                    tags_igreja
                    (tags_id_igreja, nome_tag, tipo_tag)
                VALUES
                    (?, ?, "membros")
            `,
            [company_id, new_tag])
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    deleteTag: function (company_id, tag_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                    DELETE FROM
                        tags_igreja
                    WHERE
                        tags_igreja.id_tag = ?
                    AND
                        tags_igreja.tags_id_igreja = ?
                `,
                [tag_id, company_id])
                .then(() => {
                    resolve();
                }).catch((error) => {
                    reject(error);
                })
        })
    },
    returnTags: function (company_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                SELECT
                    *
                FROM
                    tags_igreja
                WHERE
                    tags_id_igreja = ?
            `, [company_id])
            .then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    createFunction: function (company_id, new_function) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                INSERT INTO
                    funcoes_igreja
                    (id_funcoes_igreja_id_igreja, nome_funcao, tipo_funcao)
                VALUES
                    (?, ?, "membros")
            `, [company_id, new_function])
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    deleteFunction: function (function_id, company_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                    DELETE FROM
                        funcoes_igreja
                    WHERE
                        id_funcoes_igreja = ?
                    AND
                        id_funcoes_igreja_id_igreja = ?
                `,
                [function_id, company_id])
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                })
        })
    },
    returnFunctions: function (company_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                SELECT
                    *
                FROM
                    funcoes_igreja
                WHERE
                    id_funcoes_igreja_id_igreja = ?
            `,
            [company_id])
            .then((results) => {
                let lista_funcoes = results.map((currentFunction) => {
                    return {
                        id_funcao: currentFunction.id_funcoes_igreja,
                        id_igreja: currentFunction.id_funcoes_id_igreja,
                        nome_funcao: currentFunction.nome_funcao
                    }
                })
                
                resolve(lista_funcoes);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    returnChurch: function (company_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                SELECT
                    *
                FROM
                    igreja
                WHERE 
                    id_igreja = ?`,
                [company_id])
            .then((results) => {
                if (results.length <= 0) {
                    reject("Nenhuma igreja com esse id foi encontrada.");
                }

                let igreja = {
                    id_igreja: results[0].id_igreja,
                    nome_igreja: results[0].nome_igreja,
                    imagem_igreja: results[0].imagem_igreja,
                    usuario_administrador: results[0].usuario_administrador,
                    membros: {},
                    quantidade_membros: 0
                }

                functions.returnChurchMembers(results[0].id_igreja).then((results2) => {
                    igreja.membros = results2.object;
                    igreja.quantidade_membros = results2.size;
                    
                    resolve(igreja);
                }).catch((error2) => {
                    reject(error2);
                })
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    postWarning: function (company_id, message, user_id) {
        return new Promise((resolve, reject) => {
            if (message.length > 100) {
                reject("Mensagem é muito grande, limite de 100 caracteres");
            }

            functions.executeSQL(`
                INSERT INTO
                    avisos_igreja
                    (aviso_igreja_id_igreja, aviso_igreja_mensagem, aviso_igreja_id_criador, aviso_igreja_data_criacao)
                VALUES
                    (?, ?, ?, CURRENT_TIMESTAMP())
            `, [company_id, message, user_id])
            .then((results) => {
                if (results.affectedRows <= 0) {
                    reject("Não foi possível publicar o aviso");
                }

                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnWarnings: function (user_id, company_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                SELECT
                    *,
                    (
                        SELECT
                            count(*)
                        FROM 
                            curtidas_avisos
                        WHERE
                            id_aviso = ai.id_aviso_igreja
                    ) as quantidade_curtidas,
                    CASE WHEN 
                        (
                            SELECT
                                count(*)
                            FROM 
                                curtidas_avisos
                            WHERE
                                id_aviso = ai.id_aviso_igreja
                            AND
                                id_usuario = ?
                        ) 
                    THEN 
                        1
                    ELSE
                        0
                    END as current_user_liked
                FROM
                    avisos_igreja ai
                INNER JOIN
                    usuario u
                ON
                    ai.aviso_igreja_id_criador = u.id_usuario
                WHERE
                    ai.aviso_igreja_id_igreja = ?
                AND
                    ai.aviso_igreja_data_criacao > DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY);
            `, [user_id, company_id])
            .then((results) => {
                let avisos = results.map((warning) => {
                    return {
                        id_aviso: warning.id_aviso_igreja,
                        id_igreja: warning.aviso_igreja_id_igreja,
                        mensagem: warning.aviso_igreja_mensagem,
                        data_criacao: warning.aviso_igreja_data_criacao,
                        quantidade_curtidas: warning.quantidade_curtidas,
                        usuario_atual_curtiu: warning.current_user_liked,
                        criador: {
                            id_usuario: warning.id_usuario,
                            nome_usuario: warning.nome_usuario,
                            imagem_usuario: warning.imagem_usuario
                        }
                    }
                })

                resolve(avisos);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    likeWarning: function (user_id, warning_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    INSERT INTO
                        curtidas_avisos
                        (id_usuario, id_aviso)
                    VALUES
                        (?, ?)
                `, [user_id, warning_id]
            ).then((results) => {
                if (results.affectedRows <= 0) {
                    reject("Ocorreu um erro ao curtir o aviso");
                }

                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    sendInvite: function (company_id, user_id, requesting_user_id) {
        return new Promise((resolve, reject) => {
            if (user_id == requesting_user_id) {
                reject("Você não pode se auto convidar para entrar em uma igreja");
            }

            _permissions.isMember(user_id, company_id).then(() => {
                reject("Você não pode enviar um convite para quem já é membro");
            }).catch(() => {
                functions.executeSQL(
                    `
                        SELECT
                            count(id) AS count
                        FROM
                            convites_membros_igreja
                        WHERE
                            id_usuario_requisitado = ?
                        AND
                            id_igreja = ?
                    `, [user_id, company_id]
                ).then((results) => {
                    console.log(results)
                    if (results[0].count > 0) {
                        reject("Essa pessoa já tem um convite pendente");
                    } else {
                        functions.executeSQL(
                            `
                                INSERT INTO
                                    convites_membros_igreja
                                    (id_igreja, id_usuario_requisitado, id_usuario_requisitante)
                                VALUES
                                    (?, ?, ?)
                            `, [company_id, user_id, requesting_user_id]
                        ).then((results) => {
                            if (results.affectedRows <= 0) {
                                reject("Ocorreu um erro ao enviar o convite");
                            }
        
                            resolve();
                        }).catch((error) => {
                            reject(error);
                        })
                    }
                })
            })
        })
    },
    addMember: function (company_id, user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    INSERT INTO
                        membros_igreja
                        (id_igreja, id_usuario)
                    VALUES
                        (?, ?)
                `, [company_id, user_id]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    addFunction: function (new_function, company_id, user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    INSERT INTO

                `
            )
            functions.insertMetadata("funcaoUsuario", "", new_function, company_id, user_id, 0, 0).then((results2) => {
                if (results2.affectedRows > 0) {
                    reject("Não foi possível adicionar a função ao usuário");
                }

                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    removeMember: function (company_id, user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                DELETE FROM
                    membros_igreja
                WHERE
                    id_igreja = ?
                AND
                    id_usuario = ?`,
            [company_id, user_id])
            .then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    createChurch: function (company_name, administrator_id, church_image) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                INSERT INTO igreja
                    (nome_igreja, usuario_administrador, imagem_igreja)
                VALUES
                    (?, ?, ?)
            `, [company_name, administrator_id, church_image])
            .then((results) => {
                this.addMember(results.insertId, administrator_id);

                let igreja_cadastrada = {
                    id_igreja: results.insertId,
                    nome_igreja: company_name,
                    usuario_administrador: administrator_id
                }

                resolve(igreja_cadastrada);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    changeChurchImage: function (company_id, image_path) {
        return new Promise((resolve, reject) => {
            functions.executeSQL("UPDATE igreja SET imagem_igreja = ? WHERE id_igreja = ?", [image_path, company_id])
            .then((results2) => {
                if (results2.changedRows != 0) {
                    resolve();
                } else {
                    reject("Nenhuma igreja com esse id");
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    createEvent: function (creator_id, company_id, event_date, event_name, event_members, event_musics) {
        return new Promise((resolve, reject) => {
            if (event_name.trim() == "" || event_members.length == 0 || event_musics.length == 0) {
                reject("Parâmetros incorretos");
            }

            if (event_name.length > 15) {
                reject("Nome muito grande, limite 15 caracteres");
            }

            functions.executeSQL(
                `
                    INSERT INTO
                        eventos
                        (id_igreja, nome, data_inicio, id_criador)
                    VALUES
                        (?, ?, ?, ?)
                `, [company_id, event_name, functions.dateToDB(event_date), creator_id]
            ).then((results) => {
                let promises = [];

                for (let i = 0; i < event_members.length; i++) { //Inserir os membros do evento
                    promises.push(
                        functions.executeSQL(
                            `
                                INSERT INTO
                                    membros_eventos
                                    (id_usuario, id_funcao, id_evento)
                                VALUES
                                    (?, ?, ?)
                            `, [event_members[i].id_usuario, event_members[i].id_funcao, results.insertId]
                        )
                    )
                }

                for (let i = 0; i < event_musics.length; i++) { //Inserir as músicas do evento
                    promises.push(
                        functions.executeSQL(
                            `
                                INSERT INTO
                                    musicas_eventos
                                    (id_musica, id_evento)
                                VALUES
                                    (?, ?)
                            `, [event_musics[i].id, results.insertId]
                        )
                    )
                }

                Promise.all(promises).then(() => {
                    resolve();
                }).catch((error) => {
                    reject(error);
                })
            })
        })
    },
    returnEvents: function (company_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    SELECT
                        e.id_igreja,
                        e.id AS id_evento,
                        e.nome AS nome_evento,
                        e.data_inicio AS data_inicio_evento,
                        (
                            SELECT
                                ti.nome_tag
                            FROM
                                tags_igreja ti
                            INNER JOIN
                                tags_usuario tu
                            ON
                                ti.id_tag = tu.tags_usuario_id_tag_referencia
                            WHERE
                                ti.tags_id_igreja = ? AND tu.tags_usuario_id_usuario = e.id_criador
                        ) AS criador_tag,
                        COUNT(me.id) AS quantidade_membros,
                        COUNT(mue.id) AS quantidade_musicas
                    FROM
                        eventos e
                    LEFT JOIN
                        membros_eventos me
                    ON
                        me.id_evento = e.id
                    LEFT JOIN
                        musicas_eventos mue
                    ON
                        mue.id_evento = e.id
                    WHERE
                        e.id_igreja = ?
                    GROUP BY
                        id_evento;
                `, [company_id, company_id]
            ).then((results) => {
                if (results[0].id_evento == null) {
                    resolve([]);
                }
                
                let newEvents = [];
                let promises = [];
                
                for (let i = 0; i < results.length; i++) {
                    let currentEvent = results[i];

                    promises.push(
                        functions.executeSQL(
                            `
                                SELECT
                                    u.imagem_usuario,
                                    u.id_usuario
                                FROM
                                    usuario u
                                INNER JOIN
                                    membros_eventos me
                                ON
                                    me.id_usuario = u.id_usuario
                                WHERE
                                    me.id_evento = ?
                            `, [currentEvent.id_evento]
                        ).then((results) => {
                            currentEvent["membros_evento"] = results;
                            newEvents.push(currentEvent);
                        })
                    )
                }

                Promise.all(promises).then(() => {
                    resolve(newEvents);
                }).catch((error) => {
                    reject(error);
                })
            })
        })
    },
    returnEvent: function (event_id, company_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    SELECT
                        e.id AS id_evento,
                        e.nome AS nome_evento,
                        e.data_inicio AS data_inicio_evento,
                        (
                            SELECT
                                ti.nome_tag
                            FROM
                                tags_igreja ti
                            INNER JOIN
                                tags_usuario tu
                            ON
                                ti.id_tag = tu.tags_usuario_id_tag_referencia
                            WHERE
                                ti.tags_id_igreja = ? AND tu.tags_usuario_id_usuario = e.id_criador
                        ) AS criador_tag,
                        COUNT(me.id) AS quantidade_membros,
                        COUNT(mue.id) AS quantidade_musicas
                    FROM
                        eventos e
                    INNER JOIN
                        membros_eventos me
                    ON
                        me.id_evento = e.id
                    INNER JOIN
                        musicas_eventos mue
                    ON
                        mue.id_evento = e.id
                    WHERE
                        e.id_igreja = ?
                    AND
                        e.id = ?
                `, [company_id, company_id, event_id]
            ).then((results) => {                
                functions.executeSQL(
                    `
                        SELECT
                            u.imagem_usuario,
                            u.id_usuario,
                            u.nome_usuario,
                            fi.nome_funcao AS user_occupation
                        FROM
                            usuario u
                        INNER JOIN
                            membros_eventos me
                        ON
                            me.id_usuario = u.id_usuario
                        LEFT JOIN
                            funcoes_igreja fi
                        ON
                            fi.id_funcoes_igreja = me.id_funcao
                        WHERE
                            me.id_evento = ?
                    `, [results[0].id_evento]
                ).then((results2) => {
                    results[0]["membros_evento"] = results2;

                    functions.executeSQL(
                        `
                            SELECT
                                m.nome_musica,
                                m.artista_musica,
                                m.imagem AS imagem_musica,
                                m.id_musica
                            FROM
                                musicas m
                            INNER JOIN
                                musicas_eventos me
                            ON
                                me.id_musica = m.id_musica
                            WHERE
                                me.id_evento = ?
                        `, [results[0].id_evento]
                    ).then((results3) => {
                        results[0]["musicas"] = results3;

                        resolve(results[0]);
                    })
                })
            })
        })
    }
}

module.exports = churchService;