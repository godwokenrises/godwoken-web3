import * as Knex from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema
    .createTable("blocks", function(table: Knex.TableBuilder) {
        table.bigInteger("number").primary().notNullable();
        table.text("hash").notNullable();
        table.text("parent_hash").notNullable();
        table.text("logs_bloom").notNullable();
        table.bigInteger("gas_limit").notNullable();
        table.bigInteger("gas_used").notNullable();
        table.text("miner").notNullable();
        table.bigInteger("size").notNullable();
        table.timestamp("timestamp").notNullable();
    })
    .createTable("transactions", function(table: Knex.TableBuilder) {
        table.increments("id");
        table.text("hash").notNullable();
        table.bigInteger("block_number").notNullable();
        table.foreign("block_number").references("blocks.number");
        table.text("block_hash").notNullable();
        table.integer("transaction_index").notNullable();
        table.text("from_address").notNullable();
        table.text("to_address").notNullable();
        table.decimal("value", 50, 0).notNullable();
        table.bigInteger("nonce").notNullable();
        table.bigInteger("gas_limit");
        table.decimal("gas_price", 50,0);
        table.text("input");
        table.text("v").notNullable();
        table.text("r").notNullable();
        table.text("s").notNullable();
        table.bigInteger("cumulative_gas_used");
        table.bigInteger("gas_used");
        table.text("logs_bloom");
        table.text("contract_address");
        table.boolean("status").notNullable();
    })
    .createTable("logs", function(table: Knex.TableBuilder) {
        table.increments("id");
        table.bigInteger("transaction_id").notNullable();
        table.foreign("transaction_id").references("transactions.id");
        table.text("transaction_hash").notNullable();
        table.integer("transaction_index").notNullable();
        table.bigInteger("block_number").notNullable();
        table.foreign("block_number").references("blocks.number");
        table.text("block_hash").notNullable();
        table.text("address").notNullable();
        table.text("data").notNullable();
        table.integer("log_index").notNullable();
        table.specificType("topics", "text ARRAY").notNullable();
    }) 
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema
    .dropTable("logs")
    .dropTable("transactions")
    .dropTable("blocks");
}