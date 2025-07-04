#!/bin/bash
set -e

# Parse the POSTGRES_MULTIPLE_DATABASES environment variable
# Format: database1:user1:password1,database2:user2:password2
IFS=',' read -ra DATABASES <<< "$POSTGRES_MULTIPLE_DATABASES"

for db_config in "${DATABASES[@]}"; do
    IFS=':' read -ra DB_PARTS <<< "$db_config"
    database="${DB_PARTS[0]}"
    username="${DB_PARTS[1]}"
    password="${DB_PARTS[2]}"

    echo "Creating database '$database' with user '$username'"

    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        -- Create user if not exists
        DO
        \$do\$
        BEGIN
            IF NOT EXISTS (
                SELECT FROM pg_catalog.pg_user
                WHERE usename = '$username'
            ) THEN
                CREATE USER $username WITH PASSWORD '$password';
            END IF;
        END
        \$do\$;

        -- Create database
        CREATE DATABASE $database;
        GRANT ALL PRIVILEGES ON DATABASE $database TO $username;

        -- Connect to the new database and set permissions
        \c $database;
        GRANT ALL ON SCHEMA public TO $username;
EOSQL
done

echo "Multiple databases created successfully"