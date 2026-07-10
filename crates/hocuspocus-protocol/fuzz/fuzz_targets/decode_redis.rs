//! Fuzzes the Redis pub/sub frame decoder and the embedded wire message —
//! what a compromised or misbehaving peer instance controls.

#![no_main]

use bytes::Bytes;
use libfuzzer_sys::fuzz_target;

use hocuspocus_protocol::{redis, Frame};

fuzz_target!(|data: &[u8]| {
    if let Ok(frame) = redis::decode(Bytes::copy_from_slice(data)) {
        let _ = Frame::decode(frame.message);
    }
});
