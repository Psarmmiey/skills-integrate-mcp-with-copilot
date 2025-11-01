"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import json
from pathlib import Path
from typing import Optional

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Security
security = HTTPBearer(auto_error=False)

# Load teacher credentials
def load_teachers():
    teachers_file = Path(__file__).parent / "teachers.json"
    with open(teachers_file, 'r') as f:
        return json.load(f)

# Authentication function
def authenticate_teacher(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        return None
    
    # Simple token validation - in production, use proper JWT tokens
    token = credentials.credentials
    try:
        # For simplicity, we'll use base64 encoded "email:password"
        import base64
        decoded = base64.b64decode(token).decode('utf-8')
        email, password = decoded.split(':', 1)
        
        teachers = load_teachers()
        if email in teachers["teachers"] and teachers["teachers"][email]["password"] == password:
            return {"email": email, "name": teachers["teachers"][email]["name"]}
        return None
    except Exception:
        return None

def require_teacher_auth(teacher = Depends(authenticate_teacher)):
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Teacher authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return teacher

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/login")
def login(email: str, password: str):
    """Login endpoint for teachers"""
    teachers = load_teachers()
    if email in teachers["teachers"] and teachers["teachers"][email]["password"] == password:
        # Create a simple token (base64 encoded email:password)
        import base64
        token = base64.b64encode(f"{email}:{password}".encode()).decode()
        return {
            "token": token,
            "teacher": {
                "email": email,
                "name": teachers["teachers"][email]["name"]
            }
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@app.get("/auth/verify")
def verify_auth(teacher = Depends(authenticate_teacher)):
    """Verify if current token is valid"""
    if teacher:
        return {"authenticated": True, "teacher": teacher}
    else:
        return {"authenticated": False, "teacher": None}


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, teacher = Depends(require_teacher_auth)):
    """Sign up a student for an activity (Teacher only)"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Teacher {teacher['name']} signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, teacher = Depends(require_teacher_auth)):
    """Unregister a student from an activity (Teacher only)"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Teacher {teacher['name']} unregistered {email} from {activity_name}"}
