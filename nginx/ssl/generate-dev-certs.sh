#!/bin/bash
# =============================================================================
# Generate Self-Signed SSL Certificates for Development
# =============================================================================
# This script generates self-signed certificates for local development.
# DO NOT use these in production - use Let's Encrypt or a trusted CA instead.
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSL_DIR="${SCRIPT_DIR}"

# Certificate configuration
DAYS=365
KEY_SIZE=2048
COUNTRY="FI"
STATE="Central Finland"
LOCALITY="Jyvaskyla"
ORGANIZATION="Snackbar Development"
COMMON_NAME="localhost"

echo "=== Generating Development SSL Certificates ==="
echo "Output directory: ${SSL_DIR}"

# Generate private key
echo "Generating private key..."
openssl genrsa -out "${SSL_DIR}/privkey.pem" ${KEY_SIZE}

# Generate certificate signing request
echo "Generating CSR..."
openssl req -new \
    -key "${SSL_DIR}/privkey.pem" \
    -out "${SSL_DIR}/csr.pem" \
    -subj "/C=${COUNTRY}/ST=${STATE}/L=${LOCALITY}/O=${ORGANIZATION}/CN=${COMMON_NAME}"

# Generate self-signed certificate
echo "Generating self-signed certificate..."
openssl x509 -req \
    -days ${DAYS} \
    -in "${SSL_DIR}/csr.pem" \
    -signkey "${SSL_DIR}/privkey.pem" \
    -out "${SSL_DIR}/fullchain.pem" \
    -extfile <(printf "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1")

# Clean up CSR
rm -f "${SSL_DIR}/csr.pem"

# Set permissions
chmod 600 "${SSL_DIR}/privkey.pem"
chmod 644 "${SSL_DIR}/fullchain.pem"

echo ""
echo "=== SSL Certificates Generated Successfully ==="
echo "Private Key: ${SSL_DIR}/privkey.pem"
echo "Certificate: ${SSL_DIR}/fullchain.pem"
echo ""
echo "WARNING: These are self-signed certificates for development only!"
echo "For production, use Let's Encrypt or a trusted CA."
