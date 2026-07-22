async function up(query) {
    const existingColumn = await query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'musicas'
          AND column_name = 'id_igreja'
        LIMIT 1
    `);

    if (existingColumn.length > 0) {
        return;
    }

    await query(`
        ALTER TABLE musicas
            ADD COLUMN id_igreja INT NULL AFTER id_musica,
            ADD KEY idx_musicas_igreja (id_igreja),
            ADD CONSTRAINT fk_musicas_igreja
                FOREIGN KEY (id_igreja) REFERENCES igreja (id_igreja) ON DELETE CASCADE
    `);

    // Só associa registros legados quando a igreja pode ser determinada sem ambiguidade.
    // Músicas globais ou usadas por mais de uma igreja permanecem sem igreja e deixam de
    // aparecer no acervo até serem cadastradas novamente pela igreja responsável.
    await query(`
        UPDATE musicas m
        INNER JOIN (
            SELECT me.id_musica, MIN(e.id_igreja) AS id_igreja
            FROM musicas_eventos me
            INNER JOIN eventos e ON e.id = me.id_evento
            GROUP BY me.id_musica
            HAVING COUNT(DISTINCT e.id_igreja) = 1
        ) ownership ON ownership.id_musica = m.id_musica
        SET m.id_igreja = ownership.id_igreja
    `);

    await query(`
        CREATE UNIQUE INDEX uk_musicas_igreja_nome_artista
            ON musicas (id_igreja, nome_musica, artista_musica)
    `);
}

module.exports = { up };
