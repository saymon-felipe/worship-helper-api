const functions = require("../functions/functions.js");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let usuarioService = {
    returnUser: function (user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL("SELECT * FROM usuario WHERE id_usuario = ?", [user_id])
            .then((results) => {
                if (results.length <= 0) {
                    reject("Nenhum usuário com esse id foi encontrado");
                }

                let usuario = {
                    id_usuario: results[0].id_usuario,
                    nome_usuario: results[0].nome_usuario,
                    descricao_usuario: results[0].descricao_usuario,
                    imagem_usuario: results[0].imagem_usuario,
                    app_owner: results[0].app_owner
                }
                
                resolve(usuario);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    findUsers: function (searchString) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                select 
                    nome_usuario,
                    id_usuario,
                    imagem_usuario,
                    email_usuario,
                    descricao_usuario
                from usuario
                where nome_usuario like '%${searchString}%'
            `)
            .then((results) => {
                if (results.length == 0) {
                    reject("Nenhum usuário encontrado com os critérios informados");
                }

                let lista_de_usuarios = results.map(users => {
                    return {
                        nome_usuario: users.nome_usuario,
                        id_usuario: users.id_usuario,
                        imagem_usuario: users.imagem_usuario,
                        email_usuario: users.email_usuario,
                        descricao_usuario: users.descricao_usuario
                    }
                })

                resolve(lista_de_usuarios);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    myChurches: function (user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                SELECT 
                    igreja.id_igreja,
                    igreja.nome_igreja,
                    igreja.imagem_igreja,
                    igreja.usuario_administrador,
                    CASE WHEN 
                        ? = igreja.usuario_administrador THEN true
                    ELSE
                        false
                    END as administrador
                FROM 
                    igreja
                LEFT JOIN
                    metadados
                ON
                    metadados.tipo_metadado = 'membro'
                WHERE
                    igreja.id_igreja = metadados.metadados_id_igreja 
                AND
                    metadados.metadados_id_usuario = ?
                AND
                    metadados.confirmacao = 1
            `, 
            [user_id, user_id, user_id])
            .then((results) => {
                
                let lista_igrejas = results.map(igreja => {
                    return {
                        id_igreja: igreja.id_igreja,
                        nome_igreja: igreja.nome_igreja,
                        imagem_igreja: igreja.imagem_igreja,
                        membros: [],
                        quantidade_membros: 0,
                        administrador: igreja.usuario_administrador
                    }
                })

                if (lista_igrejas.length == 0) {
                    resolve(lista_igrejas);
                }

                for (let i = 0; i < lista_igrejas.length; i++) {
                    functions.returnChurchMembers(lista_igrejas[i].id_igreja).then((results2) => {
                        lista_igrejas[i].membros = results2.object;
                        lista_igrejas[i].quantidade_membros = results2.size;

                        if (i == lista_igrejas.length - 1) {
                            resolve(lista_igrejas);
                        }
                    })
                    .catch((error2) => {
                        reject(error2);
                    })
                }
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    register: function (user_name, user_email, user_password) {
        return new Promise((resolve, reject) => {
            functions.executeSQL('select * from usuario where email_usuario = ?', [user_email])
            .then((results) => {
                if (results.length > 0) {
                    reject("Usuário já cadastrado");
                } else {
                    bcrypt.hash(user_password.toString(), 10, (errBcrypt, hash) => {
                        if (errBcrypt) {
                            reject(errBcrypt); 
                        }

                        functions.executeSQL(
                            `INSERT INTO
                                usuario
                                (nome_usuario, email_usuario, senha_usuario, descricao_usuario, imagem_usuario)
                            VALUES
                                (?, ?, ?, ?, ?)`,
                                [user_name, user_email, hash, "", process.env.URL_API + "/public/default-user-image.png"])
                        .then((results2) => {
                            let usuario_criado = {
                                id_usuario: results2.insertId,
                                nome_usuario: user_name,
                                email_usuario: user_email
                            }

                            resolve(usuario_criado);
                        })
                        .catch((error2) => {
                            reject(error2);
                        })
                    })
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    login: function (user_email, user_password) {
        return new Promise((resolve, reject) => {
            functions.executeSQL('SELECT * FROM usuario WHERE email_usuario = ?', [user_email]).then((results) => {
                if (results.length < 1) {
                    reject("Falha na autenticação");
                }

                bcrypt.compare(user_password.toString(), results[0].senha_usuario, (errBcrypt, resultBcrypt) => {
                    if (errBcrypt) {
                        reject(errBcrypt);
                    }

                    if (resultBcrypt) {
                        const token = jwt.sign({
                            id_usuario: results[0].id_usuario,
                            nome_usuario: results[0].nome_usuario,
                            email_usuario: results[0].email_usuario
                        }, process.env.JWT_KEY, {
                            expiresIn: "8h"
                        })

                        resolve(token);
                    }
                })
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    rejectInvite: function (company_id, user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL('DELETE FROM metadados WHERE metadados_id_igreja = ? AND metadados_id_usuario = ? AND tipo_metadado = "membro" AND confirmacao = 0', [company_id, user_id])
            .then((results) => {
                if (results.length <= 0) {
                    reject("Não existem convites para serem excluídos");
                } else {
                    resolve();
                }
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    acceptInvite: function (company_id, user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL('UPDATE metadados SET confirmacao = 1, data_confirmacao = CURRENT_TIMESTAMP() WHERE confirmacao = 0 AND tipo_metadado = "membro" AND metadados_id_igreja = ? AND metadados_id_usuario = ?', [company_id, user_id])
            .then((results) => {
                if (results.length <= 0) {
                    reject("Não existem convites para serem aceitos");
                }
                
                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    returnInvites: function (user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                SELECT
                    *
                FROM
                    metadados
                INNER JOIN
                    igreja
                ON 
                    igreja.id_igreja = metadados.metadados_id_igreja
                WHERE
                    metadados.metadados_id_usuario = ?
                AND 
                    metadados.confirmacao = 0
                AND 
                    metadados.tipo_metadado = "membro";
            `, [user_id])
            .then((results) => {
                let object = results.map(invite => {
                    return {
                        id_igreja: invite.metadados_id_igreja,
                        nome_igreja: invite.nome_igreja,
                        imagem_igreja: invite.imagem_igreja,
                        id_metadado: invite.id_metadado,
                        confirmacao: invite.confirmacao,
                        tipo_metadado: invite.tipo_metadado
                    }
                })

                for (let i = 0; i < object.length; i++) {
                    let current_object = object[i];

                    functions.returnChurchMembers(current_object.id_igreja, true).then((results2) => {
                        current_object.membros = results2.size;

                        if (i == object.length - 1) {
                            resolve(object);
                        }
                    })
                    .catch((error2) => {
                        reject(error2);
                    })
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    updateBio: function (new_bio, user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL("UPDATE usuario SET descricao_usuario = ? WHERE id_usuario = ?",
            [new_bio, user_id])
            .then((results) => {
                resolve(new_bio);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    removeImage: function (user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL("SELECT imagem_usuario FROM usuario WHERE id_usuario = ?",
            [user_id])
            .then((results) => {
                let photo_url = results[0].imagem_usuario.split("/")[3];

                uploadConfig.deleteFromS3(photo_url);

                functions.executeSQL("update usuario set imagem_usuario = ? where id_usuario = ?",
                [process.env.URL_API + "/public/default-user-image.png", user_id])
                .then((results2) => {
                    if (results2.changedRows != 0) {
                        resolve();
                    } else {
                        resolve("Nenhuma alteração feita");
                    }
                })
                .catch((error2) => {
                    reject(error2);
                })
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    setImage: function (file_path, user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL("update usuario set imagem_usuario = ? where id_usuario = ?",
            [file_path, user_id])
            .then((results) => {
                if (results.changedRows != 0) {
                    resolve();
                } else {
                    reject("Nenhum usuario com esse id");
                }
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    changeTag: function (user_id, company_id, tag_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                SELECT
                    *
                FROM
                    tags_usuario
                WHERE
                    tags_usuario_id_usuario = ?
                AND 
                    tags_usuario_id_igreja = ?
            `, [user_id, company_id])
            .then((results) => {
                if (results.length == 0) {
                    functions.executeSQL(`
                        INSERT INTO
                            tags_usuario
                            (tags_usuario_id_igreja, tags_usuario_id_usuario, tags_usuario_id_tag_referencia)
                        VALUES
                            (?, ?, ?)
                    `, [company_id, user_id, tag_id])
                    .then((results2) => {
                        resolve();
                    }).catch((error2) => {
                        reject(error2);
                    })
                } else {
                    functions.executeSQL(`
                        UPDATE
                            tags_usuario
                        SET
                            tags_usuario_id_tag_referencia = ?
                        WHERE
                            tags_usuario_id_igreja = ?
                        AND
                            tags_usuario_id_usuario = ?
                    `, [tag_id, company_id, user_id])
                    .then((results2) => {
                        resolve();
                    })
                    .catch((error2) => {
                        reject(error2);
                    })
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    newFunctions: function (user_id, company_id, new_functions) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                DELETE FROM
                    funcoes_usuario
                WHERE
                    id_funcoes_igreja_id_usuario = ?
                AND 
                    id_funcoes_igreja_id_igreja = ?
            `, [user_id, company_id])
            .then((results) => {
                for (let i = 0; i < new_functions.length; i++) {
                    functions.executeSQL(`
                        INSERT INTO
                            funcoes_usuario
                            (id_funcoes_igreja_id_igreja, id_funcoes_igreja_id_usuario, id_funcoes_referencia)
                        VALUES
                            (?, ?, ?)
                    `, [company_id, user_id, new_functions[i]])
                    .then((results2) => {
                        if (i == new_functions.length - 1) {
                            resolve();
                        }
                    }).catch((error2) => {
                        reject(error2);
                    })
                } 
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    checkJwt: function (user_id, tokenParam) {
        return new Promise((resolve, reject) => {
            functions.executeSQL("SELECT * FROM usuario WHERE id_usuario = ?",
            [user_id])
            .then((results) => {
                if (results.length <= 0) {
                    reject("Usuário não encontrado");
                }
                
                let token = tokenParam.split(" ")[1];
                jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
                    if (err) {
                        reject("Token inválido");
                    } else {
                        let newToken = jwt.sign({
                            id_usuario: results[0].id_usuario,
                            nome_usuario: results[0].nome_usuario,
                            email_usuario: results[0].email_usuario
                        }, process.env.JWT_KEY, {expiresIn: "8h"});

                        resolve(newToken);
                    }
                })
            }).catch((error) => {
                reject(error);
            })
        })
    }
}

module.exports = usuarioService;