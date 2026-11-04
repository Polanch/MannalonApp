I want to build the content of my existing FarmAdminLand.jsx.

IMPORTANT PROJECT STRUCTURE:

I already have a parent page:

FarmAdmin.jsx

Inside FarmAdmin.jsx, I already render:

1. FarmAdminHeader.jsx
2. FarmAdminLand.jsx

FarmAdminHeader.jsx is already formatted and positioned as a fixed header at the top with a height of 60px.

The FarmAdminHeader contains navigation/menu buttons, including:

"Land"

When the Farm-Admin clicks the "Land" button, FarmAdminLand.jsx is rendered UNDER the existing FarmAdminHeader.jsx.

DO NOT modify FarmAdminHeader.jsx.

DO NOT create another header.

DO NOT create another navigation bar.

DO NOT handle the Land button click inside FarmAdminLand.jsx.

FarmAdminLand.jsx should ONLY contain the Land/Farm Management content.

==================================================
EXISTING BACKEND CONTEXT
==================================================

I already have a separate Spring Boot backend project being developed in IntelliJ.

I have already instructed my backend Copilot to migrate/create the database tables required for the Farm-Admin farm registration system.

The existing database structure includes:

farm_registrations

farm_registration_documents

farms

These tables are already part of the backend/database work.

The frontend must NOT invent a new database structure.

The frontend must work with the backend structure that already exists.

If you need information about the backend implementation, inspect the existing frontend project's API/service patterns first.

If an API endpoint does not exist yet, DO NOT invent an endpoint and pretend that it exists.

Instead, clearly identify what backend functionality is required.

==================================================
VERY IMPORTANT — BACKEND COPILOT COORDINATION
==================================================

Because the backend is being developed separately using IntelliJ Copilot, after implementing FarmAdminLand.jsx, provide me with a separate section called:

"BACKEND COPILOT INSTRUCTIONS"

This section must contain a copy-paste-ready prompt that I can give to my IntelliJ/Spring Boot backend Copilot.

The backend prompt should tell the backend Copilot exactly what the frontend needs from the backend.

Include:

1. Required REST API endpoints
2. HTTP methods
3. Request body structure
4. Response body structure
5. Required path variables/query parameters
6. Authentication/current Farm-Admin identification requirements
7. Database tables involved
8. Relationships between the tables
9. Farm registration status behavior
10. Document upload requirements
11. Farm Code generation behavior
12. Error responses
13. Validation requirements

The backend prompt must NOT create duplicate tables if the required tables already exist.

The backend Copilot should inspect the existing Spring Boot project before implementing anything.

The backend should use the existing project's:
- Controllers
- Services
- Repositories
- Entities
- DTOs
- Security/authentication
- Exception handling
- File storage approach

Do not tell the backend Copilot to rewrite existing architecture unnecessarily.

The backend Copilot should integrate with the existing project.

==================================================
FARMADMINLAND.JSX CONTENT
==================================================

The purpose of this page is for the logged-in Farm-Admin to:

1. View their registered farms
2. Register a new farm
3. Submit supporting documents
4. View registration status
5. View the Farm Code after approval

==================================================
INITIAL VIEW
==================================================

When the Farm-Admin opens the Land section, display:

"My Registered Farms"

and an:

"+ Add"

button.

Below this should be a table containing farms belonging ONLY to the currently logged-in Farm-Admin.

Table columns:

- Farm Name
- Location
- Area
- Farm Type
- Ownership
- Status
- Farm Code
- Action

==================================================
EMPTY STATE
==================================================

If the Farm-Admin has no registered farms:

Display:

"You have no Farm Registered"

inside the table/content area.

Provide an:

"+ Add"

button.

The empty state should look intentional and professional.

==================================================
ADD FARM
==================================================

When "+ Add" is clicked:

Display the Register Farm interface inside FarmAdminLand.jsx.

Do NOT navigate to another page.

Do NOT modify FarmAdmin.jsx.

Do NOT modify FarmAdminHeader.jsx.

Provide a clear:

"Back"

or

"Cancel"

button.

==================================================
STEP 1 — FARM INFORMATION
==================================================

Fields:

Farm Name
- required

Farm Area
- required
- numeric
- unit: hectares

Farm Type
- dropdown

Options:
- Rice Farm
- Rice-Based Farm
- Other

Irrigation Type
- dropdown

Options:
- Irrigated
- Rainfed
- Other

Ownership / Tenure Type
- required
- dropdown

Options:
- Owner
- Lessee
- Tenant
- Co-owner
- Other

==================================================
STEP 2 — FARM LOCATION
==================================================

Fields:

Region
- required

Province
- required

Municipality / City
- required

Barangay
- required

Sitio / Purok
- optional

==================================================
STEP 3 — DOCUMENT SUBMISSION
==================================================

Allow the Farm-Admin to submit supporting documents.

Document types:

- Proof of Land Ownership
- Certificate of Title / Land Title
- Tax Declaration
- Lease Agreement
- Barangay Certification
- Other Supporting Document

Each document should contain:

- Document Type
- Document Number
- File

Allow the Farm-Admin to:

- Add another document
- Remove a document
- See selected filename

At least one supporting document should be required.

Keep selected files in React state until the backend upload integration is available.

Do not invent an upload API.

==================================================
STEP 4 — REVIEW
==================================================

Display a complete review before submission.

FARM INFORMATION

- Farm Name
- Farm Area
- Farm Type
- Irrigation Type
- Ownership / Tenure

FARM LOCATION

- Region
- Province
- Municipality / City
- Barangay
- Sitio / Purok

DOCUMENTS

- Document Type
- Document Number
- Filename

Buttons:

[ Back ]

[ Submit Farm Registration ]

Do not lose entered information when moving between steps.

==================================================
SUBMISSION
==================================================

The frontend should eventually submit the farm registration to the Spring Boot backend.

The conceptual registration data is:

{
    farm_name: "...",
    region: "...",
    province: "...",
    municipality_city: "...",
    barangay: "...",
    sitio: "...",
    area_hectares: ...,
    farm_type: "...",
    irrigation_type: "...",
    ownership_type: "..."
}

IMPORTANT:

Do NOT allow the frontend user to manually provide:

farm_admin_id
status
farm_code
reviewed_by
approved_by

These must be controlled by the backend.

The backend must determine the currently authenticated Farm-Admin.

The backend should create the registration with:

status = PENDING

Do not rely on the frontend to determine the user's identity or approval status.

==================================================
AFTER SUBMISSION
==================================================

After successful submission, show:

"Farm Registration Submitted"

"Your farm registration has been submitted and is now pending review."

Status:

PENDING

Provide:

[ Back to My Farms ]

The new farm should appear in the farm list as:

PENDING

Farm Code:

—

==================================================
STATUS BEHAVIOR
==================================================

PENDING:

- Display PENDING
- No Farm Code

APPROVED:

- Display APPROVED
- Display Farm Code

REJECTED:

- Display REJECTED
- No Farm Code
- Allow the user to view the rejection reason

The frontend must NEVER generate the Farm Code.

The Farm Code is generated by the backend only after MAO-Admin approval.

==================================================
DATABASE RELATIONSHIP
==================================================

The existing backend/database tables are:

farm_registrations

farm_registration_documents

farms

Flow:

Farm-Admin submits registration

↓

farm_registrations

status = PENDING

↓

Documents are associated with:

farm_registration_documents

↓

MAO-Admin reviews registration

↓

If approved:

Create/populate:

farms

↓

Generate unique:

farm_code

The frontend must respect this workflow.

Do not directly create a farm from the frontend.

==================================================
FRONTEND API INTEGRATION
==================================================

If backend endpoints already exist:

Use the existing API/service structure.

If they do not exist:

Do NOT invent fake endpoints.

Instead:

1. Build the frontend component and state management cleanly.
2. Clearly identify the missing backend endpoints.
3. Generate the "BACKEND COPILOT INSTRUCTIONS" section at the end.
4. Tell me exactly which frontend functions will need to be connected to the backend once the backend Copilot implements the APIs.

Use Axios only if Axios is already being used by the project.

Do not introduce a new API library unnecessarily.

==================================================
LAYOUT
==================================================

Remember:

FarmAdminLand.jsx is rendered UNDER FarmAdminHeader.jsx.

Therefore:

- No header
- No navigation
- No fixed positioning
- No duplicate menu
- No changes to the existing 60px FarmAdminHeader

The content should naturally occupy the area below the header.

Use appropriate spacing so the content does not overlap the fixed header.

==================================================
DESIGN
==================================================

Follow the existing Mannalon design.

Use:

- Clean management table
- Clear empty state
- Add button
- Multi-step registration form
- Clear required-field indicators
- Document upload area
- Review section
- Status indicators
- Responsive layout

Do not redesign the rest of the application.

No inline CSS.

Use the existing assets/styles folder.

Do not create SVG icons.

Use existing placeholder/icon assets where appropriate.

==================================================
DEVELOPMENT RULES
==================================================

Before coding:

1. Inspect FarmAdmin.jsx.
2. Inspect FarmAdminHeader.jsx.
3. Inspect the existing FarmAdminLand.jsx.
4. Inspect the existing CSS structure.
5. Inspect existing authentication/session handling.
6. Inspect existing Axios/API service patterns.
7. Inspect existing reusable components.

Reuse existing project patterns wherever possible.

Do not modify unrelated components.

Do not create a second authentication system.

Do not create a second navigation system.

Do not create duplicate backend models or database structures.

==================================================
FINAL RESPONSE REQUIREMENT
==================================================

After implementing the frontend, provide me with:

1. FILES CREATED
2. FILES MODIFIED
3. FRONTEND FUNCTIONALITY IMPLEMENTED
4. BACKEND API DEPENDENCIES
5. BACKEND COPILOT INSTRUCTIONS

For "BACKEND COPILOT INSTRUCTIONS", give me ONE complete copy-paste-ready prompt specifically written for my Spring Boot IntelliJ Copilot.

The backend prompt must be based on the actual frontend implementation you created.

It should explain exactly what the backend needs to provide so I can copy the prompt directly into my backend project.

Do not simply say "create an API".

Specify the exact endpoints, request/response structures, authentication requirements, database relationships, validation, document handling, status behavior, and Farm Code generation required by this frontend.