const functions = require("../functions/functions.js");
const { google } = require('googleapis');

const API_KEY = process.env.YOUTUBE_DATA_API_KEY;

const youtube = google.youtube({
    version: 'v3',
    auth: API_KEY
  });

let musicService = {
    searchMusic: function (name, artist) {
        return new Promise((resolve, reject) => {
            
            let searchQuery = `${name} - ${artist} official audio`;

            youtube.search.list({
                part: 'snippet',
                q: searchQuery,
                maxResults: 5,
                type: 'video',
                order: 'relevance'
            }).then((response) => {
                const videos = response.data.items.map(item => ({
                    title: item.snippet.title,
                    videoId: item.id.videoId,
                    publishedAt: item.snippet.publishedAt,
                    url: "https://youtube.com/watch?v=" + item.id.videoId,
                    videoThumbnail: item.snippet.thumbnails.default.url
                }));

                resolve(videos);
            })
        })
    },
    insertMusicTags: function (music_id, music_tags) {
        return new Promise((resolve, reject) => {
            let promises = [];

            for (let i = 0; i < music_tags.length; i++) {
                promises.push(
                    functions.executeSQL(
                        `
                            INSERT INTO
                                tags_de_musicas
                                (tag_id_musica, id_tag_referencia)
                            VALUES
                                (?, ?)
                        `, [music_id, music_tags[i].id]
                    )
                )
            }

            Promise.all(promises).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    createMusic: function (name, artist, video_url, cipher_url, thumbnail, music_tags) {
        return new Promise((resolve, reject) => {
            let self = this;

            functions.executeSQL(
                `
                    SELECT
                        *
                    FROM
                        musicas
                    WHERE
                        nome_musica LIKE "%?%"
                `, [name]
            ).then((results) => {
                if (results.length > 0) {
                    reject("Música já cadastrada no banco de dados");
                } else {
                    functions.executeSQL(
                        `
                            INSERT INTO
                                musicas
                                (nome_musica, artista_musica, video_url, cifra_url, imagem, video_id)
                            VALUES
                                (?, ?, ?, ?, ?, ?)
                        `, [name, artist, video_url, cipher_url, thumbnail, video_url.split("?v=")[1]]
                    ).then((results) => {
                        self.insertMusicTags(results.insertId, music_tags).then(() => {
                            resolve();
                        })
                    }).catch((error) => {
                        reject(error);
                    })
                }
            })
        })
    },
    returnMusics: function () {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    SELECT
                        m.*
                    FROM
                        musicas m
                `
            ).then((results) => {
                functions.returnFormattedMusics(results).then((results2) => {
                    resolve(results2);
                }).catch((error) => {
                    reject(error);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnMusic: function (music_id, event_id = 0) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    SELECT
                        m.*,
                        (
                            SELECT
                                t.nome
                            FROM
                                tons t
                            INNER JOIN
                                musicas_eventos me
                            ON
                                me.tom = t.id
                            WHERE
                                me.id_musica = m.id_musica
                        ) AS tom
                    FROM
                        musicas m
                    WHERE
                        m.id_musica = ?
                `, [music_id]
            ).then((results) => {
                console.log(results)
                functions.returnFormattedMusics(results).then((results2) => {
                    resolve(results2[0]);
                }).catch((error) => {
                    reject(error);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnMusicComments: function (music_id, user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(`
                SELECT
                    *,
                    (
                        SELECT
                            count(*)
                        FROM 
                            curtidas_comentarios_musicas
                        WHERE
                            id_comentario = cm.id
                    ) as quantidade_curtidas,
                    CASE WHEN 
                        (
                            SELECT
                                count(*)
                            FROM 
                                curtidas_comentarios_musicas
                            WHERE
                                id_comentario = cm.id
                            AND
                                id_usuario = ?
                        ) 
                    THEN 
                        1
                    ELSE
                        0
                    END as current_user_liked
                FROM
                    comentarios_musica cm
                INNER JOIN
                    usuario u
                ON
                    cm.id_usuario = u.id_usuario
                WHERE
                    cm.id_musica = ?
            `, [user_id, music_id])
            .then((results) => {
                let comentarios = results.map((comment) => {
                    return {
                        id_aviso: comment.id,
                        id_igreja: null,
                        mensagem: comment.mensagem,
                        data_criacao: comment.data_criacao,
                        quantidade_curtidas: comment.quantidade_curtidas,
                        usuario_atual_curtiu: comment.current_user_liked,
                        criador: {
                            id_usuario: comment.id_usuario,
                            nome_usuario: comment.nome_usuario,
                            imagem_usuario: comment.imagem_usuario
                        }
                    }
                })

                resolve(comentarios);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    postMusicComment: function (message, user_id, music_id) {
        return new Promise((resolve, reject) => {
            if (message.length > 100) {
                reject("Mensagem é muito grande, limite de 100 caracteres");
            }

            functions.executeSQL(`
                INSERT INTO
                    comentarios_musica
                    (id_musica, id_usuario, mensagem)
                VALUES
                    (?, ?, ?)
            `, [music_id, user_id, message])
            .then((results) => {
                if (results.affectedRows <= 0) {
                    reject("Não foi possível publicar o comentário");
                }

                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    likeComment: function (id_comment, user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    INSERT INTO
                        curtidas_comentarios_musicas
                        (id_usuario, id_comentario)
                    VALUES
                        (?, ?)
                `, [user_id, id_comment]
            ).then((results) => {
                if (results.affectedRows <= 0) {
                    reject("Ocorreu um erro ao curtir o comentário");
                }

                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    returnMusicTagsList: function () {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    SELECT
                        id_tag_musicas AS id,
                        nome_tag AS nome
                    FROM
                        lista_tags_musicas
                `, []
            ).then((results) => {
                resolve(results);
            })
            .catch((error) => {
                reject(error);
            })
        })
    }
}

module.exports = musicService;