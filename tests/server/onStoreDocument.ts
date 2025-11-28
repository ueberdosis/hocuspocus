import type { Extension, onLoadDocumentPayload, onStoreDocumentPayload } from "@hocuspocus/server";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHocuspocusProviderWebsocket,
	sleep,
} from "../utils/index.ts";
import * as Y from "yjs";

test("calls the debouned onStoreDocument hook before the document is removed from memory", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			debounce: 3000,
			async onStoreDocument() {
				t.pass();
				resolve("done");
			},
		});

		const socket = newHocuspocusProviderWebsocket(server);

		const provider = newHocuspocusProvider(server, {
			websocketProvider: socket,
			onSynced() {
				// Dummy change to trigger onStoreDocument
				provider.document.getArray("foo").push(["foo"]);

				socket.destroy();
			},
		});
	});
});

test("doesn’t remove the document from memory when there’s a new connection established during onStoreDocument is called", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onStoreDocument() {
				return sleep(1000);
			},
		});
		const socket = newHocuspocusProviderWebsocket(server);
		const anotherSocket = newHocuspocusProviderWebsocket(server);

		newHocuspocusProvider(server, {
			websocketProvider: socket,
			onSynced() {
				setTimeout(() => {
					anotherSocket.connect();
				}, 100);

				setTimeout(() => {
					t.is(server.getDocumentsCount(), 1);
					resolve("done");
				}, 1100);
			},
		});
		newHocuspocusProvider(server, {
			websocketProvider: anotherSocket,
		});
	});
});

test("removes the document from memory when there’s no connection after onStoreDocument is called", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onStoreDocument() {
				return sleep(1000);
			},
		});

		const provider = newHocuspocusProvider(server, {
			onSynced() {
				// Dummy change to trigger onStoreDocument
				provider.document.getArray("foo").push(["foo"]);
				provider.configuration.websocketProvider.destroy();
				provider.destroy();
			},
			onDestroy() {
				// Check if the document is removed from memory …
				setTimeout(() => {
					t.is(server.getDocumentsCount(), 0);

					resolve("done");
				}, 1100);
			},
		});
	});
});

test("onStoreDocument callback receives document updates", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onStoreDocument({ document }: onStoreDocumentPayload) {
				const value = document.getArray("foo").get(0);
				t.is(value, "bar");

				resolve("done");
			},
		});

		const provider = newHocuspocusProvider(server);

		provider.on("synced", () => {
			provider.document.getArray("foo").insert(0, ["bar"]);
		});
	});
});

test("debounces document changes for onStoreDocument hooks", async (t) => {
	await new Promise(async (resolve) => {
		let executedOnChange = 0;
		let executedOnStoreDocument = 0;

		const hocuspocus = await newHocuspocus({
			debounce: 300,
			async onChange() {
				executedOnChange += 1;
			},
			async onStoreDocument() {
				executedOnStoreDocument += 1;
			},
			async onDestroy() {
				t.is(executedOnChange, 5);
				t.is(executedOnStoreDocument, 1);

				resolve("done");
			},
		});

		const provider = newHocuspocusProvider(hocuspocus, {
			onSynced() {
				provider.document.getArray("foo").push(["foo"]);
				provider.document.getArray("foo").push(["bar"]);
				provider.document.getArray("foo").push(["barfoo"]);
				provider.document.getArray("foo").push(["foobar"]);
				provider.document.getArray("foo").push(["foofoo"]);

				setTimeout(() => {
					hocuspocus.server!.destroy();
				}, 200);
			},
		});
	});
});

test("executes onStoreDocument callback from an extension", async (t) => {
	await new Promise(async (resolve) => {
		class CustomExtension {
			async onStoreDocument({ document }: onStoreDocumentPayload) {
				const value = document.getArray("foo").get(0);
				t.is(value, "bar");

				resolve("done");
			}
		}

		const server = await newHocuspocus({
			extensions: [new CustomExtension()],
		});

		const provider = newHocuspocusProvider(server);

		provider.on("synced", () => {
			provider.document.getArray("foo").insert(0, ["bar"]);
		});
	});
});

test("stops when one of the onStoreDocument hooks throws an error", async (t) => {
	await new Promise(async (resolve) => {
		class BreakingTheChain {
			async onStoreDocument() {
				setTimeout(() => {
					t.pass();
					resolve("done");
				}, 100);

				// Stop it!
				throw new Error();
			}
		}

		class NotExecuted {
			async onStoreDocument() {
				// This MUST NOT be executed.

				resolve("done");
			}
		}

		const server = await newHocuspocus({
			extensions: [new BreakingTheChain(), new NotExecuted()],
		});

		const provider = newHocuspocusProvider(server);

		provider.on("synced", () => {
			provider.document.getArray("foo").insert(0, ["bar"]);
		});
	});
});

test("has the server instance", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onStoreDocument({ instance }) {
				t.is(instance, server);

				resolve("done");
			},
		});

		const provider = newHocuspocusProvider(server);

		provider.on("synced", () => {
			provider.document.getArray("foo").insert(0, ["bar"]);
		});
	});
});

test("runs hooks in the given order", async (t) => {
	await new Promise(async (resolve) => {
		const triggered: string[] = [];

		class Running {
			async onStoreDocument() {
				triggered.push("one");
			}
		}

		class BreakTheChain {
			async onStoreDocument() {
				triggered.push("two");
				throw Error();
			}
		}

		class NotRunning {
			async onStoreDocument() {
				triggered.push("three");
			}
		}

		const server = await newHocuspocus({
			extensions: [new Running(), new BreakTheChain(), new NotRunning()],
			// lowest priority
			async onStoreDocument() {
				triggered.push("four");
			},
			async afterStoreDocument() {
				t.fail(); // this shouldnt run
			},
		});

		const provider = newHocuspocusProvider(server, {
			onSynced() {
				// Dummy change to trigger onStoreDocument
				provider.document.getArray("foo").push(["foo"]);
				provider.configuration.websocketProvider.destroy();
				provider.destroy();

				setTimeout(() => {
					t.deepEqual(triggered, ["one", "two"]);

					resolve(true);
				}, 250);
			},
		});
	});
});

test("allows to overwrite the order of extension with a priority", async (t) => {
	await new Promise(async (resolve) => {
		const triggered: string[] = [];

		class Running {
			async onStoreDocument() {
				triggered.push("one");
			}
		}

		class BreakTheChain {
			async onStoreDocument() {
				triggered.push("two");
				throw Error();
			}
		}

		class NotRunning {
			async onStoreDocument() {
				triggered.push("three");
			}
		}

		class HighPriority {
			priority = 1000;

			async onStoreDocument() {
				triggered.push("zero");
			}
		}

		const server = await newHocuspocus({
			afterStoreDocument: async () => {
				t.fail();
			},
			extensions: [
				new Running(),
				new BreakTheChain(),
				new NotRunning(),
				new HighPriority(),
			],
		});

		const provider = newHocuspocusProvider(server, {
			onSynced() {
				// Dummy change to trigger onStoreDocument
				provider.document.getArray("foo").push(["foo"]);
				provider.configuration.websocketProvider.destroy();
				provider.destroy();

				setTimeout(() => {
					t.deepEqual(triggered, ["zero", "one", "two"]);

					resolve(true);
				}, 250);
			},
		});
	});
});

test("if a connection connects while another disconnects onStoreDocument is still running, onLoadDocument will be called after onStoreDocument finished", async (t) => {
	await new Promise(async (testResolve) => {
		let isStoredOnDb = false;
		let loadCalls = 0;

		const server = await newHocuspocus({
			async onStoreDocument({ instance }) {
				return new Promise((resolve) => {
					setTimeout(() => {
						isStoredOnDb = true;
						resolve(true);
					}, 200);
				});
			},
			async onLoadDocument() {
				return new Promise((resolve) => {
					if (loadCalls > 0) {
						t.true(isStoredOnDb);
						testResolve(true);
					}

					loadCalls += 1;
					resolve(true);
				});
			},
		});

		const provider = newHocuspocusProvider(server);
		provider.on("synced", () => {
			// Dummy change to trigger onStoreDocument
			provider.document.getArray("foo").push(["foo"]);
			provider.configuration.websocketProvider.disconnect();

			setTimeout(() => {
				const provider2 = newHocuspocusProvider(server);

				provider2.on("synced", () => {
					provider2.configuration.websocketProvider.disconnect();
					testResolve(true);
					t.pass();
				});
			}, 50);
		});
	});
});

test("waits before calling onStoreDocument after the last user disconnects when configured", async (t) => {
	await new Promise(async (resolve) => {
		let startTime = 0;
		const server = await newHocuspocus({
			unloadImmediately: false,
			debounce: 500,
			async onStoreDocument() {
				const endTime = Date.now();
				if (startTime === 0) {
					t.fail("startTime not set");
				} else if (endTime - startTime < 500) {
					t.fail("did not wait 500ms to call onStoreDocument when closing");
				} else {
					t.pass();
				}
				resolve("done");
			},
		});

		const socket = newHocuspocusProviderWebsocket(server);

		const provider = newHocuspocusProvider(server, {
			websocketProvider: socket,
			onSynced() {
				// Dummy change to trigger onStoreDocument
				provider.document.getArray("foo").push(["foo"]);
				startTime = Date.now();
				socket.destroy();
			},
		});
	});
});

test("calls debounced onStoreDocument immediately after the last user disconnects when configured", async (t) => {
	await new Promise(async (resolve) => {
		let startTime = 0;
		const server = await newHocuspocus({
			unloadImmediately: true,
			debounce: 500,
			async onStoreDocument() {
				const endTime = Date.now();
				if (startTime === 0) {
					t.fail("startTime not set");
				} else if (endTime - startTime < 500) {
					t.pass();
				} else {
					t.fail("did not call onStoreDocument immediately when closing");
				}
				resolve("done");
			},
		});

		const socket = newHocuspocusProviderWebsocket(server);

		const provider = newHocuspocusProvider(server, {
			websocketProvider: socket,
			onSynced() {
				// Dummy change to trigger onStoreDocument
				provider.document.getArray("foo").push(["foo"]);
				startTime = Date.now();
				socket.destroy();
			},
		});
	});
});

test("does not call the onStoreDocument hook if document is not changed after the last user disconnects", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onStoreDocument() {
				t.fail(
					"no need to call onStoreDocument if the document is not changed",
				);
			},
		});

		const socket = newHocuspocusProviderWebsocket(server);

		const provider = newHocuspocusProvider(server, {
			websocketProvider: socket,
			onSynced() {
				socket.destroy();
			},
		});

		setTimeout(() => {
			resolve("done");
		}, 200);
	});
	t.pass();
});

test("does not start a new onStoreDocument if there is already one running (should wait for the first one to finish)", async (t) => {
	/*
	If our storage backend takes more time than the debounce time to store the document, 
	we might end up in a situation where multiple onStoreDocument calls are running at the same time.

	Rough timeline:

  1.  ~0ms     Client 1 connects
  2.  ~10ms    Client 1 makes change 1 (triggers debounced save)
  3.  ~100ms  Server starts saving change 1 (debounced)
  4.  ~200ms  Client 1 makes change 2 (triggers debounced save)
  6.  ~510ms  Server finishes saving change 1.
  6.  ~511ms  Server starts saving change 2 (debounced)
  7.  ~1111ms  Server finishes saving change 2.
  */

	await new Promise(async (resolve) => {
		let started = 0
		let finished = 0
		const server = await newHocuspocus({
			debounce: 100,
			async onStoreDocument() {
				if (started === 1) {
					// This is the second call
					t.is(finished, 1, "the first call must have finished before starting the second");
					resolve("done");
				} else {
					started++
					await sleep(500) // Simulate long save
					finished++
				}
			},
		});

		const socket1 = newHocuspocusProviderWebsocket(server);
		const provider1 = newHocuspocusProvider(server, {
			websocketProvider: socket1,
			async onSynced() {
				// Change 1
				provider1.document.getArray("foo").push(["foo"]);
        setTimeout(() => {
					// Change 2
          provider1.document.getArray("foo").push(["bar"]);
          socket1.destroy();
        }, 200)
			},
		});
	});
})

test("triggers unload only after finishing with a save in progress", async (t) => {
	/*
	Rough timeline:

  1.  ~0ms     Client 1 connects
  2.  ~10ms    Client 1 makes change 1 (triggers debounced save)
  3.  ~1000ms  Server starts saving change 1 (debounced)
	4.  ~1100ms	 Client 1 disconnects. Document is not unloaded because save is in progress.
  5.  ~1500ms  Server finishes saving change 1. Document is unloaded
	*/
		await new Promise(async (resolve) => {
			const start = Date.now()
			let saveStarted = false
			let saveFinished = false
			const server = await newHocuspocus({
				debounce: 1000,
				extensions: [{
					async onStoreDocument() {
						saveStarted = true
						await sleep(500) // Add pause to simulate long save
						saveFinished = true
					},
					async afterUnloadDocument(data) {
						t.deepEqual(saveFinished, true, "Unload should occur only after save was finished");
						t.pass()
						resolve("done");
					},
				}],
			});
			const socket1 = newHocuspocusProviderWebsocket(server);
			const provider1 = newHocuspocusProvider(server, {
				websocketProvider: socket1,
				async onSynced() {
					provider1.document.getArray("foo").push(["foo"]);
					setTimeout(() => { // Wait for sending changes
						socket1.destroy();
					}, 1100)
				},
			});
		})
})

test("does not trigger unload prematurely when a save is in progress (unloadImmediately=true)", async (t) => {
  /*
	Rough timeline:

  1.  ~0ms     Client 1 connects
  2.  ~10ms    Client 1 makes change 1 (triggers debounced save)
  3.  ~1000ms  Server starts saving change 1 (debounced)
  4.  ~1100ms  Client 1 makes change 2 (triggers debounced save)
  5.  ~1300ms  Client 1 disconnects, triggering immediate save of change 2
  6.  ~1500ms  Server finishes saving change 1. Does not unload the document, because change 2 is still being saved.
  7.  ~1600ms  Client 2 connects, loads document
  9.  ~1800ms  Server finishes saving change 2.
  10. ~2100ms  We verify that Client 2 sees both changes.
  */
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			debounce: 1000,
      extensions: [new SlowInMemoryStorage()],			
		});

		const socket1 = newHocuspocusProviderWebsocket(server);
		const provider1 = newHocuspocusProvider(server, {
			websocketProvider: socket1,
      
			async onSynced() {
				provider1.document.getArray("foo").push(["foo"]);
        setTimeout(() => {
          provider1.document.getArray("foo").push(["bar"]);
          setTimeout(() => { // Wait for sending changes
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
          setTimeout(() => {
            const value = provider2.document.getArray("foo").toArray()
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

  Rough timeline:

  1.  ~0ms     Client 1 connects
  2.  ~10ms    Client 1 makes a change 1 (triggers debounced save)
  3.  ~1000ms  Server starts saving change 1 (debounced)
  4.  ~1100ms  Client 1 makes change 2 (triggers debounced save)
  5.  ~1300ms  Client 1 disconnects, while change 2 is still being debounced
  6.  ~1500ms  Server finishes saving change 1. Does not unload the document, because change 2 is still being debounced.
  7.  ~1600ms  Client 2 connects
  8.  ~2000ms  Server starts saving change 2 (debounced)
  9.  ~2500ms  Server finishes saving change 2
  10. ~3000ms  We verify that Client 2 sees both changes.

  */

	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			debounce: 1000,
      unloadImmediately: false,
      extensions: [new SlowInMemoryStorage()],			
		});

		const socket1 = newHocuspocusProviderWebsocket(server);
		const provider1 = newHocuspocusProvider(server, {
			websocketProvider: socket1,
      
			async onSynced() {
				provider1.document.getArray("foo").push(["foo"]);
			},
		});
    setTimeout(() => {
        provider1.document.getArray("foo").push(["bar"]);
        setTimeout(() => { // Wait for sending changes
          socket1.destroy();
        }, 200)        
    }, 1100)

    setTimeout(() => {
      const socket2 = newHocuspocusProviderWebsocket(server);
      const provider2 = newHocuspocusProvider(server, {
        websocketProvider: socket2,        
        async onSynced() {
          setTimeout(() => {
            t.deepEqual(getCurrentValue(provider2.document), ["foo", "bar"], "Client 2 should see both changes");
            t.pass()
            resolve("done");
          }, 1500)				
        },
      });
    }, 1600)
		

	});
});

const getCurrentValue = (doc: Y.Doc) => doc.getArray("foo").toArray()

class SlowInMemoryStorage implements Extension {
  state: Uint8Array<ArrayBufferLike> | null = null
  async onStoreDocument(data: onStoreDocumentPayload) {
    const stateToSave = Y.encodeStateAsUpdate(data.document) // Capture state to save immediately
    await sleep(500) // Add pause to simulate long save
    this.state = stateToSave
  }
  async onLoadDocument(data: onLoadDocumentPayload) {
    if (this.state) {
      Y.applyUpdate(data.document, this.state)
    }
  }
}