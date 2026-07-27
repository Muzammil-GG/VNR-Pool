---
title: Software Requirements Specification (SRS)
author: VNR Pool Team
date: 2026-07-27
---

# Software Requirements Specification (SRS)
## Project Name: VNR Pool (Premium Ride-Sharing for VNRVJIET)

---

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to present a detailed Software Requirements Specification (SRS) for **VNR Pool**. It will explain the purpose and features of the system, the interfaces of the system, what the system will do, the constraints under which it must operate, and how the system will react to external stimuli.

### 1.2 Intended Audience
This document is intended for project stakeholders, developers, UI/UX designers, testers, and university administrators (VNRVJIET) who need to understand the architectural and functional layout of the VNR Pool ecosystem.

### 1.3 Project Scope
VNR Pool is a highly secure, closed-ecosystem web application designed specifically for the students of VNRVJIET. It facilitates peer-to-peer carpooling and bike-pooling. By restricting access exclusively to users with a valid `@vnrvjiet.in` email address, it guarantees a safe environment for students to share rides, split commute costs, and reduce their collective carbon footprint.

---

## 2. Problem Statement

Commuting to and from college presents several significant challenges for university students:
1. **High Commute Costs:** Private cabs (Uber/Ola) and auto-rickshaws are extremely expensive for daily student budgets.
2. **Environmental Impact:** Hundreds of students traveling solo in cars and bikes contribute heavily to traffic congestion and carbon emissions around the campus.
3. **Safety & Trust Concerns:** Students are often hesitant to share rides with complete strangers using public carpooling apps due to safety and security risks.
4. **Inefficiency:** Many students travel the same routes daily with empty seats in their vehicles, while other students struggle to find affordable transport for the exact same route.

---

## 3. The Solution

**VNR Pool** directly solves these issues by creating a hyper-local, high-trust ride-sharing network:
- **Verified Identity:** Only verified VNRVJIET students can log in. The system uses strict domain-locking to reject any non-college emails.
- **Cost Sharing:** Students can easily split the cost of fuel, making daily commutes highly affordable.
- **Eco-Friendly (Gamified):** The app tracks "Eco Points," gamifying the reduction of carbon footprint and incentivizing shared rides.
- **High Trust Ecosystem:** Since all users are verified students of the same college, the inherent risk of traveling with strangers is entirely eliminated.

---

## 4. Overall Description

### 4.1 Product Perspective
VNR Pool is a standalone progressive web application (PWA) built using modern web technologies (Next.js 14, React, Tailwind CSS) with a backend-as-a-service (BaaS) architecture powered by Supabase.

### 4.2 User Classes and Characteristics
* **Passenger:** A verified student looking for a ride to or from the college. Passengers can search for rides, request bookings, and message drivers.
* **Driver:** A verified student offering empty seats in their car or on their bike. Drivers can publish rides, accept/reject booking requests, and manage their trip schedules.
* **Administrator:** System admins who monitor platform health, handle disputes, and maintain community guidelines.

### 4.3 Operating Environment
* **Frontend:** Any modern mobile or desktop web browser (Chrome, Safari, Edge, Firefox). The UI is meticulously designed to be highly responsive and mobile-first.
* **Backend:** Serverless environment hosted on Vercel, interfacing with a PostgreSQL database managed by Supabase.

---

## 5. System Features & Facilities

### 5.1 Domain-Restricted Authentication
* **Description:** The system integrates Google OAuth but strictly filters login attempts. If the authenticated email does not end with `@vnrvjiet.in`, the system forcefully terminates the session and blocks access.
* **Benefit:** Ensures a 100% closed, safe environment for students.

### 5.2 Dynamic Ride Management
* **Publishing Rides:** Drivers can specify their starting location, destination, date, time, available seats, and vehicle type (Car/Bike).
* **Searching Rides:** Passengers can filter available rides by date, origin, and destination.
* **Booking System:** Passengers request a seat. The driver receives a notification and can **Approve** or **Reject** the request.

### 5.3 Real-Time Messaging & Chat
* **Description:** Once a ride is approved, a secure chat channel is opened between the driver and the passenger.
* **Facilities:** Users can coordinate pickup spots and timings in real-time. Unapproved passengers cannot message the driver, preventing spam.

### 5.4 Gamification & Trust Metrics
* **Eco Points:** Users earn points for every shared ride, visualizing their contribution to reducing carbon emissions.
* **Trust Score:** A dynamic rating system (out of 5.0) where users rate each other post-ride. High trust scores result in a glowing "Premium Status" badge on user profiles.

### 5.5 Advanced User Profiles
* **Public Cards:** Users can click on any driver or passenger's avatar to view a sleek, premium "Public Profile Card."
* **Tap-to-Call:** Verified profiles expose a tap-to-call button for immediate coordination (obfuscated until booking is confirmed).
* **Vehicle Verification:** Drivers can list their vehicle registration numbers (e.g., TS09XX1234), which are strictly validated against Indian RTO formats.

---

## 6. External Interface Requirements

### 6.1 User Interfaces
The UI is designed with a "Premium Aesthetic" prioritizing modern glassmorphism, dynamic gradients (Indigo, Purple, Emerald), and fluid micro-animations (powered by Framer Motion).
* **Dashboard:** Features a live, scroll-controlled background with floating vehicles over an interactive glowing grid.
* **Modals & Dialogs:** All interactions (booking, profile viewing) occur in highly polished, non-intrusive modal overlays.

### 6.2 Software Interfaces
* **Database & Auth:** Supabase (PostgreSQL, GoTrue Auth).
* **Hosting & Edge Compute:** Vercel.
* **Styling Engine:** Tailwind CSS & Radix UI Primitives.

---

## 7. Nonfunctional Requirements

### 7.1 Performance Requirements
* The application utilizes Next.js Server Components to guarantee lightning-fast initial page loads.
* Real-time database subscriptions (Supabase Realtime) must reflect changes (chat messages, booking status) within 200ms.

### 7.2 Security Requirements
* All environment variables and service role keys are securely managed via Vercel Edge config.
* Row Level Security (RLS) is strictly enforced on the database. A user can only read messages sent to them, and can only edit their own profile.
* Protection against spam is implemented via strict API Rate Limiting.

### 7.3 Software Quality Attributes
* **Aesthetics:** The visual language of the application is a core feature, designed to "wow" users with a premium, state-of-the-art feel, heavily utilizing deep dark modes and curated color palettes.
* **Reliability:** 99.9% uptime guaranteed by serverless edge infrastructure.

---
*End of Document*
