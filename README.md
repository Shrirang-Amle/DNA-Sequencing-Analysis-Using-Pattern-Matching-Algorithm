# DNA Sequencing Analysis Using Pattern Matching Algorithms

## Overview

This project is a bioinformatics-inspired web application that analyzes DNA sequences using multiple exact and approximate string matching algorithms. It allows users to search DNA patterns within large genomic datasets and compare the performance of different pattern matching techniques.

The system demonstrates the practical application of Design and Analysis of Algorithms (DAA) concepts on real-world DNA sequence data.

---

## Features

- DNA sequence pattern searching
- Exact pattern matching
  - Naive Algorithm
  - Knuth-Morris-Pratt (KMP)
  - Rabin-Karp Algorithm
- Approximate pattern matching
- Performance comparison of algorithms
- Execution time measurement and analysis
- Interactive web-based interface

---

## Tech Stack

### Frontend
- React.js
- HTML
- CSS
- JavaScript

### Backend
- Spring Boot
- Java

### Dataset
- Real genomic DNA sequence dataset (.fna)

---

## Project Structure

```
DNA-Sequencing-Analysis/
│
├── frontend/
│   └── React Application
│
├── backend/
│   └── Spring Boot Application
│
├── Dataset/
│   └── DNA Dataset (.fna) [Ignored from Git]
│
└── README.md
```

---

## Algorithms Implemented

### 1. Naive Pattern Matching
Simple character-by-character comparison approach.

### 2. Knuth-Morris-Pratt (KMP)
Uses preprocessing to avoid redundant comparisons and improve efficiency.

### 3. Rabin-Karp
Uses hashing for efficient pattern searching.

### 4. Approximate Matching
Allows limited mismatches while searching DNA patterns.

---

## Real-World Problem Solved

DNA sequences are extremely large and searching for genes, mutations, or specific biological markers efficiently is a major challenge in bioinformatics.

This project demonstrates how advanced pattern matching algorithms can be used to locate DNA subsequences quickly and accurately while comparing their performance on real genomic datasets.

Applications include:

- Gene identification
- Mutation analysis
- Genome research
- Bioinformatics studies
- Biological sequence analysis

---

## Performance Analysis

The system records and compares:

- Execution Time
- Matching Accuracy
- Number of Occurrences Found

This helps evaluate the efficiency of different algorithms on large DNA datasets.

---

## Dataset

Due to GitHub's file size limitations, the genomic dataset is not included in this repository.

Download the dataset separately and place it inside:

```
Dataset/
```

---

## How to Run

### Backend

```bash
cd backend/dna
mvn spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm start
```

---

## Future Enhancements

- Boyer-Moore Algorithm
- Aho-Corasick Multi-pattern Matching
- DNA Sequence Visualization
- Machine Learning Based DNA Analysis
- Cloud Dataset Integration

---

## Author

Shrirang Amle
