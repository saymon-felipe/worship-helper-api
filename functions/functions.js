let mysql = require("../mysql.js").pool;

let functions = {
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
                    ${only_size ? 'count(u.id_usuario)' : "*"}
                FROM 
                    usuario u
                LEFT JOIN
                    membros_igreja mi
                ON
                    mi.id_usuario = u.id_usuario 
                WHERE
                    mi.id_igreja = ?`,
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
    },
    returnFormattedMusics: function (musics) {
        return new Promise((resolve, reject) => {
            let musicList = musics.map(music => {
                return {
                    id: music.id_musica,
                    name: music.nome_musica,
                    artist: music.artista_musica,
                    video_url: music.video_url,
                    cipher_url: music.cifra_url,
                    image: music.imagem,
                    video_id: music.video_id,
                    tags: []
                }
            })

            let promises = [];
            let musicsTags = [];
    
            for (let i = 0; i < musicList.length; i++) {
                promises.push(
                    functions.executeSQL(
                        `
                            SELECT
                                tm.tag_id_musica,
                                tm.id_tag_referencia,
                                ltm.nome_tag
                            FROM
                                tags_de_musicas tm
                            INNER JOIN
                                lista_tags_musicas ltm
                            ON
                                ltm.id_tag_musicas = tm.id_tag_referencia
                            WHERE
                                tag_id_musica = ?
                        `, [musicList[i].id]
                    ).then((results) => {
                        musicsTags.push(results);
                    })
                )
            }
    
            Promise.all(promises).then(() => {
                for (let i = 0; i < musicList.length; i++) {
                    for (let j = 0; j < musicsTags.length; j++) {
                        if (musicsTags[j].length > 0 && musicsTags[j][0].tag_id_musica == musicList[i].id) {
                            let tags = musicsTags[j].map(tag => {
                                return {
                                    id: tag.id_tag_referencia,
                                    nome: tag.nome_tag
                                }
                            })
                            musicList[i].tags = tags;
                        }
                    }
                }

                resolve(musicList);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    dateToDB: function (date) {
        let partsData = date.split('-');
        let year = partsData[0];
        let month = partsData[1];
        let day = partsData[2];

        let formattedDate = year + '-' + month + '-' + day;

        return formattedDate;
    }
}

module.exports = functions;