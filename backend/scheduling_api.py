"""
API endpoints for candidate and interview scheduling management
"""
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from sqlalchemy import func, or_
from database import (
    get_session, Candidate, Interview, TimeSlot, InterviewStatus,
    init_db
)
from scheduler import (
    import_candidates_from_csv,
    check_scheduling_conflict,
    find_available_slots,
    get_schedule_summary,
    parse_date_string,
    parse_time_string,
    combine_datetime,
    normalize_email,
)
from services.scheduling_service import schedule_interview_for_candidate
from functools import wraps
import logging

logger = logging.getLogger(__name__)

scheduling_bp = Blueprint('scheduling', __name__)

from flask_jwt_extended import jwt_required

def require_auth(f):
    return jwt_required()(f)

@scheduling_bp.route('/api/candidates/import', methods=['POST'])
@require_auth
def import_candidates():
    """Import candidates from CSV data"""
    try:
        data = request.json
        if not data or 'csv_data' not in data:
            return jsonify({'error': 'CSV data required'}), 400
        
        csv_data = data['csv_data']
        imported_count, errors = import_candidates_from_csv(csv_data)
        
        return jsonify({
            'success': True,
            'imported': imported_count,
            'errors': errors,
            'message': f'Successfully imported {imported_count} candidates/interviews'
        })
    
    except Exception as e:
        logger.error(f"Error importing candidates: {str(e)}")
        return jsonify({'error': f'Import failed: {str(e)}'}), 500

@scheduling_bp.route('/api/candidates', methods=['GET'])
@require_auth
def get_candidates():
    """Get all candidates with optional filtering"""
    try:
        session = get_session()
        
        # Query parameters
        search = request.args.get('search', '').strip()
        status = request.args.get('status', '').strip()
        country = request.args.get('country', '').strip()  # New param
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', 0, type=int)
        
        logger.debug(
            "Get candidates called",
            extra={
                "search": search,
                "country": country,
                "limit": limit,
                "offset": offset,
            },
        )
        
        query = session.query(Candidate)
        
        # Apply filters
        if search:
            query = query.filter(
                or_(
                    Candidate.first_name.ilike(f'%{search}%'),
                    Candidate.last_name.ilike(f'%{search}%'),
                    Candidate.email.ilike(f'%{search}%'),
                    func.concat(Candidate.first_name, ' ', Candidate.last_name).ilike(f'%{search}%')
                )
            )
        
        # Apply country filter if provided
        if country:
            query = query.filter(Candidate.country == country)
        
        # Status filtering removed - use interview status instead
        
        # Get total count
        total = query.count()
        logger.debug(
            "Get candidates results",
            extra={
                "total": total,
                "country": country,
            },
        )
        
        # Apply pagination
        if limit:
            query = query.limit(limit).offset(offset)
        
        candidates = query.all()
        
        return jsonify({
            'success': True,
            'candidates': [c.to_dict() for c in candidates],
            'total': total,
            'limit': limit,
            'offset': offset
        })
    
    except Exception as e:
        logger.error(f"Error fetching candidates: {str(e)}")
        return jsonify({'error': f'Failed to fetch candidates: {str(e)}'}), 500
    finally:
        session.close()

@scheduling_bp.route('/api/candidates/<int:candidate_id>', methods=['GET'])
@require_auth
def get_candidate(candidate_id):
    """Get a specific candidate by ID"""
    try:
        session = get_session()
        candidate = session.query(Candidate).filter_by(id=candidate_id).first()
        
        if not candidate:
            return jsonify({'error': 'Candidate not found'}), 404
        
        return jsonify({
            'success': True,
            'candidate': candidate.to_dict()
        })
    
    except Exception as e:
        logger.error(f"Error fetching candidate: {str(e)}")
        return jsonify({'error': f'Failed to fetch candidate: {str(e)}'}), 500
    finally:
        session.close()

@scheduling_bp.route('/api/candidates/<int:candidate_id>', methods=['PUT'])
@require_auth
def update_candidate(candidate_id):
    """Update candidate information"""
    try:
        session = get_session()
        candidate = session.query(Candidate).filter_by(id=candidate_id).first()
        
        if not candidate:
            return jsonify({'error': 'Candidate not found'}), 404
        
        data = request.json
        if 'first_name' in data:
            candidate.first_name = data['first_name']
        if 'last_name' in data:
            candidate.last_name = data['last_name']
        if 'email' in data:
            email = normalize_email(data['email'])
            # Check if email already exists for another candidate
            existing = session.query(Candidate).filter(
                Candidate.email == email,
                Candidate.id != candidate_id
            ).first()
            if existing:
                return jsonify({'error': 'Email already exists for another candidate'}), 400
            candidate.email = email
        if 'phone' in data:
            candidate.phone = data['phone']
        if 'country' in data:
            candidate.country = data['country']
        if 'address' in data:
            candidate.address = data['address']
        if 'citizenship' in data:
            candidate.citizenship = data['citizenship']
        # Candidate status removed - use interview status instead
        if 'notes' in data:
            candidate.notes = data['notes']
        
        candidate.updated_at = datetime.utcnow()
        session.commit()
        
        # Refresh the candidate to ensure we have the latest data
        session.refresh(candidate)
        
        logger.info(f"Candidate {candidate_id} updated successfully")
        
        return jsonify({
            'success': True,
            'candidate': candidate.to_dict()
        })
    
    except Exception as e:
        session.rollback()
        logger.error(f"Error updating candidate: {str(e)}")
        return jsonify({'error': f'Failed to update candidate: {str(e)}'}), 500
    finally:
        session.close()

@scheduling_bp.route('/api/candidates', methods=['POST'])
@require_auth
def create_candidate():
    """Create a new candidate"""
    try:
        data = request.json
        session = get_session()
        
        # Validate required fields
        if 'first_name' not in data or not data['first_name']:
            return jsonify({'error': 'first_name is required'}), 400
        if 'last_name' not in data or not data['last_name']:
            return jsonify({'error': 'last_name is required'}), 400
        if 'email' not in data or not data['email']:
            return jsonify({'error': 'email is required'}), 400
        
        # Normalize email
        email = normalize_email(data['email'])
        
        # Check if email already exists
        existing = session.query(Candidate).filter_by(email=email).first()
        if existing:
            return jsonify({'error': 'Email already exists for another candidate'}), 400
        
        # Create candidate
        candidate = Candidate(
            first_name=data['first_name'],
            last_name=data['last_name'],
            email=email,
            phone=data.get('phone', ''),
            country=data.get('country', 'US'), # Default to US
            address=data.get('address', ''),
            citizenship=data.get('citizenship', ''),
            status=data.get('status', ''),
            notes=data.get('notes', '')
        )
        
        session.add(candidate)
        session.commit()
        
        return jsonify({
            'success': True,
            'candidate': candidate.to_dict()
        }), 201
    
    except Exception as e:
        session.rollback()
        logger.error(f"Error creating candidate: {str(e)}")
        return jsonify({'error': f'Failed to create candidate: {str(e)}'}), 500
    finally:
        session.close()

@scheduling_bp.route('/api/candidates/<int:candidate_id>', methods=['DELETE'])
@require_auth
def delete_candidate(candidate_id):
    """Delete a candidate"""
    try:
        session = get_session()
        candidate = session.query(Candidate).filter_by(id=candidate_id).first()
        
        if not candidate:
            return jsonify({'error': 'Candidate not found'}), 404
        
        # Delete the candidate (cascade will handle related interviews)
        session.delete(candidate)
        session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Candidate deleted successfully'
        })
    
    except Exception as e:
        session.rollback()
        logger.error(f"Error deleting candidate: {str(e)}")
        return jsonify({'error': f'Failed to delete candidate: {str(e)}'}), 500
    finally:
        session.close()

@scheduling_bp.route('/api/interviews', methods=['GET'])
@require_auth
def get_interviews():
    """Get all interviews with optional filtering"""
    try:
        session = get_session()
        
        # Query parameters
        candidate_id = request.args.get('candidate_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', 0, type=int)
        
        from sqlalchemy.orm import joinedload
        query = session.query(Interview).options(
            joinedload(Interview.candidate)
        )
        
        # Apply filters
        if candidate_id:
            query = query.filter(Interview.candidate_id == candidate_id)
        
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(Interview.interview_date >= start_dt)
            except:
                pass
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(Interview.interview_date <= end_dt)
            except:
                pass
        
        if status:
            query = query.filter(Interview.status == status)
        
        # Get total count
        total = query.count()
        
        # Order by date
        query = query.order_by(Interview.interview_date)
        
        # Apply pagination
        if limit:
            query = query.limit(limit).offset(offset)
        
        interviews = query.all()
        
        return jsonify({
            'success': True,
            'interviews': [i.to_dict() for i in interviews],
            'total': total,
            'limit': limit,
            'offset': offset
        })
    
    except Exception as e:
        logger.error(f"Error fetching interviews: {str(e)}")
        return jsonify({'error': f'Failed to fetch interviews: {str(e)}'}), 500
    finally:
        session.close()

@scheduling_bp.route('/api/interviews/<int:interview_id>', methods=['GET'])
@require_auth
def get_interview(interview_id):
    """Get a specific interview by ID"""
    try:
        session = get_session()
        from sqlalchemy.orm import joinedload
        interview = session.query(Interview).options(
            joinedload(Interview.candidate)
        ).filter_by(id=interview_id).first()
        
        if not interview:
            return jsonify({'error': 'Interview not found'}), 404
        
        return jsonify({
            'success': True,
            'interview': interview.to_dict()
        })
    
    except Exception as e:
        logger.error(f"Error fetching interview: {str(e)}")
        return jsonify({'error': f'Failed to fetch interview: {str(e)}'}), 500
    finally:
        session.close()

@scheduling_bp.route('/api/interviews', methods=['POST'])
@require_auth
def create_interview():
    """Create a new interview"""
    try:
        data = request.json
        session = get_session()
        
        # Validate required fields
        if 'candidate_id' not in data:
            return jsonify({'error': 'candidate_id is required'}), 400
        if 'interview_date' not in data:
            return jsonify({'error': 'interview_date is required'}), 400
        
        candidate_id = data['candidate_id']

        # Parse interview date
        try:
            interview_date = datetime.fromisoformat(
                data['interview_date'].replace('Z', '+00:00')
            )
        except Exception:
            return jsonify({'error': 'Invalid interview_date format'}), 400

        service_result = schedule_interview_for_candidate(
            candidate_id=candidate_id,
            interview_datetime=interview_date,
            interview_time=data.get('interview_time'),
            day_of_week=data.get('day_of_week'),
            status=data.get('status'),
            meet_link=data.get('meet_link'),
            notes=data.get('notes'),
        )

        if not service_result.get('success'):
            error = service_result.get('error', 'Failed to create interview')
            # Map common errors to HTTP status codes
            if error == 'Candidate not found':
                return jsonify({'error': error}), 404
            if error == 'Scheduling conflict detected':
                return jsonify({
                    'error': error,
                    'conflicts': service_result.get('conflicts', []),
                }), 400

            logger.error(f"Error creating interview via service: {error}")
            return jsonify({'error': error}), 500

        return jsonify({
            'success': True,
            'interview': service_result['interview'],
        }), 201
    
    except Exception as e:
        session.rollback()
        logger.error(f"Error creating interview: {str(e)}")
        return jsonify({'error': f'Failed to create interview: {str(e)}'}), 500
    finally:
        session.close()

@scheduling_bp.route('/api/interviews/<int:interview_id>', methods=['PUT'])
@require_auth
def update_interview(interview_id):
    """Update an interview"""
    try:
        session = get_session()
        interview = session.query(Interview).filter_by(id=interview_id).first()
        
        if not interview:
            return jsonify({'error': 'Interview not found'}), 404
        
        data = request.json
        
        # Update fields
        if 'interview_date' in data:
            try:
                new_date = datetime.fromisoformat(data['interview_date'].replace('Z', '+00:00'))
                # Check for conflicts if date changed
                if new_date != interview.interview_date:
                    has_conflict, conflict_details = check_scheduling_conflict(
                        interview.candidate_id, new_date, exclude_interview_id=interview_id, session=session
                    )
                    if has_conflict:
                        return jsonify({
                            'error': 'Scheduling conflict detected',
                            'conflicts': conflict_details
                        }), 400
                interview.interview_date = new_date
            except:
                return jsonify({'error': 'Invalid interview_date format'}), 400
        
        if 'interview_time' in data:
            interview.interview_time = data['interview_time']
        if 'day_of_week' in data:
            interview.day_of_week = data['day_of_week']
        if 'status' in data:
            interview.status = data['status']
        if 'meet_link' in data:
            interview.meet_link = data['meet_link']
        if 'notes' in data:
            interview.notes = data['notes']
        if 'email_sent' in data:
            interview.email_sent = data['email_sent']
            if data['email_sent']:
                interview.email_sent_at = datetime.utcnow()
        
        interview.updated_at = datetime.utcnow()
        session.commit()
        
        return jsonify({
            'success': True,
            'interview': interview.to_dict()
        })
    
    except Exception as e:
        session.rollback()
        logger.error(f"Error updating interview: {str(e)}")
        return jsonify({'error': f'Failed to update interview: {str(e)}'}), 500
    finally:
        session.close()

@scheduling_bp.route('/api/interviews/<int:interview_id>', methods=['DELETE'])
@require_auth
def delete_interview(interview_id):
    """Cancel/delete an interview"""
    try:
        session = get_session()
        interview = session.query(Interview).filter_by(id=interview_id).first()
        
        if not interview:
            return jsonify({'error': 'Interview not found'}), 404
        
        # Hard delete
        session.delete(interview)
        session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Interview deleted successfully'
        })
    
    except Exception as e:
        session.rollback()
        logger.error(f"Error cancelling interview: {str(e)}")
        return jsonify({'error': f'Failed to cancel interview: {str(e)}'}), 500
    finally:
        session.close()

@scheduling_bp.route('/api/schedule/available-slots', methods=['GET'])
@require_auth
def get_available_slots():
    """Get available interview slots"""
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        preferred_times = request.args.getlist('preferred_times')
        candidate_id = request.args.get('candidate_id', type=int)
        
        if not start_date_str or not end_date_str:
            return jsonify({'error': 'start_date and end_date are required'}), 400
        
        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        except:
            return jsonify({'error': 'Invalid date format'}), 400
        
        slots = find_available_slots(start_date, end_date, preferred_times, candidate_id)
        
        return jsonify({
            'success': True,
            'slots': [s.isoformat() for s in slots],
            'count': len(slots)
        })
    
    except Exception as e:
        logger.error(f"Error fetching available slots: {str(e)}")
        return jsonify({'error': f'Failed to fetch slots: {str(e)}'}), 500

@scheduling_bp.route('/api/schedule/summary', methods=['GET'])
@require_auth
def get_schedule_summary_endpoint():
    """Get scheduling summary statistics"""
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        start_date = None
        end_date = None
        
        if start_date_str:
            try:
                start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            except:
                pass
        
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            except:
                pass
        
        summary = get_schedule_summary(start_date, end_date)
        
        return jsonify({
            'success': True,
            'summary': summary
        })
    
    except Exception as e:
        logger.error(f"Error fetching schedule summary: {str(e)}")
        return jsonify({'error': f'Failed to fetch summary: {str(e)}'}), 500

@scheduling_bp.route('/api/schedule/calendar', methods=['GET'])
@require_auth
def get_calendar_view():
    """Get calendar view of interviews grouped by date"""
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if not start_date_str:
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            try:
                start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            except:
                start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        if not end_date_str:
            end_date = start_date + timedelta(days=30)
        else:
            try:
                end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            except:
                end_date = start_date + timedelta(days=30)
        
        session = get_session()
        from sqlalchemy.orm import joinedload
        interviews = session.query(Interview).options(
            joinedload(Interview.candidate)
        ).filter(
            Interview.interview_date >= start_date,
            Interview.interview_date <= end_date
        ).order_by(Interview.interview_date).all()
        
        # Group by date
        calendar = {}
        for interview in interviews:
            date_key = interview.interview_date.date().isoformat()
            if date_key not in calendar:
                calendar[date_key] = []
            # Ensure candidate data is fresh from database
            interview_dict = interview.to_dict()
            # Verify candidate status is included
            if interview_dict.get('candidate') and interview_dict['candidate'].get('status'):
                logger.debug(f"Interview {interview.id}: Candidate status = '{interview_dict['candidate']['status']}'")
            calendar[date_key].append(interview_dict)
        
        return jsonify({
            'success': True,
            'calendar': calendar,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error fetching calendar: {str(e)}")
        return jsonify({'error': f'Failed to fetch calendar: {str(e)}'}), 500
    finally:
        session.close()

