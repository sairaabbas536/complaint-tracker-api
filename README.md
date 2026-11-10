# Campus Complaint Tracker API (MUET SZAB Campus, Khairpur)
Simple CRUD REST API - Node.js, Express, SQLite. Built for SW426 PBL.

    npm install
    npm start        # http://localhost:3000/api/complaints
    npm run test:api # Newman runs the Postman collection (server must be running)

| Method | URL | Success | Errors |
|---|---|---|---|
| POST | /api/complaints | 201 | 400 |
| GET | /api/complaints | 200 | |
| GET | /api/complaints/:id | 200 | 404 |
| PUT | /api/complaints/:id | 200 | 400, 404 |
| DELETE | /api/complaints/:id | 200 | 404 |

## Website (frontend)
After `npm start`, open **http://localhost:3000** in the browser.
- Student Login page (name + roll number, no password), then a portal with top bar and sidebar: Dashboard, Register Complaint, All Complaints, Recent Activity.
- Register (POST), view (GET), edit (PUT), mark resolved (PUT) and delete (DELETE) complaints; search box, category counts and a recent-activity list.
- To show your logo, save the image as `public/logo.png` (a "CCT" badge is shown if it is missing).

## Troubleshooting
- Website shows no records / red "Cannot connect to the server" message: the server is not running. Run `npm start` and open http://localhost:3000.

## Validation and security
- Name: full name, every word starts with a capital letter (e.g. `Saira Abbas`). Roll number: capital letters only (e.g. `K22SW006`). Status: Pending / In Progress / Resolved.
  The website shows green for correct and red for wrong input, and the API rejects invalid data with 400.
- Prepared SQL statements (no SQL injection), escaped output on the website (no XSS), 10 KB body limit,
  rate limit (120 requests/minute), CORS limited to localhost, security headers, generic error messages.
- Postman collection has 14 tests (TC12-TC14 check the validation rules). Re-import it into Postman after updating.
