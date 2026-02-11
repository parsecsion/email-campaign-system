from database import get_session, Candidate, Interview, InterviewStatus, Draft, session_scope
from sqlalchemy import or_
from datetime import datetime
import json
import logging
from services.scheduling_service import schedule_interview_for_candidate


logger = logging.getLogger(__name__)


class AgentTools:
    
    def search_candidates(self, query=None, first_name=None, last_name=None, email=None, phone=None, country=None):
        with session_scope() as session:
            q = session.query(Candidate)

            # 1. Structured Search (High Precision)
            if first_name or last_name or email or phone:
                if first_name:
                    q = q.filter(Candidate.first_name.ilike(f'%{first_name}%'))
                if last_name:
                    q = q.filter(Candidate.last_name.ilike(f'%{last_name}%'))
                if email:
                    q = q.filter(Candidate.email.ilike(f'%{email}%'))
                if phone:
                    # Strip non-digits for better matching if needed, but simple ilike for now
                    q = q.filter(Candidate.phone.ilike(f'%{phone}%'))
            
            # 2. Fallback / "Smart" Query Search (if query string provided)
            elif query:
                # Split query for "First Last" search
                parts = query.split()
                if len(parts) >= 2:
                    first_part = parts[0]
                    last_part = " ".join(parts[-1:]) # simple heuristic: first word is first name, last word is last name
                    # or better:
                    # AND logic for split parts vs OR logic for full string
                    
                    # Let's try to find matches where ANY field matches the full query
                    # OR where first/last match the parts
                    
                    conditions = [
                        Candidate.first_name.ilike(f'%{query}%'),
                        Candidate.last_name.ilike(f'%{query}%'),
                        Candidate.email.ilike(f'%{query}%'),
                        Candidate.phone.ilike(f'%{query}%')
                    ]
                    
                    # Split logic: First matches First AND Last matches Last
                    split_condition = (
                        Candidate.first_name.ilike(f'%{parts[0]}%') & 
                        Candidate.last_name.ilike(f'%{parts[-1]}%')
                    )
                    conditions.append(split_condition)
                    
                    q = q.filter(or_(*conditions))
                else:
                    # Single word query
                    q = q.filter(
                        or_(
                            Candidate.first_name.ilike(f'%{query}%'),
                            Candidate.last_name.ilike(f'%{query}%'),
                            Candidate.email.ilike(f'%{query}%'),
                            Candidate.phone.ilike(f'%{query}%')
                        )
                    )

            # Fuzzy country matching if provided
            if country:
                q = q.filter(Candidate.country.ilike(f'%{country}%'))
                
            results = q.limit(20).all()
            logger.debug("Agent search_candidates", extra={"result_count": len(results)})
            # Return PII-reduced view for the agent / LLM.
            return [c.to_safe_dict() for c in results]

    def update_candidate(self, candidate_id, **kwargs):
        """
        Update candidate details. 
        Supported kwargs: first_name, last_name, email, phone, country, notes, status
        """
        try:
            with session_scope() as session:
                candidate = session.query(Candidate).filter_by(id=candidate_id).first()
                if not candidate:
                    return {"error": "Candidate not found"}
                
                # Update fields if provided
                allowed_fields = ['first_name', 'last_name', 'email', 'phone', 'country', 'notes', 'status']
                changes = []
                
                for field in allowed_fields:
                    if field in kwargs and kwargs[field] is not None:
                        old_value = getattr(candidate, field)
                        new_value = kwargs[field]
                        if old_value != new_value:
                            setattr(candidate, field, new_value)
                            changes.append(f"{field}: '{old_value}' -> '{new_value}'")
                
                if not changes:
                    return {"success": True, "message": "No changes made."}

                return {
                    "success": True, 
                    "message": f"Updated candidate {candidate_id}. Changes: {', '.join(changes)}",
                    "candidate": candidate.to_dict()
                }
        except Exception as e:
            return {"error": str(e)}

    def get_candidate_details(self, candidate_id):
        with session_scope() as session:
            candidate = session.query(Candidate).filter_by(id=candidate_id).first()
            if not candidate:
                return {"error": "Candidate not found"}
            return candidate.to_dict()

    def delete_interview(self, interview_id):
        try:
            with session_scope() as session:
                interview = session.query(Interview).filter_by(id=interview_id).first()
                if not interview:
                    return {"error": f"Interview {interview_id} not found"}
                
                session.delete(interview)
                return {"success": True, "message": f"Deleted interview {interview_id}"}
        except Exception as e:
            return {"error": str(e)}

    def add_candidate(self, first_name, last_name, email, country="US"):
        try:
            with session_scope() as session:
                # Check exist
                existing = session.query(Candidate).filter_by(email=email).first()
                if existing:
                    return {"error": "Candidate already exists", "id": existing.id}
                
                new_c = Candidate(
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    country=country,
                    status="new"
                )
                session.add(new_c)
                return {"success": True, "id": new_c.id, "message": f"Added {first_name} {last_name}"}
        except Exception as e:
            return {"error": str(e)}

    def get_schedule(self, limit=20):
        with session_scope() as session:
            interviews = session.query(Interview).filter(
                Interview.interview_date >= datetime.now()
            ).order_by(Interview.interview_date).limit(limit).all()
            
            return [i.to_dict() for i in interviews]

    def check_availability(self, start_date, end_date, **kwargs):
        # reuse existing logic or simplify
        # For now, just return a stub or call the complex scheduler function
        from scheduler import find_available_slots
        try:
            s_dt = datetime.fromisoformat(start_date)
            e_dt = datetime.fromisoformat(end_date)
            slots = find_available_slots(s_dt, e_dt)
            return [s.isoformat() for s in slots]
        except Exception as e:
            return {"error": str(e)}

    def schedule_interview(self, candidate_id, interview_date=None, start_time=None):
        # Alias handling for robustness against LLM hallucinations
        final_date = interview_date or start_time
        if not final_date:
            return {"error": "Missing interview_date or start_time argument"}

        try:
            dt = datetime.fromisoformat(final_date)
        except Exception:
            return {"error": "Invalid interview_date format"}

        result = schedule_interview_for_candidate(
            candidate_id=candidate_id,
            interview_datetime=dt,
        )

        if not result.get("success"):
            return result

        interview = result["interview"]
        return {
            "success": True,
            "id": interview.get("id"),
            "date": interview.get("interview_date"),
            "interview": interview,
        }

    def draft_email(self, recipient_email, subject, content, sender_email=None):
        try:
            with session_scope() as session:
                # Default sender if not provided (should be passed from user context)
                if not sender_email:
                    sender_email = "agent@system.local" 
                
                # Create a simple recipient list structure for the draft
                recipients_list = [{"Email": recipient_email}]
                
                new_draft = Draft(
                    sender_email=sender_email,
                    subject=subject,
                    html_content=content,  # Agent provides content, treat as HTML/Text
                    recipients=json.dumps(recipients_list)
                )
                session.add(new_draft)
                
                return {
                    "success": True, 
                    "draft_id": new_draft.id,
                    "message": f"Draft '{subject}' created for {recipient_email}. ID: {new_draft.id}"
                }
        except Exception as e:
            return {"error": str(e)}
