import { toNodeHandler } from "better-auth/node";
import { auth } from "../../lib/auth.js";

export const config = { maxDuration: 10 };
export default toNodeHandler(auth);
