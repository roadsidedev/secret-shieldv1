// KeySpot native sealed-memory core.
// Phase 7: constant-time HMAC, zeroizing secret buffers, and
// fast-path regex scanning via napi-rs (Node N-API) and eventually PyO3.
//
// Usage from Node:
//   const native = require('@keyspot/native');
//   native.hmacSign(key, data)      -> Buffer
//   native.hmacVerify(key, data, tag) -> bool
//   native.scanSecrets(text)        -> Vec<ScanMatch>
//   native.zeroizeBuffer(buf)       -> void

use napi::bindgen_prelude::*;
use napi_derive::napi;
use once_cell::sync::Lazy;
use regex::Regex;
use zeroize::Zeroize;

// ═══════════════════════════════════════════════════════════════════
// Sealed memory
// ═══════════════════════════════════════════════════════════════════

/// A heap-allocated buffer that zeroizes its contents on drop.
/// Use for secret material that should not persist after use.
#[napi]
pub struct SecretBuffer {
    inner: Vec<u8>,
}

#[napi]
impl SecretBuffer {
    #[napi(constructor)]
    pub fn new(size: i32) -> Self {
        Self {
            inner: vec![0u8; size as usize],
        }
    }

    pub fn write(&mut self, data: Buffer) {
        let len = data.len().min(self.inner.len());
        self.inner[..len].copy_from_slice(&data[..len]);
    }

    pub fn read(&self) -> Buffer {
        self.inner.clone().into()
    }

    pub fn len(&self) -> i32 {
        self.inner.len() as i32
    }
}

impl Drop for SecretBuffer {
    fn drop(&mut self) {
        self.inner.zeroize();
    }
}

/// Overwrite a buffer with zeros. Use for raw V8 buffers.
#[napi]
pub fn zeroize_buffer(mut buf: Buffer) {
    for b in buf.as_mut() {
        *b = 0;
    }
}

// ═══════════════════════════════════════════════════════════════════
// Constant-time HMAC-SHA256
// ═══════════════════════════════════════════════════════════════════

#[napi]
pub fn hmac_sign(key: Buffer, data: Buffer) -> Buffer {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    type HmacSha256 = Hmac<Sha256>;

    let mut mac = HmacSha256::new_from_slice(&key).expect("HMAC key");
    mac.update(&data);
    mac.finalize().into_bytes().to_vec().into()
}

/// Verify a HMAC-SHA256 tag in constant time. Returns true if valid.
#[napi]
pub fn hmac_verify(key: Buffer, data: Buffer, tag: Buffer) -> bool {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    type HmacSha256 = Hmac<Sha256>;

    let mut mac = match HmacSha256::new_from_slice(&key) {
        Ok(m) => m,
        Err(_) => return false,
    };
    mac.update(&data);
    let expected = mac.finalize().into_bytes();
    constant_time_eq(&expected, &tag)
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut result = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}

// ═══════════════════════════════════════════════════════════════════
// Fast-path secret scanning
// ═══════════════════════════════════════════════════════════════════

#[napi(object)]
#[derive(Clone)]
pub struct ScanMatch {
    pub pattern: String,
    pub value: String,
    pub start: i32,
    pub end: i32,
}

static SCAN_PATTERNS: Lazy<Vec<(Regex, &str)>> = Lazy::new(|| {
    vec![
        (Regex::new(r"sk-[a-zA-Z0-9]{48}").unwrap(), "openai_api_key"),
        (Regex::new(r"sk-ant-api03-[a-zA-Z0-9_-]{86}-[a-zA-Z0-9_-]{8}").unwrap(), "anthropic_api_key"),
        (Regex::new(r"\bAKIA[0-9A-Z]{16}\b").unwrap(), "aws_access_key"),
        (Regex::new(r"\b(?:0x)?[a-fA-F0-9]{64}\b").unwrap(), "ethereum_private_key"),
        (Regex::new(r"\b[1-9A-HJ-NP-Za-km-z]{87,88}\b").unwrap(), "solana_private_key"),
        (Regex::new(r"\bAIza[0-9A-Za-z\-_]{35}\b").unwrap(), "google_ai_key"),
        (Regex::new(r"\bhf_[a-zA-Z0-9]{34,50}\b").unwrap(), "huggingface_token"),
        (Regex::new(r"\bghp_[a-zA-Z0-9]{36}\b").unwrap(), "github_token"),
        (Regex::new(r"\b(sk_live|pk_live)_[0-9a-zA-Z]{24,34}\b").unwrap(), "stripe_live_key"),
        (Regex::new(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----").unwrap(), "private_key_block"),
    ]
});

/// Scan text for common secret patterns using the native regex engine.
/// Returns matches with pattern name, matched value, and byte offsets.
/// The value field is provided for detection confirmation; it should be
/// redacted before returning to untrusted surfaces.
#[napi]
pub fn scan_secrets(text: String) -> Vec<ScanMatch> {
    let mut results = Vec::new();
    for (re, name) in SCAN_PATTERNS.iter() {
        for cap in re.captures_iter(&text) {
            if let Some(m) = cap.get(0) {
                results.push(ScanMatch {
                    pattern: name.to_string(),
                    value: m.as_str().to_string(),
                    start: m.start() as i32,
                    end: m.end() as i32,
                });
            }
        }
    }
    results
}

/// Returns true if the code is running with napi-rs native bindings.
/// Useful for feature detection from JS.
#[napi]
pub fn is_native_available() -> bool {
    true
}

// ═══════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hmac() {
        let key = b"test-key-32-bytes-long-for-hmac!".to_vec();
        let data = b"hello-world".to_vec();
        let tag = hmac_sign(key.clone().into(), data.clone().into());
        assert!(hmac_verify(key.clone().into(), data.clone().into(), tag.clone().into()));
        assert!(!hmac_verify(key.clone().into(), b"wrong-data".to_vec().into(), tag.into()));
    }

    #[test]
    fn test_constant_time() {
        assert!(!constant_time_eq(b"abc", b"abd"));
        assert!(!constant_time_eq(b"abc", b"ab"));
        assert!(constant_time_eq(b"abc", b"abc"));
    }

    #[test]
    fn test_secret_buffer() {
        let mut buf = SecretBuffer::new(32);
        assert_eq!(buf.len(), 32);
        buf.write(b"hello-world".to_vec().into());
        assert_eq!(buf.read().as_ref(), b"hello-world");
    }

    #[test]
    fn test_zeroize() {
        let mut buf = SecretBuffer::new(8);
        buf.write(b"secret!".to_vec().into());
        drop(buf);
        // memory deallocated and zeroized — can't read after move
    }

    #[test]
    fn test_scan_secrets() {
        let text = "My key is sk-123456789012345678901234567890123456789012345678 and AKIA1234567890123456".to_string();
        let results = scan_secrets(text);
        assert!(results.len() >= 2);
        assert!(results.iter().any(|m| m.pattern == "openai_api_key"));
        assert!(results.iter().any(|m| m.pattern == "aws_access_key"));
    }

    #[test]
    fn test_is_native() {
        assert!(is_native_available());
    }
}
