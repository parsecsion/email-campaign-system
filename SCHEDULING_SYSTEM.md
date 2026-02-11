# Interview Scheduling System

A comprehensive database-driven scheduling system integrated with the email campaign system for managing candidates and interviews.

## Features

### Database Management
- **Candidate Management**: Store and manage candidate information (name, email, phone, status)
- **Interview Scheduling**: Schedule interviews with date, time, and status tracking
- **Conflict Detection**: Automatically detect scheduling conflicts
- **Smart Slot Suggestions**: Find available interview slots based on preferences

### CSV Import
- Import candidates and interviews from CSV files
- Automatic date/time parsing from various formats
- Email normalization (removes spaces, normalizes format)
- Duplicate detection and merging

### API Endpoints

#### Candidates
- `GET /api/candidates` - List all candidates (with search, filtering, pagination)
- `GET /api/candidates/<id>` - Get specific candidate
- `PUT /api/candidates/<id>` - Update candidate information
- `POST /api/candidates/import` - Import candidates from CSV

#### Interviews
- `GET /api/interviews` - List all interviews (with filtering by date, status, candidate)
- `GET /api/interviews/<id>` - Get specific interview
- `POST /api/interviews` - Create new interview (with conflict checking)
- `PUT /api/interviews/<id>` - Update interview (reschedule, change status)
- `DELETE /api/interviews/<id>` - Cancel interview (soft delete)

#### Scheduling
- `GET /api/schedule/available-slots` - Find available interview slots
- `GET /api/schedule/summary` - Get scheduling statistics
- `GET /api/schedule/calendar` - Get calendar view grouped by date

## Database Schema

### Candidates Table
- `id` (Primary Key)
- `first_name`
- `last_name`
- `email` (Unique, Indexed)
- `phone`
- `status`
- `notes`
- `created_at`
- `updated_at`

### Interviews Table
- `id` (Primary Key)
- `candidate_id` (Foreign Key → Candidates)
- `interview_date` (DateTime, Indexed)
- `interview_time`
- `day_of_week`
- `status` (pending, confirmed, rescheduled, cancelled, completed)
- `meet_link`
- `notes`
- `email_sent` (Boolean)
- `email_sent_at`
- `created_at`
- `updated_at`

### Time Slots Table
- `id` (Primary Key)
- `slot_date` (DateTime, Indexed)
- `slot_time`
- `duration_minutes`
- `is_available`
- `max_interviews`
- `current_bookings`
- `notes`
- `created_at`

## Usage

### Import CSV File

```bash
cd backend
python import_csv.py "../USA CONFIRMED.csv"
```

The script will:
1. Parse the CSV file
2. Extract candidate and interview information
3. Normalize email addresses
4. Parse dates and times
5. Create database records
6. Report any errors

### Using the API

#### Import Candidates from CSV

```javascript
const csvData = `FIRST NAME,LAST NAME,EMAIL ADDRESS,DATE,TIME
John,Doe,john@example.com,14TH NOV 2025,9:00`;

fetch('/api/candidates/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ csv_data: csvData })
});
```

#### Get All Candidates

```javascript
fetch('/api/candidates?search=john&status=Confirmed&limit=10')
  .then(res => res.json())
  .then(data => console.log(data.candidates));
```

#### Create Interview

```javascript
fetch('/api/interviews', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    candidate_id: 1,
    interview_date: '2025-11-14T09:00:00',
    interview_time: '9:00',
    day_of_week: 'FRIDAY',
    status: 'confirmed'
  })
});
```

#### Find Available Slots

```javascript
fetch('/api/schedule/available-slots?start_date=2025-11-14&end_date=2025-11-20&preferred_times=9:00&preferred_times=10:00')
  .then(res => res.json())
  .then(data => console.log(data.slots));
```

#### Get Calendar View

```javascript
fetch('/api/schedule/calendar?start_date=2025-11-14&end_date=2025-11-20')
  .then(res => res.json())
  .then(data => {
    // data.calendar is an object with dates as keys
    Object.keys(data.calendar).forEach(date => {
      console.log(`${date}: ${data.calendar[date].length} interviews`);
    });
  });
```

## Date/Time Parsing

The system supports various date formats:
- `14TH NOV 2025`
- `15th NOV 2025`
- `14 NOV 2025`
- `14-November-2025`

Time formats:
- `9:00`
- `9:30`
- `1:00` (automatically converted to 13:00)

## Conflict Detection

The system automatically checks for:
- **Same candidate conflicts**: Candidate cannot have two interviews within 1 hour
- **Time slot availability**: Prevents overbooking (configurable)

## Integration with Email System

Interviews can be linked to email campaigns:
- Use interview data to populate email templates
- Track email sending status per interview
- Automatically format dates for email templates

Example integration:
```python
# Get interviews that need confirmation emails
interviews = session.query(Interview).filter(
    Interview.status == 'confirmed',
    Interview.email_sent == False
).all()

# Send emails using interview data
for interview in interviews:
    recipient_data = {
        'Name': interview.candidate.first_name,
        'Email': interview.candidate.email,
        'Day': interview.interview_date.strftime('%A, %d %B %Y'),
        'InterviewTime': interview.interview_time
    }
    # Send email using existing email campaign system
```

## Database Location

The SQLite database is stored at:
```
data/candidates.db
```

The database is automatically created on first use.

## Error Handling

All API endpoints return consistent error responses:
```json
{
  "error": "Error message here"
}
```

Success responses:
```json
{
  "success": true,
  "data": {...}
}
```

## Authentication

All scheduling endpoints require authentication (same as email campaign system).

## Future Enhancements

- [ ] Recurring interview slots
- [ ] Interview reminders (email/SMS)
- [ ] Interview feedback collection
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Multi-timezone support
- [ ] Interview video recording links
- [ ] Automated rescheduling suggestions
- [ ] Bulk operations (reschedule multiple interviews)

