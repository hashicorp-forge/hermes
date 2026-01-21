# PostgreSQL Database Setup

This guide covers setting up PostgreSQL as the database for Hermes.

## Overview

PostgreSQL provides:
- **Persistent storage** for all application data
- **ACID compliance** for data integrity
- **Relational queries** for complex data relationships
- **Full-text search** capabilities (optional, use with Meilisearch/Algolia)
- **Scalability** for production workloads

## Data Stored in PostgreSQL

Hermes uses PostgreSQL as the source of truth for:
- **Documents**: Metadata, status, ownership, approval workflows
- **Users**: User profiles, permissions, preferences
- **Products**: Product/team definitions and abbreviations
- **Projects**: Project information and Jira links
- **Reviews**: Document review requests and approvals
- **Drafts**: Draft document associations
- **Recently Viewed**: User activity tracking

## Quick Start (Docker)

### Using Testing Environment

The easiest way to run PostgreSQL locally:

```bash
# Start PostgreSQL with all services
cd testing
docker compose up -d

# PostgreSQL available at:
# - Native mode: localhost:5432
# - Testing mode: localhost:5433
```

### Using Root Makefile

From the repository root:

```bash
# Start PostgreSQL
make docker/postgres/start

# Check status
docker compose ps postgres

# Stop PostgreSQL
make docker/postgres/stop
```

### Standalone Docker

Run just PostgreSQL:

```bash
docker run -d \
  --name hermes-postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hermes \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15
```

## Production Deployment

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: hermes-postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=hermes
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=hermes
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hermes"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Start with:
```bash
export POSTGRES_PASSWORD="your-secure-password"
docker compose up -d
```

### Managed Services

**Recommended for production**:

- **AWS RDS for PostgreSQL**: Managed, auto-backups, multi-AZ
- **Google Cloud SQL**: Managed, high availability
- **Azure Database for PostgreSQL**: Managed, built-in security
- **Heroku Postgres**: Simple, integrated with Heroku apps
- **DigitalOcean Managed Databases**: Cost-effective managed option

### Native Installation

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS**:
```bash
brew install postgresql@15
brew services start postgresql@15
```

**RHEL/CentOS**:
```bash
sudo yum install postgresql15-server
sudo postgresql-15-setup initdb
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15
```

## Configuration

### Hermes Backend Configuration

Add to your `config.hcl`:

```hcl
database {
  host     = "localhost"
  port     = 5432
  dbname   = "hermes"
  user     = "postgres"
  password = "postgres"  # Use secure password in production!
  
  # Optional: Additional connection parameters
  sslmode  = "disable"   # Use "require" in production
}
```

### Environment Variables (Recommended for Production)

Instead of hardcoding credentials:

```bash
export HERMES_SERVER_POSTGRES_HOST="localhost"
export HERMES_SERVER_POSTGRES_PORT="5432"
export HERMES_SERVER_POSTGRES_DBNAME="hermes"
export HERMES_SERVER_POSTGRES_USER="hermes"
export HERMES_SERVER_POSTGRES_PASSWORD="your-secure-password"
export HERMES_SERVER_POSTGRES_SSLMODE="require"
```

### Port Conventions

**Native Development**:
- PostgreSQL: `localhost:5432`
- Database: `hermes`
- User: `postgres`
- Password: `postgres`

**Testing Environment**:
- PostgreSQL: `localhost:5433` (external), `postgres:5432` (inside Docker)
- Database: `hermes`
- User: `postgres`
- Password: `postgres`

## Database Schema

### Auto-Migration

Hermes automatically migrates the database schema on startup using GORM AutoMigrate:

```bash
# First run creates all tables
./hermes server -config=config.hcl

# Output:
# [info] Running database migrations...
# [info] Database migrations completed
```

### Manual Schema Inspection

Connect to database:

```bash
# Using psql
psql -h localhost -p 5432 -U postgres -d hermes

# List tables
\dt

# Describe table
\d documents

# Run query
SELECT id, title, doc_type, status FROM documents LIMIT 10;
```

### Main Tables

**`documents`**: Core document metadata
- `id`, `google_file_id`, `title`, `doc_type`, `doc_number`
- `product`, `status`, `summary`, `contributors`, `approvers`
- `created_at`, `updated_at`, `published_at`

**`users`**: User profiles
- `id`, `email_address`, `first_name`, `last_name`
- `photo_url`, `created_at`, `updated_at`

**`products`**: Product/team definitions
- `id`, `name`, `abbreviation`, `created_at`, `updated_at`

**`document_reviews`**: Review requests
- `id`, `document_id`, `user_id`, `status`, `created_at`, `updated_at`

**`recently_viewed_docs`**: User activity
- `user_id`, `document_id`, `viewed_at`

**`drafts`**: Draft document associations  
- `id`, `document_id`, `user_id`, `created_at`

**`projects`**: Project definitions
- `id`, `name`, `jira_issue_id`, `created_at`, `updated_at`

## Backup and Recovery

### Using pg_dump

**Full database backup**:
```bash
# Backup to file
pg_dump -h localhost -U postgres hermes > hermes_backup.sql

# Compressed backup
pg_dump -h localhost -U postgres hermes | gzip > hermes_backup.sql.gz

# With timestamp
pg_dump -h localhost -U postgres hermes > hermes_$(date +%Y%m%d_%H%M%S).sql
```

**Restore from backup**:
```bash
# Drop and recreate database
psql -h localhost -U postgres -c "DROP DATABASE hermes;"
psql -h localhost -U postgres -c "CREATE DATABASE hermes;"

# Restore
psql -h localhost -U postgres hermes < hermes_backup.sql

# From compressed backup
gunzip -c hermes_backup.sql.gz | psql -h localhost -U postgres hermes
```

### Docker Volume Backup

**Backup volume**:
```bash
docker run --rm \
  -v hermes_postgres_data:/data \
  -v $(pwd):/backup \
  busybox tar czf /backup/postgres-data-backup.tar.gz /data
```

**Restore volume**:
```bash
# Stop PostgreSQL
docker compose stop postgres

# Restore data
docker run --rm \
  -v hermes_postgres_data:/data \
  -v $(pwd):/backup \
  busybox tar xzf /backup/postgres-data-backup.tar.gz -C /

# Restart PostgreSQL
docker compose start postgres
```

### Automated Backups

**Cron job** (daily at 2 AM):
```bash
# Add to crontab
0 2 * * * /usr/bin/pg_dump -h localhost -U postgres hermes | gzip > /backups/hermes_$(date +\%Y\%m\%d).sql.gz

# Keep only last 30 days
0 3 * * * find /backups -name "hermes_*.sql.gz" -mtime +30 -delete
```

**Managed services**: AWS RDS, Cloud SQL, and Azure provide automated backup solutions.

## Performance Tuning

### Connection Pooling

Configure in `postgresql.conf`:

```ini
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 5242kB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Indexing

Hermes GORM models define indices automatically. Check with:

```sql
-- List all indices
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Missing indices analysis
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY abs(correlation) DESC;
```

### Monitoring

**Check connections**:
```sql
SELECT count(*) FROM pg_stat_activity;
SELECT * FROM pg_stat_activity WHERE datname = 'hermes';
```

**Check database size**:
```sql
SELECT pg_size_pretty(pg_database_size('hermes'));
```

**Check table sizes**:
```sql
SELECT 
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Slow queries**:
```sql
-- Enable slow query logging in postgresql.conf
log_min_duration_statement = 1000  -- Log queries > 1 second

-- View slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## Security

### Production Security Checklist

- [ ] **Use strong passwords** (not `postgres`)
- [ ] **Enable SSL/TLS** (`sslmode=require`)
- [ ] **Restrict network access** (firewall, security groups)
- [ ] **Create dedicated user** (not superuser `postgres`)
- [ ] **Use environment variables** (not hardcoded passwords)
- [ ] **Enable connection limits** (`max_connections`)
- [ ] **Regular backups** (automated)
- [ ] **Monitor logs** for suspicious activity
- [ ] **Keep PostgreSQL updated** (security patches)

### Create Dedicated User

```sql
-- Connect as postgres superuser
psql -h localhost -U postgres

-- Create user
CREATE USER hermes WITH PASSWORD 'secure-password-here';

-- Create database
CREATE DATABASE hermes OWNER hermes;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hermes TO hermes;

-- Connect to hermes database
\c hermes

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO hermes;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hermes;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hermes;
```

### SSL/TLS Configuration

**Enable SSL in PostgreSQL** (`postgresql.conf`):
```ini
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
ssl_ca_file = '/path/to/root.crt'
```

**Configure Hermes to use SSL** (`config.hcl`):
```hcl
database {
  host     = "localhost"
  port     = 5432
  dbname   = "hermes"
  user     = "hermes"
  password = "secure-password"
  sslmode  = "require"  # Options: disable, require, verify-ca, verify-full
}
```

## Troubleshooting

### Connection Refused

**Cause**: PostgreSQL not running or wrong host/port

**Solution**:
```bash
# Check if running
docker ps | grep postgres
# OR
sudo systemctl status postgresql

# Check config
grep -A5 "^database {" config.hcl

# Test connection
psql -h localhost -p 5432 -U postgres -d hermes -c "SELECT 1;"
```

### Authentication Failed

**Cause**: Wrong username or password

**Solution**:
```bash
# Check environment variables
env | grep POSTGRES

# Reset password (Docker)
docker compose down
docker volume rm hermes_postgres_data
docker compose up -d

# Reset password (native)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'newpassword';"
```

### Database Does Not Exist

**Cause**: Database not created yet

**Solution**:
```bash
# Create database
psql -h localhost -U postgres -c "CREATE DATABASE hermes;"

# Or let Hermes create it on first run
./hermes server -config=config.hcl
```

### Too Many Connections

**Cause**: Connection limit reached

**Solution**:
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'hermes' AND state = 'idle';

-- Increase max_connections in postgresql.conf
max_connections = 200
```

### Slow Queries

**Cause**: Missing indices or inefficient queries

**Solution**:
```sql
-- Analyze tables
ANALYZE;

-- Check for missing indices
EXPLAIN ANALYZE SELECT * FROM documents WHERE doc_type = 'RFC';

-- Create index if needed
CREATE INDEX idx_documents_doc_type ON documents(doc_type);
```

## Migration from Other Databases

Hermes is designed for PostgreSQL only. If migrating from another database:

1. **Export data** from source database
2. **Set up PostgreSQL** (see above)
3. **Configure Hermes** with PostgreSQL connection
4. **Run Hermes** - it will create schema automatically
5. **Import data** using SQL scripts or custom migration tool

## See Also

- [Configuration Documentation](CONFIG_HCL_DOCUMENTATION.md)
- [Testing Environment](../testing/README.md)
- [Makefile Targets](MAKEFILE_ROOT_TARGETS.md) - Database commands
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [GORM Documentation](https://gorm.io/docs/) - ORM used by Hermes
