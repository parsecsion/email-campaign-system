from datetime import datetime
from typing import Optional, Dict, Any

from database import session_scope, Candidate, Interview, InterviewStatus
from scheduler import check_scheduling_conflict


def schedule_interview_for_candidate(
    candidate_id: int,
    interview_datetime: datetime,
    interview_time: Optional[str] = None,
    day_of_week: Optional[str] = None,
    status: Optional[str] = None,
    meet_link: Optional[str] = None,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Shared scheduling helper used by both HTTP API and the agent.

    Performs:
    - Candidate existence check
    - Conflict detection (via scheduler.check_scheduling_conflict)
    - Interview creation and commit

    Returns a dict with either:
      { "success": True, "interview": <interview_dict> }
    or:
      { "error": <message>, ...optional extra fields... }
    """
    try:
        with session_scope() as session:
            candidate = session.query(Candidate).filter_by(id=candidate_id).first()
            if not candidate:
                return {"error": "Candidate not found"}

            has_conflict, conflict_details = check_scheduling_conflict(
                candidate_id, interview_datetime, session=session
            )
            if has_conflict:
                return {
                    "error": "Scheduling conflict detected",
                    "conflicts": conflict_details,
                }

            interview = Interview(
                candidate_id=candidate_id,
                interview_date=interview_datetime,
                interview_time=interview_time,
                day_of_week=day_of_week,
                status=status or InterviewStatus.PENDING.value,
                meet_link=meet_link,
                notes=notes,
            )

            session.add(interview)

            # Use model helper to avoid duplicating serialization
            return {"success": True, "interview": interview.to_dict()}
    except Exception as exc:
        return {"error": str(exc)}

