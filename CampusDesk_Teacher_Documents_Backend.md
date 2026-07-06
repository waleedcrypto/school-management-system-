# CampusDesk - Teacher Documents Module Backend Documentation

## 1. Database Tables

### Table: `school_documents`
**Purpose**: Stores metadata for all uploaded documents.
- `id` (UUID, Primary Key, Default: `uuid_generate_v4()`)
- `school_id` (UUID, Foreign Key to `schools.id`)
- `category_id` (UUID, Foreign Key to `document_categories.id`)
- `title` (Text, NOT NULL)
- `description` (Text, Nullable)
- `file_url` (Text, NOT NULL) - Public URL to access the file
- `file_path` (Text, NOT NULL) - Path in the storage bucket
- `file_size` (Integer, NOT NULL) - Size in bytes
- `uploaded_by` (UUID, Foreign Key to `auth.users.id` / `profiles.id`)
- `visibility` (Text, Default: 'all') - Defines who can view ('all', 'specific')
- `assigned_teachers` (UUID[], Default: '{}') - List of specific teacher IDs if visibility is 'specific'
- `created_at` (Timestamp with time zone, Default: `now()`)
- `updated_at` (Timestamp with time zone, Default: `now()`)

### Table: `document_categories`
**Purpose**: Manages categories for grouping documents (e.g., Notice, Syllabus).
- `id` (UUID, Primary Key, Default: `uuid_generate_v4()`)
- `school_id` (UUID, Foreign Key to `schools.id`)
- `name` (Text, NOT NULL)
- `description` (Text, Nullable)
- `created_at` (Timestamp with time zone, Default: `now()`)

### Table: `document_history`
**Purpose**: Tracks upload, update, and deletion events for auditing.
- `id` (UUID, Primary Key, Default: `uuid_generate_v4()`)
- `school_id` (UUID, Foreign Key to `schools.id`)
- `document_id` (UUID, Nullable, Foreign Key to `school_documents.id` ON DELETE SET NULL)
- `action` (Text, NOT NULL) - e.g., 'uploaded', 'updated', 'deleted'
- `document_title` (Text, NOT NULL)
- `performed_by` (UUID, Foreign Key to `profiles.id`)
- `details` (JSONB, Nullable) - Stores extra info like previous titles
- `created_at` (Timestamp with time zone, Default: `now()`)

---

## 2. SQL Queries

```sql
-- Table: document_categories
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: school_documents
CREATE TABLE IF NOT EXISTS school_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    visibility TEXT DEFAULT 'all',
    assigned_teachers UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: document_history
CREATE TABLE IF NOT EXISTS document_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    document_id UUID REFERENCES school_documents(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    document_title TEXT NOT NULL,
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_documents_school_id ON school_documents(school_id);
CREATE INDEX IF NOT EXISTS idx_document_history_school_id ON document_history(school_id);

-- RLS Policies
ALTER TABLE school_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents from their school" 
ON school_documents FOR SELECT 
USING (
    school_id IN (
        SELECT school_id FROM profiles WHERE id = auth.uid()
    )
);

-- Note: In the future, to enforce visibility rules directly at the DB level, 
-- you can update the RLS policy to ensure teachers only see 'all' or if their auth.uid() is in assigned_teachers:
-- USING (
--   school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()) 
--   AND (
--     (SELECT role FROM profiles WHERE id = auth.uid()) = 'school_admin'
--     OR visibility = 'all' 
--     OR auth.uid() = ANY(assigned_teachers)
--   )
-- )
```

---

## 3. Supabase Storage Information

- **Storage Bucket Name**: `school_documents`
- **Bucket Configuration**: Publicly accessible (`public: true`)
- **File Path Structure**: `[school_id]/[timestamp]_[filename]` (e.g., `f1d17d9c.../1688463375839_syllabus.pdf`)
- **Access Permissions**:
  - `Public Access`: Anyone with the URL can view/download files.
  - `Authenticated users can upload`: Only authenticated users can insert files to the bucket.
  - `Authenticated users can delete`: Only authenticated users can remove files from the bucket.

---

## 4. APIs

All APIs utilize Supabase's PostgREST auto-generated REST API.

### Get Documents
- **Endpoint**: `GET /rest/v1/school_documents`
- **Headers**: `apikey`, `Authorization: Bearer [token]`
- **Query Parameters**: `select=*,document_categories(id,name),profiles(first_name,last_name)&school_id=eq.[school_id]`
- **Response**: Array of document objects.

### Upload Document (Storage)
- **Endpoint**: `POST /storage/v1/object/school_documents/[file_path]`
- **Headers**: `apikey`, `Authorization: Bearer [token]`, `Content-Type: application/pdf`
- **Body**: Binary file data.

### Create Document Record
- **Endpoint**: `POST /rest/v1/school_documents`
- **Headers**: `apikey`, `Authorization: Bearer [token]`, `Content-Type: application/json`, `Prefer: return=representation`
- **Body**: `{ "school_id": "...", "category_id": "...", "title": "...", "description": "...", "file_path": "...", "file_url": "...", "file_size": 1024, "uploaded_by": "...", "visibility": "all", "assigned_teachers": [] }`

---

## 5. Teacher Document APIs

For the Android application, you will query these directly using the Supabase Android SDK (Kotlin) or standard HTTP requests.

### Get Documents API
Retrieves documents for the teacher's school, ensuring they only see documents meant for 'all' or explicitly assigned to them.
```http
GET /rest/v1/school_documents?select=*,category:document_categories(name),uploader:profiles(first_name,last_name)&school_id=eq.{teacher_school_id}&or=(visibility.eq.all,assigned_teachers.cs.%7B{teacher_user_id}%7D)&order=created_at.desc
```

### Download Document API
Since the bucket is public, documents can be downloaded directly via GET request using the `file_url` stored in the database.
```http
GET {file_url}
```

### Search Documents API
Filter documents by title using `ilike` operator.
```http
GET /rest/v1/school_documents?title=ilike.*{search_term}*&school_id=eq.{teacher_school_id}
```

### Filter Documents API
Filter documents by a specific `category_id`.
```http
GET /rest/v1/school_documents?category_id=eq.{category_id}&school_id=eq.{teacher_school_id}
```

---

## 6. Authentication & Permissions

- **Principal / School Admin**:
  - Upload: Yes
  - View: Yes
  - Delete: Yes
  - Edit: Yes
  - Download: Yes
- **Teacher**:
  - Upload: No (By default view-only in this module context)
  - View: Yes
  - Delete: No
  - Edit: No
  - Download: Yes

*Note: RLS (Row Level Security) ensures users can only read records belonging to their respective `school_id`.*

---

## 7. Data Flow

```text
Principal Upload PDF
↓
Supabase Storage (Bucket: school_documents)
↓
Database Record (Table: school_documents)
↓
Teacher Android App (Fetches records via Supabase SDK)
↓
View / Download (Using stored file_url)
```

---

## 8. Android Integration Guide

### `Teacher_Documents_Integration_Guide`

**Overview**: The Android application will connect to Supabase to retrieve and display documents.

- **Tables to Query**: `school_documents`, `document_categories`
- **Storage Bucket**: `school_documents`
- **Required Fields for UI**: `title`, `description`, `file_size` (convert to MB), `created_at` (format as date), `file_url`, `category.name`

**Expected JSON Response (Get Documents)**:
```json
[
  {
    "id": "uuid-1234",
    "title": "Mid Term Exam Syllabus",
    "description": "Syllabus for Grade 10",
    "file_url": "https://[project].supabase.co/storage/v1/object/public/school_documents/...",
    "file_size": 2500000,
    "visibility": "specific",
    "assigned_teachers": ["teacher-uuid-1"],
    "created_at": "2026-07-04T12:00:00Z",
    "category": { "name": "Examination" },
    "uploader": { "first_name": "Abdullah", "last_name": "Khan" }
  }
]
```

**Implementation Notes for Download**:
1. Retrieve `file_url` from the document object.
2. Use Android `DownloadManager` or `OkHttp` to download the file directly from the URL.
3. Save to device storage (e.g., `Environment.DIRECTORY_DOWNLOADS`).
4. To open the PDF, use an `Intent` with `ACTION_VIEW` and MIME type `application/pdf`, utilizing `FileProvider` to grant read access to the PDF viewer application.

**Authentication Flow**:
1. User logs in to the Android App.
2. Obtain Supabase Session token.
3. Initialize Supabase Kotlin SDK with the token.
4. SDK handles injecting `Authorization: Bearer <token>` into all subsequent database queries.
