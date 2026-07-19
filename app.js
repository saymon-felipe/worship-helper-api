require('./config/env');
const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const { cacheGetResponses, clearCacheOnMutation } = require('./middleware/cache');

const rotaUsuarios = require('./routes/usuario');
const rotaIgreja = require('./routes/church');
const rotaMusicas = require("./routes/music");
const rotaContato = require('./routes/contato');

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function parseOrigins(value) {
    return (value || '')
        .split(',')
        .map(origin => origin.trim().replace(/\/$/, ''))
        .filter(Boolean);
}

app.use((req, res, next) => {
    const allowedOrigins = [...new Set([
        ...parseOrigins(process.env.URL_SITE),
        ...parseOrigins(process.env.URL_APP),
        'http://localhost:8080',
        'http://192.168.0.7:8080',
        'http://localhost:8081',
        'http://localhost:5174',
        'http://localhost:5175'
    ].map(origin => origin.replace(/\/$/, '')).filter(Boolean))];

    const origin = req.headers.origin;
    if (origin) {
        const cleanOrigin = origin.trim().replace(/\/$/, '');
        if (allowedOrigins.includes(cleanOrigin)) {
            res.header('Access-Control-Allow-Origin', origin);
        } else {
            res.header('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
        }
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }

    res.header(
        "Access-Control-Allow-Headers", 
        "Content-type, Origin, X-Requested-With, Accept, Authorization"
    )

    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
        return res.status(200).send({});
    }

    next(); 
})

app.use(cacheGetResponses);
app.use(clearCacheOnMutation);

app.use('/usuario', rotaUsuarios);
app.use('/igreja', rotaIgreja);
app.use('/musicas', rotaMusicas);
app.use('/api', rotaContato);
app.use('/public', express.static('public'));

app.use((req, res, next) => {
    const error = new Error("Não encontrado");
    error.status = 404;
    next(error);
})

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    return res.send({
        error: error.message
    })
})

module.exports = app;
