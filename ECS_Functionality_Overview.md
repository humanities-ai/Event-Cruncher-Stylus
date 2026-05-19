# Event Cruncher Stylus — Functionality Overview

---

## 1. Language Translation

The application supports three display languages, selectable from the Landing Page dropdown or persisted across sessions via browser detection:

- **English** (default)
- **German** (Deutsch)
- **Mandarin Chinese** (普通话)

All UI labels, cube face names (Who, What, When, Where, Why, How), button text, placeholder copy, navigation links, instructions, and footer text are fully translated. Changing the language also regenerates the 3D cube face textures so labels update in real time.

---

## 2. Short Description

Each of the six 5W1H cube faces has an associated **Short Description** — a concise summary intended to contextualize that face's content. Accessed by clicking the top-right quadrant of a face when a face is selected on the Cosmos page.

- **View / Edit**: Opens a modal showing the current short description text for that face.
- **Save**: Persists the text to the database (`face_descriptions` table, `short_description` column).
- **File Attachments**: Files can be uploaded and associated with the short description; they appear as linked items inside the modal.
- **Lock / Unlock**: Admin users can lock a short description so that non-admin users cannot edit it or trigger the AI generator for it (see Section 4).

---

## 3. Long Description

Each cube face also supports a **Long Description** — a more detailed, narrative-form explanation of that face's content. Accessed by clicking the bottom-left quadrant of a face.

- **View / Edit**: Opens a modal with a larger text area for richer content.
- **Save**: Persists to the database (`long_description` column).
- **File Attachments**: Same file-attach capability as the Short Description modal.
- **Lock / Unlock**: Admin-only lock that blocks non-admin users from editing or generating AI content for the long description.

---

## 4. AI Generator — Short and Long Descriptions

Both Short and Long Description modals include an **AI generation assistant**:

- **Short Description AI**: Opens the AI Short Description modal. The user provides a query/prompt; the system sends the current face context and prompt to the Anthropic API (`/api/anthropic`) and streams a generated suggestion back in the modal.
- **Long Description AI**: Same flow for the Long Description, supporting multi-turn prompting and longer-form generated content.
- **Apply**: A one-click button copies the AI-generated text into the description text area so the user can review and save it.
- **Locked State**: If an admin has locked the description for that face, the AI modal is replaced with an "AI Generator Locked" notice, preventing generation for non-admin users.
- **Interaction Logging**: All AI queries and applied responses are recorded in the interaction log (see Section 6).

---

## 5. Lock / Unlock Functionality

Locking is a per-face, per-description-type toggle available only to **admin** users (username `admin` / userId `1` depending on context):

| Target | Lock Field | Effect When Locked |
|---|---|---|
| Short Description | `is_locked` | Non-admins see read-only text; AI generator disabled |
| Long Description | `long_desc_locked` | Non-admins see read-only text; AI generator disabled |

- Lock state is visually indicated in the description modal by a **🔒 Locked** / **🔓 Unlocked** pill button (red when locked, amber when unlocked).
- Lock state is stored in the database and persists across sessions.
- Non-admin users attempting to open the AI generator when locked see an "AI Generator Locked by Admin" notice modal.

---

## 6. Interaction Log

A persistent, in-session activity record that tracks user actions throughout the application:

**Logged event types include:**
- Session start
- Face selected
- Face text added
- File uploaded to a face
- Short/long description viewed
- Short/long description saved
- Short/long description lock toggled
- AI short/long query submitted
- AI response applied

**Storage**: The log is kept in memory (`interactionLogRef`) and serialized to `localStorage` as `ecs_interaction_log`, so it survives page refreshes within the same browser session.

**Export**: The interaction log is automatically included as `interaction-log.txt` in the ZIP download (see Section 13). It is formatted with timestamps and human-readable action descriptions.

---

## 7. Interactive Workspace

The primary editing area for each cube face:

- **Text Input**: A multi-line textarea for entering the face's 5W1H content.
- **Bullet Points**: A toolbar button inserts a bullet character (•) at the current cursor position.
- **Numbered Lists**: A toolbar button inserts an incrementing number prefix.
- **Smart Enter Key**: When the cursor is inside a bullet or numbered line, pressing Enter automatically continues the same formatting on the next line.
- **File Insertion**: A file upload input allows attaching one or more files to the current face (see Section 8).
- **Saved vs. Pending Files**: Files uploaded but not yet saved are shown with an "(unsaved)" indicator; already-saved files display normally with a delete button.
- **Save Button**: Persists both text and confirmed file uploads to the database simultaneously.

---

## 8. File Upload — All Formats

Files can be attached to any cube face workspace, short description, or long description. The system is format-agnostic:

- **Accepted types**: Any file format the browser's file picker allows. The Navigator AI explicitly supports `.zip`, `.xlsx`, `.csv`, `.jpg`, `.png`, `.pdf`, `.txt`, `.doc`, `.docx`.
- **Storage**: Files are stored as binary data in the `avfiles` (workspace) or `desc_files` (descriptions) database tables alongside their name and MIME type.
- **Download**: Saved files are individually downloadable via linked URLs inside each modal or file list.
- **Delete**: Each saved file shows a delete button; deletion is synced to the server immediately.
- **Multiple files**: Multiple files can be selected and attached in one operation per face.

---

## 9. Hover Tooltips on Icons

Interactive UI elements across the application display descriptive hover tooltips to guide users:

- **Quadrant hover (Cosmos)**: When a face is selected and the user hovers over one of the four surrounding quadrants (Workspace, Short Description, Long Description, 5W1H Processor), a tooltip appears near the cursor identifying the quadrant and its function.
- **Button tooltips**: Action buttons such as the AI evaluation button carry a `title` attribute (e.g., "Evaluate your entries for consistency and suggestions") that displays as a browser tooltip on hover.
- **Topbar quadrant labels**: The four quadrant corners display persistent label overlays (Q1 WORKSPACE, Q2 SHORT DESC, Q3 LONG DESC, Q4 5W1H LLM) that clarify the interface layout.
- **Toolbar icons**: Icon-only toolbar buttons (bullet, numbered list, file upload, XLSX, download) show descriptive labels or title text on hover.

---

## 10. Share Link — Simulations and Evaluations

Any logged-in user can generate a **shareable link** that captures a snapshot of their current 5W1H face data:

1. The user clicks the **Share Simulation** button.
2. The app posts the current face texts and user identity to `/api/simulation-tokens`, which stores them and returns a unique token.
3. A **Share Link Ready** modal displays the full URL (e.g., `https://app.url/levels/cosmos?token=abc123`) with a **Copy Link** button.
4. Any logged-in user who opens that URL is presented with a **Shared by [username]** modal showing the snapshot data and three action buttons:
   - **Textual Simulation** — runs a narrative simulation on the shared data
   - **Video Visual** — generates a video presentation of the shared data
   - **Consistency Evaluator** — runs a wobble/consistency evaluation on the shared data

---

## 11. Video Visual Simulation

Generates an AI-authored, scene-by-scene **animated video presentation** of the 5W1H content:

- Triggered via the **Video Visual** button (also available from a shared link).
- The server (`/api/generate-video`) uses the face texts to construct a structured scene list.
- **VideoPlayer component** renders the scenes in-browser:
  - Each scene has a configurable duration, background color, and layered text elements.
  - Elements animate in with fade, slide, or scale presets.
  - A scrubber bar at the bottom shows scene progress and allows clicking to jump to any scene.
  - A play/pause button controls auto-advance.
- The modal title reflects the video's generated title.

---

## 12. Textual Simulation

Generates a written, narrative-form analysis of the 5W1H content:

- Triggered via the **Textual Simulation** button in the Simulate modal or from a shared link.
- Sends all six face texts to `/api/simulate`.
- The result modal (5W1H Textual Simulation) displays three sections:
  - **Scenario** (◎): A coherent narrative constructed from the face data.
  - **Gaps** (⚠): A grid of identified missing or underdeveloped dimensions per face.
  - **Variations** (⟳): Alternative scenario framings or interpretations.

---

## 13. Consistency Evaluation (Wobble Evaluator)

An AI-powered analysis of how internally consistent and well-balanced the 5W1H entries are:

- Triggered via the **AI Evaluation** button or from the Consistency Evaluator action on a shared link.
- **Mode selector**: Three evaluation styles:
  - **Direct** — straightforward consistency feedback
  - **Clues** — hints and leading questions
  - **Socratic** — deeper interrogative prompting
- **Domain selector**: Contextualizes the evaluation for a specific field: General, Legal, Medical, Scientific, or Journalistic.
- The result displays:
  - A **Wobble badge** — SILENT (high consistency), SHIMMER (moderate tension), or WOBBLE (high tension) — with an overall tension percentage.
  - **Tier bars** (T1: WHO/WHAT, T2: WHERE/WHEN, T3: HOW/WHY): Color-coded consistency scores per axis pair.
  - **Tier diagnoses**: Written analysis per tier.
  - **Feedback**: Mode-specific written feedback.
  - **Overall assessment**: Summary paragraph.
  - **Mini Octahedron**: An animated 3D octahedron whose wobble animation intensity reflects the overall consistency score.

---

## 14. Spreadsheet View

A tabular view of all face data presented in a modal:

- Triggered by the **XLSX** button in the toolbar.
- Displays a grid with faces as columns and rows for text content and attached file names.
- Uses the `xlsx` library to render the data in-browser without downloading.

---

## 15. Download — ZIP Archive

A single-click export of all workspace data into a downloadable ZIP file:

- Triggered by the **Download** button.
- The ZIP (`ECSDataFolder.zip`) contains:
  - **ECS-Data.xlsx**: An Excel spreadsheet with all six face texts and attached file names.
  - **Attached files**: Every file uploaded to any face, downloaded from the server and packed into the archive.
  - **interaction-log.txt**: A formatted plain-text record of all session interactions (see Section 6).
- Uses `jszip` for archive creation and `file-saver` for the browser download trigger.

---

## 16. Top-Left Logo Button — Return to Start Page

The **ECS logo** in the top-left corner of every page is a clickable link that navigates back to the **Start Page** (`/`), which is the animated splash screen (DisplayPage). This acts as the application's "home" or restart button, resetting the user to the beginning of the flow.

---

## 17. Top-Right Dropdown Menu

A **hamburger menu** icon in the top-right corner of every page opens a navigation dropdown with links to all major sections:

- Start Page (`/`)
- Landing Page (`/landing-page`)
- Login (`/login`)
- Create Account (`/create-account`)
- Navigator AI (`/levels/Navigator`)

The menu is consistent across all pages and provides global navigation from any point in the application.

---

## 18. Navigator AI — Chat Interface

A dedicated AI chat page (`/levels/Navigator`) for open-ended conversation with an AI assistant:

- **Multi-turn chat**: Sends and receives messages in a scrollable conversation thread. Previous messages remain visible.
- **Markdown rendering**: AI responses are rendered with full markdown formatting (bold, headers, lists, etc.) using `react-markdown`.
- **File attachments**: The user can attach multiple files to a message before sending. Supported formats include `.zip`, `.xlsx`, `.csv`, `.jpg`, `.png`, `.pdf`, `.txt`, `.doc`, `.docx`. Files appear as removable chips in the input area.
- **File deduplication**: Re-selecting a file already in the pending list does not duplicate it.
- **Loading state**: A "Thinking…" indicator appears while the server is processing.
- **Error handling**: Network or server errors display a user-friendly error message in the thread.
- **Auto-scroll**: The conversation view scrolls to the latest message automatically.
- **Hint text**: An introductory prompt appears when no messages have been sent yet.
- **API**: Messages and files are sent to `/api/navigator-chat` via `FormData`.

---

## 19. ECS Sector Analysis (5W1H LLM Processor)

The fourth quadrant (Q4) of the Cosmos face view exposes an AI-driven analysis panel for each face. Clicking it opens an **ECS Sector Modal**:

- **Title and sub-label**: Identifies the face and dimension being analyzed.
- **AI response**: Sends a structured prompt to the Anthropic API and streams the response into the modal body, rendered with inline markdown (bold, italic).
- **Consistency questions**: For each face, the AI is asked to identify internal contradictions within that face's descriptions and evaluate external consistency with its oppositional counterpart (e.g., Why vs. How, Who vs. What).
- **Editor prompts**: The response includes concrete questions an editor should consider.

---

## 20. Validation Modal

An AI-powered content validation check available on the Tetrahedral Level and Cosmos:

- Checks each face for:
  - **Length** (word/character count adequacy)
  - **Validity** (whether the content meaningfully answers the face's question)
  - **Consistency** (cross-face coherence)
  - **Suggestions** (specific improvement recommendations)
- Results are displayed as color-coded status badges per face in a card grid.

---

## 21. Criteria Instructions (CI Modal)

An admin-only feature for setting per-face guidance visible to all users:

- **Admin view**: An editable modal (CI button) where the admin types instructions for each face.
- **User view**: The same modal in read-only mode shows the admin's instructions.
- Stored in the `criteria` database table.
- Accessible from the toolbar on CubicLevel and TetrahedralLevel pages.

---

## 22. 3D Interactive Cube / Octahedron Visualization

The central UI element across all level pages:

- **Cosmos / Tetrahedral**: An octahedron with six cube faces embedded at its vertices, orbiting faces, and a halo wireframe. Supports drag-to-rotate, pinch-zoom, scroll-wheel zoom, and auto-spin when idle.
- **CubicLevel**: A standard six-face cube with OrbitControls, raycasting-based face selection, and smooth camera tweening to center the selected face.
- **Face selection**: Clicking a face highlights it with a gold/amber border texture, centers the camera on it, and activates the editing quadrants.
- **Dynamic textures**: Face labels are rendered to canvas textures and regenerated when the language changes.
- **Opacity management**: Faces adjust opacity based on their angle to the camera so rear faces fade out gracefully.

---

## 23. User Authentication

- **Login** (`/login`): Username + password form with bcrypt-verified credentials. Failed login shows an error popup. Successful login stores `loggedInUserId` and `loggedInUsername` in `localStorage` and redirects to the Cosmos page.
- **Create Account** (`/create-account`): Registration form with strong-password validation (8+ chars, uppercase, lowercase, digit, special character), password confirmation matching, and duplicate-username detection. Automatically creates the user's `avdata` row on success.
- **Persistent session**: `localStorage` keys maintain the logged-in state across page refreshes.

---

## 24. Application Flow Summary

```
DisplayPage (/)
  Animated hacker-text splash + START button
  └─► LandingPage (/landing-page)
        Language selector, Login / Create Account links
        ├─► Login (/login)
        │     └─► Cosmos (/levels/cosmos)  [main editor]
        └─► CreateAccount (/create-account)
              └─► Cosmos (/levels/cosmos)

Cosmos (/levels/cosmos)
  ├─ Workspace (Q1)         — text editing, file upload
  ├─ Short Description (Q2) — view/edit/lock/AI-generate
  ├─ Long Description (Q3)  — view/edit/lock/AI-generate
  ├─ 5W1H Processor (Q4)    — AI sector analysis
  ├─ Consistency Evaluator  — wobble/tension scoring
  ├─ Textual Simulation     — narrative scenario + gaps
  ├─ Video Visual           — animated scene-by-scene player
  ├─ Share Link             — token-based shareable URL
  ├─ Spreadsheet View       — in-browser XLSX modal
  ├─ ZIP Download           — data + files + interaction log
  └─► Navigator AI (/levels/Navigator)
        Multi-turn AI chat with file attachments
```

---

## 25. Technology Stack (Reference)

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6 |
| 3D Graphics | Three.js |
| Internationalization | i18next (EN / DE / ZH) |
| AI Backend | Anthropic API (via Express proxy) |
| File Export | JSZip, file-saver, xlsx |
| Database | MySQL (profiles, avdata, avfiles, face_descriptions, desc_files, criteria, simulation_tokens) |
| File Upload | Multer (Express middleware) |
| Auth | bcryptjs |
| Markdown | react-markdown |
