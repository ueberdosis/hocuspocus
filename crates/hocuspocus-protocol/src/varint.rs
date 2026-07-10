//! lib0-compatible encoding primitives.
//!
//! Matches `lib0/encoding.js` / `lib0/decoding.js` as used by yjs,
//! y-protocols and hocuspocus: unsigned var-ints are little-endian 7-bit
//! groups with a continuation bit; strings and byte arrays are
//! length-prefixed with a var-uint.

use bytes::{Bytes, BytesMut};

use crate::ProtocolError;

/// Reads lib0 primitives from a [`Bytes`] buffer.
///
/// Slices returned for byte arrays are zero-copy views into the original
/// buffer.
#[derive(Debug, Clone)]
pub struct Reader {
    buf: Bytes,
    pos: usize,
}

impl Reader {
    pub fn new(buf: Bytes) -> Self {
        Self { buf, pos: 0 }
    }

    /// Equivalent of lib0 `decoding.hasContent`.
    pub fn has_content(&self) -> bool {
        self.pos < self.buf.len()
    }

    /// Number of unread bytes.
    pub fn remaining(&self) -> usize {
        self.buf.len() - self.pos
    }

    /// Returns the unread portion of the buffer without consuming it.
    pub fn rest(&self) -> Bytes {
        self.buf.slice(self.pos..)
    }

    pub fn read_u8(&mut self) -> Result<u8, ProtocolError> {
        let byte = *self.buf.get(self.pos).ok_or(ProtocolError::UnexpectedEof)?;
        self.pos += 1;
        Ok(byte)
    }

    /// Equivalent of lib0 `decoding.readVarUint`.
    pub fn read_var_uint(&mut self) -> Result<u64, ProtocolError> {
        let mut num: u64 = 0;
        let mut shift: u32 = 0;
        loop {
            let byte = self.read_u8()?;
            if shift >= 64 || (shift == 63 && byte > 1) {
                return Err(ProtocolError::VarIntOverflow);
            }
            num |= u64::from(byte & 0x7f) << shift;
            if byte & 0x80 == 0 {
                return Ok(num);
            }
            shift += 7;
        }
    }

    /// Equivalent of lib0 `decoding.readVarUint8Array`. Zero-copy.
    pub fn read_var_bytes(&mut self) -> Result<Bytes, ProtocolError> {
        let len =
            usize::try_from(self.read_var_uint()?).map_err(|_| ProtocolError::VarIntOverflow)?;
        if self.remaining() < len {
            return Err(ProtocolError::UnexpectedEof);
        }
        let slice = self.buf.slice(self.pos..self.pos + len);
        self.pos += len;
        Ok(slice)
    }

    /// Equivalent of lib0 `decoding.readVarString`.
    pub fn read_var_string(&mut self) -> Result<String, ProtocolError> {
        let bytes = self.read_var_bytes()?;
        String::from_utf8(bytes.to_vec()).map_err(|_| ProtocolError::InvalidUtf8)
    }
}

/// Writes lib0 primitives into a growable buffer.
#[derive(Debug, Default)]
pub struct Writer {
    buf: BytesMut,
}

impl Writer {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            buf: BytesMut::with_capacity(capacity),
        }
    }

    pub fn write_u8(&mut self, byte: u8) {
        self.buf.extend_from_slice(&[byte]);
    }

    /// Equivalent of lib0 `encoding.writeVarUint`.
    pub fn write_var_uint(&mut self, mut num: u64) {
        while num > 0x7f {
            self.write_u8(0x80 | (num as u8 & 0x7f));
            num >>= 7;
        }
        self.write_u8(num as u8 & 0x7f);
    }

    /// Equivalent of lib0 `encoding.writeVarUint8Array`.
    pub fn write_var_bytes(&mut self, bytes: &[u8]) {
        self.write_var_uint(bytes.len() as u64);
        self.buf.extend_from_slice(bytes);
    }

    /// Equivalent of lib0 `encoding.writeVarString`.
    pub fn write_var_string(&mut self, value: &str) {
        self.write_var_bytes(value.as_bytes());
    }

    /// Appends raw bytes without a length prefix.
    pub fn write_raw(&mut self, bytes: &[u8]) {
        self.buf.extend_from_slice(bytes);
    }

    pub fn len(&self) -> usize {
        self.buf.len()
    }

    pub fn is_empty(&self) -> bool {
        self.buf.is_empty()
    }

    /// Freezes the buffer into an immutable, cheaply cloneable [`Bytes`].
    pub fn freeze(self) -> Bytes {
        self.buf.freeze()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn var_uint_roundtrip() {
        // Boundary values around the 7-bit group edges, matching lib0.
        for value in [
            0u64,
            1,
            42,
            127,
            128,
            129,
            16_383,
            16_384,
            1 << 21,
            u32::MAX as u64,
            u64::MAX,
        ] {
            let mut writer = Writer::new();
            writer.write_var_uint(value);
            let mut reader = Reader::new(writer.freeze());
            assert_eq!(reader.read_var_uint().unwrap(), value);
            assert!(!reader.has_content());
        }
    }

    #[test]
    fn var_uint_known_encodings() {
        // Hand-derived from lib0: 7-bit little-endian groups, continuation bit high.
        let cases: &[(u64, &[u8])] = &[
            (0, &[0x00]),
            (127, &[0x7f]),
            (128, &[0x80, 0x01]),
            (300, &[0xac, 0x02]),
            (16_384, &[0x80, 0x80, 0x01]),
        ];
        for (value, expected) in cases {
            let mut writer = Writer::new();
            writer.write_var_uint(*value);
            assert_eq!(&writer.freeze()[..], *expected, "encoding of {value}");
        }
    }

    #[test]
    fn var_string_roundtrip() {
        for value in ["", "a", "my-document", "döc-ümläut-…", "name\0session"] {
            let mut writer = Writer::new();
            writer.write_var_string(value);
            let mut reader = Reader::new(writer.freeze());
            assert_eq!(reader.read_var_string().unwrap(), value);
        }
    }

    #[test]
    fn truncated_input_errors() {
        // Length prefix promises more bytes than available.
        let mut writer = Writer::new();
        writer.write_var_uint(10);
        writer.write_raw(&[1, 2, 3]);
        let mut reader = Reader::new(writer.freeze());
        assert_eq!(reader.read_var_bytes(), Err(ProtocolError::UnexpectedEof));

        // Continuation bit set on the final byte.
        let mut reader = Reader::new(Bytes::from_static(&[0x80]));
        assert_eq!(reader.read_var_uint(), Err(ProtocolError::UnexpectedEof));
    }

    #[test]
    fn var_uint_overflow_errors() {
        // 11 continuation groups exceed 64 bits.
        let mut reader = Reader::new(Bytes::from_static(&[
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01,
        ]));
        assert_eq!(reader.read_var_uint(), Err(ProtocolError::VarIntOverflow));
    }
}
