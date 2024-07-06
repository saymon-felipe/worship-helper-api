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
    createMusic: function (name, artist, video_url, cipher_url, thumbnail) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    INSERT INTO
                        musicas
                        (nome_musica, artista_musica, video_url, cifra_url, imagem, video_id)
                    VALUES
                        (?, ?, ?, ?, ?, ?)
                `, [name, artist, video_url, cipher_url, thumbnail, video_url.split("?v=")[1]]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
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
                let musicList = functions.returnFormattedMusics(results, []);
                resolve(musicList);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnMusic: function (music_id) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    SELECT
                        m.*
                    FROM
                        musicas m
                    WHERE
                        m.id_musica = ?
                `, [music_id]
            ).then((results) => {
                let musicList = functions.returnFormattedMusics(results, []);
                resolve(musicList[0]);
            }).catch((error) => {
                reject(error);
            })
        })
    }
}

module.exports = musicService;