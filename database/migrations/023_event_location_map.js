async function columnExists(query, table, columnName) {
    const results = await query(
        `
            SELECT COUNT(1) AS total
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            AND table_name = ?
            AND column_name = ?
        `,
        [table, columnName]
    );

    return results[0].total > 0;
}

async function up(query) {
    // CEP (somente digitos) e coordenadas do pino do mapa do local do evento. Todos opcionais: eventos antigos e eventos
    // sem local ficam com NULL. DOUBLE (e nao DECIMAL) para o driver devolver numero, e nao texto.
    if (!(await columnExists(query, "eventos", "cep_evento"))) {
        await query("ALTER TABLE eventos ADD COLUMN cep_evento CHAR(8) NULL");
    }

    if (!(await columnExists(query, "eventos", "latitude_evento"))) {
        await query("ALTER TABLE eventos ADD COLUMN latitude_evento DOUBLE NULL");
    }

    if (!(await columnExists(query, "eventos", "longitude_evento"))) {
        await query("ALTER TABLE eventos ADD COLUMN longitude_evento DOUBLE NULL");
    }
}

module.exports = {
    up
};
