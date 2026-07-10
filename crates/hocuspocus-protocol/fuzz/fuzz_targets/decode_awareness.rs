//! Fuzzes the awareness update decoder directly (the inner bytes of an
//! Awareness envelope), including re-encode of whatever decodes.

#![no_main]

use bytes::Bytes;
use libfuzzer_sys::fuzz_target;

use hocuspocus_protocol::AwarenessUpdate;

fuzz_target!(|data: &[u8]| {
    if let Ok(update) = AwarenessUpdate::decode_bytes(Bytes::copy_from_slice(data)) {
        // Anything that decodes must re-encode without panicking.
        let _ = update.to_bytes();
    }
});
