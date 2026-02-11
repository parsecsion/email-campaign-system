import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_session, Candidate, init_db
from sqlalchemy import inspect
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_consolidation():
    session = get_session()
    try:
        # 1. Check Schema
        logger.info("Checking schema...")
        inspector = inspect(session.get_bind())
        columns = [c['name'] for c in inspector.get_columns('candidates')]
        
        assert 'country' in columns, "country column missing"
        assert 'address' in columns, "address column missing"
        assert 'citizenship' in columns, "citizenship column missing"
        logger.info("Schema verification passed.")

        # 2. Check UK Candidates Migration
        logger.info("Checking migration...")
        uk_count = session.query(Candidate).filter(Candidate.country == 'UK').count()
        logger.info(f"Found {uk_count} UK candidates.")
        assert uk_count > 0, "No UK candidates found (migration might have failed or database was empty)"
        
        # 3. Check specific migrated data (if known, otherwise just count is acceptable for now)
        sample = session.query(Candidate).filter(Candidate.country == 'UK').first()
        if sample:
            logger.info(f"Sample UK candidate: {sample.first_name} {sample.last_name}, {sample.country}")

        # 4. Check Table Drop
        tables = inspector.get_table_names()
        assert 'uk_candidates' not in tables, "uk_candidates table still exists"
        logger.info("uk_candidates table dropped successfully.")
        
    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    test_consolidation()
