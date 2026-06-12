# Computer-Aided Diagnosis System

A professional, clinical-grade AI-powered Healthcare Decision Support Platform. This full-stack web application is designed to assist healthcare providers in analyzing patient records, interpreting uploaded medical documents, predicting disease risks with confidence estimation, and maintaining a robust historical audit trail.

---

## 🌟 Key Features

- **Clinical-Grade Landing Dashboard**: A beautiful, modern interface using a curated dark navy and teal clinical palette, highlighting system capabilities and CTA paths.
- **Medical Report Upload & OCR**: Integration with AWS S3 for document storage, combined with LLM-powered OCR and entity extraction to parse textual reports.
- **Structured Manual Assessment Input**: A comprehensive form containing vital patient metrics including Glucose levels, HbA1c, Age, BMI, Symptoms, and current Medicines.
- **AI Disease Risk Prediction**: Predicts clinical risk levels and calculates confidence scores, identifies detected medical entities, and generates automated clinical summaries.
- **Analysis History & Audit Trails**: Maintains historical records of assessments for authenticated users.
- **Secure Authentication**: Integration with OAuth for secure access controls.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 & Vite
- **Styling**: Tailwind CSS v4, Framer Motion (micro-animations), Radix UI primitive components
- **Routing**: Wouter
- **Data Fetching & State**: TanStack React Query, tRPC Client
- **Data Visualization**: Recharts

### Backend
- **Server**: Express with tRPC API structure
- **Language**: TypeScript (Node.js runtime via `tsx`)
- **Database**: MySQL with Drizzle ORM
- **Object Storage**: AWS SDK S3 for medical report files

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- **pnpm** (preferred package manager)

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up your environment variables:
   Create a `.env` file in the root directory and configure:
   ```env
   DATABASE_URL=your_mysql_database_url
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_S3_BUCKET=your_s3_bucket_name
   ```

3. Run database migrations:
   ```bash
   pnpm db:push
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```
   The application will be running on `http://localhost:5173`.

---

## 🧪 Testing

Run unit and integration tests using Vitest:
```bash
pnpm test
```
