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
                    videoThumbnail: item.snippet.thumbnails.url
                }));
              
                resolve(videos);
            })
        })
    },
    createMusic: function (name, artist, url) {
        return new Promise((resolve, reject) => {
            functions.executeSQL(
                `
                    
                `
            )
        })
    }
}

module.exports = musicService;