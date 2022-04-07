import { Knex as KnexType } from "knex";

export async function up(knex: KnexType): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    return;
  }
  await knex.schema
    .createTable("blocks", function (table: KnexType.TableBuilder) {
      table.bigInteger("number").primary().notNullable();
      table.text("hash").notNullable();
      table.unique(["hash"]);
      table.text("parent_hash").notNullable();
      table.text("logs_bloom").notNullable();
      table.bigInteger("gas_limit").notNullable();
      table.bigInteger("gas_used").notNullable();
      table.text("miner").notNullable();
      table.bigInteger("size").notNullable();
      table.timestamp("timestamp").notNullable();
    })
    .createTable("transactions", function (table: KnexType.TableBuilder) {
      table.increments("id");
      table.text("hash").notNullable();
      table.unique(["hash"]);
      table.bigInteger("block_number").notNullable();
      table.index("block_number");
      table.foreign("block_number").references("blocks.number");
      table.text("block_hash").notNullable();
      table.index("block_hash");
      table.integer("transaction_index").notNullable();
      table.text("from_address").notNullable();
      table.index("from_address");
      table.text("to_address");
      table.index("to_address");
      table.decimal("value", 50, 0).notNullable();
      table.bigInteger("nonce").notNullable();
      table.bigInteger("gas_limit");
      table.decimal("gas_price", 50, 0);
      table.text("input");
      table.text("v").notNullable();
      table.text("r").notNullable();
      table.text("s").notNullable();
      table.bigInteger("cumulative_gas_used");
      table.bigInteger("gas_used");
      table.text("logs_bloom");
      table.text("contract_address");
      table.index("contract_address");
      table.boolean("status").notNullable();
      table.unique(
        ["block_hash", "transaction_index"],
        "block_hash_transaction_index_idx"
      );
      table.unique(
        ["block_number", "transaction_index"],
        "block_number_transaction_index_idx"
      );
    })
    .createTable("logs", function (table: KnexType.TableBuilder) {
      table.increments("id");
      table.bigInteger("transaction_id").notNullable();
      table.foreign("transaction_id").references("transactions.id");
      table.text("transaction_hash").notNullable();
      table.index("transaction_hash");
      table.integer("transaction_index").notNullable();
      table.bigInteger("block_number").notNullable();
      table.foreign("block_number").references("blocks.number");
      table.index("block_number");
      table.text("block_hash").notNullable();
      table.index("block_hash");
      table.text("address").notNullable();
      table.index("address");
      table.text("data");
      table.integer("log_index").notNullable();
      table.specificType("topics", "text ARRAY").notNullable();
    });
}

export async function down(knex: KnexType): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    return;
  }
  await knex.schema
    .dropTable("logs")
    .dropTable("transactions")
    .dropTable("blocks");
}
