import { Command } from "commander";
import { fixEthTxHashRun, listWrongEthTxHashesRun } from "./fix-eth-tx-hash";
import { version as packageVersion } from "../package.json";

const program = new Command();
program.version(packageVersion);

program
  .command("fix-eth-tx-hash")
  .description("Fix eth_tx_hash in database where R or S with leading zeros")
  .option(
    "-d, --database-url <database url>",
    "If not provide, will use env `DATABASE_URL`, throw error if not provided too",
    undefined
  )
  .option(
    "-c, --chain-id <chain id>",
    "Godwoken chain id, if not provoide, will get from RPC",
    undefined
  )
  .option("-r, --rpc <rpc>", "Godwoken / Web3 RPC url", "http://127.0.0.1:8024")
  .action(fixEthTxHashRun);

program
  .command("list-wrong-eth-tx-hashes")
  .description(
    "List transactions which R or S with leading zeros, only list first 20 txs"
  )
  .option("-d, --database-url <database url>", "database url", undefined)
  .action(listWrongEthTxHashesRun);

program.parse();
