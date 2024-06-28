const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');

const rotaUsuarios = require('./routes/usuario');
const rotaIgreja = require('./routes/church');
const rotaMusicas = require("./routes/music");

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.URL_SITE);
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

app.use('/usuario', rotaUsuarios);
app.use('/igreja', rotaIgreja);
app.use('/musicas', rotaMusicas);
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
