import * as functions from "firebase-functions";
import next from "next";

const isDev = process.env.NODE_ENV !== "production";
const nextAppInstance = next({ dev: isDev });
const handle = nextAppInstance.getRequestHandler();

export const nextApp = functions.https.onRequest(async (req, res) => {
  await nextAppInstance.prepare();
  return handle(req, res);
});
