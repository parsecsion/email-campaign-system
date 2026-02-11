# Scheduling System - Quick Start Guide

## What Was Created

A complete database-driven interview scheduling system integrated with your email campaign platform.

### Files Created

1. **`backend/database.py`** - Database models and schema
   - Candidate model
   - Interview model
   - TimeSlot model
   - Database initialization

2. **`backend/scheduler.py`** - Smart scheduling logic
   - CSV import functionality
   - Date/time parsing
   - Conflict detection
   - Available slot finder
   - Schedule statistics

3. **`backend/scheduling_api.py`** - REST API endpoints
   - Candidate management endpoints
   - Interview management endpoints
   - Scheduling utilities endpoints

4. **`backend/import_csv.py`** - CSV import utility script

5. **`SCHEDULING_SYSTEM.md`** - Complete documentation

### Database

- **Location**: `data/candidates.db` (SQLite)
- **Status**: ✅ Created and populated with 128 candidates/interviews from your CSV

## Quick Start

### 1. Import Your CSV (Already Done!)

```bash
cd backend
python import_csv.py "../USA CONFIRMED.csv"
```

✅ **Result**: 128 candidates/interviews imported successfully

### 2. Start the Backend Server

The scheduling API is automatically integrated into your Flask app:

```bash
cd backend
python app.py
```

The API endpoints are now available at:
- `http://localhost:5000/api/candidates`
- `http://localhost:5000/api/interviews`
- `http://localhost:5000/api/schedule/*`

### 3. Test the API

#### Get All Candidates
```bash
curl http://localhost:5000/api/candidates
```

#### Get Interviews for a Date Range
```bash
curl "http://localhost:5000/api/interviews?start_date=2025-11-14&end_date=2025-11-20"
```

#### Get Calendar View
```bash
curl "http://localhost:5000/api/schedule/calendar?start_date=2025-11-14&end_date=2025-11-20"
```

## Key Features

### ✅ Smart CSV Import
- Automatically parses dates like "14TH NOV 2025"
- Handles various time formats
- Normalizes email addresses (removes spaces)
- Detects duplicates and merges data

### ✅ Conflict Detection
- Prevents double-booking candidates
- Checks for time slot availability
- Validates before creating interviews

### ✅ Available Slot Finder
- Finds open interview slots
- Respects preferred times
- Excludes candidate conflicts

### ✅ Calendar View
- Groups interviews by date
- Easy to visualize schedule
- Filter by date range

## Integration with Email System

The scheduling system integrates seamlessly with your email campaign:

1. **Use interview data in emails**:
   ```python
   # Interview data automatically includes:
   # - Name (first name extracted)
   # - Day (formatted date)
   # - InterviewTime
   # - Email
   ```

2. **Track email sending**:
   - `email_sent` flag on interviews
   - `email_sent_at` timestamp
   - Link interviews to email campaigns

## Next Steps

1. **Frontend Integration**: Add calendar view to your React frontend
2. **Email Automation**: Automatically send confirmation emails when interviews are scheduled
3. **Rescheduling**: Add UI for candidates to request reschedules
4. **Reminders**: Set up automated reminder emails before interviews

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/candidates` | GET | List candidates |
| `/api/candidates/<id>` | GET | Get candidate |
| `/api/candidates/<id>` | PUT | Update candidate |
| `/api/candidates/import` | POST | Import from CSV |
| `/api/interviews` | GET | List interviews |
| `/api/interviews` | POST | Create interview |
| `/api/interviews/<id>` | GET | Get interview |
| `/api/interviews/<id>` | PUT | Update interview |
| `/api/interviews/<id>` | DELETE | Cancel interview |
| `/api/schedule/available-slots` | GET | Find available slots |
| `/api/schedule/summary` | GET | Get statistics |
| `/api/schedule/calendar` | GET | Get calendar view |

All endpoints require authentication (same as email campaign system).

## Database Statistics

After importing your CSV:
- **128 candidates/interviews** imported
- **2 errors** (empty rows in CSV - expected)
- **Database size**: ~70 KB

## Support

For detailed documentation, see `SCHEDULING_SYSTEM.md`.

For issues or questions, check the logs:
- Application logs: `backend/email_campaign.log`
- Database: `data/candidates.db`

