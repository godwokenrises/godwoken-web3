import test from "ava";
import { formatDecimal } from "../../src/db/helpers";

const testCase: { [key: string]: bigint } = {
  "1000": 1000n,
  "1000.01": 1001n,
  "1569.00": 1569n,
  "1433.0": 1433n,
};

test("formatDecimal", (t) => {
  for (const [key, value] of Object.entries(testCase)) {
    const result = formatDecimal(key);
    t.is(result, value);
  }
});
