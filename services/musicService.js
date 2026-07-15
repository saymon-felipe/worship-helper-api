const zlib = require("zlib");
const functions = require("../functions/functions.js");
const ciphers = require("../functions/cyphers.js");

const GOOGLE_API_URL = "https://www.googleapis.com/youtube/v3/search";
const GOOGLE_VIDEO_DETAILS_URL = "https://www.googleapis.com/youtube/v3/videos";

function getYoutubeApiKey() {
    return process.env.YOUTUBE_API_KEY;
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

function extractYoutubeVideoId(videoUrl) {
    try {
        const url = new URL(videoUrl);

        if (url.hostname.includes("youtu.be")) {
            return url.pathname.replace("/", "");
        }

        return url.searchParams.get("v") || "";
    } catch {
        return "";
    }
}

function compressCipherText(text) {
    if (!text) {
        return null;
    }

    return zlib.gzipSync(Buffer.from(text, "utf8"));
}

function decompressCipherText(content, encoding) {
    if (!content) {
        return "";
    }

    if (encoding === "gzip") {
        return zlib.gunzipSync(content).toString("utf8");
    }

    return Buffer.from(content).toString("utf8");
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
            throw createApiError("YOUTUBE_API_KEY não configurada.", 500);
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
    createMusic: async function (name, artist, video_url, cipher_url, cipher_title, thumbnail, music_tags) {
        const results = await functions.executeSQL(
            `
                SELECT
                    id_musica
                FROM
                    musicas
                WHERE
                    LOWER(nome_musica) = ? AND LOWER(artista_musica) = ?
            `,
            [name.toLowerCase(), artist.toLowerCase()]
        );

        if (results.length > 0) {
            throw "Musica ja cadastrada no banco de dados";
        }

        const videoId = extractYoutubeVideoId(video_url);

        if (!videoId) {
            throw "URL do video invalida";
        }

        const cipherContent = await ciphers.scrapeCifraContent(cipher_url);
        const compressedCipher = compressCipherText(cipherContent.text);
        const resolvedCipherTitle = cipher_title || cipherContent.title || "";

        const inserted = await functions.executeSQL(
            `
                INSERT INTO
                    musicas
                    (nome_musica, artista_musica, video_url, cifra_url, cifra_titulo, cifra_conteudo, cifra_encoding, imagem, video_id)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [name, artist, video_url, cipher_url, resolvedCipherTitle, compressedCipher, "gzip", thumbnail, videoId]
        );

        await this.insertMusicTags(inserted.insertId, music_tags);
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
                            AND
                                (? = 0 OR me.id_evento = ?)
                            LIMIT 1
                        ) AS tom
                    FROM
                        musicas m
                    WHERE
                        m.id_musica = ?
                `, [event_id, event_id, music_id]
            ).then((results) => {
                functions.returnFormattedMusics(results).then((results2) => {
                    if (!results2[0]) {
                        resolve(results2[0]);
                        return;
                    }

                    results2[0].cipher_text = decompressCipherText(results[0].cifra_conteudo, results[0].cifra_encoding);
                    results2[0].cipher_title = results[0].cifra_titulo || "";
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
                        parent_id: comment.parent_id,
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
    postMusicComment: function (message, user_id, music_id, parent_id = null) {
        return new Promise((resolve, reject) => {
            if (message.length > 100) {
                reject("Mensagem e muito grande, limite de 100 caracteres");
            }

            functions.executeSQL(`
                INSERT INTO
                    comentarios_musica
                    (id_musica, id_usuario, mensagem, parent_id)
                VALUES
                    (?, ?, ?, ?)
            `, [music_id, user_id, message, parent_id])
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
    eventHasMusic: async function (event_id, music_id, church_id) {
        const results = await functions.executeSQL(`
            SELECT
                me.id
            FROM
                musicas_eventos me
            INNER JOIN
                eventos e
            ON
                e.id = me.id_evento
            WHERE
                me.id_evento = ?
            AND
                me.id_musica = ?
            AND
                e.id_igreja = ?
            LIMIT 1
        `, [event_id, music_id, church_id]);

        return results.length > 0;
    },
    returnEventMusicComments: async function (music_id, event_id, user_id) {
        const results = await functions.executeSQL(`
            SELECT
                cme.*,
                u.nome_usuario,
                u.imagem_usuario,
                (
                    SELECT
                        count(*)
                    FROM
                        curtidas_comentarios_musicas_eventos ccme
                    WHERE
                        ccme.id_comentario = cme.id
                ) as quantidade_curtidas,
                CASE WHEN
                    (
                        SELECT
                            count(*)
                        FROM
                            curtidas_comentarios_musicas_eventos ccme
                        WHERE
                            ccme.id_comentario = cme.id
                        AND
                            ccme.id_usuario = ?
                    )
                THEN
                    1
                ELSE
                    0
                END as current_user_liked
            FROM
                comentarios_musicas_eventos cme
            INNER JOIN
                usuario u
            ON
                cme.id_usuario = u.id_usuario
            WHERE
                cme.id_musica = ?
            AND
                cme.id_evento = ?
        `, [user_id, music_id, event_id]);

        return results.map((comment) => {
            return {
                id_aviso: comment.id,
                id_igreja: null,
                mensagem: comment.mensagem,
                data_criacao: comment.data_criacao,
                parent_id: comment.parent_id,
                quantidade_curtidas: comment.quantidade_curtidas,
                usuario_atual_curtiu: comment.current_user_liked,
                criador: {
                    id_usuario: comment.id_usuario,
                    nome_usuario: comment.nome_usuario,
                    imagem_usuario: comment.imagem_usuario
                }
            }
        });
    },
    postEventMusicComment: async function (message, user_id, music_id, event_id, parent_id = null) {
        if (message.length > 100) {
            throw "Mensagem e muito grande, limite de 100 caracteres";
        }

        const result = await functions.executeSQL(`
            INSERT INTO
                comentarios_musicas_eventos
                (id_evento, id_musica, id_usuario, mensagem, parent_id)
            VALUES
                (?, ?, ?, ?, ?)
        `, [event_id, music_id, user_id, message, parent_id]);

        if (result.affectedRows <= 0) {
            throw "Nao foi possivel publicar o comentario";
        }
    },
    likeEventMusicComment: async function (id_comment, user_id) {
        const result = await functions.executeSQL(
            `
                INSERT INTO
                    curtidas_comentarios_musicas_eventos
                    (id_usuario, id_comentario)
                VALUES
                    (?, ?)
            `, [user_id, id_comment]
        );

        if (result.affectedRows <= 0) {
            throw "Ocorreu um erro ao curtir o comentario";
        }
    },
    updateEventMusicComment: async function (id_comment, user_id, message) {
        const results = await functions.executeSQL(`
            SELECT
                id_usuario
            FROM
                comentarios_musicas_eventos
            WHERE
                id = ?
        `, [id_comment]);

        const isOwner = results.length > 0 && Number(results[0].id_usuario) === Number(user_id);
        if (!isOwner) {
            throw "Acesso negado";
        }

        await functions.executeSQL(`
            UPDATE
                comentarios_musicas_eventos
            SET
                mensagem = ?
            WHERE
                id = ?
        `, [message, id_comment]);
    },
    deleteEventMusicComment: async function (id_comment, user_id) {
        const results = await functions.executeSQL(`
            SELECT
                id_usuario
            FROM
                comentarios_musicas_eventos
            WHERE
                id = ?
        `, [id_comment]);

        const isOwner = results.length > 0 && Number(results[0].id_usuario) === Number(user_id);
        if (!isOwner) {
            throw "Acesso negado";
        }

        await functions.executeSQL(`
            DELETE FROM
                comentarios_musicas_eventos
            WHERE
                id = ?
        `, [id_comment]);
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
    },
    deleteMusic: async function (music_id) {
        // Exclui curtidas dos comentários da música
        await functions.executeSQL(
            `DELETE FROM curtidas_comentarios_musicas WHERE id_comentario IN (SELECT id FROM comentarios_musica WHERE id_musica = ?)`
            , [music_id]
        );
        // Exclui os comentários da música
        await functions.executeSQL(
            `DELETE FROM comentarios_musica WHERE id_musica = ?`
            , [music_id]
        );
        // Exclui vínculos da música com eventos
        await functions.executeSQL(
            `DELETE FROM musicas_eventos WHERE id_musica = ?`
            , [music_id]
        );
        // Exclui as tags da música
        await functions.executeSQL(
            `DELETE FROM tags_de_musicas WHERE tag_id_musica = ?`
            , [music_id]
        );
        // Exclui a música
        const result = await functions.executeSQL(
            `DELETE FROM musicas WHERE id_musica = ?`
            , [music_id]
        );
        
        if (result.affectedRows === 0) {
            throw new Error("Música não encontrada ou já excluída");
        }
    }
}

module.exports = musicService;

