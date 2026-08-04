# DLG Data Deletion — RBI Digital Lending Guidelines Skill

**Use this skill when:** User wants to send data deletion requests to digital lenders under RBI's Digital Lending Guidelines.

**Legal basis:** RBI Master Direction on Digital Lending (updated August 2025) — Para 10.2, 11.1

---

## What This Skill Does

Helps users:
1. Discover which digital lenders/fintechs hold their data
2. Create deletion requests with unique DPR-IDs
3. Send requests citing RBI DLG
4. Track and follow up on responses
5. Escalate if no response

---

## Quick Start

```
You: "I want to delete my data from KreditBee and CRED"

Skill responds with:
1. Check if entities are in the registry
2. Guide user to create requests
3. Help send emails
4. Track responses
```

---

## Step-by-Step Process

### Step 1: Set Up Profile

User needs to configure:
- Full name
- Email (Gmail recommended for SMTP)
- Phone number(s)
- Address
- SMTP credentials (or use skill to help set up)

### Step 2: Discover Data Holders

**From CIBIL Report (recommended):**
```
Ask user to upload/share their CIBIL report PDF
Parse to extract all institutions that queried their credit
Create requests for each
```

**From Bank Statement:**
```
Ask user to share EMI deductions or NACH mandate details
Extract FI names
Match to registry
```

**From Memory:**
```
Ask user: "Which fintechs/loan apps have you used?"
List: KreditBee, CRED, Slice, PhonePe, Paytm, etc.
```

### Step 3: Create Requests

For each entity:
1. Create unique DPR-ID
2. Generate deletion email citing RBI DLG
3. Save to tracking database

### Step 4: Send Requests

Send via:
- SMTP (Gmail/Outlook)
- Or generate letters for registered post

### Step 5: Track & Follow Up

- Day 3: Follow-up if no acknowledgment
- Day 7: Escalate to DPO
- Day 30: Escalate to RBI Ombudsman

---

## Email Template (RBI DLG)

```
Subject: Data Deletion Request — RBI Digital Lending Guidelines — [Entity Name] — [DPR-ID]

Dear Grievance Officer / Nodal Officer,

I am writing to request deletion of my personal data held by [Entity Name] 
under RBI Master Direction on Digital Lending (updated August 2025).

As per Para 10.2: "Data shall be deleted once the purpose is over"
As per Para 11.1: "No data sharing without consent after loan closure"

I request your organization to:
1. Confirm receipt of this request
2. Delete all my personal data in your digital lending records
3. Provide written confirmation of data deletion

Reference:
- DPR-ID: [DPR-ID]
- Request Date: [Date]
- Entity: [Entity Name]

Contact:
- Email: [User's email]
- Phone: [User's phone(s)]

Regards,
[User's Name]
[User's Phone(s)]
```

---

## Entity Registry

**Top Digital Lenders (59 in registry):**

| Entity | Category | Grievance Email |
|--------|----------|-----------------|
| KreditBee | fintech | grievance@kreditbee.in |
| EarlySalary | fintech | grievance.officer@earlysalary.com |
| CRED | fintech | grievance.nodal@cred.club |
| Slice | fintech | grievance.officer@sliceit.com |
| PhonePe | fintech | grievance.officer@phonepe.com |
| Paytm | fintech | nodalofficer.lending@paytm.com |
| Bajaj Finserv | nbfc | gro@bajajfinserv.in |
| Tata Capital | nbfc | grievance@tatacapital.com |
| Lendingkart | fintech | grievance@lendingkart.com |
| LoanTap | fintech | grievance@loantap.in |

**Full list:** `finwipe list --category fintech`

---

## Discovery Commands

If user has CIBIL report:
```
Parse PDF → extract institution names → match to registry → create requests
```

If user remembers fintechs used:
```
Ask for list → verify in registry → create requests
```

If user has bank statement:
```
Extract EMI deductions → identify FIs → create requests
```

---

## Escalation Path

```
Day 0: Send deletion request
Day 3: Follow-up if no ACK
Day 7: Escalate to DPO
Day 14: Escalate to RBI Ombudsman
Day 30: File with Consumer Forum
```

---

## What Can Be Deleted (RBI DLG)

```
✓ Pre-approved loan offer profiles
✓ Marketing and promotional data
✓ Behavioral and usage data
✓ App permissions and preferences
✓ Third-party shared data
```

## What Cannot Be Deleted

```
✗ KYC documents (PMLA: 10 years)
✗ Transaction records (RBI: 5-10 years)
✗ Active loan account data
✗ CIBIL's own records
```

---

## Tools Available

- `finwipe` CLI tool for tracking requests
- Gmail SMTP for sending
- SQLite database for tracking
- Template emails with RBI DLG citations

---

## Key Phrases to Use

- "RBI Master Direction on Digital Lending (updated August 2025)"
- "Para 10.2 — data deletion"
- "Para 11.1 — no post-closure data sharing"
- "DPR-ID" for unique tracking
- "Grievance Officer / Nodal Officer"

---

## Common Fintechs to Check

**Loan Apps:**
- KreditBee, EarlySalary, Stashfin, LoanTap
- CRED, Slice, Uni, PostPe, Simpl
- MoneyTap, Kissht, Indifi, Capital Float

**Payment Apps with Lending:**
- PhonePe, Paytm, Google Pay, Amazon Pay
- BharatPe, Credenc, Paytm Money

**NBFCs:**
- Bajaj Finserv, Tata Capital, Aditya Birla Finance
- HDB, Chola, Mahindra Finance, Shriram
- Lendingkart, Muthoot, Airtel Payments Bank

---

## Example Conversation Flow

```
User: "I want to delete my data from apps that gave me loans"

Skill: "Great! Let's do this under RBI Digital Lending Guidelines.
        
Which of these have you used?
- KreditBee (loan)
- CRED (credit card + BNPL)  
- Slice (card)
- PhonePe (payments + lending)
- Paytm (payments + lending)
- EarlySalary (salary advance)
- Bajaj Finserv (loan)
- [other]

Or upload your CIBIL report and I'll find them automatically."

User: "I've used KreditBee, CRED, and PhonePe"

Skill: "Found all three in the registry. Creating deletion requests:

1. KreditBee (DPR-2026-XXXXXX) → grievance@kreditbee.in
2. CRED (DPR-2026-XXXXXX) → grievance.nodal@cred.club  
3. PhonePe (DPR-2026-XXXXXX) → grievance.officer@phonepe.com

Want me to send the deletion emails now? 
Include your name, email, and phone number in each."
```
