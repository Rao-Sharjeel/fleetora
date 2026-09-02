"""
Master-data seed values, transcribed from the frontend's mock fixtures so the
Master Setup screens open with the same reference records after the API swap.

Each entry is (code, name, {extra fields}). FK-bearing tables reference other
masters by code; the seed command resolves those to real objects.
"""

VEHICLE_TYPES = [
    ("VT-01", "Car", {"description": "Passenger Car / Sedan"}),
    ("VT-02", "Pickup", {"description": "Single / Double Cabin"}),
    ("VT-03", "Van", {"description": "Mini / Passenger Van"}),
    ("VT-04", "Bus", {"description": "Passenger Bus"}),
    ("VT-05", "Truck", {"description": "Light / Heavy Duty Truck"}),
    ("VT-06", "Motorcycle", {"description": "Two Wheeler"}),
    ("VT-07", "Forklift", {"description": "Material Handling Vehicle"}),
]

VEHICLE_MAKES = [
    ("MAKE-01", "Toyota", {"country": "Japan", "description": "Vehicle Manufacturer"}),
    ("MAKE-02", "Suzuki", {"country": "Japan", "description": "Vehicle Manufacturer"}),
    ("MAKE-03", "Honda", {"country": "Japan", "description": "Vehicle Manufacturer"}),
    ("MAKE-04", "Hino", {"country": "Japan", "description": "Commercial Vehicles"}),
    ("MAKE-05", "Isuzu", {"country": "Japan", "description": "Commercial Vehicles"}),
    ("MAKE-06", "Hyundai", {"country": "South Korea", "description": "Vehicle Manufacturer"}),
]

# (code, name, make_code, vehicle_type_code, year_from)
VEHICLE_MODELS = [
    ("MOD-01", "Corolla", "MAKE-01", "VT-01", 2020),
    ("MOD-02", "Hilux", "MAKE-01", "VT-02", 2021),
    ("MOD-03", "Alto", "MAKE-02", "VT-01", 2019),
    ("MOD-04", "City", "MAKE-03", "VT-01", 2021),
    ("MOD-05", "Dutro", "MAKE-04", "VT-05", 2020),
    ("MOD-06", "N-Series", "MAKE-05", "VT-05", 2020),
]

DEPARTMENTS = [
    ("DEPT-01", "Administration", {"description": "Administration Department"}),
    ("DEPT-02", "Sales & Marketing", {"description": "Sales and Marketing"}),
    ("DEPT-03", "Production", {"description": "Production Department"}),
    ("DEPT-04", "Warehouse", {"description": "Warehouse & Logistics"}),
    ("DEPT-05", "Finance", {"description": "Finance Department"}),
    ("DEPT-06", "HR & Admin", {"description": "Human Resources & Admin"}),
    ("DEPT-07", "Procurement", {"description": "Procurement Department"}),
]

VEHICLE_PURPOSES = [
    ("PUR-01", "Official Visit", {"use_type": "Official", "approval_level": "Department Head"}),
    ("PUR-02", "Client Visit", {"use_type": "Official", "approval_level": "Department Head"}),
    ("PUR-03", "Material Collection", {"use_type": "Official", "approval_level": "Department Head"}),
    ("PUR-04", "Delivery / Dispatch", {"use_type": "Official", "approval_level": "Department Head"}),
    ("PUR-05", "Bank / Government Work", {"use_type": "Official", "approval_level": "Department Head"}),
    ("PUR-06", "Personal Use", {"use_type": "Personal", "approval_level": "CEO / Management"}),
    ("PUR-07", "Emergency", {"use_type": "Official", "approval_level": "Management"}),
]

MAINTENANCE_SERVICE_TYPES = [
    ("MST-01", "Engine Oil Change", {"category": "Engine", "default_basis": "Mileage"}),
    ("MST-02", "Oil Filter Change", {"category": "Engine", "default_basis": "Mileage"}),
    ("MST-03", "Air Filter Change", {"category": "Engine", "default_basis": "Mileage"}),
    ("MST-04", "Fuel Filter Change", {"category": "Engine", "default_basis": "Mileage"}),
    ("MST-05", "Gear Oil Change", {"category": "Transmission", "default_basis": "Mileage"}),
    ("MST-06", "Brake Service", {"category": "Brake", "default_basis": "Mileage / Time"}),
    ("MST-07", "Tyre Rotation", {"category": "Tyre", "default_basis": "Mileage"}),
    ("MST-08", "Wheel Alignment", {"category": "Tyre", "default_basis": "Mileage"}),
    ("MST-09", "AC Service", {"category": "Electrical", "default_basis": "Mileage"}),
    ("MST-10", "General Service", {"category": "General", "default_basis": "Mileage / Time"}),
]

ENGINE_OILS = [
    ("OIL-01", "Shell 5W-30", {"brand": "Shell", "grade": "5W-30", "oil_type": "Synthetic", "pack_size": "4 Ltr", "default_km": 5000}),
    ("OIL-02", "Mobil 10W-40", {"brand": "Mobil", "grade": "10W-40", "oil_type": "Semi Synthetic", "pack_size": "4 Ltr", "default_km": 5000}),
    ("OIL-03", "Total 15W-40", {"brand": "Total", "grade": "15W-40", "oil_type": "Mineral", "pack_size": "4 Ltr", "default_km": 4000}),
    ("OIL-04", "Castrol 5W-30", {"brand": "Castrol", "grade": "5W-30", "oil_type": "Synthetic", "pack_size": "4 Ltr", "default_km": 5000}),
    ("OIL-05", "ZIC 10W-40", {"brand": "ZIC", "grade": "10W-40", "oil_type": "Semi Synthetic", "pack_size": "4 Ltr", "default_km": 5000}),
]

PARTS_CONSUMABLES = [
    ("PRT-01", "Oil Filter", {"category": "Filter", "unit": "Nos.", "default_life_km": 5000}),
    ("PRT-02", "Air Filter", {"category": "Filter", "unit": "Nos.", "default_life_km": 10000}),
    ("PRT-03", "Fuel Filter", {"category": "Filter", "unit": "Nos.", "default_life_km": 20000}),
    ("PRT-04", "Spark Plug", {"category": "Ignition", "unit": "Set", "default_life_km": 30000}),
    ("PRT-05", "Timing Belt", {"category": "Engine", "unit": "Nos.", "default_life_km": 80000}),
    ("PRT-06", "Brake Pads", {"category": "Brake", "unit": "Set", "default_life_km": 30000}),
    ("PRT-07", "Wiper Blades", {"category": "Body", "unit": "Set"}),
]

WORKSHOP_VENDORS = [
    ("VEN-01", "ABC Auto Workshop", {"vendor_type": "Workshop", "contact_person": "Service Manager", "phone": "0300-1111111"}),
    ("VEN-02", "Authorized Toyota Dealer", {"vendor_type": "Dealer", "contact_person": "Service Advisor", "phone": "0300-2222222"}),
    ("VEN-03", "Tyre Service Center", {"vendor_type": "Tyre Vendor", "contact_person": "Manager", "phone": "0300-3333333"}),
    ("VEN-04", "Battery Supplier", {"vendor_type": "Parts Vendor", "contact_person": "Sales Officer", "phone": "0300-4444444"}),
    ("VEN-05", "Lubricant Supplier", {"vendor_type": "Oil Vendor", "contact_person": "Sales Manager", "phone": "0300-5555555"}),
]

# (code, name, department_code, description)
COST_CENTERS = [
    ("CC-001", "Administration Fleet", "DEPT-01", "Admin vehicle expenses"),
    ("CC-002", "Sales Fleet", "DEPT-02", "Sales vehicle expenses"),
    ("CC-003", "Production Transport", "DEPT-03", "Production transport"),
    ("CC-004", "Warehouse Logistics", "DEPT-04", "Warehouse fleet expenses"),
    ("CC-005", "Management Vehicles", "DEPT-01", "Management vehicles"),
    ("CC-006", "Project / Special Duty", "DEPT-01", "Special assignments"),
]

DRIVING_LICENCE_TYPES = [
    ("DLT-01", "Motor Cycle", {"description": "Motorcycle licence", "default_validity_years": 5}),
    ("DLT-02", "Motor Car", {"description": "Private car licence", "default_validity_years": 5}),
    ("DLT-03", "LTV", {"description": "Light Transport Vehicle licence", "default_validity_years": 5}),
    ("DLT-04", "HTV", {"description": "Heavy Transport Vehicle licence", "default_validity_years": 3}),
    ("DLT-05", "PSV", {"description": "Public Service Vehicle licence", "default_validity_years": 3}),
    ("DLT-06", "Tractor", {"description": "Agricultural / tractor licence", "default_validity_years": 5}),
]

FUEL_TYPES = [
    ("FT-01", "Petrol", {"unit": "Ltr", "description": "Motor petrol"}),
    ("FT-02", "Diesel", {"unit": "Ltr", "description": "High speed diesel"}),
    ("FT-03", "CNG", {"unit": "KG", "description": "Compressed Natural Gas"}),
    ("FT-04", "Hybrid", {"unit": "Ltr/Unit", "description": "Petrol + Electric", "status": "inactive"}),
    ("FT-05", "Electric", {"unit": "kWh", "description": "Electric Vehicle", "status": "inactive"}),
]

GEAR_OIL_TYPES = [
    ("GO-01", "Petrol", {"description": "Petroleum based gear oil"}),
    ("GO-02", "Diesel", {"description": "Diesel based gear oil"}),
    ("GO-03", "CNG", {"description": "CNG compatible gear oil"}),
]

TYRE_TYPES = [
    ("TYR-01", "TYR-20S65R15", {"brand": "Bridgestone", "size": "205/65 R15", "type_pattern": "Tubeless", "ply_load": "4 Ply", "std_life_km": 40000}),
    ("TYR-02", "TYR-21S75R16", {"brand": "Michelin", "size": "215/75 R16", "type_pattern": "Tubeless", "ply_load": "6 Ply", "std_life_km": 50000}),
    ("TYR-03", "TYR-26S70R17", {"brand": "Yokohama", "size": "265/70 R17", "type_pattern": "Tubeless", "ply_load": "6 Ply", "std_life_km": 60000}),
    ("TYR-04", "TYR-22S60R17", {"brand": "Dunlop", "size": "225/60 R17", "type_pattern": "Tubeless", "ply_load": "4 Ply", "std_life_km": 45000}),
    ("TYR-05", "TYR-7S016", {"brand": "General", "size": "7.50 R16", "type_pattern": "Tube Type", "ply_load": "12 Ply", "std_life_km": 70000}),
    ("TYR-06", "TYR-100020", {"brand": "Bridgestone", "size": "10.00 R20", "type_pattern": "Tube Type", "ply_load": "14 Ply", "std_life_km": 80000}),
]

DOCUMENT_TYPES = [
    ("DOC-01", "Registration Book", {"category": "Vehicle Document", "default_alert_days": 30, "mandatory": True}),
    ("DOC-02", "Insurance Certificate", {"category": "Vehicle Document", "default_alert_days": 30, "mandatory": True}),
    ("DOC-03", "Fitness Certificate", {"category": "Vehicle Document", "default_alert_days": 30, "mandatory": True}),
    ("DOC-04", "Route Permit", {"category": "Vehicle Document", "default_alert_days": 30, "mandatory": True}),
    ("DOC-05", "Token Tax", {"category": "Vehicle Document", "default_alert_days": 15, "mandatory": True}),
    ("DOC-06", "Emission Certificate", {"category": "Vehicle Document", "default_alert_days": 30, "mandatory": False}),
    ("DOC-07", "Pollution Certificate", {"category": "Vehicle Document", "default_alert_days": 30, "mandatory": False}),
    ("DOC-08", "Driver Licence", {"category": "Driver Document", "default_alert_days": 15, "mandatory": True}),
    ("DOC-09", "CNIC", {"category": "Driver Document", "mandatory": False}),
    ("DOC-10", "Other Document", {"category": "General", "default_alert_days": 30, "mandatory": False}),
]

LOCATION_SITES = [
    ("LOC-01", "Head Office", {"address": "5-G, Gulberg III, Lahore"}),
    ("LOC-02", "Factory", {"address": "Main Canal Bank, Chung, Lahore"}),
    ("LOC-03", "Warehouse - Kasur", {"address": "Multan Road, Chung Punjgran, Kasur"}),
    ("LOC-04", "Branch Office - Karachi", {"address": "Shahrah-e-Faisal, Karachi"}),
    ("LOC-05", "Branch Office - Multan", {"address": "Bosan Road, Multan"}),
]

# (code, name, location_code, description)
GATES = [
    ("GATE-01", "Main Gate", "LOC-01", "Main entrance gate"),
    ("GATE-02", "Factory Gate", "LOC-02", "Factory main gate"),
    ("GATE-03", "Warehouse Gate", "LOC-03", "Warehouse entry gate"),
    ("GATE-04", "Exit Gate", "LOC-03", "Warehouse exit gate"),
    ("GATE-05", "Side Gate", "LOC-02", "Side entry gate"),
]
