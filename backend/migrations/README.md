## Database Migrations

This project is intended to use Alembic for schema migrations on top of the
SQLAlchemy models defined in `database.py`.

Suggested setup (to be completed in your environment):

1. Install Alembic:

   ```bash
   pip install alembic
   ```

2. Initialize an Alembic environment at the project root:

   ```bash
   alembic init backend/migrations
   ```

3. Configure `backend/migrations/env.py` to target the `Base` metadata from
   `backend.database` and to read the `DATABASE_URL` from your environment or
   `backend.config`.

4. Generate your initial migration from the current models:

   ```bash
   alembic revision --autogenerate -m "initial schema"
   ```

5. Apply migrations with:

   ```bash
   alembic upgrade head
   ```

For local development with SQLite, you can continue using the existing DB
file; for production, plan to point `DATABASE_URL` to a PostgreSQL instance
and use the same migration workflow.

