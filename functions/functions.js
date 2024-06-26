let mysql = require("../mysql.js").pool;

let functions = {
    insertMetadata: function (tipo_metadado, data_confirmacao = "", nome_metadado, id_igreja, id_usuario, id_objeto = 0, confirmacao = 0) {
        return new Promise((resolve, reject) => {
            this.executeSQL(`
                INSERT INTO 
                    metadados
                    (tipo_metadado, data_criacao, data_confirmacao, nome_metadado, metadados_id_igreja, metadados_id_usuario, id_objeto, confirmacao)
                VALUES
                    (?, CURRENT_TIMESTAMP(), ?, ?, ?, ?, ?, ?)
            `,
            [tipo_metadado, data_confirmacao, nome_metadado, id_igreja, id_usuario, id_objeto, confirmacao])
            .then((results) => {
                resolve(results);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    createResponse: function (message, returnObj, request_type, request_status) {
        let response = {
            message: message,
            returnObj: returnObj,
            request: {
                type: request_type.toUpperCase(),
                status: request_status
            }
        }

        return response;
    },
    executeSQL: function (queryText, params = []) {
        return new Promise((resolve, reject) => {
            mysql.getConnection((error, conn) => {
                if (error) {
                    reject(error);
                } else {
                    conn.query(queryText, params, (err, results) => {
                        conn.release();
                        if (err) {
                            reject(err);
                        } else {
                            resolve(results);
                        }
                    })
                }
            })
        })
    },
    returnChurchMembers: function (id_igreja, only_size = false) {
        return new Promise((resolve, reject) => {
            let result = {};
            let self = this;
            self.executeSQL(`
                SELECT
                    ${only_size ? 'count(id_usuario)' : "*"}
                FROM 
                    usuario u
                LEFT JOIN
                    metadados m
                ON
                    m.metadados_id_usuario = u.id_usuario 
                WHERE
                    m.tipo_metadado = "membro"
                AND
                    m.confirmacao = 1
                AND
                    m.metadados_id_igreja = ?`,
                [id_igreja])
            .then((results) => { 
                let members = results.map(membro => {
                    return {
                        id_usuario: membro.id_usuario,
                        nome_usuario: membro.nome_usuario,
                        email_usuario: membro.email_usuario,
                        descricao_usuario: membro.descricao_usuario,
                        app_owner: membro.app_owner,
                        imagem_usuario: membro.imagem_usuario
                    }
                })
                self.retornaTags(id_igreja).then((results2) => { 
                    let tags_usuarios = results2;
                    for (let i = 0; i < members.length; i++) {
                        members[i].tag_usuario = tags_usuarios.filter(tag => {
                            if (tag.id_usuario == members[i].id_usuario) {
                                return tag.id_usuario;
                            }
                        })
                    }
                    self.retornaFuncoes(id_igreja).then((results3) => {
                        let funcoes_usuarios = results3;
                        for (let i = 0; i < members.length; i++) {
                            members[i].funcoes_usuario = funcoes_usuarios.filter(funcao => {
                                if (funcao.id_usuario == members[i].id_usuario) {
                                    return funcao.id_usuario;
                                }
                            })
                        }
                        result.object = members;
                        result.size = members.length;
                        resolve(result);
                    })
                })
            })
            .catch((error2) => {
                reject(error2);
            })
        })
    },
    retornaTags: function (id_igreja) {
        return new Promise((resolve, reject) => {
            this.executeSQL(`
                SELECT
                    *
                FROM 
                    tags_usuario tg
                LEFT JOIN
                    tags_igreja ti
                ON
                    tg.tags_usuario_id_tag_referencia = ti.id_tag
                WHERE
                    tg.tags_usuario_id_igreja = ?`, [id_igreja])
            .then((results) => {
                let ocupacoes = results.map(tag => {
                    return {
                        id_tag: tag.id_tag,
                        nome_tag: tag.nome_tag,
                        id_usuario: tag.tags_usuario_id_usuario
                    }
                })
                resolve(ocupacoes);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    retornaFuncoes: function (id_igreja) {
        return new Promise((resolve, reject) => {
            this.executeSQL(`
                SELECT
                    *
                FROM 
                    funcoes_usuario fu
                INNER JOIN
                    funcoes_igreja fi
                ON
                    fi.id_funcoes_igreja = fu.id_funcoes_referencia
                WHERE
                    fu.id_funcoes_igreja_id_igreja = ?
            `, [id_igreja])
            .then((results) => {
                let funcoesUsuarios = results.map(funcao => {
                    return {
                        nome_funcao: funcao.nome_funcao,
                        id_usuario: funcao.id_funcoes_igreja_id_usuario,
                        id_igreja: id_igreja,
                        id_funcao: funcao.id_funcoes_referencia
                    }
                })
                resolve(funcoesUsuarios);
            })
            .catch((error) => {
                reject(error);
            })
        })
    }
}

module.exports = functions;