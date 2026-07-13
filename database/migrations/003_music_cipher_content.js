const columns = [
    {
        table: "musicas",
        name: "cifra_titulo",
        definition: "VARCHAR(255) NULL"
    },
    {
        table: "musicas",
        name: "cifra_conteudo",
        definition: "MEDIUMBLOB NULL"
    },
    {
        table: "musicas",
        name: "cifra_encoding",
        definition: "VARCHAR(20) NOT NULL DEFAULT 'gzip'"
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
async function up(query) {
    for (const column of columns) {
        if (await columnExists(query, column.table, column.name)) {
            continue;
        }
        await query(`ALTER TABLE ${column.table} ADD COLUMN ${column.name} ${column.definition}`);
    }
}
module.exports = {
    up
};