import test from "ava";
import { client, JSONResponse } from "../www";

test("net_version", async (t) => {
  let res: JSONResponse = await client.request(t.title, []);
  t.falsy(res.error);
});

test("net_peerCount", async (t) => {
  let res: JSONResponse = await client.request(t.title, []);
  t.falsy(res.error);
  t.is(res.result, "0x0");
});

test("net_listening", async (t) => {
  let res: JSONResponse = await client.request(t.title, []);
  t.falsy(res.error);
  t.true(res.result);
});
