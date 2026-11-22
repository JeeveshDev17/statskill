# The 33-competency framework

StatSkill tags every question to exactly **one** of these 33 competencies, taken from problem statement **SIH26101**. They are grouped into 4 domains.

When an officer answers a question wrongly, its competency becomes a **gap**, and StatSkill recommends a course from the right-hand column. Every competency has at least one course.

The same list appears in two places in the code. Keep them in step if you change one:
- `COMPETENCIES` in `netlify/edge-functions/generate.js` (sent to Gemini in the prompt)
- the competency list in `index.html` (used to check and correct the AI's tags)

**Tag checking:** the page matches each question's tag by competency ID first (for example `TECH-09`), then by name with case, spaces and punctuation ignored (so `"ai/ml"` becomes `"AI / ML"`). The domain is then taken from this list, not from the AI. Questions whose tag matches nothing are dropped.

### Statistical

| ID | Competency | Courses that close this gap |
|---|---|---|
| STAT-01 | Survey Design | Handling Unit Level Data of Household Consumption Expenditure Survey (NSSTA)<br>Socio-Economic and Enterprise Survey Module (NSSTA) |
| STAT-02 | Sampling | Survey Methodology (Module 1.3) (NSSTA) |
| STAT-03 | National Accounts | Annual National Accounts (NSSTA) |
| STAT-04 | Price Statistics | Economics and Financial Statistics (Module 1.2) (NSSTA) |
| STAT-05 | Labour Statistics | Survey Methodology (Module 1.3) (NSSTA) |
| STAT-06 | Agricultural Statistics | Refresher Programme on Agricultural Statistics (NSSTA) |
| STAT-07 | Industrial Statistics | Handling Unit Level Data of Annual Survey of Industries (NSSTA) |
| STAT-08 | SDG Indicators | Driving Sustainability through Policy and Governance (iGOT) |
| STAT-09 | Metadata Standards | Official Statistics (Module 1.1) (NSSTA) |
| STAT-10 | Data Quality Frameworks | Analysis and Interpretation of Large-Scale Programs (iGOT)<br>Overview of Basic Statistics (NSSTA) |

### Technical

| ID | Competency | Courses that close this gap |
|---|---|---|
| TECH-01 | Python | Data Analysis through Statistical Packages (Module 2.2) (NSSTA) |
| TECH-02 | R | Working with Unit Level Data using SPSS and R (Module 2.3) (NSSTA) |
| TECH-03 | SQL | Advance IT (Module 2.1) (NSSTA) |
| TECH-04 | Stata | Working with Unit Level Data using SPSS and R (Module 2.3) (NSSTA) |
| TECH-05 | SPSS | Working with Unit Level Data using SPSS and R (Module 2.3) (NSSTA) |
| TECH-06 | SAS | Data Analysis through Statistical Packages (Module 2.2) (NSSTA) |
| TECH-07 | GIS | Advance IT (Module 2.1) (NSSTA) |
| TECH-08 | Data Visualization | Microsoft Excel Advanced (iGOT) |
| TECH-09 | AI / ML | AI in Government: Transforming Public Service Delivery (iGOT)<br>Fundamentals of Generative Artificial Intelligence (iGOT)<br>Data Mining and Applications (Module 2.4) (NSSTA) |
| TECH-10 | Cloud Computing | Advance IT (Module 2.1) (NSSTA) |
| TECH-11 | APIs | Advance IT (Module 2.1) (NSSTA) |
| TECH-12 | Open Data | Responsible Data Management (iGOT) |

### Digital Governance

| ID | Competency | Courses that close this gap |
|---|---|---|
| DGOV-01 | Cybersecurity | CERT-In and Fundamentals of Cyber Hygiene (iGOT)<br>Cybersecurity (Basic Level) (iGOT) |
| DGOV-02 | Data Privacy | Responsible Data Management (iGOT)<br>Digital Personal Data Protection Act 2023: An Overview (iGOT) |
| DGOV-03 | Digital Signatures | Digital Signatures and e-Office Workflows (iGOT) |
| DGOV-04 | Government Cloud | Cloud Adoption in Government (MeghRaj) (iGOT) |
| DGOV-05 | Digital Public Infrastructure | Deep Tech and India (iGOT) |

### Behavioural & Managerial

| ID | Competency | Courses that close this gap |
|---|---|---|
| BEHV-01 | Leadership | Leading with Clarity: Svadharma in Public Service (iGOT)<br>Leadership Skills (iGOT) |
| BEHV-02 | Communication | Basics of Communication (iGOT)<br>Negotiation Fundamentals (iGOT) |
| BEHV-03 | Project Management | Time Management Skills (iGOT) |
| BEHV-04 | Ethics | Do’s and Don’ts for Government Employees (iGOT)<br>AI Ethics in Good Governance (iGOT) |
| BEHV-05 | Decision Making | Evidence Based Policy Making (iGOT)<br>Fundamentals of Public Policy (iGOT) |
| BEHV-06 | Change Management | Design Thinking for Excellence in Public Services (iGOT) |

---

**Course sources:** iGOT Karmayogi courses link to their real course pages by course ID. NSSTA programmes link to the NSSTA site, because NSSTA does not publish a separate web page for each programme.

*StatSkill by Jeevesh Dev · Team DevOOPS · SIH26101*
