import random
from datetime import datetime, timedelta
from faker import Faker
from database import get_session, Candidate, Interview, InterviewStatus

fake_us = Faker('en_US')
fake_uk = Faker('en_GB')

def seed_database():
    session = get_session()
    print("--- Seeding Database ---")
    
    try:
        # 1. Clear existing data
        print("Clearing existing data...")
        session.query(Interview).delete()
        session.query(Candidate).delete()
        session.commit()
        print("Data cleared.")

        candidates = []

        # 2. Generate 50 US Candidates
        print("Generating 50 US Candidates...")
        for _ in range(50):
            c = Candidate(
                first_name=fake_us.first_name(),
                last_name=fake_us.last_name(),
                email=fake_us.unique.email(),
                phone=fake_us.phone_number(),
                country="US",
                address=fake_us.address().replace('\n', ', '),
                citizenship="United States",
                notes=fake_us.sentence(),
                created_at=fake_us.date_time_between(start_date='-30d', end_date='now')
            )
            candidates.append(c)

        # 3. Generate 50 UK Candidates
        print("Generating 50 UK Candidates...")
        for _ in range(50):
            c = Candidate(
                first_name=fake_uk.first_name(),
                last_name=fake_uk.last_name(),
                email=fake_uk.unique.email(),
                phone=fake_uk.phone_number(),
                country="UK",
                address=fake_uk.address().replace('\n', ', '),
                citizenship="United Kingdom",
                notes=fake_uk.sentence(),
                created_at=fake_uk.date_time_between(start_date='-30d', end_date='now')
            )
            candidates.append(c)

        session.add_all(candidates)
        session.commit()
        print(f"Created {len(candidates)} candidates.")

        # 4. Generate Random Interviews
        print("Generating Random Interviews...")
        # Assign interviews to ~40% of candidates
        interview_candidates = random.sample(candidates, k=40)
        
        interviews = []
        for cand in interview_candidates:
            # Random date in recent past or near future
            dt = fake_us.date_time_between(start_date='-10d', end_date='+20d')
            
            # Status based on date
            if dt < datetime.now():
                status = random.choice([InterviewStatus.COMPLETED.value, InterviewStatus.CANCELLED.value, InterviewStatus.CONFIRMED.value]) # specific logic?
                # Actually, if date is past and confirmed, it's effectively 'missed' or 'needs feedback', but let's stick to simple statuses
            else:
                status = random.choice([InterviewStatus.PENDING.value, InterviewStatus.CONFIRMED.value])
                
            i = Interview(
                candidate_id=cand.id,
                interview_date=dt,
                interview_time=dt.strftime("%H:%M"),
                day_of_week=dt.strftime("%A").upper(),
                status=status,
                meet_link=f"https://meet.google.com/{fake_us.lexify(text='???-????-???')}",
                notes=fake_us.sentence(),
                email_sent=True,
                email_sent_at=dt - timedelta(days=1)
            )
            interviews.append(i)
        
        session.add_all(interviews)
        session.commit()
        print(f"Created {len(interviews)} interviews.")
        print("--- Seeding Complete ---")

    except Exception as e:
        print(f"Error seeding database: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    seed_database()
