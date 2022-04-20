/**
 * Module dependencies.
 */

import { logger } from "../base/logger";
import { app } from "./app";

/**
 * Get port from environment and store in Express.
 */
const port: number = +(process.env.PORT || "3000");
const server = app.listen(port, () => {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr!.port;
  logger.info("godwoken-web3-api:server Listening on " + bind);
});

export const isListening = function () {
  return server.listening;
};
