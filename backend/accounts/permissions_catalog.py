"""
The permission catalog for staff RBAC — the one place every permission is
defined. Synced into the Permission table on every migrate (see
accounts.signals), referenced by the API's access rules (accounts.access) and
served to the admin app to build the role/permission pickers.

Admins bypass all of this: an admin can do everything. Users & Roles and Kiosk
Devices have no permissions at all — they stay admin-only, because both hand
out access (logins, device credentials) and letting staff reach them would let
them grant themselves more.

Adding a permission: add it here, then use it in accounts.access and the admin
app's permission checks. No migration is needed.
"""

PERMISSION_GROUPS: list[dict] = [
    {"key": "dashboard", "label": "Dashboard", "permissions": [
        ("dashboard.view", "View dashboard"),
    ]},
    {"key": "vehicles", "label": "Vehicles", "permissions": [
        ("vehicles.view", "View vehicles"),
        ("vehicles.create", "Add vehicles"),
        ("vehicles.edit", "Edit vehicles"),
        ("vehicles.delete", "Delete vehicles"),
        ("vehicles.manage_exit_access", "Allow or block a vehicle from exiting"),
    ]},
    {"key": "drivers", "label": "Drivers", "permissions": [
        ("drivers.view", "View drivers"),
        ("drivers.create", "Add drivers"),
        ("drivers.edit", "Edit drivers"),
        ("drivers.delete", "Delete drivers"),
    ]},
    {"key": "guards", "label": "Security Guards", "permissions": [
        ("guards.view", "View security guards"),
        ("guards.create", "Add security guards"),
        ("guards.edit", "Edit security guards"),
        ("guards.delete", "Delete security guards"),
    ]},
    {"key": "gate", "label": "Gate Operations", "permissions": [
        ("gate.exit", "Record vehicle exits"),
        ("gate.entry", "Record vehicle entries"),
        ("gate.fuel", "Record fuel at the gate"),
    ]},
    {"key": "trips", "label": "Trips", "permissions": [
        ("trips.view", "View trip register and vehicles outside"),
        ("trips.edit", "Edit trips"),
        ("trips.delete", "Delete trips"),
    ]},
    {"key": "requisitions", "label": "Requisitions", "permissions": [
        ("requisitions.view", "View requisitions"),
        ("requisitions.create", "Create requisitions"),
        ("requisitions.edit", "Edit requisitions"),
        ("requisitions.approve", "Approve or reject requisitions"),
    ]},
    {"key": "fuel", "label": "Fuel", "permissions": [
        ("fuel.view", "View fuel entries"),
        ("fuel.create", "Add fuel entries"),
        ("fuel.edit", "Edit fuel entries"),
        ("fuel.delete", "Delete fuel entries"),
    ]},
    {"key": "maintenance", "label": "Maintenance", "permissions": [
        ("maintenance.view", "View maintenance records"),
        ("maintenance.create", "Add maintenance records"),
        ("maintenance.edit", "Edit maintenance records"),
        ("maintenance.delete", "Delete maintenance records"),
    ]},
    {"key": "tyres", "label": "Tyres", "permissions": [
        ("tyres.view", "View tyres"),
        ("tyres.create", "Add tyres"),
        ("tyres.edit", "Edit tyres"),
        ("tyres.delete", "Delete tyres"),
    ]},
    {"key": "documents", "label": "Documents", "permissions": [
        ("documents.view", "View documents"),
        ("documents.create", "Add documents"),
        ("documents.edit", "Edit documents"),
        ("documents.delete", "Delete documents"),
    ]},
    {"key": "odometer_issues", "label": "Odometer Issues", "permissions": [
        ("odometer_issues.view", "View reported odometer issues"),
        ("odometer_issues.resolve", "Enter readings for reported odometer issues"),
    ]},
    {"key": "alerts", "label": "Alerts", "permissions": [
        ("alerts.view", "View alerts"),
        ("alerts.manage", "Update and dismiss alerts"),
    ]},
    {"key": "reports", "label": "Reports", "permissions": [
        ("reports.view", "View reports"),
    ]},
    {"key": "master_data", "label": "Master Setup", "permissions": [
        ("master_data.view", "View Master Setup"),
        ("master_data.manage", "Add and edit Master Setup records"),
    ]},
    {"key": "audit", "label": "Audit Trail", "permissions": [
        ("audit.view", "View audit trail"),
    ]},
    {"key": "settings", "label": "Settings", "permissions": [
        ("settings.view", "View settings"),
        ("settings.edit", "Change settings"),
    ]},
]

ALL_PERMISSIONS: dict[str, str] = {
    codename: label for group in PERMISSION_GROUPS for codename, label in group["permissions"]
}
PERMISSION_GROUP_OF: dict[str, str] = {
    codename: group["label"] for group in PERMISSION_GROUPS for codename, _ in group["permissions"]
}

GATE_PERMISSIONS = frozenset({"gate.exit", "gate.entry", "gate.fuel"})


def _implied_view(codename: str) -> str | None:
    """Any action on a resource needs that resource's view — "edit drivers"
    without "view drivers" would be a button on a page you can't open."""
    resource, _, action = codename.partition(".")
    view = f"{resource}.view"
    if action != "view" and view in ALL_PERMISSIONS:
        return view
    return None


def expand_permissions(codenames) -> set[str]:
    """The given permissions plus everything they imply."""
    expanded = {c for c in codenames if c in ALL_PERMISSIONS}
    for codename in list(expanded):
        implied = _implied_view(codename)
        if implied:
            expanded.add(implied)
    return expanded


# Roles every tenant starts with. Admins aren't here — they're a user type,
# not a role. These reproduce exactly what the old fixed roles could reach, so
# moving existing users onto them changes nobody's access.
SYSTEM_ROLES: dict[str, dict] = {
    "fleet_manager": {
        "name": "Fleet Manager",
        "description": "Runs day-to-day fleet operations.",
        "permissions": [
            "dashboard.view",
            "vehicles.create", "vehicles.edit", "vehicles.delete", "vehicles.manage_exit_access",
            "drivers.create", "drivers.edit", "drivers.delete",
            "trips.view", "trips.edit", "trips.delete",
            "requisitions.create", "requisitions.edit", "requisitions.approve",
            "fuel.create", "fuel.edit", "fuel.delete",
            "maintenance.create", "maintenance.edit", "maintenance.delete",
            "tyres.create", "tyres.edit", "tyres.delete",
            "documents.create", "documents.edit", "documents.delete",
            "odometer_issues.resolve",
            "alerts.manage",
            "reports.view",
        ],
    },
    "management": {
        "name": "Management",
        "description": "Read-only oversight of the fleet.",
        "permissions": [
            "dashboard.view", "vehicles.view", "drivers.view", "trips.view",
            "alerts.manage", "reports.view",
        ],
    },
    "gate_guard": {
        "name": "Gate Guard",
        "description": "Records vehicles leaving and returning, and fuel at the gate.",
        "permissions": ["gate.exit", "gate.entry", "gate.fuel"],
    },
}
