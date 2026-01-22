#!/bin/bash

# Generate a secure JWT secret for Supabase Edge Functions
# This script generates a cryptographically secure random secret
# that is at least 256 bits (32 bytes) as required by the JWT signing algorithm.

set -e

# Generate 32 bytes (256 bits) of random data and encode as base64
# Using openssl for cross-platform compatibility
if command -v openssl &> /dev/null; then
    SECRET=$(openssl rand -base64 32)
elif command -v /usr/bin/openssl &> /dev/null; then
    SECRET=$(/usr/bin/openssl rand -base64 32)
else
    echo "Error: openssl is required but not found. Please install openssl." >&2
    exit 1
fi

# Remove any newlines that might be added
SECRET=$(echo -n "$SECRET" | tr -d '\n')

echo "Generated JWT secret:"
echo ""
echo "$SECRET"
echo ""
echo "To use this secret, set it as an environment variable:"
echo "  export JWT_SECRET=\"$SECRET\""
echo ""
echo "Or add it to your Supabase secrets:"
echo "  supabase secrets set JWT_SECRET=\"$SECRET\""
echo ""
echo "Note: Keep this secret secure and never commit it to version control!"
