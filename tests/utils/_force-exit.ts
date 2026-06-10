import process from "node:process";
import { registerCompletionHandler } from "ava";

registerCompletionHandler(() => {
	process.exit(); // eslint-disable-line
});
