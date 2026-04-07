"""
Auto-Assignment Engine for Complaint Care

Assignment flow:
  1. Pick the team with the lowest active load (round-robin, A→B→C tie-break)
  2. Within that team, pick the available staff member with the lowest active load
  3. Auto-assign directly to that staff member (staff_id set, is_auto_assigned=True)
  4. Only goes to pool when ALL teams are at MAX_ACTIVE_PER_TEAM capacity
     i.e. every team already has 2 active tasks → 6 total active tasks across 3 teams

Example — 3 teams, each with 1 staff, all at 0 tasks, same category:
  Task 1 → Team A → Staff A1  (A=0, B=0, C=0 → pick A)
  Task 2 → Team B → Staff B1  (A=1, B=0, C=0 → pick B)
  Task 3 → Team C → Staff C1  (A=1, B=1, C=0 → pick C)
  Task 4 → Team A → Staff A1  (A=1, B=1, C=1 → tie → pick A)
  Task 5 → Team B → Staff B1  (A=2, B=1, C=1 → pick B)
  Task 6 → Team C → Staff C1  (A=2, B=2, C=1 → pick C)
  Task 7 → Pool               (A=2, B=2, C=2 → all full)
"""
from datetime import datetime, timedelta
from models.staff import Staff, ComplaintAssignment, TeamType, CategoryExpertise, AssignmentStatus
from models.user import db

# Flat SLA deadline for all complaints: 48 hours
SLA_HOURS = 48

# Max active complaints per team before overflow goes to pool
MAX_ACTIVE_PER_TEAM = 2

# Max active complaints a single staff member can hold
MAX_ACTIVE_PER_STAFF = 2

# Teams in tie-break order
TEAM_ORDER = [TeamType.TEAM_A, TeamType.TEAM_B, TeamType.TEAM_C]


def get_sla_deadline() -> datetime:
    return datetime.utcnow() + timedelta(hours=SLA_HOURS)


def get_team_active_count(team: TeamType, category: str) -> int:
    """Active (non-resolved/closed) assignments for a team+category."""
    from models.complaint import Complaint, ComplaintStatus
    return ComplaintAssignment.query.filter_by(
        team=team,
        category=category
    ).join(ComplaintAssignment.complaint).filter(
        Complaint.status.notin_([ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])
    ).count()


def get_staff_active_count(staff_id: int) -> int:
    """Active (non-resolved/closed) assignments for a staff member."""
    from models.complaint import Complaint, ComplaintStatus
    return ComplaintAssignment.query.filter_by(
        staff_id=staff_id
    ).join(ComplaintAssignment.complaint).filter(
        Complaint.status.notin_([ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])
    ).count()


def select_best_team(category: str):
    """
    Pick the team with the lowest active load for this category.
    Tie-break: A before B before C.
    Returns None if ALL teams are at MAX_ACTIVE_PER_TEAM.
    """
    team_loads = {team: get_team_active_count(team, category) for team in TEAM_ORDER}
    available = {t: l for t, l in team_loads.items() if l < MAX_ACTIVE_PER_TEAM}
    if not available:
        return None
    return min(available, key=lambda t: (available[t], TEAM_ORDER.index(t)))


def select_best_staff(team: TeamType, category: str):
    """
    Within a team, find the available staff member with the lowest active load
    who is under MAX_ACTIVE_PER_STAFF. Matches by category_expertise first,
    falls back to any available staff in the team.
    Returns None if no staff has capacity.
    """
    category_enum = next((c for c in CategoryExpertise if c.value == category), None)

    # Try category-matched staff first
    candidates = Staff.query.filter_by(
        team=team,
        category_expertise=category_enum,
        is_available=True
    ).all() if category_enum else []

    # Fallback: any available staff in the team
    if not candidates:
        candidates = Staff.query.filter_by(team=team, is_available=True).all()

    # Filter by capacity and sort by active load ascending
    eligible = [
        (s, get_staff_active_count(s.id))
        for s in candidates
        if get_staff_active_count(s.id) < MAX_ACTIVE_PER_STAFF
    ]

    if not eligible:
        return None

    # Pick staff with lowest active count; use id as tie-break for determinism
    return min(eligible, key=lambda x: (x[1], x[0].id))[0]


def assign_complaint(complaint) -> ComplaintAssignment:
    """
    Assign a complaint to the best team + staff member.

    Two paths:
    1. estimated_completion_time <= 30 min (quick task):
       - Bypass team capacity limit
       - Assign directly to the best available staff in the best team
       - No MAX_ACTIVE_PER_TEAM restriction applies
    2. No estimated time or > 30 min:
       - Normal round-robin: pick team with lowest load (max 2 per team)
       - Falls back to pool only when all teams are at MAX_ACTIVE_PER_TEAM
    """
    category = complaint.category.value
    sla_deadline = get_sla_deadline()
    estimated_time = complaint.estimated_completion_time
    is_quick_task = estimated_time is not None and estimated_time <= 30

    if is_quick_task:
        # Quick task — find best staff across all teams, no capacity cap on teams
        best_staff = None
        best_team = None
        best_load = float('inf')

        for team in TEAM_ORDER:
            candidate = select_best_staff(team, category)
            if candidate:
                load = get_staff_active_count(candidate.id)
                if load < best_load:
                    best_load = load
                    best_staff = candidate
                    best_team = team

        if best_staff:
            best_staff.current_load += 1
            assignment = ComplaintAssignment(
                complaint_id=complaint.id,
                staff_id=best_staff.id,
                team=best_team,
                category=category,
                status=AssignmentStatus.ASSIGNED,
                is_auto_assigned=True,
                accepted_at=datetime.utcnow(),
                sla_deadline=sla_deadline
            )
            db.session.add(assignment)
            db.session.commit()
            print(f"⚡ [{complaint.ticket_id}] Quick task ({estimated_time}m) → {best_team.value} → {best_staff.name}")
            return assignment
        else:
            # No staff available at all → pool
            assignment = ComplaintAssignment(
                complaint_id=complaint.id,
                staff_id=None,
                team=TeamType.TEAM_A,
                category=category,
                status=AssignmentStatus.ASSIGNED,
                is_auto_assigned=False,
                sla_deadline=sla_deadline
            )
            db.session.add(assignment)
            db.session.commit()
            print(f"⚠️  [{complaint.ticket_id}] Quick task but no staff available → pool")
            return assignment

    # Normal task — round-robin with team capacity limit
    selected_team = select_best_team(category)

    if selected_team is None:
        # All teams full → pool
        assignment = ComplaintAssignment(
            complaint_id=complaint.id,
            staff_id=None,
            team=TeamType.TEAM_A,
            category=category,
            status=AssignmentStatus.ASSIGNED,
            is_auto_assigned=False,
            sla_deadline=sla_deadline
        )
        db.session.add(assignment)
        db.session.commit()
        loads = {t.value: get_team_active_count(t, category) for t in TEAM_ORDER}
        print(f"⚠️  [{complaint.ticket_id}] All teams full {loads} → general pool")
        return assignment

    assigned_staff = select_best_staff(selected_team, category)

    if assigned_staff:
        assigned_staff.current_load += 1
        assignment = ComplaintAssignment(
            complaint_id=complaint.id,
            staff_id=assigned_staff.id,
            team=selected_team,
            category=category,
            status=AssignmentStatus.ASSIGNED,
            is_auto_assigned=True,
            accepted_at=datetime.utcnow(),
            sla_deadline=sla_deadline
        )
    else:
        # Team has capacity but no available staff → team pool
        assignment = ComplaintAssignment(
            complaint_id=complaint.id,
            staff_id=None,
            team=selected_team,
            category=category,
            status=AssignmentStatus.ASSIGNED,
            is_auto_assigned=False,
            sla_deadline=sla_deadline
        )

    db.session.add(assignment)
    db.session.commit()

    loads = {t.value: get_team_active_count(t, category) for t in TEAM_ORDER}
    if assigned_staff:
        print(f"✅ [{complaint.ticket_id}] → {selected_team.value} → {assigned_staff.name} | loads: {loads}")
    else:
        print(f"✅ [{complaint.ticket_id}] → {selected_team.value} (no staff, team pool) | loads: {loads}")

    return assignment


def complete_assignment(assignment: ComplaintAssignment):
    """Called when a complaint is resolved — updates staff performance stats."""
    assignment.status = AssignmentStatus.COMPLETED
    assignment.completed_at = datetime.utcnow()

    if assignment.staff_id:
        staff = Staff.query.get(assignment.staff_id)
        if staff:
            staff.current_load = max(0, staff.current_load - 1)
            staff.total_resolved += 1

            if assignment.accepted_at:
                resolution_minutes = (
                    assignment.completed_at - assignment.accepted_at
                ).total_seconds() / 60
                if staff.total_resolved == 1:
                    staff.avg_resolution_time = resolution_minutes
                else:
                    staff.avg_resolution_time = (
                        (staff.avg_resolution_time * (staff.total_resolved - 1) + resolution_minutes)
                        / staff.total_resolved
                    )

    db.session.commit()
