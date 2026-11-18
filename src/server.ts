import { createServer } from "http";
import type { IncomingMessage, Server, ServerResponse } from "http";
import routeHandler from "./routes/route.js";
import config from "./config/index.js";
import connectDB from "./database/connect.js";
import { expirePendingOrderReservations } from "./service/order.service.js";


const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
  void routeHandler(req as import("./types/http.js").AppRequest, res);
});


const startServer = async () => {
  try {
    await connectDB();
    server.listen(config.port, () => {
      console.log(`NodeTS Shop API is running at http://localhost:${config.port}`);
    });

    // Release unpaid stock reservations after 30 minutes.
    setInterval(() => {
      void expirePendingOrderReservations()
        .then((count) => {
          if (count > 0) console.log(`Released ${count} expired order reservation(s)`);
        })
        .catch((error: unknown) => console.error("Reservation cleanup failed:", error));
    }, 60_000).unref();
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

void startServer();
