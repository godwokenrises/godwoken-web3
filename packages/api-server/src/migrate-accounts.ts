import levelup from "levelup";
import leveldown from "leveldown";
import path from "path";
import { Query } from "./db";

async function main() {
  const argvArgs = process.argv.slice(2);
  const defaultStorePath = path.resolve(__dirname, "..", "lib", "./hashmap-db");
  let storePath = argvArgs[0];
  if (storePath == null) {
    console.log(`store path not provided, using ${defaultStorePath}`);
    storePath = defaultStorePath;
  } else {
    storePath = path.resolve(__dirname, "..", storePath);
    console.log(`Using store path: ${storePath}`);
  }

  const db = levelup(leveldown(storePath));

  const query = new Query();

  const arr: { shortScriptHash: string; ethAddress: string }[] = [];
  db.createReadStream()
    .on("data", function (data) {
      const shortScriptHash = data.key.toString();
      const ethAddress = data.value.toString();
      arr.push({
        shortScriptHash,
        ethAddress,
      });
    })
    .on("error", function (err) {
      console.error("Migrate error:", err);
    })
    .on("close", async function () {
      for (let a of arr) {
        const { shortScriptHash, ethAddress } = a;
        await query.accounts.save(ethAddress, shortScriptHash);
        console.log(
          `insert one record, short_script_hash: ${shortScriptHash}, eth_address: ${ethAddress}`
        );
      }
      console.log("Stream closed");
      process.exit(0);
    })
    .on("end", function () {});
}

main();
