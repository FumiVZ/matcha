#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CERT_DIR="$SCRIPT_DIR"

# Certificate configuration
DAYS_VALID=365
DOMAIN="localhost"

# Check if certificates already exist
if [ -f "$CERT_DIR/cert.pem" ] && [ -f "$CERT_DIR/key.pem" ]; then
    echo "SSL certificates already exist in $CERT_DIR"
    echo "To regenerate, delete cert.pem and key.pem first"
    exit 0
fi

echo "Generating self-signed SSL certificates..."

# Generate private key and self-signed certificate
openssl req -x509 \
    -nodes \
    -days $DAYS_VALID \
    -newkey rsa:2048 \
    -keyout "$CERT_DIR/key.pem" \
    -out "$CERT_DIR/cert.pem" \
    -subj "/C=FR/ST=IDF/L=Paris/O=42/OU=Matcha/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

if [ $? -eq 0 ]; then
    echo "SSL certificates generated successfully!"
    echo "  Certificate: $CERT_DIR/cert.pem"
    echo "  Private Key: $CERT_DIR/key.pem"
    echo ""
    echo "Note: These are self-signed certificates for development only."
    echo "Your browser will show a security warning - this is expected."
else
    echo "Error generating SSL certificates"
    exit 1
fi
