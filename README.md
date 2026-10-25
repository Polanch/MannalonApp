# React + Vite

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
OpenAI's Responses API using `gpt-4.1` by default. A ChatGPT subscription does not
include API usage: configure an OpenAI API project, billing, and a project budget
before enabling this feature.

### Backend setup

Use Java 21 or newer and the existing MySQL configuration. Set environment variables
in the same PowerShell process that starts Spring Boot:

```powershell
$env:OPENAI_API_KEY = '<your OpenAI API key>'
$env:OPENAI_MODEL = 'gpt-4.1'
.\backend\mvnw.cmd -f backend\pom.xml spring-boot:run
```

Set the key privately in your local terminal or deployment secret manager, never
in source code, chat, or a `VITE_` variable. The root `.env.example` documents the
variables; Spring Boot does **not** automatically load a root `.env` file.
The model can also be configured with `chatbot.openai.model`; use a model that
supports Responses API web search with domain filters and structured outputs.

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
- Every answer requests live web search with an `irri.org` domain allowlist,
  including IRRI subdomains such as `knowledgebank.irri.org`.
- Clickable source citations are shown inline and below the answer. The server
  checks citation URLs and requires a completed search. Missing/invalid citations
  produce a clearly marked Ilokano "no verified IRRI source" reply, not unsourced advice.
- Domain filtering/citation checks reduce risk but do not mathematically prove
  that every generated claim is supported. Human agricultural review remains necessary.
- Only six recent saved turns are supplied as context; the last 20 turns of the
  latest conversation are restored when the chatbot is reopened.
- A second, tool-free structured-output call creates the English admin summary
  and category. Supported categories are pests, diseases, water, soil, planting,
  harvesting, and other. Both calls incur token costs; search also incurs tool costs.
  No-source replies are still categorized by the AI and explicitly flagged in the records.
- Errors are shown explicitly. Failed provider calls are not recorded as successful
  chat turns, and the reply is returned only after the database save succeeds.
- Requests are limited to 2,000 characters and one question per 15 seconds per
  session. This is an accidental-use guard, **not** a production-wide spending cap.
  Set provider budgets and add deployment-level rate limits before public rollout.

### Stored records, privacy, and future training

Flyway migration `V22__farmer_chatbot_turns.sql` creates `farmer_chatbot_turns`.
Each successful turn stores the farmer's internal account ID, conversation UUID,
question, full reply, category, short summary, source annotations, grounding status,
configured model, answer response ID, combined token usage, notice version, and
timestamp. The admin dashboard provides a paginated, category-filtered read-only
table with expandable full responses. Farmers cannot access that endpoint or
another farmer's conversation; identities come from the server session, not request data.

The Privacy Policy is at `/privacy-policy`, linked from the landing footer, farmer
sidebar, registration form, and chatbot. Chatbot use displays a recording notice.
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

OpenAI requests use `store: false`; this prevents response-object storage but
does not promise zero provider retention. Questions, conversation context, and
the metadata input are still processed by OpenAI.

### Validation

```powershell
.\backend\mvnw.cmd -f backend\pom.xml '-Dtest=OpenAiChatClientTest,ChatbotServiceTest,ChatbotAccessTest,ChatbotPersistenceTest' test
npm run build
```

The provider and access tests use mocked OpenAI responses, never a real key.
`ChatbotPersistenceTest` uses the configured MySQL database and Flyway, like the
existing integration tests, and rolls back its test account/chat records.
Live OpenAI/IRRI retrieval and Ilokano quality must also be checked after
configuring an API key. Backend code lives in the separately versioned, ignored
`backend` repository; include its changes when deploying, not just the React repository.

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
