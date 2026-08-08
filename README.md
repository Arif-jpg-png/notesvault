# NotesVault v2 — Supabase + Vercel

## What this version does

- Public notes library
- Search and category filter
- Supabase database
- Admin email/password login
- Add / edit / delete notes
- Stores original Google Drive URL
- Stores GPLinks monetized URL
- Public "Download / Open Notes" button opens GPLinks
- Dark mode
- Responsive UI

## 1) Create Supabase project

Create a project at https://supabase.com/

Then:
Authentication → Users → Add user
Create your admin email/password.

Then:
SQL Editor → New query
Paste `supabase.sql`
Run it.

Then:
Project Settings → API
Copy:
- Project URL
- anon/publishable key

Put them in `config.js`.

DO NOT use the `service_role` or secret key in `config.js`.

## 2) Local test

Open the folder in VS Code.
Use Live Server, or run any local static server.
Open the site and click Admin.
Sign in with your Supabase user.

## 3) Add a note

For each note:
- Google Drive URL = original file/folder URL
- GPLinks URL = monetized GPLinks URL
- The public button uses GPLinks URL.

Make sure your Google Drive sharing settings allow the intended visitors to access the file.

## 4) Deploy with GitHub + Vercel

Create a GitHub repository.
Upload all files:
index.html
styles.css
config.js
app.js
supabase.sql
README.md

Then create a Vercel account at https://vercel.com/
Import the GitHub repository.
Click Deploy.

Vercel will give a `*.vercel.app` URL.

## 5) Custom domain

Later, buy a domain from a registrar and add it in:
Vercel → Project → Settings → Domains

Follow Vercel's DNS instructions.

## Security notes

The frontend contains the Supabase anon/publishable key. This is normal for Supabase browser apps when Row Level Security (RLS) is configured correctly.

NEVER expose:
- Supabase service_role key
- Supabase secret key
- private API keys

The supplied SQL allows every authenticated Supabase user to edit notes. If you create only one admin account, that is acceptable for a small personal site. For multiple users, add a role system and restrict policies to an admin role.

GPLinks policies and payout rules can change. Follow their current terms and do not use fake clicks, bots, misleading buttons, or traffic that violates their rules.
