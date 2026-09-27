
We are now implementing the Farmer authentication and registration flow.

Strict Rule: Do not modify the backend folder.

IMPORTANT:
- I have already created:
  - FarmerLogin.jsx
  - FarmerRegister.jsx
- Do NOT recreate these files.
- Inspect the existing project structure and modify these existing components.
- Follow the existing Mannalon frontend conventions.
- Do not modify FarmAdmin.jsx, FarmAdminHeader.jsx, FarmAdminLand.jsx, or the existing Farm-Admin authentication flow.
- Do not create a new authentication system.
- Do not create fake backend endpoints.
- If the required backend API does not exist yet, implement the frontend structure and clearly provide a "BACKEND COPILOT INSTRUCTIONS" section at the end describing exactly what the Spring Boot backend needs to provide.

PROJECT CONVENTIONS:
- React.js + Vite
- JavaScript, not TypeScript
- Use React functional components and hooks where appropriate.
- No inline CSS.
- All CSS must be placed in assets/styles.
- Do not add comments to the code.
- Remove unnecessary default Vite/React styling if present.
- Use existing project styling conventions.
- For icons, use assets/images/placeholdericon.png for now.
- Do not generate SVG icons.
- Keep the implementation clean and beginner-readable.
- Do not unnecessarily modify unrelated files.

==================================================
FARMER LOGIN
==================================================

The existing FarmerLogin.jsx should contain a simple Farmer login form.

Inputs:

1. Mobile Number
2. Password

The login UI should be simple because the Farmer is intended to be a user who may have limited experience with technology.

Suggested structure:

Farmer Login

Mobile Number
[________________]

Password
[________________]

[ Login ]

There should also be a clear link/button leading to FarmerRegister.jsx:

"Don't have an account? Register"

The login form should:
- Validate that mobile number is not empty.
- Validate that password is not empty.
- Prevent submission if validation fails.
- Show clear, simple validation messages.
- Use proper input types.
- Do not store passwords in localStorage.
- Do not hardcode successful login behavior.
- Do not create fake credentials.

When the backend authentication API is available, the frontend should send the mobile number and password to the backend.

The backend will determine whether the Farmer account is valid and active.

If login succeeds, prepare the frontend for redirecting to the Farmer dashboard/home page.

If the Farmer account is still pending approval or has been rejected, the backend response should be displayed appropriately.

Do not invent the final Farmer dashboard yet if it does not already exist.

==================================================
FARMER REGISTRATION
==================================================

The existing FarmerRegister.jsx should contain a very simple registration process.

The Farmer only needs to provide:

1. Farm Code
2. Mobile Number
3. Password
4. Selfie holding their ID

The registration UI should be simple and easy to understand.

Suggested structure:

Farmer Registration

Farm Code
[________________]

Mobile Number
[________________]

Password
[________________]

Selfie with ID
[ Open Camera / Take Selfie ]

[ Register ]

There should also be a clear link/button leading back to FarmerLogin.jsx:

"Already have an account? Login"

==================================================
FARM CODE
==================================================

The Farm Code is required.

The Farmer receives the Farm Code from their Farm-Admin.

The frontend should:
- Require the Farm Code.
- Trim unnecessary whitespace.
- Send the Farm Code to the backend.
- Do NOT generate a Farm Code on the frontend.
- Do NOT allow the Farmer to choose or create a Farm.
- Do NOT ask the Farmer to enter a Farm-Admin ID.
- Do NOT ask the Farmer for farm_id.

The Farmer only knows the human-readable Farm Code.

The backend is responsible for finding the corresponding approved farm and resolving the Farm Code to the actual farm_id.

For example:

Farmer enters:

FARM-001

Backend:

farms.farm_code = FARM-001

↓

farm_id = corresponding farm ID

↓

create pending farmer registration associated with that farm.

If the Farm Code does not exist or the farm is not approved/active, the frontend should display a simple error such as:

"Invalid Farm Code. Please check with your Farm-Admin."

Do not implement this validation using hardcoded frontend data.

==================================================
MOBILE NUMBER
==================================================

The Farmer must provide a mobile number.

Requirements:
- Required.
- Use an appropriate input type.
- Validate that the input is a reasonable Philippine mobile number format.
- Do not assume that the mobile number is the Farmer's Mannalon email.
- The mobile number is used for Farmer login.
- Do not automatically create the Mannalon email on the frontend.

The backend remains responsible for determining whether the mobile number is already registered.

If the mobile number is already associated with an existing Farmer account or pending registration, display an appropriate message.

==================================================
PASSWORD
==================================================

The Farmer must create a password during registration.

Requirements:
- Required.
- Use password input type.
- Provide a simple show/hide password option if consistent with the existing UI.
- Do not store the raw password anywhere in frontend storage.
- Do not hash the password in the frontend.
- Send it securely to the backend over HTTPS.
- The backend will hash and store the password.

Do not implement password hashing in React.

==================================================
SELFIE WITH ID
==================================================

This is an important part of the Farmer registration.

The Farmer must submit a selfie while holding their valid ID.

The frontend should provide a camera-based experience.

Preferred flow:

1. Farmer clicks "Take Selfie"
2. Browser requests camera permission.
3. Camera preview opens.
4. Farmer positions themselves while holding their ID.
5. Farmer clicks "Capture".
6. The captured image is shown as a preview.
7. Farmer can:
   - Retake
   - Accept
8. The accepted image becomes the file that will be submitted with the registration.

Use the browser's camera APIs where appropriate, such as:

navigator.mediaDevices.getUserMedia()

The frontend should handle:
- Camera permission denied
- Camera unavailable
- Camera loading failure
- Retaking the selfie
- Previewing the captured image
- Closing/stopping the camera stream when it is no longer needed

IMPORTANT:
- Do not permanently access the user's camera.
- Stop the MediaStream when the camera is closed, the component unmounts, or the picture is captured if the preview is no longer needed.
- Do not upload the image until the Farmer submits the registration.
- Do not store the selfie in localStorage.
- Do not convert the image into an unnecessarily huge base64 string for storage.

If the project already has a preferred file-upload pattern, follow that pattern.

The backend will ultimately receive the selfie as an uploaded file.

==================================================
REGISTRATION SUBMISSION
==================================================

When the Farmer clicks Register, validate:

- Farm Code is present.
- Mobile Number is present and valid.
- Password is present.
- Selfie has been captured.

If any requirement is missing, prevent submission and clearly tell the Farmer what is missing.

The frontend should prepare the request as multipart/form-data because the registration contains both:

- text fields
- image/file

Conceptually:

farmCode
mobileNumber
password
selfie

Do not send the selfie as a fake URL.

Do not invent an endpoint if one does not exist.

If the backend endpoint already exists, inspect the existing backend/API conventions and use them.

If it does not exist, leave the frontend integration structured cleanly and provide backend instructions.

==================================================
REGISTRATION STATUS
==================================================

Remember that Farmer registration requires approval by the Farm-Admin.

The registration process is:

Farmer
↓
Farm Code + Mobile Number + Password + Selfie with ID
↓
Submit Registration
↓
PENDING
↓
Farm-Admin reviews the registration
↓
APPROVED or REJECTED

The frontend must NOT automatically treat registration as an approved account.

After successful registration submission, show a simple message such as:

"Registration submitted successfully. Your account is pending approval from your Farm-Admin."

The Farmer should not be allowed to log in as an active Farmer until the backend confirms that the account has been approved and activated.

==================================================
MANNALON EMAIL
==================================================

IMPORTANT:

The Farmer does NOT enter a Mannalon email during registration.

The Farmer does NOT create their own Mannalon email.

After the Farm-Admin approves the Farmer registration, the BACKEND will create the official Mannalon email.

The intended format is:

firstname.lastname@mannalon.com

The frontend should NOT generate this email.

The frontend should NOT ask the Farmer for their first name or last name unless this is later added to the requirements.

The backend/Farm-Admin approval workflow will handle the information needed to generate the official Mannalon email.

If the backend later returns the generated Mannalon email after approval, the frontend may display it.

==================================================
THREE-WAY APPROVAL CONTEXT
==================================================

Keep the existing Mannalon approval architecture in mind:

1. Person → Farm-Admin
   MAO-Admin approves the person who wants to become a Farm-Admin.

2. Farm-Admin → Farm
   Farm-Admin registers a farm.
   MAO-Admin approves the farm.
   The system generates the Farm Code.

3. Farmer → Farm
   Farmer enters the Farm Code.
   Farmer submits Mobile Number, Password, and Selfie with ID.
   Farm-Admin reviews the Farmer registration.
   Farm-Admin approves or rejects the Farmer.
   After approval, the system creates the actual Farmer account and Mannalon email.

The Farmer should never be able to:
- Create a Farm
- Create a Farm Code
- Approve themselves
- Select an arbitrary Farm-Admin
- Mark their own registration as approved

==================================================
UI/UX
==================================================

Keep the Farmer interface significantly simpler than the Farm-Admin interface.

The design should prioritize:
- Large readable labels
- Clear buttons
- Minimal fields
- Simple instructions
- Clear validation messages
- Clear camera instructions
- No unnecessary technical terminology

For the selfie section, show an instruction similar to:

"Take a selfie while holding your valid ID."

Then:

"Make sure your face and ID are clearly visible."

The Farmer should immediately understand what to do without needing technical knowledge.

Do not add unnecessary fields such as:
- Full address
- Birth date
- Civil status
- Farm ownership information
- Farm area
- Farm location
- Farmer ID
- Farm-Admin ID

Those belong to other parts of the system and are not part of this simplified Farmer registration.

==================================================
ROUTING
==================================================

Use the existing React Router configuration.

Do not create a second router.

Connect:

FarmerLogin.jsx
↕
FarmerRegister.jsx

Use the project's existing routing conventions.

Do not modify unrelated authentication routes.

==================================================
BACKEND COPILOT INSTRUCTIONS
==================================================

At the end of your response, provide a section titled:

BACKEND COPILOT INSTRUCTIONS

This section should be copy-paste-ready for my IntelliJ/Spring Boot Backend Copilot.

It should tell the backend developer exactly what is required for this Farmer flow, including:

1. Farmer registration endpoint
2. Farmer login endpoint
3. Multipart/form-data handling for the selfie
4. Farm Code validation
5. Looking up the approved farm using farm_code
6. Creating a PENDING farmer registration
7. Preventing duplicate active/pending registrations for the same mobile number where appropriate
8. Farm-Admin approval endpoint
9. What happens when a Farm-Admin approves the Farmer
10. Creating the actual users record
11. Creating the farmers record
12. Setting user_role appropriately for Farmer
13. Generating the Mannalon email after approval
14. Generating the email in the format firstname.lastname@mannalon.com
15. Handling duplicate names when the generated email already exists
16. Password hashing using the existing backend security implementation
17. Returning appropriate API responses for:
    - Invalid Farm Code
    - Duplicate mobile number
    - Pending registration
    - Rejected registration
    - Successful registration
    - Successful login
    - Invalid login
18. Authentication/session/JWT behavior should follow the existing Mannalon backend implementation rather than creating a second authentication mechanism.
19. Create the tables necessary for the Farmer.

Before writing backend instructions, inspect the existing backend architecture and reuse existing:
- Entities
- Repositories
- Services
- Controllers
- DTOs
- Security configuration
- File upload/storage mechanism
- Authentication mechanism

Do NOT tell me to create duplicate tables if the required tables already exist.

The frontend and backend should work with the existing Mannalon database architecture.

Finally, after making the frontend changes, list:
1. Files modified
2. Files created, if any
3. Backend API requirements
4. Any assumptions that still need confirmation

IMPORTANT ROUTING UPDATE:

I already have a Farmer dashboard/page:

Farmer.jsx

Its route is:

/farmer

When a Farmer successfully logs in with valid credentials and the backend confirms that the account is ACTIVE/APPROVED, redirect the Farmer to:

/farmer

Do NOT create another Farmer dashboard or another route for the Farmer home page.

The expected flow is:

FarmerLogin.jsx
        ↓
Enter Mobile Number + Password
        ↓
Backend authentication
        ↓
Successful authentication
        ↓
Navigate to /farmer
        ↓
Farmer.jsx

Use the existing React Router configuration and existing routing conventions.

Do not use window.location for normal React navigation unless the existing project specifically uses that pattern.

Prefer the project's existing React Router navigation approach, such as useNavigate().

If the Farmer account is:
- PENDING → do not redirect to /farmer
- REJECTED → do not redirect to /farmer
- INACTIVE → do not redirect to /farmer
- ACTIVE/APPROVED → redirect to /farmer

Do not modify Farmer.jsx unless necessary for authentication integration.

Do not create a duplicate Farmer dashboard.

Also make sure that navigating directly to /farmer does not bypass whatever authentication protection already exists in the project. Reuse the existing authentication/route-protection mechanism instead of creating a second authentication system.