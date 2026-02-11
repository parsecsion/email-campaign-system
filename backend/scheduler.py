"""
Smart scheduling system for interview management
"""
from datetime import datetime, timedelta
from database import get_session, Candidate, Interview, TimeSlot, InterviewStatus
import re
import logging

logger = logging.getLogger(__name__)

def parse_date_string(date_str):
    """
    Parse date string from CSV format (e.g., "14TH NOV 2025", "15th NOV 2025")
    Returns datetime object or None
    """
    if not date_str or not date_str.strip():
        return None
    
    try:
        # Remove ordinal suffixes (TH, ST, ND, RD)
        date_str = re.sub(r'(\d+)(TH|ST|ND|RD)', r'\1', date_str, flags=re.IGNORECASE)
        date_str = date_str.strip()
        
        # Try different date formats
        formats = [
            "%d %b %Y",      # "14 NOV 2025"
            "%d %B %Y",      # "14 November 2025"
            "%d-%b-%Y",      # "14-NOV-2025"
            "%d/%b/%Y",      # "14/NOV/2025"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        # If all formats fail, try parsing with dateutil (if available)
        # Fallback to manual parsing
        parts = date_str.split()
        if len(parts) >= 3:
            day = int(re.sub(r'\D', '', parts[0]))
            month_str = parts[1].upper()
            year = int(parts[2])
            
            month_map = {
                'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
                'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
            }
            
            if month_str in month_map:
                return datetime(year, month_map[month_str], day)
        
        logger.warning(f"Could not parse date: {date_str}")
        return None
    except Exception as e:
        logger.error(f"Error parsing date '{date_str}': {str(e)}")
        return None

def parse_time_string(time_str):
    """
    Parse time string (e.g., "9:00", "9:30", "1:00")
    Returns time string in HH:MM format
    """
    if not time_str or not time_str.strip():
        return None
    
    time_str = time_str.strip()
    
    # Handle formats like "9:00", "9:30", "1:00"
    if ':' in time_str:
        parts = time_str.split(':')
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        
        # Handle 12-hour format if needed
        if hour < 9:  # Assuming interviews start at 9 AM
            hour += 12
        
        return f"{hour:02d}:{minute:02d}"
    
    return time_str

def combine_datetime(date_obj, time_str):
    """
    Combine date and time into a datetime object
    """
    if not date_obj or not time_str:
        return None
    
    try:
        time_parts = time_str.split(':')
        hour = int(time_parts[0])
        minute = int(time_parts[1]) if len(time_parts) > 1 else 0
        
        return datetime.combine(date_obj.date(), datetime.min.time().replace(hour=hour, minute=minute))
    except Exception as e:
        logger.error(f"Error combining datetime: {str(e)}")
        return None

def normalize_email(email):
    """Normalize email address (strip whitespace, remove spaces)"""
    if not email:
        return None
    email = email.strip()
    email = email.replace(' ', '')
    return email.lower()

def import_candidates_from_csv(csv_data):
    """
    Import candidates and interviews from CSV data
    Returns: (imported_count, errors)
    """
    session = get_session()
    imported = 0
    errors = []
    
    try:
        lines = csv_data.strip().split('\n')
        if len(lines) < 2:
            return 0, ["CSV file must have at least a header row and one data row"]
        
        # Parse header
        header = [h.strip() for h in lines[0].split(',')]
        
        # Map column names (case-insensitive)
        col_map = {}
        for i, col in enumerate(header):
            col_upper = col.upper()
            if 'FIRST NAME' in col_upper or 'FIRSTNAME' in col_upper:
                col_map['first_name'] = i
            elif 'LAST NAME' in col_upper or 'LASTNAME' in col_upper:
                col_map['last_name'] = i
            elif 'EMAIL' in col_upper and 'ADDRESS' in col_upper:
                col_map['email'] = i
            elif 'PHONE' in col_upper:
                col_map['phone'] = i
            elif 'STATUS' in col_upper:
                col_map['status'] = i
            elif 'DATE' in col_upper and 'DAY' not in col_upper:
                col_map['date'] = i
            elif 'DAY' in col_upper and 'INTERVIEW' in col_upper:
                col_map['day'] = i
            elif 'TIME' in col_upper:
                col_map['time'] = i
        
        # Process data rows
        for row_num, line in enumerate(lines[1:], start=2):
            if not line.strip():
                continue
            
            values = [v.strip() for v in line.split(',')]
            
            # Skip empty rows
            if not any(values):
                continue
            
            # Extract data
            first_name = values[col_map.get('first_name', 0)] if col_map.get('first_name') is not None else ''
            last_name = values[col_map.get('last_name', 1)] if col_map.get('last_name') is not None else ''
            email = values[col_map.get('email', 3)] if col_map.get('email') is not None else ''
            phone = values[col_map.get('phone', 2)] if col_map.get('phone') is not None else ''
            status = values[col_map.get('status', 4)] if col_map.get('status') is not None else ''
            date_str = values[col_map.get('date', 5)] if col_map.get('date') is not None else ''
            day_str = values[col_map.get('day', 6)] if col_map.get('day') is not None else ''
            time_str = values[col_map.get('time', 7)] if col_map.get('time') is not None else ''
            
            # Skip if no email (required)
            email = normalize_email(email)
            if not email:
                errors.append(f"Row {row_num}: Missing email address")
                continue
            
            # Skip if no name
            if not first_name and not last_name:
                errors.append(f"Row {row_num}: Missing name")
                continue
            
            try:
                with session.begin_nested():
                    # Find or create candidate
                    candidate = session.query(Candidate).filter_by(email=email).first()
                    if not candidate:
                        candidate = Candidate(
                            first_name=first_name or 'Unknown',
                            last_name=last_name or '',
                            email=email,
                            phone=phone,
                            country='US', # Default to US for imports, or could infer
                            status=status
                        )
                        session.add(candidate)
                        session.flush()  # Get candidate ID
                    else:
                        # Update existing candidate if needed
                        # Only update fields that are missing or empty, don't overwrite user changes
                        if first_name and not candidate.first_name:
                            candidate.first_name = first_name
                        if last_name and not candidate.last_name:
                            candidate.last_name = last_name
                        if phone and not candidate.phone:
                            candidate.phone = phone
                        # Candidate status removed - status is now only on interviews
                    
                    # Create interview if date/time provided
                    if date_str or time_str:
                        interview_date = parse_date_string(date_str)
                        interview_time = parse_time_string(time_str)
                        
                        if interview_date and interview_time:
                            interview_datetime = combine_datetime(interview_date, interview_time)
                            
                            if interview_datetime:
                                # Check if interview already exists
                                existing = session.query(Interview).filter_by(
                                    candidate_id=candidate.id,
                                    interview_date=interview_datetime
                                ).first()
                                
                                if not existing:
                                    interview_status = InterviewStatus.CONFIRMED.value if status and 'confirmed' in status.lower() else InterviewStatus.PENDING.value
                                    
                                    interview = Interview(
                                        candidate_id=candidate.id,
                                        interview_date=interview_datetime,
                                        interview_time=interview_time,
                                        day_of_week=day_str,
                                        status=interview_status,
                                        notes=status if status and 'reschedule' in status.lower() else None
                                    )
                                    session.add(interview)
                                    imported += 1
                                else:
                                    # Update existing interview
                                    if status and 'confirmed' in status.lower():
                                        existing.status = InterviewStatus.CONFIRMED.value
                                    if day_str:
                                        existing.day_of_week = day_str
                                    if interview_time:
                                        existing.interview_time = interview_time
                        elif interview_date:
                            # Date only, no time
                            errors.append(f"Row {row_num}: Date provided but time is missing or invalid")
                    else:
                        # No interview data, just candidate
                        imported += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
                logger.error(f"Error processing row {row_num}: {str(e)}")
                continue
        
        session.commit()
        return imported, errors
    
    except Exception as e:
        session.rollback()
        logger.error(f"Error importing CSV: {str(e)}")
        return 0, [f"Import failed: {str(e)}"]
    finally:
        session.close()

def check_scheduling_conflict(candidate_id, interview_datetime, exclude_interview_id=None, session=None):
    """
    Check if scheduling an interview would create a conflict
    Returns: (has_conflict, conflict_details)
    """
    close_session = False
    if not session:
        session = get_session()
        close_session = True
        
    try:
        # Check for same candidate having another interview within 1 hour
        time_window_start = interview_datetime - timedelta(hours=1)
        time_window_end = interview_datetime + timedelta(hours=1)
        
        query = session.query(Interview).filter(
            Interview.candidate_id == candidate_id,
            Interview.interview_date >= time_window_start,
            Interview.interview_date <= time_window_end,
            Interview.status != InterviewStatus.CANCELLED.value
        )
        
        if exclude_interview_id:
            query = query.filter(Interview.id != exclude_interview_id)
        
        conflicts = query.all()
        
        if conflicts:
            conflict_details = [f"Candidate has another interview at {c.interview_date.strftime('%Y-%m-%d %H:%M')}" for c in conflicts]
            return True, conflict_details
        
        # Check for exact duplicate (double booking same slot)
        # This is important for preventing race conditions where multiple requests come in
        duplicate = session.query(Interview).filter(
            Interview.candidate_id == candidate_id,
            Interview.interview_date == interview_datetime,
            Interview.status != InterviewStatus.CANCELLED.value
        )
        if exclude_interview_id:
            duplicate = duplicate.filter(Interview.id != exclude_interview_id)
            
        if duplicate.first():
             return True, [f"Candidate already has an interview at {interview_datetime.strftime('%Y-%m-%d %H:%M')}"]

        return False, []
    
    finally:
        if close_session:
            session.close()

def find_available_slots(start_date, end_date, preferred_times=None, exclude_candidate_id=None):
    """
    Find available interview slots between start_date and end_date
    preferred_times: list of preferred time strings (e.g., ["9:00", "10:00"])
    Returns: list of available datetime objects
    """
    session = get_session()
    try:
        available_slots = []
        current_date = start_date
        
        if not preferred_times:
            preferred_times = []
            for hour in range(9, 17):  # 9 AM to 4:30 PM
                preferred_times.append(f"{hour:02d}:00")
                preferred_times.append(f"{hour:02d}:30")
        
        # 1. Fetch ALL interviews in the date range (Active only)
        # Note: We query a bit wider to be safe, or exact range
        existing_interviews = session.query(Interview).filter(
            Interview.interview_date >= start_date,
            Interview.interview_date <= end_date,
            Interview.status != InterviewStatus.CANCELLED.value
        ).all()
        
        # 2. Build a map of busy slots: datetime -> count
        # and a set for the specific candidate if needed
        busy_slots = {}
        candidate_busy_slots = set()
        
        for interview in existing_interviews:
            dt = interview.interview_date
            busy_slots[dt] = busy_slots.get(dt, 0) + 1
            
            if exclude_candidate_id and interview.candidate_id == exclude_candidate_id:
                candidate_busy_slots.add(dt)
        
        # 3. Generate slots and check against maps (in-memory)
        while current_date <= end_date:
            for time_str in preferred_times:
                slot_datetime = combine_datetime(current_date, time_str)
                if not slot_datetime:
                    continue
                
                # Check general availability (limit 1 per slot)
                if busy_slots.get(slot_datetime, 0) >= 1:
                    continue
                
                # Check candidate specific conflict
                if slot_datetime in candidate_busy_slots:
                    continue
                
                available_slots.append(slot_datetime)
            
            current_date += timedelta(days=1)
        
        return sorted(available_slots)
    
    finally:
        session.close()

def get_schedule_summary(start_date=None, end_date=None):
    """
    Get summary of scheduled interviews
    Returns: dict with statistics
    """
    session = get_session()
    try:
        query = session.query(Interview)
        
        if start_date:
            query = query.filter(Interview.interview_date >= start_date)
        if end_date:
            query = query.filter(Interview.interview_date <= end_date)
            
        # Optimize: Single query with group_by instead of multiple count queries
        from sqlalchemy import func
        results = query.with_entities(Interview.status, func.count(Interview.id)).group_by(Interview.status).all()
        
        counts = {status: 0 for status in [s.value for s in InterviewStatus]}
        total = 0
        
        for status, count in results:
            counts[status] = count
            total += count
            
        # Calculate upcoming (future dates, not cancelled/completed)
        upcoming_query = session.query(func.count(Interview.id)).filter(
            Interview.interview_date >= datetime.now(),
            Interview.status.in_([InterviewStatus.CONFIRMED.value, InterviewStatus.PENDING.value, InterviewStatus.RESCHEDULED.value])
        )
        upcoming_count = upcoming_query.scalar() or 0

        return {
            'total_interviews': total,
            'upcoming_interviews': upcoming_count,
            'confirmed_interviews': counts.get(InterviewStatus.CONFIRMED.value, 0),
            'pending_interviews': counts.get(InterviewStatus.PENDING.value, 0),
            'cancelled_interviews': counts.get(InterviewStatus.CANCELLED.value, 0),
            'completed_interviews': counts.get(InterviewStatus.COMPLETED.value, 0)
        }

    
    finally:
        session.close()

