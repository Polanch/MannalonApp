# React + Vite

## Ticketing and rental reports

- The **Admin Dashboard** shows all-time counts for all six ticket statuses and
  an ongoing total (Open + Assigned + In Progress + On Hold), refreshing every
  15 seconds. Failed refreshes are shown explicitly; unavailable counts are not
  presented as zero. **Manage tickets** opens the ticketing center.
- The bottom of the Admin Dashboard includes the existing community farm map,
  showing approved farms with shared locations through `/api/farm-locations`.

- **Farmer:** FarmTools > Ticketing (`/farmer/tickets`).
- **Farm-Admin:** Resources > Ticketing (`/farmadmin/tickets`).
- **Admin / MAO-Admin:** Ticketing in the sidebar (`/admin/tickets`).
- Farmers and Farm-Admins can create categorized tickets with evidence. Reported
  renters can respond to cases involving them. Lists show status, severity,
  assignment, attachment count, and latest comment author/time. The API currently
  supplies author IDs rather than names, so authors display as `User #globalId`.
- Open ticket details include private image previews/downloads, paginated comments,
  and audit history. Lists, details, comments, history, and visible Admin insights
  refresh every **15 seconds**; polling stops when those views unmount.
- Admins can assign active Admins, change severity (3 default, 1 highest), and
  manage status. On-hold requires a reason; resolution/cancellation requires a
  closing report. Closed tickets are read-only. Admin forms capture versions and
  require review/reset when polling detects changes; HTTP 409 never auto-retries.
- Rental owners open an active/returned booking in **Granted** and choose
  **Report rental issue**. Non-return is offered only for active overdue rentals.
  Rental cards/details show the backend report status, grace deadline, and
  escalation. Newly submitted reports link to their ticket.
- Deadlines are enforced by the backend in UTC, not by browser timers.
  Offset-free backend timestamps are interpreted as UTC and displayed in local
  time. Creation-date filter inputs are explicitly **UTC**.
- Non-return grace ends seven days after the original due time; rule-violation
  grace ends seven days after reporting. Escalation is separate from severity.
- Attachments: up to five per request, each at most **10 MiB** (backend's 10 MB
  limit), supporting JPG/JPEG/PNG/WebP/PDF/TXT/CSV. Previews/downloads use
  cookie-authenticated backend endpoints and temporary blob URLs, not public paths.
- Insights use backend aggregates. Ticket metrics use the selected creation-date
  range; the current backend's rental report totals are all-time. Average closure
  time includes resolved and cancelled tickets.

### Frontend configuration

Set `VITE_API_ORIGIN` in `.env.local` (default `http://localhost:8080`) and restart
Vite. This shared origin is used by ticketing and existing clients importing
`API_ORIGIN`. Session cookies and backend CORS must permit the actual frontend
origin. No actor IDs are sent to authenticate ticket actions.

### Rental settlement

`ticket.rentalReport.version` contains the actual rental-report optimistic-lock
version. **Confirm settlement** submits it as `expectedReportVersion`, together
with the captured ticket version as `expectedTicketVersion`. Reporting owners
and Admins can settle open reports; renters cannot. If either version changes,
review the latest details and reset the settlement form before retrying.

Restart/deploy the updated backend to expose the report version. Responses from
older backends that omit it keep settlement disabled with an explicit explanation;
the frontend never substitutes the ticket version or a constant. Admin status
closure is not a substitute: the current backend cancels an open linked rental
report when closing by status, which the UI warns about.

### Ticketing validation

`npm test` covers UTC timestamps, exact attachment limits, multipart fields,
session credentials, pagination/filters, optimistic-lock payloads, private downloads,
explicit 400/403/409 errors, returned report versions, and the missing-version settlement guard.
`npm run build` validates production compilation. Backend persistence and scheduler
tests remain the responsibility of the separate backend repository.

## User Management

Admins open **User Management** in the sidebar (`/admin/users`).

- **Users:** search/filter approved Farmers and Farm Admins, edit profile details,
  block with a reason, set inactive, or restore access. No accounts are deleted.
  Farmer/Farm-Admin creation still requires the existing registration/approval
  process. Login identifiers, roles, passwords, farm assignments, and approval
  decisions cannot be changed through the profile editor.
- **Admins:** create an immediately active `MAO-Admin` with full name, employee ID,
  and an initial password. Employee IDs allow letters, numbers, underscores, and
  hyphens (up to 50 characters); passwords require 10-72 characters and at most
  72 UTF-8 bytes. Passwords are stored with BCrypt. Share initial credentials
  privately; this screen does not send them or force a first-login reset.
- **Appeals:** review pending appeals or view resolved history. Approval restores
  access; rejection keeps the account blocked. A review note is required.
- **Deactivate Account**, at the bottom of the Admins tab, deactivates the
  **currently signed-in admin** after password confirmation and signs them out.
  The last active admin cannot deactivate; create another admin first. The
  default developer account is not removed automatically, but can deactivate
  itself. Backend startup will not recreate or reactivate an existing account.

Blocked users who enter the correct password are sent to `/appeal`, with a
restricted appeal-only server session, not normal application access. They can
submit **one appeal per block** and refresh its status. After access is restored
they must sign in again. A new block allows a new appeal; old appeals cannot
restore access for a later block. Manual account-status changes close pending
appeals. Each new appeal keeps its original block reason for admin history.
Inactive accounts cannot sign in or submit an appeal.

Existing authenticated API sessions are checked against live account status on
each request. The UI also checks on route changes and every 20 seconds, redirecting
blocked users to appeals and signing inactive users out. Logout invalidates the
server session as well as clearing client session flags. This is not a redesign
of unrelated legacy endpoints' existing anonymous/client-ID authorization.

Restart the backend after updating. Flyway
`V24__user_management_and_appeals.sql` adds moderation fields, appeals, and the
database lock used to serialize account-management writes.
`V25__appeal_block_reason_snapshot.sql` preserves reasons in appeal history.
Deploy changes from **both** the frontend and separate backend repositories.

```powershell
.\backend\mvnw.cmd -f backend\pom.xml '-Dtest=UserManagementAccessTest,UserManagementPersistenceTest,UserManagementServiceTest' test
npm run build
```

Account integration tests use transactional fixtures and roll back their records;
they do not deactivate the real developer account. Browser checks use synthetic
accounts, not live account mutations.

## Book Library / archive

This is a standalone book archive, independent of the AI chatbot. No AI API key
is needed.

- **Admin / MAO-Admin:** open **Library** in the admin sidebar (`/admin/library`).
  Expand **Genres** to add categories, then choose **Upload book**.
  Supply a title, author, description, publish date, genre, PDF, and JPEG/PNG cover.
  Published books are available immediately. **Edit** changes book metadata and
  its genre; replacing files and deleting books/genres are not implemented.
- **Farmer:** choose **FarmTools > Library** (`/farmer/library`).
- **Farm-Admin:** choose **FarmTools > Library** from the left navigation.
  The app remembers the selected view using its existing Farm-Admin navigation.
- Both reader roles see a cover-grid catalog with title/author/description search,
  a genre filter, pagination (12 books per page), book details, and an embedded
  browser PDF reader. They cannot upload books, edit metadata, or create genres.
- **Save / My Library** stores bookmarks in the database per authenticated account.
  Removing a saved book only removes that account's bookmark, not the archive book.
  Search and genre filters work in both All books and My Library.
- Library success messages appear as dismissible bottom-right toasts and close
  automatically after five seconds. Validation and request errors stay beside
  the affected controls so they remain visible until addressed.

### Storage and deployment

Flyway `V23__book_library.sql` creates `library_genres`, `library_books`, and
`library_saved_books` on backend startup. Restart the backend after updating.
Include changes from the separate `backend` Git repository when deploying.

Files are stored outside the frontend bundle under `library.upload-directory`.
The default is `uploads/library`, relative to the backend process working
directory. Set the backend environment variable `LIBRARY_UPLOAD_DIRECTORY` to
an absolute persistent directory in production, and back up **both** the files
and database. Missing files are reported as unavailable; database records do
not contain the document binary. Root and backend upload directories are ignored
by Git.

PDFs are limited to **50 MiB** and covers to **5 MiB**. PDFs undergo a basic PDF
header check; JPEG/PNG covers are decoded, limited to 25 million pixels, and
served with a detected MIME type and generated filename. These checks are not
a malware scan or full PDF parser. Only authorized admins may upload; establish
document-review/malware-scanning procedures before accepting untrusted documents.
Upload only material you have permission to distribute.

The existing multipart limits are 50 MB per file / 60 MB per request. Keep reverse
proxy upload/time limits consistent. Failed database transactions clean up their
newly uploaded files. Backups/cleanup policies are still the operator's responsibility.

Documents and covers are served through authenticated `/api/library` endpoints,
not public static upload URLs. PDF requests support byte ranges and inline
viewing. The Library-only security chain permits embedding from the app's current
development origins (`http://localhost:5173`, `http://localhost:5174`) and its own
origin. When deploying elsewhere, update both CORS and the Library
`frame-ancestors` Content Security Policy in `SecurityConfig` to the exact app
origin. Other app endpoints retain their existing framing policy.

The reader uses the browser's built-in PDF controls, not custom page rendering.
For browsers that cannot embed PDFs, use **open the PDF in a new tab**. View-only
means no archive editing permissions; it does **not** prevent the browser from
downloading or copying a PDF.

### Library validation

```powershell
.\backend\mvnw.cmd -f backend\pom.xml '-Dtest=LibraryFileStoreTest,LibraryAccessTest,LibraryPersistenceTest' test
npm run build
```

Tests cover exact size thresholds, file signatures/types, rollback cleanup,
admin-only mutations, authenticated file/range delivery, real MySQL/Flyway
metadata persistence, search/filter pagination, and private/idempotent saved books.
Database integration tests roll back their test records. Browser UI checks use
synthetic book/file fixtures and do not upload test books to the real archive.

## Farmer AI chatbot

The farmer **Chatbot** menu opens `/farmer/chatbot`. The Spring Boot backend calls
local Ollama and retrieves stored passages from approved IRRI pages. Installing
a model alone does not populate the source collection. The active flow does not
use OpenAI or live web search.

### Backend setup

Use Java 21 or newer and the existing MySQL configuration. Set environment variables
in the same PowerShell process that starts Spring Boot:

```powershell
ollama pull deepseek-r1:8b
ollama pull nomic-embed-text
$env:OLLAMA_BASE_URL = 'http://localhost:11434'
$env:OLLAMA_CHAT_MODEL = 'deepseek-r1:8b'
$env:OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text'
$env:CHATBOT_RAG_INGEST_ENABLED = 'true'
$env:CHATBOT_RAG_INGEST_ON_STARTUP = 'false'
.\backend\mvnw.cmd -f backend\pom.xml spring-boot:run
```

The root `.env.example` documents the variables; Spring Boot does **not**
automatically load a root `.env` file. IntelliJ users can set the same variables
in the backend run configuration. Model selection in the Ollama desktop app
does not override backend configuration. No API key is needed for local inference.

Set `CHATBOT_RAG_APPROVED_URLS` to a comma-separated list of permitted, relevant
IRRI article URLs. The importer reads these pages, not every linked article.
An authenticated Admin/MAO-Admin can trigger ingestion with
`POST /api/admin/chatbot/ingest-irri`. Review its ingestion report for skipped
pages and warnings. Alternatively enable `CHATBOT_RAG_INGEST_ON_STARTUP` for an
initial ingestion, then turn it off. Keep the same embedding model for ingestion
and questions; changing it requires rebuilding the stored embeddings.

In another terminal, run `npm run dev`. The app uses the existing backend address,
`http://localhost:8080`, and session cookies. Existing backend CORS permits
`http://localhost:5173` and `http://localhost:5174`. Log in as a farmer to chat,
or as `MAO-Admin`/`Admin` to open **Management > AI Chat Records**
(`/admin/chat-records`). Chat records are separate from the admin dashboard.
Questions and summaries show compact previews; expand them to read the full text.
Privacy guidance and technical details are collapsed by default.

### Grounding and language

- The assistant is instructed to reply in simple Ilokano. Have a fluent Ilokano
  speaker review real answers before launch; language accuracy is not guaranteed.
- Retrieval uses stored IRRI-source chunks, including approved subdomains such
  as `knowledgebank.irri.org`. Sources can be stale until ingestion runs again.
- Clickable source citations are shown inline and below the answer. The server
  builds source metadata from retrieved chunks. Inline offsets use UTF-16 string
  positions; a `0,0` source-only reference appears in the list without an empty
  inline link. The frontend reports malformed references and does not link
  non-IRRI URLs. Empty retrieval produces a clearly marked Ilokano
  "no verified IRRI source" reply.
- Domain filtering/citation checks reduce risk but do not mathematically prove
  that every generated claim is supported. Human agricultural review remains necessary.
- Only six recent saved turns are supplied as context; the last 20 turns of the
  latest conversation are restored when the chatbot is reopened.
- A second, tool-free structured-output call creates the English admin summary
  and category. Supported categories are pests, diseases, water, soil, planting,
  harvesting, and other. Both calls consume local inference time and memory.
  The backend removes model thinking text before returning and storing replies.
  No-source replies are still categorized by the AI and explicitly flagged in the records.
- Errors are shown explicitly. Failed provider calls are not recorded as successful
  chat turns, and the reply is returned only after the database save succeeds.
- Requests are limited to 2,000 characters and one question per 15 seconds per
  session. This is an accidental-use guard, not a deployment-wide resource limit.
  Add deployment-level rate limits and capacity monitoring before public rollout.

### Stored records, privacy, and future training

Flyway migration `V22__farmer_chatbot_turns.sql` creates `farmer_chatbot_turns`.
Each successful turn stores the farmer's internal account ID, conversation UUID,
question, full reply, category, short summary, source annotations, grounding status,
configured model, answer response ID, combined token usage, notice version, and
timestamp. The admin dashboard provides a paginated, category-filtered read-only
table with expandable full responses. Farmers cannot access that endpoint or
another farmer's conversation; identities come from the server session, not request data.

The Privacy Policy is at `/privacy-policy`, linked from the landing footer, farmer
sidebar, registration form, and chatbot. The chatbot uses English controls with an
Ilokano greeting and answers. Its **AI usage & privacy policy** link opens a modal
with the recording notice, source limitations, responsible-use guidance, and a
link to the full policy. The popup supports keyboard focus, Escape, and a Close button.
`policy_version` identifies the notice shown by the feature; it is **not** a
separate explicit-consent audit record or proof of valid training consent.
The policy text describes this chatbot feature and needs operator/legal review
alongside a complete application-wide privacy policy before deployment.

No automatic training, dataset export, or fine-tuning is implemented. Stored
chats are **unreviewed data**, not ready-to-use training examples. Before training,
establish the appropriate legal basis/consent, remove personal information,
review Ilokano quality and factual accuracy, and check rights for source-derived
content. Do not simply train on model mistakes or copyrighted IRRI passages.
Records currently have no automatic expiry or self-service deletion; operators
must establish retention/deletion procedures before launch.

Generation and embedding requests go to the configured local Ollama service.
Source ingestion fetches approved IRRI pages over the internet without sending
farmer conversations. Configuring a remote/cloud provider would require revisiting
the privacy notice. Coordinate any notice-version change with the backend's
stored `policy_version`; old records must retain their original version.

### Validation

```powershell
.\backend\mvnw.cmd -f backend\pom.xml '-Dtest=OpenAiChatClientTest,ChatbotServiceTest,ChatbotAccessTest,ChatbotPersistenceTest' test
npm test
npm run build
```

The frontend contract tests use synthetic responses and render the actual
components. They cover UTF-16 citation positions, repeated/source-only citations,
invalid references, no-source notices, registry query parameters, multipart
imports, row errors, and failed/invalid responses.
`ChatbotPersistenceTest` uses the configured MySQL database and Flyway, like the
existing integration tests, and rolls back its test account/chat records.
Live Ollama/IRRI retrieval and Ilokano quality must also be checked after
configuring models and ingesting sources. Backend code lives in the separately versioned, ignored
`backend` repository; include its changes when deploying, not just the React repository.

## RSBSA directory

Admins open **RSBSA Registry** at `/admin/farmers` to search or upload `.xlsx`
and `.csv` files (maximum 10 MiB). Farm Admins open **RSBSA Directory** from
their left navigation for read-only lookup. Records are independent of online
accounts; importing does not create or activate users. Farm Admin approval is
the final farmer-account approval; Admin retains block/inactive controls in
User Management.

The table uses `GET /api/rsbsa-registry` with search and zero-based pages of 20.
Search and refresh return to the first page. Import uses multipart field `file`
at `POST /api/admin/rsbsa-registry/import`. Results show added, updated and skipped
counts, with every returned row error available in an expandable list. Keep mobile
numbers and identifiers as text in the workbook to preserve leading zeros.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
