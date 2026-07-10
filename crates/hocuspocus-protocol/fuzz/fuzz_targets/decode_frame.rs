//! Fuzzes the full inbound path a WebSocket frame takes: envelope decode,
//! then the type-specific payload decoder — exactly what a malicious client
//! controls. Must never panic or allocate absurdly; errors are fine.

#![no_main]

use bytes::Bytes;
use libfuzzer_sys::fuzz_target;

use hocuspocus_protocol::{AuthInbound, AwarenessUpdate, Frame, MessageType, Reader, SyncMessage};

fuzz_target!(|data: &[u8]| {
    let Ok(Frame::Message(envelope)) = Frame::decode(Bytes::copy_from_slice(data)) else {
        return;
    };
    let mut reader = Reader::new(envelope.payload);
    match envelope.kind {
        MessageType::Sync | MessageType::SyncReply => {
            let _ = SyncMessage::decode(&mut reader);
        }
        MessageType::Awareness => {
            if let Ok(inner) = reader.read_var_bytes() {
                let _ = AwarenessUpdate::decode_bytes(inner);
            }
        }
        MessageType::Auth => {
            let _ = AuthInbound::decode(&mut reader);
        }
        MessageType::Stateless | MessageType::BroadcastStateless | MessageType::Close => {
            let _ = reader.read_var_string();
        }
        MessageType::SyncStatus => {
            let _ = reader.read_var_uint();
        }
        _ => {}
    }
});
