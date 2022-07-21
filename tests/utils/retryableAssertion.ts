import {sleep} from "./sleep";
import {ExecutionContext} from "ava";

export const retryableAssertion = async (t: ExecutionContext, recoverableTry: (tt: ExecutionContext) => void) => {
  while(true) {
    const lastTry = await t.try(recoverableTry)

    if( lastTry.passed ){
      lastTry.commit();
      break
    }
    lastTry.discard()

    await sleep(100)
  }
}
