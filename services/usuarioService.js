const functions = require("../functions/functions.js");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const _churchService = require("./churchService.js");
const uploadConfig = require("../config/upload.js");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function createUserToken(user) {
    return jwt.sign({
        id_usuario: user.id_usuario,
        nome_usuario: user.nome_usuario,
        email_usuario: user.email_usuario,
        app_owner: Boolean(user.app_owner)
    }, process.env.JWT_KEY, {
        expiresIn: JWT_EXPIRES_IN
    });
}

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
                    email_usuario: results[0].email_usuario,
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
                    COUNT(membros_totais.id_usuario) AS quantidade_membros,
                    CASE WHEN 
                        ? = igreja.usuario_administrador THEN true
                    ELSE
                        false
                    END as administrador
                FROM 
                    igreja
                INNER JOIN
                    membros_igreja membros_usuario
                LEFT JOIN
                    membros_igreja membros_totais
                ON
                    membros_totais.id_igreja = igreja.id_igreja
                WHERE
                    igreja.id_igreja = membros_usuario.id_igreja 
                AND
                    membros_usuario.id_usuario = ?
                GROUP BY
                    igreja.id_igreja,
                    igreja.nome_igreja,
                    igreja.imagem_igreja,
                    igreja.usuario_administrador
            `, 
            [user_id, user_id])
            .then((results) => {
                
                let lista_igrejas = results.map(igreja => {
                    return {
                        id_igreja: igreja.id_igreja,
                        nome_igreja: igreja.nome_igreja,
                        imagem_igreja: igreja.imagem_igreja,
                        membros: [],
                        quantidade_membros: Number(igreja.quantidade_membros || 0),
                        administrador: igreja.administrador
                    }
                })

                resolve(lista_igrejas);
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

                            functions.executeSQL(`
                                UPDATE convites_membros_igreja
                                SET id_usuario_requisitado = ?
                                WHERE id_usuario_requisitado IS NULL
                                AND LOWER(email_usuario_requisitado) = LOWER(?)
                                AND data_confirmacao IS NULL
                            `, [results2.insertId, user_email]).then(() => {
                                // Save lead to database
                                functions.executeSQL(
                                `INSERT INTO leads 
                                    (nome, email, telefone, origem, tipo_equipe, nome_igreja) 
                                 VALUES 
                                    (?, ?, NULL, 'app_cadastro', NULL, NULL)`,
                                [user_name, user_email]
                            ).then(() => {
                                console.log(`[LEADS] Registration lead saved for: ${user_email}`);
                            }).catch((err) => {
                                console.error('[LEADS ERROR] Failed to save app registration lead to database:', err);
                            });

                                resolve(usuario_criado);
                            }).catch((error3) => {
                                reject(error3);
                            });
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
                    return;
                }

                bcrypt.compare(user_password.toString(), results[0].senha_usuario, (errBcrypt, resultBcrypt) => {
                    if (errBcrypt) {
                        reject(errBcrypt);
                        return;
                    }

                    if (resultBcrypt) {
                        resolve(createUserToken(results[0]));
                    } else {
                        reject("Falha na autenticação");
                    }
                })
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    createPasswordResetToken: async function (user_email) {
        const normalizedEmail = String(user_email || "").trim().toLowerCase();
        const users = await functions.executeSQL(`
            SELECT id_usuario, nome_usuario, email_usuario
            FROM usuario
            WHERE LOWER(email_usuario) = ?
            LIMIT 1
        `, [normalizedEmail]);

        if (users.length <= 0) {
            return null;
        }

        const user = users[0];
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        await functions.executeSQL("DELETE FROM password_reset_tokens WHERE id_usuario = ?", [user.id_usuario]);
        await functions.executeSQL(`
            INSERT INTO password_reset_tokens (id_usuario, token_hash, expires_at)
            VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE))
        `, [user.id_usuario, tokenHash]);

        return {
            email_usuario: user.email_usuario,
            nome_usuario: user.nome_usuario,
            token
        };
    },
    resetPassword: async function (user_email, token, new_password) {
        const normalizedEmail = String(user_email || "").trim().toLowerCase();
        const tokenHash = crypto.createHash("sha256").update(String(token || "")).digest("hex");
        const tokens = await functions.executeSQL(`
            SELECT prt.id, prt.id_usuario
            FROM password_reset_tokens prt
            INNER JOIN usuario u ON u.id_usuario = prt.id_usuario
            WHERE prt.token_hash = ?
              AND LOWER(u.email_usuario) = ?
              AND prt.used_at IS NULL
              AND prt.expires_at > CURRENT_TIMESTAMP()
            LIMIT 1
        `, [tokenHash, normalizedEmail]);

        if (tokens.length <= 0) {
            throw new Error("Este link é inválido ou expirou. Solicite uma nova redefinição de senha.");
        }

        const resetToken = tokens[0];
        const consumeResult = await functions.executeSQL(`
            UPDATE password_reset_tokens
            SET used_at = CURRENT_TIMESTAMP()
            WHERE id = ? AND used_at IS NULL
        `, [resetToken.id]);

        if (consumeResult.affectedRows <= 0) {
            throw new Error("Este link já foi utilizado. Solicite uma nova redefinição de senha.");
        }

        const passwordHash = await bcrypt.hash(String(new_password), 10);
        await functions.executeSQL("UPDATE usuario SET senha_usuario = ? WHERE id_usuario = ?", [passwordHash, resetToken.id_usuario]);
    },
    rejectInvite: function (company_id, user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    DELETE FROM 
                        convites_membros_igreja
                    WHERE
                        id_igreja = ?
                    AND
                        id_usuario_requisitado = ?
                `, [company_id, user_id]
            ).then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    acceptInvite: async function (company_id, user_id) {
        const invites = await functions.executeSQL(
            `
                SELECT
                    id,
                    id_usuario_requisitante
                FROM
                    convites_membros_igreja
                WHERE
                    id_igreja = ?
                AND
                    id_usuario_requisitado = ?
                AND
                    data_confirmacao IS NULL
                LIMIT 1
            `,
            [company_id, user_id]
        );

        if (invites.length <= 0) {
            throw "Convite não encontrado";
        }

        await _churchService.addMember(company_id, user_id);

        await functions.executeSQL(
            `
                DELETE FROM
                    convites_membros_igreja
                WHERE
                    id = ?
            `,
            [invites[0].id]
        );

        return {
            id_usuario_requisitante: invites[0].id_usuario_requisitante
        };
    },
    returnInvites: function (user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    SELECT
                        cmi.*,
                        i.*
                    FROM
                        convites_membros_igreja cmi
                    INNER JOIN
                        igreja i
                    ON
                        i.id_igreja = cmi.id_igreja
                    WHERE
                        cmi.id_usuario_requisitado = ?
                    AND
                        cmi.data_confirmacao IS NULL
                `, [user_id]
            ).then((results) => {
                if (results.length == 0) {
                    resolve(results);
                }

                let object = results.map(invite => {
                    return {
                        id_igreja: invite.id_igreja,
                        nome_igreja: invite.nome_igreja,
                        imagem_igreja: invite.imagem_igreja
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
                    reject("Nenhum usuário com esse id");
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
            .then(() => {
                if (new_functions.length == 0) {
                    resolve();
                }

                for (let i = 0; i < new_functions.length; i++) {
                    functions.executeSQL(`
                        INSERT INTO
                            funcoes_usuario
                            (id_funcoes_igreja_id_igreja, id_funcoes_igreja_id_usuario, id_funcoes_referencia)
                        VALUES
                            (?, ?, ?)
                    `, [company_id, user_id, new_functions[i]])
                    .then(() => {
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
    issueTokenForUser: async function (user_id) {
        const users = await functions.executeSQL("SELECT * FROM usuario WHERE id_usuario = ?", [user_id]);
        if (users.length <= 0) {
            throw new Error("Usuário não encontrado");
        }
        return createUserToken(users[0]);
    },
    refreshJwt: function (user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL("SELECT * FROM usuario WHERE id_usuario = ?",
            [user_id])
            .then((results) => {
                if (results.length <= 0) {
                    reject("Usuário não encontrado");
                    return;
                }
                
                resolve(createUserToken(results[0]));
            }).catch((error) => {
                reject(error);
            })
        })
    }
}

module.exports = usuarioService;
