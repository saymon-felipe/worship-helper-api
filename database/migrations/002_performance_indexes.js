const indexes = [
    {
        table: "eventos",
        name: "idx_eventos_igreja_data_inicio",
        columns: "id_igreja, data_inicio"
    },
    {
        table: "avisos_igreja",
        name: "idx_avisos_igreja_data",
        columns: "aviso_igreja_id_igreja, aviso_igreja_data_criacao"
    },
    {
        table: "comentarios_musica",
        name: "idx_comentarios_musica_data",
        columns: "id_musica, data_criacao"
    },
    {
        table: "convites_membros_igreja",
        name: "idx_convites_igreja_usuario_status",
        columns: "id_igreja, id_usuario_requisitado, data_confirmacao"
    },
    {
        table: "membros_eventos",
        name: "idx_membros_eventos_evento_usuario",
        columns: "id_evento, id_usuario"
    },
    {
        table: "musicas_eventos",
        name: "idx_musicas_eventos_evento_musica",
        columns: "id_evento, id_musica"
    }
];
async function indexExists(query, table, indexName) {
    const results = await query(
        `
            SELECT
                COUNT(1) AS total
            FROM
                information_schema.statistics
            WHERE
                table_schema = DATABASE()
            AND
                table_name = ?
            AND
                index_name = ?
        `,
        [table, indexName]
    );
    return results[0].total > 0;
}
async function up(query) {
    for (const index of indexes) {
        if (await indexExists(query, index.table, index.name)) {
            continue;
        }
        await query(`CREATE INDEX ${index.name} ON ${index.table} (${index.columns})`);
    }
}
module.exports = {
    up
};