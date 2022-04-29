/**
 * Module dependencies.
 */

import { startServer } from "./app";

/**
 * Get port from environment and store in Express.
 */
const port: number = +(process.env.PORT || "3000");
startServer(port);
