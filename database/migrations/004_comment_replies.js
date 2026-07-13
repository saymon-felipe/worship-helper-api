const columns = [
    {
        table: "avisos_igreja",
        name: "aviso_igreja_parent_id",
        definition: "INT NULL"
    },
    {
        table: "comentarios_musica",
        name: "parent_id",
        definition: "INT NULL"
    }
];
const indexes = [
    {
        table: "avisos_igreja",
        name: "idx_avisos_parent",
        columns: "aviso_igreja_parent_id"
    },
    {
        table: "comentarios_musica",
        name: "idx_comentarios_parent",
        columns: "parent_id"
    }
];
async function columnExists(query, table, columnName) {
    const results = await query(
        `
            SELECT
                COUNT(1) AS total
            FROM
                information_schema.columns
            WHERE
                table_schema = DATABASE()
            AND
                table_name = ?
            AND
                column_name = ?
        `,
        [table, columnName]
    );
    return results[0].total > 0;
}
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
    await query("ALTER TABLE avisos_igreja MODIFY COLUMN aviso_igreja_mensagem VARCHAR(280) NOT NULL");
    await query("ALTER TABLE comentarios_musica MODIFY COLUMN mensagem VARCHAR(280) NOT NULL");
    for (const column of columns) {
        if (!(await columnExists(query, column.table, column.name))) {
            await query(`ALTER TABLE ${column.table} ADD COLUMN ${column.name} ${column.definition}`);
        }
    }
    for (const index of indexes) {
        if (!(await indexExists(query, index.table, index.name))) {
            await query(`CREATE INDEX ${index.name} ON ${index.table} (${index.columns})`);
        }
    }
}
module.exports = {
    up
};
