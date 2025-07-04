#!/bin/bash

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to be ready..."
until curl -sf http://localhost:8080/health/ready > /dev/null; do
  sleep 5
done

echo "Keycloak is ready. Setting up realm and client..."

# Get admin token
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Failed to get admin token"
  exit 1
fi

# Create Fountane realm
echo "Creating Fountane realm..."
curl -X POST "http://localhost:8080/admin/realms" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "realm": "fountane",
    "enabled": true,
    "displayName": "Fountane AI",
    "loginTheme": "keycloak",
    "accessTokenLifespan": 3600,
    "ssoSessionIdleTimeout": 1800,
    "ssoSessionMaxLifespan": 36000,
    "registrationAllowed": false,
    "resetPasswordAllowed": true,
    "rememberMe": true,
    "verifyEmail": false,
    "loginWithEmailAllowed": true,
    "duplicateEmailsAllowed": false,
    "bruteForceProtected": true,
    "permanentLockout": false,
    "maxFailureWaitSeconds": 900,
    "minimumQuickLoginWaitSeconds": 60,
    "waitIncrementSeconds": 60,
    "quickLoginCheckMilliSeconds": 1000,
    "maxDeltaTimeSeconds": 43200,
    "failureFactor": 30
  }'

# Create auth service client
echo "Creating auth service client..."
curl -X POST "http://localhost:8080/admin/realms/fountane/clients" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "fountane-auth-service",
    "enabled": true,
    "clientAuthenticatorType": "client-secret",
    "secret": "secret",
    "serviceAccountsEnabled": true,
    "authorizationServicesEnabled": false,
    "publicClient": false,
    "frontchannelLogout": false,
    "protocol": "openid-connect",
    "fullScopeAllowed": true,
    "nodeReRegistrationTimeout": -1,
    "defaultClientScopes": [
      "web-origins",
      "profile",
      "roles",
      "email"
    ],
    "optionalClientScopes": [
      "address",
      "phone",
      "offline_access",
      "microprofile-jwt"
    ]
  }'

# Create default roles
echo "Creating default roles..."
for role in "admin" "developer" "user" "viewer"; do
  curl -X POST "http://localhost:8080/admin/realms/fountane/roles" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$role\",
      \"description\": \"Default $role role\",
      \"composite\": false,
      \"clientRole\": false
    }"
done

# Create a test user
echo "Creating test user..."
curl -X POST "http://localhost:8080/admin/realms/fountane/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test@example.com",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "enabled": true,
    "emailVerified": true,
    "attributes": {
      "tenantId": ["default"]
    },
    "credentials": [{
      "type": "password",
      "value": "password123",
      "temporary": false
    }]
  }'

# Get test user ID
TEST_USER_ID=$(curl -s -X GET "http://localhost:8080/admin/realms/fountane/users?username=test@example.com" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Assign user role to test user
if [ ! -z "$TEST_USER_ID" ]; then
  # Get user role ID
  USER_ROLE_ID=$(curl -s -X GET "http://localhost:8080/admin/realms/fountane/roles" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    | grep -B1 '"name":"user"' | grep '"id":"' | cut -d'"' -f4)
  
  # Assign role
  curl -X POST "http://localhost:8080/admin/realms/fountane/users/$TEST_USER_ID/role-mappings/realm" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "[{\"id\": \"$USER_ROLE_ID\", \"name\": \"user\"}]"
fi

echo "Keycloak setup complete!"
echo ""
echo "Test credentials:"
echo "  Username: test@example.com"
echo "  Password: password123"
echo "  Tenant ID: default"
echo ""
echo "Admin console: http://localhost:8080/admin"
echo "  Username: admin"
echo "  Password: admin"