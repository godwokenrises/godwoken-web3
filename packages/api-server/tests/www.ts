import jayson from "jayson/promise";

export const client = jayson.Client.http({
  port: process.env.PORT == null ? "8024" : process.env.PORT,
});

export interface JSONResponse {
  jsonrpc: "2.0";
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}
