const functions = require("../functions/functions.js");

const GOOGLE_API_URL = "https://www.googleapis.com/youtube/v3/search";
const GOOGLE_VIDEO_DETAILS_URL = "https://www.googleapis.com/youtube/v3/videos";

function getYoutubeApiKey() {
    return process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY || "";
}

function createApiError(message, status = 500) {
    return {
        message,
        status
    };
}

function parseDuration(isoDuration) {
    if (!isoDuration) {
        return 0;
    }

    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    if (!match) {
        return 0;
    }

    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);

    return (hours * 3600) + (minutes * 60) + seconds;
}

async function requestYoutubeJson(url, params) {
    const requestUrl = new URL(url);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
            requestUrl.searchParams.set(key, value);
        }
    });

    const response = await fetch(requestUrl);

    if (!response.ok) {
        const error = new Error(`Youtube request failed with status ${response.status}`);
        error.status = response.status;
        error.payload = await response.text();
        throw error;
    }

    return response.json();
}

let musicService = {
    searchMusic: async function (name, artist) {
        const youtubeApiKey = getYoutubeApiKey();

        if (!youtubeApiKey) {
            throw createApiError("YOUTUBE_API_KEY ou YOUTUBE_DATA_API_KEY nao configurada.", 500);
        }

        const searchQuery = `${name} - ${artist} official audio`;

        try {
            const searchData = await requestYoutubeJson(GOOGLE_API_URL, {
                part: "snippet",
                q: searchQuery,
                type: "video",
                maxResults: 5,
                order: "relevance",
                key: youtubeApiKey
            });

            const items = Array.isArray(searchData.items) ? searchData.items : [];

            if (items.length === 0) {
                return [];
            }

            const videoIds = items
                .map((item) => item.id && item.id.videoId)
                .filter(Boolean)
                .join(",");

            const durationsMap = {};

            if (videoIds) {
                try {
                    const detailsData = await requestYoutubeJson(GOOGLE_VIDEO_DETAILS_URL, {
                        part: "contentDetails",
                        id: videoIds,
                        key: youtubeApiKey
                    });

                    const detailItems = Array.isArray(detailsData.items) ? detailsData.items : [];

                    detailItems.forEach((item) => {
                        durationsMap[item.id] = parseDuration(item.contentDetails && item.contentDetails.duration);
                    });
                } catch (detailsError) {
                    console.warn("[MusicService] Falha ao buscar duracoes no YouTube:", detailsError.message);
                }
            }

            return items.map((item) => {
                const thumbnails = item.snippet && item.snippet.thumbnails ? item.snippet.thumbnails : {};
                const thumbnail =
                    (thumbnails.high && thumbnails.high.url) ||
                    (thumbnails.medium && thumbnails.medium.url) ||
                    (thumbnails.default && thumbnails.default.url) ||
                    "";

                return {
                    title: item.snippet.title,
                    videoId: item.id.videoId,
                    publishedAt: item.snippet.publishedAt,
                    url: "https://youtube.com/watch?v=" + item.id.videoId,
                    videoThumbnail: thumbnail,
                    channelTitle: item.snippet.channelTitle,
                    duration_seconds: durationsMap[item.id.videoId] || 0
                };
            });
        } catch (error) {
            if (error.status === 403) {
                throw createApiError("Cota diaria do YouTube excedida ou chave invalida.", 429);
            }

            if (error.status === 400) {
                throw createApiError("Busca do YouTube malformada.", 400);
            }

            console.error("[MusicService] Erro ao consultar o YouTube:", error.message);
            throw createApiError("Falha na comunicacao com o YouTube.", 502);
        }
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
                        LOWER(nome_musica) = "${name.toLowerCase()}" AND LOWER(artista_musica) = "${artist.toLowerCase()}"
                `, []
            ).then((results) => {
                if (results.length > 0) {
                    reject("Musica ja cadastrada no banco de dados");
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
                reject("Mensagem e muito grande, limite de 100 caracteres");
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
                    reject("Nao foi possivel publicar o comentario");
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
                    reject("Ocorreu um erro ao curtir o comentario");
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
