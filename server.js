const http = require('http');
const port = process.env.PORT || 3000;
const app = require('./app');
const { runMigrations } = require('./database/migrate');

const server = http.createServer(app);

async function startServer() {
    if (process.env.SKIP_MIGRATIONS !== "true") {
        await runMigrations();
    }

    server.listen(port, () => {
        console.log(`Worship Helper API rodando na porta ${port}`);
    });
}

startServer().catch((error) => {
    console.error("Falha ao iniciar a API", error);
    process.exit(1);
});
