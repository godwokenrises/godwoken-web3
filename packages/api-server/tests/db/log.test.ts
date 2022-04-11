import test from "ava";
import { FilterTopic } from "../../src/cache/types";
import { Log } from "../../src/db/types";
import { filterLogsByTopics } from "../../src/db/index";

const logs: Log[] = [
  {
    id: BigInt(0),
    transaction_hash: "",
    transaction_id: BigInt(0),
    transaction_index: 0,
    block_number: BigInt(0),
    block_hash: "",
    address: "",
    data: "",
    log_index: 0,
    topics: ["a"],
  },
  {
    id: BigInt(0),
    transaction_hash: "",
    transaction_id: BigInt(0),
    transaction_index: 0,
    block_number: BigInt(0),
    block_hash: "",
    address: "",
    data: "",
    log_index: 0,
    topics: ["a", "b"],
  },
  {
    id: BigInt(0),
    transaction_hash: "",
    transaction_id: BigInt(0),
    transaction_index: 0,
    block_number: BigInt(0),
    block_hash: "",
    address: "",
    data: "",
    log_index: 0,
    topics: ["c", "b"],
  },
  {
    id: BigInt(0),
    transaction_hash: "",
    transaction_id: BigInt(0),
    transaction_index: 0,
    block_number: BigInt(0),
    block_hash: "",
    address: "",
    data: "",
    log_index: 0,
    topics: ["b"],
  },
];

const f0: FilterTopic[] = [null, null, null];
const f1: FilterTopic[] = [];
const f2: FilterTopic[] = ["a"];
const f3: FilterTopic[] = [null, "b"];
const f4: FilterTopic[] = ["a", "b"];
const f5: FilterTopic[] = [
  ["a", "b"],
  ["a", "b"],
];
const f6: FilterTopic[] = [["a", "c"]];

test("match topics", async (t) => {
  t.deepEqual([], filterLogsByTopics(logs, f0));
  t.deepEqual(logs, filterLogsByTopics(logs, f1));
  t.deepEqual(logs.slice(0, 2), filterLogsByTopics(logs, f2));
  t.deepEqual(logs.slice(1, 3), filterLogsByTopics(logs, f3));
  t.deepEqual(logs.slice(1, 2), filterLogsByTopics(logs, f4));
  t.deepEqual(logs.slice(1, 2), filterLogsByTopics(logs, f5));
  t.deepEqual(logs.slice(0, 3), filterLogsByTopics(logs, f6));
});
