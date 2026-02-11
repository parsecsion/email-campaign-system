## Maintenance and Utility Scripts

This directory is intended to hold one-off maintenance, verification, and data
scripts used during development and operations of the Email Campaign System.

Over time, scripts from the project root and `backend/` may be moved or
consolidated here (for example: database audits, seeders, and scheduler
reproduction scripts). When adding new scripts, prefer placing them in this
directory rather than the repository root, and include a short comment at the
top explaining:

- what the script does,
- whether it is safe to run against production data, and
- any required environment variables or command-line arguments.

