import type { Extension, onLoadDocumentPayload, onStoreDocumentPayload } from "@hocuspocus/server";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHocuspocusProviderWebsocket,
	sleep,
} from "../utils/index.ts";
import * as Y from "yjs";

// TODO: clean up logging
// TODO: make sure all other tests pass after changes

test("Does not unload prematurely when a save is in progress (unloadImmediately=true)", async (t) => {
  /*
  Scenario 1

  Server is configured with `{ unloadImmediately: true, debounce: 1000 }` and has a storage backend that takes 500ms to save.
  Timeline goes as follows.

  1.  ~0ms     Client 1 connects
  2.  ~10ms    Client 1 makes change 1 (triggers debounced save)
  3.  ~1000ms  Server starts saving change 1 (debounced)
  4.  ~1100ms  Client 1 makes change 2 (triggers debounced save)
  5.  ~1300ms  Client 1 disconnects, triggering immediate save of change 2
  6.  ~1500ms  Server finishes saving change 1, detects zero clients, ERRONEOUSLY UNLOADS document (while change 2 is still being saved!)
  7.  ~1600ms  Client 2 connects, loads document (doesn't see change 2)
  9.  ~1800ms  Server finishes saving change 2. Note that this happens on a Document instance that has already been unloaded.
  10. ~2100ms  Client 2 should see change 2, but doesn't!
  */


	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			debounce: 1000,
      extensions: [new SlowInMemoryStorage()],			
		});

    // Client 1 connects
		const socket1 = newHocuspocusProviderWebsocket(server);
		const provider1 = newHocuspocusProvider(server, {
			websocketProvider: socket1,
      
			async onSynced() {
        log("Client 1 making change 1");
				provider1.document.getArray("foo").push(["foo"]);
        setTimeout(() => {
          log("Client 1 making change 2");
          provider1.document.getArray("foo").push(["bar"]);
          setTimeout(() => { // Wait for sending changes
            log("Client 1 disconnecting");        
            socket1.destroy();
          }, 200)
        }, 1100)        
			},
		});

    setTimeout(() => {
      const socket2 = newHocuspocusProviderWebsocket(server);
      const provider2 = newHocuspocusProvider(server, {
        websocketProvider: socket2,
        
        async onSynced() {
          log("Client 2 synced");
          // 2. Client 1 makes a change 1 (triggers debounced save)        
          
          setTimeout(() => {
            const value = provider2.document.getArray("foo").toArray()
            log("Checking value in Client 2: " + value);
            
            t.deepEqual(value, ["foo", "bar"], "Client 2 should see both changes");
            t.pass()
            resolve("done");
          }, 500)				
        },
      });      
    }, 1600)
	});
});

test("Does not unload prematurely when a debounced save is pending (unloadImmediately=false)", async (t) => {
  /*

  Scenario 2

  Server is configured with `{ unloadImmediately: false, debounce: 1000 }` and has a storage backend that takes 500ms to save.

  1.  ~0ms     Client 1 connects
  2.  ~10ms    Client 1 makes a change 1 (triggers debounced save)
  3.  ~1000ms  Server starts saving change 1 (debounced)
  4.  ~1100ms  Client 1 makes change 2 (triggers debounced save)
  5.  ~1300ms  Client 1 disconnects, while change 2 is still being debounced
  6.  ~1500ms  Server finishes saving change 1, detects zero clients, ERRONEOUSLY UNLOADS document (while change 2 is still debounced)
  7.  ~1600ms  Client 2 connects, loads a new Document object (doesn't see change 2, which is not yet saved as the save is debounced)
  8.  ~2000ms  Server starts saving change 2 (debounced)
  9.  ~2500ms  Server finishes saving change 2. Note that this happens on a Document instance that has already been unloaded.
  10. ~3000ms  Client 2 should see change 2, but doesn't!

  */

  const start = Date.now()
  function log(text: string) {
    console.log(Date.now() - start, text)
  }

  let state: Uint8Array<ArrayBufferLike> | null = null

	await new Promise(async (resolve) => {

		const server = await newHocuspocus({
			debounce: 1000,
      unloadImmediately: false,
      extensions: [new SlowInMemoryStorage()],			
		});

    // Client 1 connects
		const socket1 = newHocuspocusProviderWebsocket(server);
		const provider1 = newHocuspocusProvider(server, {
			websocketProvider: socket1,
      
			async onSynced() {
        log("Client 1 making change 1");
				provider1.document.getArray("foo").push(["foo"]);
			},
		});
    setTimeout(() => {
        log("Client 1 making change 2");
        provider1.document.getArray("foo").push(["bar"]);
        setTimeout(() => { // Wait for sending changes
          log("Client 1 disconnecting");        
          socket1.destroy();
        }, 200)        
    }, 1100)

    setTimeout(() => {
      const socket2 = newHocuspocusProviderWebsocket(server);
      const provider2 = newHocuspocusProvider(server, {
        websocketProvider: socket2,        
        async onSynced() {
          log("Client 2 synced");
          // 2. Client 1 makes a change 1 (triggers debounced save)        
          log("Checking value in Client 2: " + getCurrentValue(provider2.document));
          
          setTimeout(() => {
            const value = 
            log("Checking value in Client 2: " + getCurrentValue(provider2.document));
            
            t.deepEqual(getCurrentValue(provider2.document), ["foo", "bar"], "Client 2 should see both changes");
            t.pass()
            resolve("done");
          }, 1500)				
        },
      });
    }, 1600)
		

	});
});

const start = Date.now()
function log(text: string) {
  console.log(Date.now() - start, text)
}

const getCurrentValue = (doc: Y.Doc) => doc.getArray("foo").toArray()

class SlowInMemoryStorage implements Extension {
  state: Uint8Array<ArrayBufferLike> | null = null
  async onStoreDocument(data: onStoreDocumentPayload) {
    const savedStateToShow = getCurrentValue(data.document)
    const stateToSave = Y.encodeStateAsUpdate(data.document) // Simulate save in memory
    log("onStoreDocument called, going to save state " + savedStateToShow);
    await sleep(500) // Simulate long save
    this.state = stateToSave // Simulate save in memory
    log("onStoreDocument finished, saved state " + savedStateToShow);
  }
  async onLoadDocument(data: onLoadDocumentPayload) {
    if (this.state) {
      Y.applyUpdate(data.document, this.state)
    }
    log("onLoadDocument finished, loaded state " + getCurrentValue(data.document));
  }
  async afterUnloadDocument() {
    log("******** afterUnloadDocument called");
  }
}