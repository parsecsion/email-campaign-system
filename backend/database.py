"""
Database models and utilities for candidate and interview management
"""
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from contextlib import contextmanager
import enum
import os

Base = declarative_base()

class InterviewStatus(enum.Enum):
    """Interview status enumeration"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    RESCHEDULED = "rescheduled"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class Candidate(Base):
    """Candidate model"""
    __tablename__ = 'candidates'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(100), nullable=False, index=True)
    last_name = Column(String(100), nullable=False, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    phone = Column(String(50))
    country = Column(String(50), default='US', index=True) # New field
    address = Column(Text) # New field
    citizenship = Column(String(100)) # New field
    status = Column(String(50))  # General status from CSV
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    interviews = relationship("Interview", back_populates="candidate", cascade="all, delete-orphan")
    
    def to_dict(self):
        """Convert candidate to dictionary"""
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'email': self.email,
            'phone': self.phone,
            'country': self.country,
            'address': self.address,
            'citizenship': self.citizenship,
            # 'status': self.status,  # Removed - use interview status instead
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def to_safe_dict(self):
        """Minimal, PII-reduced view for AI tools and external contexts."""
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'country': self.country,
        }

class Interview(Base):
    """Interview model"""
    __tablename__ = 'interviews'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey('candidates.id'), nullable=False, index=True)
    interview_date = Column(DateTime, nullable=False, index=True)
    
    # Ensure candidate cannot have multiple interviews at the exact same time
    # Note: This requires a migration to take effect in existing DB
    __table_args__ = (UniqueConstraint('candidate_id', 'interview_date', name='uq_candidate_interview_date'),)
    interview_time = Column(String(20))  # e.g., "9:00", "9:30"
    day_of_week = Column(String(20))  # e.g., "FRIDAY", "MONDAY"
    status = Column(String(50), default=InterviewStatus.PENDING.value)
    meet_link = Column(String(500))
    notes = Column(Text)
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    candidate = relationship("Candidate", back_populates="interviews")
    
    def to_dict(self):
        """Convert interview to dictionary"""
        return {
            'id': self.id,
            'candidate_id': self.candidate_id,
            'candidate': self.candidate.to_dict() if self.candidate else None,
            'interview_date': self.interview_date.isoformat() if self.interview_date else None,
            'interview_time': self.interview_time,
            'day_of_week': self.day_of_week,
            'status': self.status,
            'meet_link': self.meet_link,
            'notes': self.notes,
            'email_sent': self.email_sent,
            'email_sent_at': self.email_sent_at.isoformat() if self.email_sent_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class TimeSlot(Base):
    """Available time slots for scheduling"""
    __tablename__ = 'time_slots'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    slot_date = Column(DateTime, nullable=False, index=True)
    slot_time = Column(String(20), nullable=False)  # e.g., "9:00", "9:30"
    duration_minutes = Column(Integer, default=30)
    is_available = Column(Boolean, default=True)
    max_interviews = Column(Integer, default=1)  # For group interviews
    current_bookings = Column(Integer, default=0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert time slot to dictionary"""
        return {
            'id': self.id,
            'slot_date': self.slot_date.isoformat() if self.slot_date else None,
            'slot_time': self.slot_time,
            'duration_minutes': self.duration_minutes,
            'is_available': self.is_available,
            'max_interviews': self.max_interviews,
            'current_bookings': self.current_bookings,
            'notes': self.notes,
            'is_booked': self.current_bookings >= self.max_interviews
        }



class EmailTracking(Base):
    """Email tracking model"""
    __tablename__ = 'email_tracking'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    tracking_id = Column(String(36), unique=True, nullable=False, index=True)
    campaign_id = Column(String(50), nullable=False, index=True)
    recipient_email = Column(String(255), nullable=False)
    status = Column(String(20), default='sent') # sent, opened
    open_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    opened_at = Column(DateTime, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    def to_dict(self):
        return {
            'tracking_id': self.tracking_id,
            'recipient_email': self.recipient_email,
            'status': self.status,
            'open_count': self.open_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'opened_at': self.opened_at.isoformat() if self.opened_at else None
        }

class Draft(Base):
    """Email draft model"""
    __tablename__ = 'drafts'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sender_email = Column(String(255), nullable=False, index=True)
    subject = Column(String(255))
    template_id = Column(String(50))
    html_content = Column(Text)
    recipients = Column(Text) # JSON string of recipients
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'sender_email': self.sender_email,
            'subject': self.subject,
            'template_id': self.template_id,
            'html_content': self.html_content,
            'recipients': self.recipients,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Settings(Base):
    """Application settings key-value store"""
    __tablename__ = 'settings'
    
    key = Column(String(50), primary_key=True)
    value = Column(Text) # JSON string or plain text
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'key': self.key,
            'value': self.value,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Template(Base):
    """Email template model"""
    __tablename__ = 'templates'
    
    id = Column(String(50), primary_key=True) # Using string ID to match existing keys if needed, or stick to auto-int? 
    # Existing templates use string keys like 'interview_confirmation_nov_11'. Let's keep String ID for flexibility.
    name = Column(String(100), nullable=False)
    subject = Column(String(255), nullable=False)
    variables = Column(Text) # JSON string of variables
    html_content = Column(Text, nullable=False)
    plain_content = Column(Text, nullable=False)
    is_system = Column(Boolean, default=False) # To protect default templates if needed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        import json
        try:
            vars_list = json.loads(self.variables) if self.variables else []
        except:
            vars_list = []
            
        return {
            'id': self.id,
            'name': self.name,
            'subject': self.subject,
            'variables': vars_list,
            'html_template': self.html_content, # Matching API response format
            'plain_template': self.plain_content,
            'is_system': self.is_system,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

def get_database_path():
    """Get database file path."""
    from config import DB_PATH
    return DB_PATH


# Global engine and session factory for concurrency-safe usage with Celery + SQLite
DATABASE_URL = f"sqlite:///{get_database_path()}"
ENGINE = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=ENGINE, autocommit=False, autoflush=False)


def get_engine():
    """Get shared database engine instance."""
    return ENGINE


def get_session():
    """Get database session."""
    return SessionLocal()


# Enable Foreign Keys (and better journaling) for SQLite
from sqlalchemy import event
from sqlalchemy.engine import Engine


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


def init_db():
    """Initialize database tables."""
    engine = get_engine()
    Base.metadata.create_all(engine)
    return engine


@contextmanager
def session_scope():
    """
    Provide a transactional scope around a series of operations.

    This helper is safe to use in web handlers, Celery tasks, and scripts,
    and ensures that commit/rollback/close are handled in one place.
    """
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

