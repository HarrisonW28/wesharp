# File upload security — MVP

## Current state

There are **no** user-facing multipart upload HTTP routes in this repository yet. **`UploadedFile`** and morph relations exist for future knife/company assets.

## Standards (when adding endpoints)

1. **`FormRequest`** with explicit rules — use **`App\Support\Http\ValidatedAttachmentRules`** for shared **`mimes` / `max:` (KiB)** constraints.
2. **Never** trust browser **`Content-Type`** alone; **`mimetypes:`** / **`mimes:`** rules inspect file content where possible.
3. **Store** outside public webroot or behind signed URLs; generate non-guessable filenames server-side.
4. **Authorise** with the same policy as the parent model (**`KnifePolicy`**, **`CompanyPolicy`**, etc.).
5. **Scan / AV** pipeline is **backlog** — document if processing untrusted binaries.

## Known risks

- Without AV, malicious payloads could be stored if staff upload is compromised — mitigate with tight type/size limits and internal-only access.

## Manual QA (when an upload route lands)

1. Reject oversize file → **422** with field error.
2. Reject mismatched magic bytes (rename `.exe` → `.jpg`) → **422**.
3. Cross-tenant upload to another company’s entity → **403**.

## Tests

- Add **`Feature\…UploadTest`** once a route exists; until then the **`ValidatedAttachmentRules`** class is referenced from this doc only.
