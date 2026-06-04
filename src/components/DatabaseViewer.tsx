/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Stream, Student, Subject, Score, StudentResultSummary } from '../types';
import { Terminal, Database, DatabaseZap, Code2, Play, GitMerge, FileCode, CheckCircle2 } from 'lucide-react';

interface DatabaseViewerProps {
  students: Student[];
  streams: Stream[];
  subjects: Subject[];
  scores: Score[];
  results: StudentResultSummary[];
}

export default function DatabaseViewer({
  students,
  streams,
  subjects,
  scores,
  results
}: DatabaseViewerProps) {
  // Tabs for DB panel
  const [activeSubTab, setActiveSubTab] = useState<'erd' | 'ddl' | 'playground'>('playground');
  
  // Playground State
  const [selectedPresetQuery, setSelectedPresetQuery] = useState('query_1');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [queryPlan, setQueryPlan] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Preset Queries
  const PRESET_QUERIES = [
    {
      id: 'query_1',
      label: 'Find Top Ranked Students with Streams (JOIN)',
      sql: `SELECT 
  st.name AS student_name, 
  st.admission_no, 
  str.name AS class_stream,
  avg.average_score AS gpa
FROM students st
INNER JOIN streams str ON st.stream_id = str.id
INNER JOIN (
  SELECT student_id, AVG(total) AS average_score
  FROM scores
  GROUP BY student_id
) avg ON st.id = avg.student_id
WHERE st.status = 'Active'
ORDER BY avg.average_score DESC
LIMIT 5;`,
      plan: `Limit  (cost=12.45..12.46 rows=5 width=96)
  ->  Sort  (cost=12.45..12.49 rows=15 width=96)
        Sort Key: avg.average_score DESC
        ->  Hash Join  (cost=5.12..11.89 rows=15 width=96)
              Hash Cond: (st.id = avg.student_id)
              ->  Hash Join  (cost=2.15..8.52 rows=15 width=64)
                    Hash Cond: (st.stream_id = str.id)
                    ->  Seq Scan on students st  (cost=0.00..5.90 rows=15 width=48)
                          Filter: (status = 'Active')
                    ->  Hash  (cost=1.50..1.50 rows=4 width=32)
                          ->  Seq Scan on streams str  (cost=0.00..1.50 rows=4 width=32)
              ->  Hash  (cost=2.45..2.45 rows=15 width=48)
                    ->  Subquery Scan on avg  (cost=1.80..2.45 rows=15 width=48)
                          ->  HashAggregate  (cost=1.80..2.10 rows=15 width=48)
                                Group Key: scores.student_id`
    },
    {
      id: 'query_2',
      label: 'Subject Metrics and Enrollees (AGGREGATIONS)',
      sql: `SELECT 
  sub.code AS course_code,
  sub.name AS subject_name,
  sub.department,
  COUNT(DISTINCT st.id) AS active_candidates,
  ROUND(AVG(sc.total), 1) AS syllabus_average
FROM subjects sub
LEFT JOIN stream_subjects ss ON sub.id = ss.subject_id
LEFT JOIN students st ON ss.stream_id = st.stream_id AND st.status = 'Active'
LEFT JOIN scores sc ON sub.id = sc.subject_id AND st.id = sc.student_id
GROUP BY sub.id, sub.code, sub.name, sub.department
ORDER BY syllabus_average DESC;`,
      plan: `Sort  (cost=22.40..22.45 rows=10 width=128)
  Sort Key: (ROUND(AVG(sc.total), 1)) DESC
  ->  HashAggregate  (cost=18.52..20.40 rows=10 width=128)
        Group Key: sub.id, sub.code, sub.name, sub.department
        ->  Hash Join  (cost=10.25..15.30 rows=45 width=96)
              Hash Cond: (sc.subject_id = sub.id)
              ->  Seq Scan on scores sc  (cost=0.00..4.12 rows=45 width=48)
              ->  Hash  (cost=8.10..8.10 rows=10 width=80)
                    ->  Nested Loop Left Join  (cost=2.15..8.10 rows=15 width=80)
                          ->  Seq Scan on subjects sub  (cost=0.00..2.10 rows=5 width=48)
                          ->  Index Scan on stream_subjects ss (cost=0.15..1.05 rows=3 width=32)`
    },
    {
      id: 'query_3',
      label: 'Active Student Folder Audit & Parents Contact',
      sql: `SELECT 
  admission_no, 
  name AS student_name, 
  parent_name, 
  parent_phone,
  status
FROM students
WHERE status != 'Active'
ORDER BY admission_no ASC;`,
      plan: `Seq Scan on students  (cost=0.00..5.90 rows=3 width=128)
  Filter: (status <> 'Active')`
    }
  ];

  // Execute Simulated SQL over existing React context
  const handleExecuteQuery = () => {
    setIsExecuting(true);
    setQueryResults([]);
    
    // Simulating small network database delay
    setTimeout(() => {
      const activeQuery = PRESET_QUERIES.find(q => q.id === selectedPresetQuery);
      if (!activeQuery) {
        setIsExecuting(false);
        return;
      }

      setQueryPlan(activeQuery.plan);

      // Perform real data transforms depending on selected query!
      if (selectedPresetQuery === 'query_1') {
        const joined = results
          .filter(r => {
            const studentDat = students.find(st => st.id === r.studentId);
            return studentDat?.status === 'Active';
          })
          .sort((a, b) => b.averageScore - a.averageScore)
          .slice(0, 5)
          .map(r => ({
            student_name: r.studentName,
            admission_no: r.admissionNo,
            class_stream: r.streamName,
            gpa: `${r.averageScore}%`
          }));
        setQueryResults(joined);
      } 
      else if (selectedPresetQuery === 'query_2') {
        const list = subjects.map(sub => {
          // get score averages
          const subjScores = scores.filter(s => s.subjectId === sub.id);
          const activeSectsCount = students.filter(st => 
            sub.assignedStreamIds.includes(st.streamId) && st.status === 'Active'
          ).length;

          const average = subjScores.length > 0
            ? Number((subjScores.reduce((acc, curr) => acc + curr.total, 0) / subjScores.length).toFixed(1))
            : 0;

          return {
            course_code: sub.code,
            subject_name: sub.name,
            department: sub.department,
            active_candidates: activeSectsCount,
            syllabus_average: average > 0 ? `${average}%` : 'N/A'
          };
        }).sort((a, b) => {
          const avgA = a.syllabus_average === 'N/A' ? 0 : parseFloat(a.syllabus_average);
          const avgB = b.syllabus_average === 'N/A' ? 0 : parseFloat(b.syllabus_average);
          return avgB - avgA;
        });
        setQueryResults(list);
      } 
      else if (selectedPresetQuery === 'query_3') {
        const audit = students
          .filter(st => st.status !== 'Active')
          .map(st => ({
            admission_no: st.admissionNo,
            student_name: st.name,
            parent_name: st.parentName,
            parent_phone: st.parentPhone,
            status: st.status
          }));
        setQueryResults(audit);
      }

      setIsExecuting(false);
    }, 600);
  };

  // Trigger default run
  React.useEffect(() => {
    handleExecuteQuery();
  }, [selectedPresetQuery, students, scores]);

  const activeSQLInfo = PRESET_QUERIES.find(q => q.id === selectedPresetQuery);

  return (
    <div className="space-y-6" id="database_viewer_module">
      
      {/* Header sections */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="text-indigo-600" size={24} />
            Data Architecture & SQL Console
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Inspect the underlying 3NF PostgreSQL/MySQL schema mappings, view active ER relations, and run terminal diagnostic aggregates
          </p>
        </div>

        {/* Database spec toggle buttons */}
        <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveSubTab('playground')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${
              activeSubTab === 'playground' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            SQL Console
          </button>
          <button
            onClick={() => setActiveSubTab('ddl')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${
              activeSubTab === 'ddl' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            DDL Schema
          </button>
          <button
            onClick={() => setActiveSubTab('erd')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${
              activeSubTab === 'erd' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ER Diagram
          </button>
        </div>
      </div>

      {/* RENDER SQL PORT TERMINAL PLAYGROUND */}
      {activeSubTab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="sql_playground_panel">
          
          {/* Diagnostic controls column */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Predefined Diagnostic Scripts</h3>
                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  Select a preset highly optimized query compiled to run aggregations, multi-table JOINs, and indexes. Runs live against current registry records.
                </p>
              </div>

              <div className="space-y-2">
                {PRESET_QUERIES.map(q => (
                  <button
                    key={q.id}
                    onClick={() => setSelectedPresetQuery(q.id)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition duration-150 flex items-start space-x-2.5 cursor-pointer ${
                      selectedPresetQuery === q.id 
                        ? 'border-indigo-600 bg-indigo-50/20 text-slate-900' 
                        : 'border-slate-150 bg-white text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    <Terminal size={14} className={`shrink-0 mt-0.5 ${selectedPresetQuery === q.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="font-semibold">{q.label}</span>
                  </button>
                ))}
              </div>

              {/* Integrity indicators */}
              <div className="pt-3 border-t border-slate-100 flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                <CheckCircle2 size={12} className="text-green-500" />
                <span>Standard compliance: PostgreSQL 3NF</span>
              </div>
            </div>
          </div>

          {/* Code display & table results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Terminal display for SQL code */}
            <div className="bg-slate-950 text-slate-200 border border-slate-800 rounded-xl shadow-md overflow-hidden font-mono text-xs">
              <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 pl-2">Ikonex Academy Live SQL Shell</span>
                </div>
                
                <span className="text-[9px] font-bold text-teal-400 bg-teal-950/50 px-2 py-0.5 border border-teal-900/50 rounded">
                  ONLINE PSQL
                </span>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold tracking-wider">// RUNNING SCRIPTS AGAINST DATABASES:</span>
                  <pre className="text-emerald-400 font-mono whitespace-pre-wrap select-all leading-relaxed bg-slate-900/60 p-3 rounded border border-slate-900">
                    {activeSQLInfo?.sql}
                  </pre>
                </div>

                {/* Simulated execution response */}
                <div className="space-y-2 pt-2 border-t border-slate-900">
                  <span className="text-[10px] text-indigo-400 font-bold tracking-wider block">// DATA LEDGER RESULT ROWS ({queryResults.length} records returned, cost index 0.05ms)</span>
                  
                  {isExecuting ? (
                    <p className="text-slate-400 animate-pulse py-4 font-semibold italic text-center">Executing index scans and hash assemblies...</p>
                  ) : queryResults.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-800 rounded bg-slate-900/30">
                      <table className="w-full text-left border-collapse font-mono text-[11px] text-slate-300">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 uppercase border-b border-slate-850">
                            {Object.keys(queryResults[0]).map(headers => (
                              <th key={headers} className="py-2 px-3">{headers}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {queryResults.map((rows, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-900/80">
                              {Object.values(rows).map((cell: any, cIdx) => (
                                <td key={cIdx} className="py-1.5 px-3 whitespace-nowrap">{String(cell)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-rose-400 py-3 italic">No database table values available to return.</p>
                  )}
                </div>

                {/* Query execution plans section */}
                <div className="space-y-1.5 pt-3 border-t border-slate-950">
                  <span className="text-[10px] text-amber-500 font-bold tracking-wider block">// POSTGRESQL QUERY EXPLAIN PLAN (EXPLAIN ANALYZE)</span>
                  <pre className="text-[10px] text-slate-400 font-mono whitespace-pre leading-relaxed bg-slate-900/20 p-2 rounded max-h-40 overflow-y-auto">
                    {queryPlan}
                  </pre>
                </div>

              </div>
            </div>
          </div>

        </div>
      )}

      {/* RENDER DDL SCHEMA CREATION */}
      {activeSubTab === 'ddl' && (
        <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs space-y-4 animate-fade-in" id="sql_ddl_panel">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Code2 size={16} className="text-indigo-600" />
              SQL CREATE TABLE Definition Scripts (3NF)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              To guarantee performance, Ikonex Academy's data model utilizes fully normalized structures with foreign key constraints, proper indices, and automated score calculations.
            </p>
          </div>

          <pre className="bg-slate-950 text-slate-300 font-mono text-[11px] p-4 rounded-xl border border-slate-900 whitespace-pre-wrap leading-relaxed select-all">
{`-- Relational 3NF Database DDL Schemas
-- Platform target: PostgreSQL or MySQL

-- 1. Class streams definition
CREATE TABLE streams (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    room_number VARCHAR(20) NOT NULL,
    class_teacher VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Student ledger folders
CREATE TABLE students (
    id VARCHAR(36) PRIMARY KEY,
    admission_no VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    stream_id VARCHAR(36) NOT NULL REFERENCES streams(id) ON DELETE RESTRICT,
    dob DATE NOT NULL,
    gender VARCHAR(15) CHECK (gender IN ('Male', 'Female', 'Other')),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Transferred')),
    parent_name VARCHAR(100) NOT NULL,
    parent_phone VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Core syllabus courses offered
CREATE TABLE subjects (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Many-to-Many course assignments to class streams
CREATE TABLE stream_subjects (
    stream_id VARCHAR(36) REFERENCES streams(id) ON DELETE CASCADE,
    subject_id VARCHAR(36) REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (stream_id, subject_id)
);

-- 5. Individual scoring assessments ledger
CREATE TABLE scores (
    id VARCHAR(100) PRIMARY KEY, -- Composite Student_Id_Subject_Id to prevent duplicates
    student_id VARCHAR(36) REFERENCES students(id) ON DELETE CASCADE,
    subject_id VARCHAR(36) REFERENCES subjects(id) ON DELETE CASCADE,
    continuous_assessment NUMERIC(5,2) NOT NULL CHECK (continuous_assessment BETWEEN 0 AND 30),
    exam NUMERIC(5,2) NOT NULL CHECK (exam BETWEEN 0 AND 70),
    total NUMERIC(5,2) GENERATED ALWAYS AS (continuous_assessment + exam) STORED,
    grade VARCHAR(5) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_subject UNIQUE (student_id, subject_id)
);

-- Indices for fast lookups
CREATE INDEX idx_students_stream ON students(stream_id);
CREATE INDEX idx_scores_student ON scores(student_id);
CREATE INDEX idx_scores_subject ON scores(subject_id);`}
          </pre>
        </div>
      )}

      {/* RENDER ENTITY RELATIONSHIP DIAGRAM */}
      {activeSubTab === 'erd' && (
        <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs space-y-4 animate-fade-in text-center" id="sql_erd_panel">
          <div className="text-left mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <GitMerge size={16} className="text-indigo-600" />
              Relational Mapping Schema (ERD Model)
            </h3>
            <p className="text-xs text-slate-500 font-sans">
              Visual architectural mapping of primary keys (PK), foreign keys (FK) and cardinality equations within Ikonex Academy
            </p>
          </div>

          <div className="border border-slate-100 p-8 rounded-xl bg-slate-50/50 flex flex-wrap justify-center gap-6 text-xs max-w-4xl mx-auto">
            {/* Table: streams */}
            <div className="w-52 bg-white rounded-lg border-2 border-slate-850 p-3 shadow-xs text-left">
              <div className="bg-slate-900 text-white p-1.5 rounded font-mono font-bold text-[10px] uppercase text-center mb-2">
                Table: streams
              </div>
              <ul className="space-y-1 font-mono text-[10px]">
                <li>🔑 <strong>id</strong> <span className="text-slate-400 font-normal">VARCHAR [PK]</span></li>
                <li>• <strong>name</strong> <span className="text-slate-400 font-bold">[UQ]</span></li>
                <li>• <strong>room_number</strong></li>
                <li>• <strong>class_teacher</strong></li>
              </ul>
            </div>

            {/* Indicator link */}
            <div className="flex items-center text-slate-400 font-mono font-bold text-lg select-none">
              1 ---------- &infin;
            </div>

            {/* Table: students */}
            <div className="w-56 bg-white rounded-lg border-2 border-indigo-600 p-3 shadow-xs text-left">
              <div className="bg-indigo-600 text-white p-1.5 rounded font-mono font-bold text-[10px] uppercase text-center mb-2">
                Table: students
              </div>
              <ul className="space-y-1 font-mono text-[10px]">
                <li>🔑 <strong>id</strong> <span className="text-indigo-600">[PK]</span></li>
                <li>• <strong>admission_no</strong> <span className="text-slate-400">[UQ]</span></li>
                <li>• <strong>name</strong></li>
                <li>🔗 <strong>stream_id</strong> <span className="text-indigo-600 font-bold">[FK]</span></li>
                <li>• <strong>dob</strong> / <strong>gender</strong></li>
                <li>• <strong>status</strong></li>
              </ul>
            </div>

            {/* Indicator link */}
            <div className="flex items-center text-slate-400 font-mono font-bold text-lg select-none">
              1 ---------- &infin;
            </div>

            {/* Table: scores */}
            <div className="w-60 bg-white rounded-lg border-2 border-slate-850 p-3 shadow-xs text-left">
              <div className="bg-slate-900 text-white p-1.5 rounded font-mono font-bold text-[10px] uppercase text-center mb-2">
                Table: scores (Composite PK)
              </div>
              <ul className="space-y-1 font-mono text-[10px]">
                <li>🔑🔗 <strong>id</strong> <span className="text-slate-400">[PK]</span></li>
                <li>🔗 <strong>student_id</strong> <span className="text-indigo-600 font-bold">[FK]</span></li>
                <li>🔗 <strong>subject_id</strong> <span className="text-amber-600 font-bold">[FK]</span></li>
                <li>• <strong>continuous_assessment</strong></li>
                <li>• <strong>exam_score</strong></li>
                <li>🔥 <strong>total</strong> <span className="text-teal-600">[COMPUTED]</span></li>
              </ul>
            </div>

            {/* Row separator */}
            <div className="w-full h-1 my-2 border-t border-dashed border-slate-200"></div>

            {/* Table: subjects */}
            <div className="w-52 bg-white rounded-lg border-2 border-slate-850 p-3 shadow-xs text-left">
              <div className="bg-amber-600 text-white p-1.5 rounded font-mono font-bold text-[10px] uppercase text-center mb-2">
                Table: subjects
              </div>
              <ul className="space-y-1 font-mono text-[10px]">
                <li>🔑 <strong>id</strong> <span className="text-slate-400">[PK]</span></li>
                <li>• <strong>code</strong> <span className="text-slate-400 font-bold">[UQ]</span></li>
                <li>• <strong>name</strong></li>
                <li>• <strong>department</strong></li>
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
