/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
// API ROUTES
// ----------------------------------------------------

// GET /api/all
app.get('/api/all', async (req, res) => {
  try {
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
    console.error('Failed to initialize database, server starting aborted:', err);
    process.exit(1);
  });
