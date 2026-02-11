
import sys
import os
import time
from datetime import datetime, timedelta

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import get_session, Candidate, Interview, InterviewStatus
from scheduler import find_available_slots, combine_datetime

def setup_data():
    session = get_session()
    # Clear existing interviews for test
    session.query(Interview).delete()
    session.query(Candidate).delete()
    
    # Create a candidate
    candidate = Candidate(
        first_name="Test", last_name="User", email="test@example.com"
    )
    session.add(candidate)
    session.commit()
    
    # Create some interviews to block slots
    base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Block 9:00 AM today
    slot1 = combine_datetime(base_date, "09:00")
    interview1 = Interview(
        candidate_id=candidate.id,
        interview_date=slot1,
        status=InterviewStatus.CONFIRMED.value
    )
    session.add(interview1)
    
    # Block 10:00 AM tomorrow
    slot2 = combine_datetime(base_date + timedelta(days=1), "10:00")
    interview2 = Interview(
        candidate_id=candidate.id,
        interview_date=slot2,
        status=InterviewStatus.PENDING.value
    )
    session.add(interview2)
    
    session.commit()
    candidate_id = candidate.id
    session.close()
    return base_date, candidate_id

def test_find_available_slots():
    base_date, candidate_id = setup_data()
    
    start_date = base_date
    end_date = base_date + timedelta(days=2) # 3 days range
    
    print(f"Testing range: {start_date.date()} to {end_date.date()}")
    
    # Measure time
    start_time = time.time()
    slots = find_available_slots(start_date, end_date)
    duration = time.time() - start_time
    
    print(f"Found {len(slots)} slots in {duration:.4f} seconds")
    
    # Verify correctness
    # 9:00 AM today should be missing
    slot1 = combine_datetime(base_date, "09:00")
    if slot1 in slots:
        print("FAIL: 9:00 AM today should be blocked but was found available")
    else:
        print("PASS: 9:00 AM today is correctly blocked")
        
    # 10:00 AM tomorrow should be missing
    slot2 = combine_datetime(base_date + timedelta(days=1), "10:00")
    if slot2 in slots:
        print("FAIL: 10:00 AM tomorrow should be blocked but was found available")
    else:
        print("PASS: 10:00 AM tomorrow is correctly blocked")
        
    # 9:30 AM today should be available
    slot3 = combine_datetime(base_date, "09:30")
    if slot3 in slots:
        print("PASS: 9:30 AM today is correctly available")
    else:
        print("FAIL: 9:30 AM today should be available but was not found")

    # Test exclusion logic
    # If we exclude the candidate who has the interview, the slot might still be blocked 
    # if the logic allows 1 interview per slot total.
    # Current logic: "if existing_interviews < 1". So if ANYONE has an interview, it's blocked.
    # But wait, find_available_slots has `exclude_candidate_id`.
    # logic says: if existing_interviews < 1: ... check candidate conflict.
    # So if I am the candidate, and I have an interview, `existing_interviews` will be 1.
    # So it returns BLOCKED.
    # This seems to verify "General Availability".
    
if __name__ == "__main__":
    test_find_available_slots()
