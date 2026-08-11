const zlib = require("zlib");
const functions = require("../functions/functions.js");
const ciphers = require("../functions/cyphers.js");
const uploadConfig = require("../config/upload.js");
const { normalizeImportedCipherText } = require("./cipherPdfImporter.js");
const { randomUUID } = require("crypto");

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

function createCipherVersion() {
    return `${Date.now().toString(36)}-${randomUUID()}`;
}

async function resolveCipherPayload(source, name, cipher_url, cipher_title, cipher_text) {
    if (source === "custom_pdf") {
        const normalizedCipherText = normalizeImportedCipherText(cipher_text);

        if (!normalizedCipherText) {
            throw createApiError("Cifra importada vazia", 422);
        }

        return {
            text: normalizedCipherText,
            title: cipher_title || name,
            url: ""
        };
    }

    if (!cipher_url) {
        throw createApiError("URL da cifra obrigatoria", 400);
    }

    const cipherContent = await ciphers.scrapeCifraContent(cipher_url);

    return {
        text: cipherContent.text,
        title: cipher_title || cipherContent.title || "",
        url: cipher_url
    };
}

async function writeCipherContent(church_id, music_id, cipher_text) {
    const cipherVersion = createCipherVersion();
    const cipherKey = `igrejas/${church_id}/musicas/${music_id}/cifras/${cipherVersion}.txt.gz`;
    await uploadConfig.putCipher(cipherKey, compressCipherText(cipher_text) || zlib.gzipSync(Buffer.from("")));

    return {
        cipherKey,
        cipherVersion
    };
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
    createMusic: async function (church_id, name, artist, video_url, cipher_url, cipher_title, thumbnail, music_tags, options = {}) {
        const results = await functions.executeSQL(
            `
                SELECT
                    id_musica
                FROM
                    musicas
                WHERE
                    id_igreja = ? AND LOWER(nome_musica) = ? AND LOWER(artista_musica) = ?
            `,
            [church_id, name.toLowerCase(), artist.toLowerCase()]
        );

        if (results.length > 0) {
            throw "Musica ja cadastrada no banco de dados";
        }

        const videoId = extractYoutubeVideoId(video_url);

        if (!videoId) {
            throw "URL do video invalida";
        }

        const cipherSource = options.cipher_source || "cifra_club";
        const cipherPayload = await resolveCipherPayload(
            cipherSource,
            name,
            cipher_url,
            cipher_title,
            options.cipher_text
        );

        const inserted = await functions.executeSQL(
            `
                INSERT INTO
                    musicas
                    (id_igreja, nome_musica, artista_musica, video_url, cifra_url, cifra_titulo, imagem, video_id)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [church_id, name, artist, video_url, cipherPayload.url, cipherPayload.title, thumbnail, videoId]
        );

        let cipherUpload;

        try {
            cipherUpload = await writeCipherContent(church_id, inserted.insertId, cipherPayload.text);
            await functions.executeSQL(
                `UPDATE musicas SET cifra_s3_key = ?, cifra_versao = ? WHERE id_musica = ?`,
                [cipherUpload.cipherKey, cipherUpload.cipherVersion, inserted.insertId]
            );
        } catch (error) {
            if (cipherUpload && cipherUpload.cipherKey) {
                await uploadConfig.deleteFromS3(cipherUpload.cipherKey).catch(() => null);
            }
            await functions.executeSQL(`DELETE FROM musicas WHERE id_musica = ?`, [inserted.insertId]);
            throw error;
        }

        await this.insertMusicTags(inserted.insertId, music_tags);
        return { id_musica: inserted.insertId };
    },
    returnMusics: function (church_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    SELECT
                        m.*
                    FROM
                        musicas m
                    WHERE
                        m.id_igreja = ?
                `, [church_id]
            ).then((results) => {
                functions.returnFormattedMusics(results).then(async (results2) => {
                    resolve(results2);
                }).catch((error) => {
                    reject(error);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnMusic: function (music_id, church_id, event_id = 0) {
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
                    AND
                        m.id_igreja = ?
                `, [event_id, event_id, music_id, church_id]
            ).then((results) => {
                functions.returnFormattedMusics(results).then(async (results2) => {
                    if (!results2[0]) {
                        resolve(results2[0]);
                        return;
                    }

                    results2[0].cipher_text = zlib.gunzipSync(
                        await uploadConfig.getCipher(results[0].cifra_s3_key)
                    ).toString("utf8");
                    results2[0].cipher_title = results[0].cifra_titulo || "";
                    results2[0].cipher_version = results[0].cifra_versao || "legacy";
                    resolve(results2[0]);
                }).catch((error) => {
                    reject(error);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    musicBelongsToChurch: async function (music_id, church_id) {
        const results = await functions.executeSQL(
            `SELECT id_musica, cifra_s3_key FROM musicas WHERE id_musica = ? AND id_igreja = ?`,
            [music_id, church_id]
        );

        return results.length > 0;
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
            functions.executeSQL(`
                SELECT id
                FROM curtidas_comentarios_musicas
                WHERE id_usuario = ? AND id_comentario = ?
                LIMIT 1
            `, [user_id, id_comment]).then((likes) => {
                const query = likes.length > 0
                    ? `DELETE FROM curtidas_comentarios_musicas WHERE id_usuario = ? AND id_comentario = ?`
                    : `INSERT INTO curtidas_comentarios_musicas (id_usuario, id_comentario) VALUES (?, ?)`;

                return functions.executeSQL(query, [user_id, id_comment]);
            }).then((results) => {
                if (results.affectedRows <= 0) {
                    reject("Ocorreu um erro ao atualizar a curtida do comentário");
                    return;
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

        return { id_aviso: result.insertId };
    },
    likeEventMusicComment: async function (id_comment, user_id) {
        const likes = await functions.executeSQL(`
            SELECT id
            FROM curtidas_comentarios_musicas_eventos
            WHERE id_usuario = ? AND id_comentario = ?
            LIMIT 1
        `, [user_id, id_comment]);

        const result = await functions.executeSQL(
            likes.length > 0
                ? `DELETE FROM curtidas_comentarios_musicas_eventos WHERE id_usuario = ? AND id_comentario = ?`
                : `INSERT INTO curtidas_comentarios_musicas_eventos (id_usuario, id_comentario) VALUES (?, ?)`,
            [user_id, id_comment]
        );

        if (result.affectedRows <= 0) {
            throw "Ocorreu um erro ao atualizar a curtida do comentario";
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
    updateCipher: async function (music_id, church_id, cipher_text) {
        const [music] = await functions.executeSQL(
            `SELECT cifra_s3_key FROM musicas WHERE id_musica = ? AND id_igreja = ?`,
            [music_id, church_id]
        );
        if (!music) {
            throw new Error("Música não encontrada");
        }

        const { cipherKey, cipherVersion } = await writeCipherContent(church_id, music_id, cipher_text);
        try {
            await functions.executeSQL(
                `UPDATE musicas SET cifra_s3_key = ?, cifra_versao = ? WHERE id_musica = ? AND id_igreja = ?`,
                [cipherKey, cipherVersion, music_id, church_id]
            );
        } catch (error) {
            await uploadConfig.deleteFromS3(cipherKey).catch(() => null);
            throw error;
        }

        if (music.cifra_s3_key) {
            await uploadConfig.deleteFromS3(music.cifra_s3_key).catch(() => null);
        }
        return { cipher_version: cipherVersion };

    },
    deleteMusic: async function (music_id, church_id) {
        const [music] = await functions.executeSQL(
            `SELECT id_musica, cifra_s3_key FROM musicas WHERE id_musica = ? AND id_igreja = ?`,
            [music_id, church_id]
        );

        if (!music) {
            throw new Error("Música não encontrada ou já excluída");
        }

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
            `DELETE FROM musicas WHERE id_musica = ? AND id_igreja = ?`
            , [music_id, church_id]
        );
        
        if (result.affectedRows === 0) {
            throw new Error("Música não encontrada ou já excluída");
        }
        if (music.cifra_s3_key) {
            await uploadConfig.deleteFromS3(music.cifra_s3_key).catch(() => null);
        }
    }
}

module.exports = musicService;

