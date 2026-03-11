#!/bin/bash
# generate-keystore.sh — Run this ONCE to create signing keystore
# On Android (Termux): pkg install openjdk-17 && chmod +x generate-keystore.sh && ./generate-keystore.sh
# On PC: just run as-is

mkdir -p keystore

keytool -genkeypair \
  -v \
  -keystore keystore/jarvis.keystore \
  -alias jarvis \
  -keyalg RSA \
  -keysize 2048 \
  -validity 36500 \
  -dname "CN=JARVIS, OU=JonsBhai, O=JARVIS, L=Rewa, ST=MP, C=IN" \
  -storepass "jarvis@2025" \
  -keypass "jarvis@2025"

echo ""
echo "✓ Keystore created: keystore/jarvis.keystore"
echo ""
echo "=== YOUR SHA-256 FINGERPRINT (copy this!) ==="
keytool -list -v \
  -keystore keystore/jarvis.keystore \
  -alias jarvis \
  -storepass "jarvis@2025" \
  2>/dev/null | grep "SHA256:" | sed 's/.*SHA256://' | tr -d ' '

echo ""
echo "=== For GitHub Secrets ==="
echo "Base64 keystore (paste as KEYSTORE_BASE64):"
base64 -w 0 keystore/jarvis.keystore
echo ""
echo ""
echo "KEYSTORE_PASSWORD = jarvis@2025"
echo "KEY_PASSWORD = jarvis@2025"
