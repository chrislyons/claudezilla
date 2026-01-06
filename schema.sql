-- Claudezilla Email Signups Table
-- Stores email addresses for Firefox Add-on launch notifications

CREATE TABLE email_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  notified BOOLEAN DEFAULT 0
);

CREATE INDEX idx_email ON email_signups(email);
CREATE INDEX idx_created_at ON email_signups(created_at);
