# 🧪 Blood Donor System - Testing Guide

## Quick Start Testing

### 1. System Health Check

```bash
# Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:7

# Start Backend (Terminal 1)
cd backend
npm install
npm run start:dev

# Start Frontend (Terminal 2)
cd frontend  
npm install
npm run dev
```

**Verify:**
- Backend: Visit `http://localhost:3001` - should show API info
- Frontend: Visit `http://localhost:3000` - should show landing page
- Health: Visit `http://localhost:3001/health` - should show "healthy"

### 2. Authentication Flow Test

**Test Registration:**
1. Go to `http://localhost:3000`
2. Click "Join as Donor" or "Hospital Login" → "Sign Up"
3. Complete the 3-step registration process
4. Try both donor and hospital registration

**Test Login:**
1. Use credentials from registration
2. Verify redirect to appropriate dashboard

### 3. Core Alert Flow Test

**As Hospital:**
1. Login to hospital account
2. Go to Hospital Dashboard
3. Click "Create Alert"
4. Fill out blood donation request form
5. Submit alert

**As Donor:**
1. Login to donor account  
2. Go to Donor Dashboard
3. Should see active alerts (if any)
4. Click "Respond" on an alert
5. Submit response

### 4. API Testing (Optional)

Use Postman or curl to test API endpoints:

```bash
# Register new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Hospital",
    "email": "test@hospital.com", 
    "password": "password123",
    "phone": "+1234567890",
    "role": "hospital",
    "address": "123 Main St",
    "location": {
      "type": "Point",
      "coordinates": [-74.0060, 40.7128]
    },
    "hospitalName": "Test Medical Center",
    "licenseNumber": "LIC123",
    "contactPerson": "Dr. Smith",
    "emergencyContact": "+1234567891"
  }'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@hospital.com",
    "password": "password123"
  }'
```

## Expected Behaviors

### ✅ What Should Work
- User registration and login
- Role-based dashboard access
- Alert creation (hospitals)
- Alert viewing (donors)
- Alert response submission
- Basic geospatial donor matching
- Form validation and error handling

### ⚠️ What Needs External Setup
- SMS notifications (requires Twilio)
- Email notifications (requires SendGrid)
- Push notifications (requires Firebase)
- Google Maps integration (requires API key)

### 🐛 Common Issues & Solutions

**Backend won't start:**
- Check MongoDB is running: `docker ps | grep mongodb`
- Check port 3001 is free: `lsof -i :3001` (Mac/Linux) or `netstat -an | findstr 3001` (Windows)

**Frontend won't start:**
- Check port 3000 is free
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

**Database connection issues:**
- Verify MongoDB URI in `.env` file
- Check MongoDB container logs: `docker logs mongodb`

**CORS errors:**
- Verify FRONTEND_URL in backend `.env` matches frontend URL
- Check browser console for specific CORS errors

## Test Data Examples

### Sample Hospital Registration
```json
{
  "name": "City General Hospital",
  "email": "admin@citygeneral.com",
  "password": "hospital123",
  "phone": "+1-555-0123",
  "role": "hospital",
  "address": "456 Medical Drive, Healthcare City, HC 12345",
  "location": {
    "type": "Point", 
    "coordinates": [-74.0060, 40.7128]
  },
  "hospitalName": "City General Hospital",
  "licenseNumber": "MED-2024-001",
  "contactPerson": "Dr. Sarah Johnson",
  "emergencyContact": "+1-555-0199"
}
```

### Sample Donor Registration
```json
{
  "name": "John Donor",
  "email": "john@donor.com", 
  "password": "donor123",
  "phone": "+1-555-0456",
  "role": "donor",
  "address": "789 Donor Street, Helper City, HC 12346",
  "location": {
    "type": "Point",
    "coordinates": [-74.0050, 40.7130]
  },
  "bloodGroup": "O+",
  "dateOfBirth": "1990-05-15",
  "weight": 70
}
```

### Sample Alert Creation
```json
{
  "bloodGroup": "O+",
  "unitsNeeded": 3,
  "priority": "high", 
  "patientCondition": "Emergency surgery patient",
  "additionalNotes": "Patient requires immediate transfusion",
  "requiredBy": "2024-12-20T18:00:00.000Z",
  "searchRadius": 10,
  "isEmergency": true
}
```

## Success Metrics

After testing, you should be able to:
- [x] Register both hospital and donor accounts
- [x] Login and access role-appropriate dashboards  
- [x] Create blood donation alerts as hospital
- [x] View and respond to alerts as donor
- [x] See real-time updates in dashboards
- [x] Navigate between all pages without errors

## Next Steps After Basic Testing

1. **Configure External Services** (Twilio, SendGrid, Firebase)
2. **Test Notification Flow** with real SMS/Email
3. **UI/UX Improvements** based on testing feedback
4. **Performance Testing** with multiple users
5. **Mobile Responsiveness** testing
6. **Production Deployment** preparation