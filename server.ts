/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';

// Load initial data and models directly from frontend definitions
import { 
  INITIAL_STREAMS, 
  INITIAL_STUDENTS, 
  INITIAL_SUBJECTS, 
  INITIAL_SCORES, 
  DEFAULT_GRADE_BOUNDARIES 
} from './src/data/mockData.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Initialize Firebase Admin SDK
try {
  const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } else {
    console.warn('WARNING: firebase-service-account.json not found. API authentication disabled.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
}

// Authentication Middleware
async function authenticateToken(req: any, res: any, next: any) {
  // If Firebase Admin SDK is not initialized, bypass verification for development
  if (admin.apps.length === 0) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    console.warn('WARNING: Access token missing. Allowing request in local development mode.');
    return next();
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.warn('WARNING: Firebase token verification failed. Allowing request in local development mode:', error);
    next(); // Bypass error to keep local environment interactive
  }
}

// Set up Postgres connection pool
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('FATAL: DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

// Database DDL creation & Seeding engine
async function initDatabase() {
  console.log('Initializing database schema and checking connection...');
  
  // 1. Create Tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS streams (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      room_number VARCHAR(20) NOT NULL,
      class_teacher VARCHAR(100) NOT NULL
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(36) PRIMARY KEY,
      admission_no VARCHAR(30) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      stream_id VARCHAR(36) NOT NULL REFERENCES streams(id) ON DELETE RESTRICT,
      dob VARCHAR(20) NOT NULL,
      gender VARCHAR(15) CHECK (gender IN ('Male', 'Female', 'Other')),
      status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Transferred')),
      parent_name VARCHAR(100) NOT NULL,
      parent_phone VARCHAR(30) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subjects (
      id VARCHAR(36) PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      department VARCHAR(50) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stream_subjects (
      stream_id VARCHAR(36) REFERENCES streams(id) ON DELETE CASCADE,
      subject_id VARCHAR(36) REFERENCES subjects(id) ON DELETE CASCADE,
      PRIMARY KEY (stream_id, subject_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id VARCHAR(100) PRIMARY KEY,
      student_id VARCHAR(36) REFERENCES students(id) ON DELETE CASCADE,
      subject_id VARCHAR(36) REFERENCES subjects(id) ON DELETE CASCADE,
      continuous_assessment NUMERIC(5,2) NOT NULL CHECK (continuous_assessment BETWEEN 0 AND 30),
      exam NUMERIC(5,2) NOT NULL CHECK (exam BETWEEN 0 AND 70),
      total NUMERIC(5,2) NOT NULL,
      grade VARCHAR(5) NOT NULL,
      updated_at VARCHAR(50) NOT NULL,
      CONSTRAINT unique_student_subject UNIQUE (student_id, subject_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS grade_boundaries (
      grade VARCHAR(5) PRIMARY KEY,
      min NUMERIC(5,2) NOT NULL,
      max NUMERIC(5,2) NOT NULL,
      remark VARCHAR(100) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) DEFAULT 'Admin'
    );
  `);

  await pool.query(`
    INSERT INTO users (id, username, password, email, name, role)
    VALUES ('usr_admin', 'lekoringoeliakim', '12345678', 'lekoringoeliakim@gmail.com', 'lekoringoeliakim', 'Admin')
    ON CONFLICT (username) DO NOTHING
  `);

  // 2. Check if database is empty (no streams seeded)
  const streamsCheck = await pool.query('SELECT COUNT(*) FROM streams');
  const count = parseInt(streamsCheck.rows[0].count, 10);
  
  if (count === 0) {
    console.log('PostgreSQL database is empty. Commencing automatic seed protocol...');
    await pool.query('BEGIN');
    try {
      // Seed grade boundaries
      for (const b of DEFAULT_GRADE_BOUNDARIES) {
        await pool.query(
          'INSERT INTO grade_boundaries (grade, min, max, remark) VALUES ($1, $2, $3, $4)',
          [b.grade, b.min, b.max, b.remark]
        );
      }
      
      // Seed streams
      for (const s of INITIAL_STREAMS) {
        await pool.query(
          'INSERT INTO streams (id, name, room_number, class_teacher) VALUES ($1, $2, $3, $4)',
          [s.id, s.name, s.roomNumber, s.classTeacher]
        );
      }
      
      // Seed students
      for (const st of INITIAL_STUDENTS) {
        await pool.query(
          `INSERT INTO students (id, admission_no, name, stream_id, dob, gender, status, parent_name, parent_phone)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [st.id, st.admissionNo, st.name, st.streamId, st.dob, st.gender, st.status, st.parentName, st.parentPhone]
        );
      }
      
      // Seed subjects & assignments
      for (const sub of INITIAL_SUBJECTS) {
        await pool.query(
          'INSERT INTO subjects (id, code, name, department) VALUES ($1, $2, $3, $4)',
          [sub.id, sub.code, sub.name, sub.department]
        );
        for (const streamId of sub.assignedStreamIds) {
          await pool.query(
            'INSERT INTO stream_subjects (stream_id, subject_id) VALUES ($1, $2)',
            [streamId, sub.id]
          );
        }
      }
      
      // Seed scores
      for (const sc of INITIAL_SCORES) {
        await pool.query(
          `INSERT INTO scores (id, student_id, subject_id, continuous_assessment, exam, total, grade, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [sc.id, sc.studentId, sc.subjectId, sc.continuousAssessment, sc.exam, sc.total, sc.grade, sc.updatedAt]
        );
      }
      
      await pool.query('COMMIT');
      console.log('Successfully completed database seeding.');
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error('Failed to seed database, rollback executed:', err);
      throw err;
    }
  } else {
    console.log('Database already contains records. Skipping seed step.');
  }
}

// ----------------------------------------------------
// IN-MEMORY DATABASE FALLBACK STATE
// ----------------------------------------------------
let isInMemoryMode = false;
let memoryStreams = [...INITIAL_STREAMS];
let memoryStudents = [...INITIAL_STUDENTS];
let memorySubjects = [...INITIAL_SUBJECTS];
let memoryScores = [...INITIAL_SCORES];
let memoryGradeBoundaries = [...DEFAULT_GRADE_BOUNDARIES];

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Apply auth middleware to all secure /api routes
app.use('/api', (req, res, next) => {
  // Allow login endpoint without authentication
  if (req.path === '/login') {
    return next();
  }
  authenticateToken(req, res, next);
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (isInMemoryMode) {
      // Allow demo user lekoringoeliakim / 12345678
      if ((username === 'lekoringoeliakim' || username === 'lekoringoeliakim@gmail.com') && password === '12345678') {
        return res.json({
          user: {
            id: 'usr_admin',
            username: 'lekoringoeliakim',
            email: 'lekoringoeliakim@gmail.com',
            name: 'lekoringoeliakim',
            role: 'Admin'
          }
        });
      }
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }
    const result = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }
    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Error during login validation:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/all
app.get('/api/all', async (req, res) => {
  try {
    if (isInMemoryMode) {
      return res.json({
        streams: memoryStreams,
        students: memoryStudents,
        subjects: memorySubjects,
        scores: memoryScores,
        gradeBoundaries: memoryGradeBoundaries
      });
    }
    const streamsRes = await pool.query('SELECT * FROM streams ORDER BY name ASC');
    const studentsRes = await pool.query('SELECT * FROM students ORDER BY name ASC');
    const subjectsRes = await pool.query('SELECT * FROM subjects ORDER BY name ASC');
    const streamSubjectsRes = await pool.query('SELECT * FROM stream_subjects');
    const scoresRes = await pool.query('SELECT * FROM scores');
    const gradeBoundariesRes = await pool.query('SELECT * FROM grade_boundaries ORDER BY min DESC');

    const subjects = subjectsRes.rows.map(sub => ({
      id: sub.id,
      code: sub.code,
      name: sub.name,
      department: sub.department,
      assignedStreamIds: streamSubjectsRes.rows
        .filter(ss => ss.subject_id === sub.id)
        .map(ss => ss.stream_id)
    }));

    const students = studentsRes.rows.map(st => ({
      id: st.id,
      admissionNo: st.admission_no,
      name: st.name,
      streamId: st.stream_id,
      dob: st.dob,
      gender: st.gender,
      status: st.status,
      parentName: st.parent_name,
      parentPhone: st.parent_phone
    }));

    const streams = streamsRes.rows.map(s => ({
      id: s.id,
      name: s.name,
      roomNumber: s.room_number,
      classTeacher: s.class_teacher
    }));

    const scores = scoresRes.rows.map(sc => ({
      id: sc.id,
      studentId: sc.student_id,
      subjectId: sc.subject_id,
      continuousAssessment: Number(sc.continuous_assessment),
      exam: Number(sc.exam),
      total: Number(sc.total),
      grade: sc.grade,
      updatedAt: sc.updated_at
    }));

    const gradeBoundaries = gradeBoundariesRes.rows.map(b => ({
      grade: b.grade,
      min: Number(b.min),
      max: Number(b.max),
      remark: b.remark
    }));

    res.json({
      streams,
      students,
      subjects,
      scores,
      gradeBoundaries
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/streams
app.post('/api/streams', async (req, res) => {
  try {
    const { id, name, roomNumber, classTeacher } = req.body;
    if (isInMemoryMode) {
      const newStream = { id, name, roomNumber, classTeacher };
      memoryStreams.push(newStream);
      return res.status(201).json(newStream);
    }
    const result = await pool.query(
      'INSERT INTO streams (id, name, room_number, class_teacher) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name, roomNumber, classTeacher]
    );
    res.status(201).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      roomNumber: result.rows[0].room_number,
      classTeacher: result.rows[0].class_teacher
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/students
app.post('/api/students', async (req, res) => {
  try {
    const { id, admissionNo, name, streamId, dob, gender, status, parentName, parentPhone } = req.body;
    if (isInMemoryMode) {
      const newStudent = { id, admissionNo, name, streamId, dob, gender, status, parentName, parentPhone };
      memoryStudents.push(newStudent);
      return res.status(201).json(newStudent);
    }
    const result = await pool.query(
      `INSERT INTO students (id, admission_no, name, stream_id, dob, gender, status, parent_name, parent_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, admissionNo, name, streamId, dob, gender, status, parentName, parentPhone]
    );
    res.status(201).json({
      id: result.rows[0].id,
      admissionNo: result.rows[0].admission_no,
      name: result.rows[0].name,
      streamId: result.rows[0].stream_id,
      dob: result.rows[0].dob,
      gender: result.rows[0].gender,
      status: result.rows[0].status,
      parentName: result.rows[0].parent_name,
      parentPhone: result.rows[0].parent_phone
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/students/:id
app.put('/api/students/:id', async (req, res) => {
  try {
    const { admissionNo, name, streamId, dob, gender, status, parentName, parentPhone } = req.body;
    if (isInMemoryMode) {
      const idx = memoryStudents.findIndex(s => s.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Student not found' });
      memoryStudents[idx] = { ...memoryStudents[idx], admissionNo, name, streamId, dob, gender, status, parentName, parentPhone };
      return res.json(memoryStudents[idx]);
    }
    const result = await pool.query(
      `UPDATE students 
       SET admission_no = $1, name = $2, stream_id = $3, dob = $4, gender = $5, status = $6, parent_name = $7, parent_phone = $8
       WHERE id = $9 RETURNING *`,
      [admissionNo, name, streamId, dob, gender, status, parentName, parentPhone, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({
      id: result.rows[0].id,
      admissionNo: result.rows[0].admission_no,
      name: result.rows[0].name,
      streamId: result.rows[0].stream_id,
      dob: result.rows[0].dob,
      gender: result.rows[0].gender,
      status: result.rows[0].status,
      parentName: result.rows[0].parent_name,
      parentPhone: result.rows[0].parent_phone
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/students/:id
app.delete('/api/students/:id', async (req, res) => {
  try {
    if (isInMemoryMode) {
      memoryStudents = memoryStudents.filter(s => s.id !== req.params.id);
      memoryScores = memoryScores.filter(sc => sc.studentId !== req.params.id);
      return res.json({ success: true });
    }
    await pool.query('DELETE FROM students WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subjects
app.post('/api/subjects', async (req, res) => {
  try {
    const { id, code, name, department, assignedStreamIds } = req.body;
    if (isInMemoryMode) {
      const newSubject = { id, code, name, department, assignedStreamIds };
      memorySubjects.push(newSubject);
      return res.status(201).json(newSubject);
    }
    await pool.query('BEGIN');
    await pool.query(
      'INSERT INTO subjects (id, code, name, department) VALUES ($1, $2, $3, $4)',
      [id, code, name, department]
    );
    for (const streamId of assignedStreamIds) {
      await pool.query(
        'INSERT INTO stream_subjects (stream_id, subject_id) VALUES ($1, $2)',
        [streamId, id]
      );
    }
    await pool.query('COMMIT');
    res.status(201).json({ id, code, name, department, assignedStreamIds });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/subjects/:id
app.put('/api/subjects/:id', async (req, res) => {
  try {
    const { code, name, department, assignedStreamIds } = req.body;
    if (isInMemoryMode) {
      const idx = memorySubjects.findIndex(s => s.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Subject not found' });
      memorySubjects[idx] = { ...memorySubjects[idx], code, name, department, assignedStreamIds };
      return res.json(memorySubjects[idx]);
    }
    await pool.query('BEGIN');
    await pool.query(
      'UPDATE subjects SET code = $1, name = $2, department = $3 WHERE id = $4',
      [code, name, department, req.params.id]
    );
    await pool.query('DELETE FROM stream_subjects WHERE subject_id = $1', [req.params.id]);
    for (const streamId of assignedStreamIds) {
      await pool.query(
        'INSERT INTO stream_subjects (stream_id, subject_id) VALUES ($1, $2)',
        [streamId, req.params.id]
      );
    }
    await pool.query('COMMIT');
    res.json({ id: req.params.id, code, name, department, assignedStreamIds });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/subjects/:id
app.delete('/api/subjects/:id', async (req, res) => {
  try {
    if (isInMemoryMode) {
      memorySubjects = memorySubjects.filter(s => s.id !== req.params.id);
      memoryScores = memoryScores.filter(sc => sc.subjectId !== req.params.id);
      return res.json({ success: true });
    }
    await pool.query('DELETE FROM subjects WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/scores (single upsert)
app.post('/api/scores', async (req, res) => {
  try {
    const { studentId, subjectId, continuousAssessment, exam, total, grade, updatedAt } = req.body;
    if (isInMemoryMode) {
      const id = `${studentId}_${subjectId}`;
      memoryScores = memoryScores.filter(sc => sc.id !== id);
      const newScore = {
        id,
        studentId,
        subjectId,
        continuousAssessment: Number(continuousAssessment),
        exam: Number(exam),
        total: Number(total),
        grade,
        updatedAt
      };
      memoryScores.push(newScore);
      return res.json(newScore);
    }
    const id = `${studentId}_${subjectId}`;
    await pool.query(
      `INSERT INTO scores (id, student_id, subject_id, continuous_assessment, exam, total, grade, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (student_id, subject_id)
       DO UPDATE SET continuous_assessment = EXCLUDED.continuous_assessment,
                     exam = EXCLUDED.exam,
                     total = EXCLUDED.total,
                     grade = EXCLUDED.grade,
                     updated_at = EXCLUDED.updated_at`,
      [id, studentId, subjectId, continuousAssessment, exam, total, grade, updatedAt]
    );
    res.json({ id, studentId, subjectId, continuousAssessment, exam, total, grade, updatedAt });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/scores/batch (bulk upsert)
app.post('/api/scores/batch', async (req, res) => {
  try {
    const updatesList = req.body;
    if (isInMemoryMode) {
      for (const score of updatesList) {
        const { studentId, subjectId, continuousAssessment, exam, total, grade, updatedAt } = score;
        const id = `${studentId}_${subjectId}`;
        memoryScores = memoryScores.filter(sc => sc.id !== id);
        memoryScores.push({
          id,
          studentId,
          subjectId,
          continuousAssessment: Number(continuousAssessment),
          exam: Number(exam),
          total: Number(total),
          grade,
          updatedAt
        });
      }
      return res.json({ success: true });
    }
    await pool.query('BEGIN');
    for (const score of updatesList) {
      const { studentId, subjectId, continuousAssessment, exam, total, grade, updatedAt } = score;
      const id = `${studentId}_${subjectId}`;
      await pool.query(
        `INSERT INTO scores (id, student_id, subject_id, continuous_assessment, exam, total, grade, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (student_id, subject_id)
         DO UPDATE SET continuous_assessment = EXCLUDED.continuous_assessment,
                       exam = EXCLUDED.exam,
                       total = EXCLUDED.total,
                       grade = EXCLUDED.grade,
                       updated_at = EXCLUDED.updated_at`,
        [id, studentId, subjectId, continuousAssessment, exam, total, grade, updatedAt]
      );
    }
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/grade-boundaries (updates system-wide grading criteria)
app.put('/api/grade-boundaries', async (req, res) => {
  try {
    const newBoundaries = req.body;
    if (isInMemoryMode) {
      memoryGradeBoundaries = newBoundaries;
      // Auto-update all existing scores based on the new grading bands
      memoryScores = memoryScores.map(sc => {
        const scoreTotal = Number(sc.total);
        const boundary = newBoundaries.find((b: any) => scoreTotal >= b.min && scoreTotal <= b.max);
        return {
          ...sc,
          grade: boundary ? boundary.grade : 'F'
        };
      });
      return res.json({ success: true });
    }
    await pool.query('BEGIN');
    await pool.query('DELETE FROM grade_boundaries');
    for (const b of newBoundaries) {
      await pool.query(
        'INSERT INTO grade_boundaries (grade, min, max, remark) VALUES ($1, $2, $3, $4)',
        [b.grade, b.min, b.max, b.remark]
      );
    }
    
    // Auto-update all existing scores based on the new grading bands
    const scoresResult = await pool.query('SELECT id, total FROM scores');
    for (const row of scoresResult.rows) {
      const scoreTotal = Number(row.total);
      const boundary = newBoundaries.find((b: any) => scoreTotal >= b.min && scoreTotal <= b.max);
      const newGrade = boundary ? boundary.grade : 'F';
      await pool.query('UPDATE scores SET grade = $1 WHERE id = $2', [newGrade, row.id]);
    }
    
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'Gemini API key is missing. Please add GEMINI_API_KEY to your backend .env file to enable the chatbot assistant.'
      });
    }

    const { message, history, systemContext } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format chat contents. history is expected to be an array of:
    // { role: 'user' | 'model', parts: [{ text: string }] }
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        contents.push({
          role: turn.role,
          parts: [{ text: turn.parts?.[0]?.text || turn.content || '' }]
        });
      }
    }
    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const systemInstruction = `You are Iko, the AI Academic Assistant for Ikonex Academy, a modern School Management System (SMS).
You have access to the current active school data. Below is the system-wide context including student records, class streams, subjects, scores, and grade boundaries:
${systemContext || 'No database context available.'}

Your goal is to answer queries from the administrator regarding:
1. Student records (enrolled, status, gender, parent details, date of birth, admission numbers).
2. Class streams (which stream exists, rooms, class teachers).
3. Academic performance (continuous assessments, exam marks, grades, mean scores, pass rates, leaderboards).
4. Curriculum (subjects, departments, assigned streams).
5. Grade boundaries and Remarks.

Guidelines:
- If asked about statistics (e.g. 'Who is the top student?', 'What is the average grade in Math?'), calculate it based on the provided context.
- Keep your tone professional, friendly, and encouraging.
- Format responses beautifully using Markdown (bold text, lists, and tables where appropriate to present comparison or student results).
- If the question is outside the scope of Ikonex Academy, answer it politely but steer the focus back to the school data.
- Do not make up any facts or student records that are not in the provided context.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error in chatbot endpoint:', error);
    res.status(500).json({ error: error.message || 'An error occurred while communicating with Gemini.' });
  }
});

// Serve frontend assets in production
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

// ----------------------------------------------------
// SERVER START
// ----------------------------------------------------
const PORT = process.env.PORT || 5000;

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend server successfully listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.warn('WARNING: Failed to connect to PostgreSQL database. Falling back to IN-MEMORY development mode.');
    console.warn('Database Error:', err.message);
    isInMemoryMode = true;
    app.listen(PORT, () => {
      console.log(`Backend server successfully listening on port ${PORT} (IN-MEMORY fallback mode)`);
    });
  });
