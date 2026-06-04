/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stream, Student, Subject, Score, GradeBoundary, StudentResultSummary } from '../types';

// Default Grading Boundaries
export const DEFAULT_GRADE_BOUNDARIES: GradeBoundary[] = [
  { grade: 'A', min: 80, max: 100, remark: 'Excellent' },
  { grade: 'B', min: 70, max: 79, remark: 'Very Good' },
  { grade: 'C', min: 60, max: 69, remark: 'Good' },
  { grade: 'D', min: 50, max: 59, remark: 'Pass' },
  { grade: 'E', min: 40, max: 49, remark: 'Fair' },
  { grade: 'F', min: 0, max: 39, remark: 'Fail' }
];

// Initial Streams
export const INITIAL_STREAMS: Stream[] = [
  { id: 'str_1', name: 'Form 1A', roomNumber: 'Room 101', classTeacher: 'Sarah Jenkins' },
  { id: 'str_2', name: 'Form 1B', roomNumber: 'Room 102', classTeacher: 'David Alao' },
  { id: 'str_3', name: 'Form 1C', roomNumber: 'Room 103', classTeacher: 'Grace Muli' },
  { id: 'str_4', name: 'Form 2A', roomNumber: 'Room 201', classTeacher: 'Marcus Stone' }
];

// Initial Subjects
export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'subj_math', code: 'MATH101', name: 'Mathematics', department: 'Sciences', assignedStreamIds: ['str_1', 'str_2', 'str_3', 'str_4'] },
  { id: 'subj_eng', code: 'ENG102', name: 'English Language', department: 'Languages', assignedStreamIds: ['str_1', 'str_2', 'str_3', 'str_4'] },
  { id: 'subj_sci', code: 'SCI103', name: 'Integrated Science', department: 'Sciences', assignedStreamIds: ['str_1', 'str_2', 'str_3'] },
  { id: 'subj_hist', code: 'HIS104', name: 'World History', department: 'Humanities', assignedStreamIds: ['str_1', 'str_3', 'str_4'] },
  { id: 'subj_comp', code: 'COMP105', name: 'Computer Studies', department: 'Sciences', assignedStreamIds: ['str_1', 'str_2', 'str_4'] }
];

// Initial Students
export const INITIAL_STUDENTS: Student[] = [
  // Form 1A
  { id: 'std_1', admissionNo: 'IXA-2026-001', name: 'Amara Okafor', streamId: 'str_1', dob: '2013-05-14', gender: 'Female', status: 'Active', parentName: 'Chinedu Okafor', parentPhone: '+234 803 111 2222' },
  { id: 'std_2', admissionNo: 'IXA-2026-002', name: 'Liam Carter', streamId: 'str_1', dob: '2013-08-22', gender: 'Male', status: 'Active', parentName: 'Helen Carter', parentPhone: '+1 555 4321' },
  { id: 'std_3', admissionNo: 'IXA-2026-003', name: 'Chloe Dubois', streamId: 'str_1', dob: '2013-02-10', gender: 'Female', status: 'Active', parentName: 'Jean Dubois', parentPhone: '+33 612 3456' },
  { id: 'std_4', admissionNo: 'IXA-2026-004', name: 'Kenji Sato', streamId: 'str_1', dob: '2013-11-05', gender: 'Male', status: 'Active', parentName: 'Yoshi Sato', parentPhone: '+81 90 9876' },
  
  // Form 1B
  { id: 'std_5', admissionNo: 'IXA-2026-005', name: 'Fatima Diop', streamId: 'str_2', dob: '2013-04-19', gender: 'Female', status: 'Active', parentName: 'Ibrahim Diop', parentPhone: '+221 77 123 4567' },
  { id: 'std_6', admissionNo: 'IXA-2026-006', name: 'Ethan Hunt', streamId: 'str_2', dob: '2013-09-01', gender: 'Male', status: 'Active', parentName: 'Owen Hunt', parentPhone: '+44 7700 900077' },
  { id: 'std_7', admissionNo: 'IXA-2026-007', name: 'Aaliyah Muhammed', streamId: 'str_2', dob: '2013-12-15', gender: 'Female', status: 'Active', parentName: 'Tariq Muhammed', parentPhone: '+971 50 123 4567' },
  
  // Form 1C
  { id: 'std_8', admissionNo: 'IXA-2026-008', name: 'Mateo Silva', streamId: 'str_3', dob: '2013-07-30', gender: 'Male', status: 'Active', parentName: 'Sophia Silva', parentPhone: '+55 11 99999-8888' },
  { id: 'std_9', admissionNo: 'IXA-2026-009', name: 'Nisha Patel', streamId: 'str_3', dob: '2013-10-12', gender: 'Female', status: 'Active', parentName: 'Aarav Patel', parentPhone: '+91 98765 43210' },
  { id: 'std_10', admissionNo: 'IXA-2026-010', name: 'Yusuf Chen', streamId: 'str_3', dob: '2013-01-25', gender: 'Male', status: 'Active', parentName: 'Min Chen', parentPhone: '+86 138 0000 0000' },

  // Form 2A
  { id: 'std_11', admissionNo: 'IXA-2025-050', name: 'Sophia Loren', streamId: 'str_4', dob: '2012-03-05', gender: 'Female', status: 'Active', parentName: 'Roberto Loren', parentPhone: '+39 02 123456' },
  { id: 'std_12', admissionNo: 'IXA-2025-055', name: 'Zayn Malik', streamId: 'str_4', dob: '2012-01-12', gender: 'Male', status: 'Active', parentName: 'Yaser Malik', parentPhone: '+44 7700 900012' },
  { id: 'std_13', admissionNo: 'IXA-2025-060', name: 'Elena Gilbert', streamId: 'str_4', dob: '2012-06-22', gender: 'Female', status: 'Suspended', parentName: 'Grayson Gilbert', parentPhone: '+1 555 7890' }
];

// Helper to lookup grade based on score and boundaries
export function calculateGradeAndRemark(score: number, boundaries: GradeBoundary[]) {
  const boundary = boundaries.find(b => score >= b.min && score <= b.max);
  if (boundary) {
    return { grade: boundary.grade, remark: boundary.remark };
  }
  // fallback
  if (score >= 80) return { grade: 'A', remark: 'Excellent' };
  if (score >= 70) return { grade: 'B', remark: 'Very Good' };
  if (score >= 60) return { grade: 'C', remark: 'Good' };
  if (score >= 50) return { grade: 'D', remark: 'Pass' };
  if (score >= 40) return { grade: 'E', remark: 'Fair' };
  return { grade: 'F', remark: 'Fail' };
}

// Initial pre-filled scores to make system instantly usable
export const INITIAL_SCORES: Score[] = [];

// Populate realistic scores for Form 1A
const form1AStudents = ['std_1', 'std_2', 'std_3', 'std_4'];
const form1ASubjects = ['subj_math', 'subj_eng', 'subj_sci', 'subj_hist', 'subj_comp'];

// Distribution seeds for some variance
const scoresSeed: Record<string, Record<string, [number, number]>> = {
  std_1: { subj_math: [26, 62], subj_eng: [28, 65], subj_sci: [25, 58], subj_hist: [24, 61], subj_comp: [29, 68] }, // A/B student
  std_2: { subj_math: [18, 45], subj_eng: [22, 53], subj_sci: [19, 42], subj_hist: [20, 48], subj_comp: [15, 38] }, // C/D student
  std_3: { subj_math: [28, 67], subj_eng: [29, 68], subj_sci: [27, 63], subj_hist: [26, 60], subj_comp: [28, 65] }, // High A student
  std_4: { subj_math: [22, 55], subj_eng: [20, 50], subj_sci: [21, 52], subj_hist: [22, 49], subj_comp: [24, 56] }  // B/C student
};

form1AStudents.forEach(stId => {
  form1ASubjects.forEach(subId => {
    const seed = scoresSeed[stId]?.[subId] || [20, 50];
    const ca = seed[0];
    const exam = seed[1];
    const total = ca + exam;
    const { grade } = calculateGradeAndRemark(total, DEFAULT_GRADE_BOUNDARIES);
    INITIAL_SCORES.push({
      id: `${stId}_${subId}`,
      studentId: stId,
      subjectId: subId,
      continuousAssessment: ca,
      exam: exam,
      total: total,
      grade: grade,
      updatedAt: '2026-06-03T14:30:00Z'
    });
  });
});

// Mock scores for Form 1B (std_5, std_6, std_7)
const form1BStudents = ['std_5', 'std_6', 'std_7'];
const form1BSubjects = ['subj_math', 'subj_eng', 'subj_sci', 'subj_comp'];

const scoresSeedB: Record<string, Record<string, [number, number]>> = {
  std_5: { subj_math: [25, 60], subj_eng: [27, 62], subj_sci: [24, 58], subj_comp: [26, 63] },
  std_6: { subj_math: [15, 30], subj_eng: [18, 42], subj_sci: [14, 35], subj_comp: [12, 32] }, // Struggling
  std_7: { subj_math: [22, 51], subj_eng: [24, 55], subj_sci: [25, 59], subj_comp: [20, 48] }
};

form1BStudents.forEach(stId => {
  form1BSubjects.forEach(subId => {
    const seed = scoresSeedB[stId]?.[subId] || [18, 45];
    const ca = seed[0];
    const exam = seed[1];
    const total = ca + exam;
    const { grade } = calculateGradeAndRemark(total, DEFAULT_GRADE_BOUNDARIES);
    INITIAL_SCORES.push({
      id: `${stId}_${subId}`,
      studentId: stId,
      subjectId: subId,
      continuousAssessment: ca,
      exam: exam,
      total: total,
      grade: grade,
      updatedAt: '2026-06-03T15:00:00Z'
    });
  });
});

// Real-time Calculations Processor Engine
// This is the core engine to calculate positions, rankings, averages, and grades.
export function processResults(
  students: Student[],
  streams: Stream[],
  subjects: Subject[],
  scores: Score[],
  gradeBoundaries: GradeBoundary[]
): StudentResultSummary[] {
  // Filter only active/suspended students to calculate grades, transfers might be omitted
  const activeStudents = students.filter(st => st.status !== 'Transferred');
  
  // Calculate scores mapped by student and subject
  const scoresMap = new Map<string, Score>();
  scores.forEach(s => scoresMap.set(`${s.studentId}_${s.subjectId}`, s));

  // Determine subject performance per student
  // We need to calculate Subject Positions. So first compile list of all totals per subject for ranking.
  // subjectTotalsStore: { [subjectId]: [{ studentId, total }] }
  const subjectTotalsStore: Record<string, { studentId: string; total: number }[]> = {};
  
  activeStudents.forEach(student => {
    // Collect which subjects are offered in this student's stream
    const associatedSubjects = subjects.filter(sub => sub.assignedStreamIds.includes(student.streamId));
    
    associatedSubjects.forEach(subject => {
      const scoreKey = `${student.id}_${subject.id}`;
      const score = scoresMap.get(scoreKey);
      const total = score ? score.total : 0; // if unrecorded, defaults to 0
      
      if (!subjectTotalsStore[subject.id]) {
        subjectTotalsStore[subject.id] = [];
      }
      subjectTotalsStore[subject.id].push({ studentId: student.id, total });
    });
  });

  // Sort subject totals descending to establish subject rankings
  // Store mappings of subjectId -> studentId -> rank
  const subjectRanks: Record<string, Record<string, number>> = {};
  Object.keys(subjectTotalsStore).forEach(subjId => {
    // Sort descending
    const sorted = [...subjectTotalsStore[subjId]].sort((a, b) => b.total - a.total);
    
    subjectRanks[subjId] = {};
    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].total < sorted[i - 1].total) {
        currentRank = i + 1; // standard dense/dense-ranking gap method
      }
      subjectRanks[subjId][sorted[i].studentId] = currentRank;
    }
  });

  // Build standard summary records for each active student
  const summaries: StudentResultSummary[] = activeStudents.map(student => {
    const stream = streams.find(st => st.id === student.streamId);
    const streamName = stream ? stream.name : 'Unknown';
    
    const associatedSubjects = subjects.filter(sub => sub.assignedStreamIds.includes(student.streamId));
    
    let totalMarks = 0;
    let gradedSubjectsCount = 0;
    const subjectResults: StudentResultSummary['subjectResults'] = {};

    associatedSubjects.forEach(subject => {
      const scoreKey = `${student.id}_${subject.id}`;
      const score = scoresMap.get(scoreKey);
      
      const ca = score ? score.continuousAssessment : 0;
      const exam = score ? score.exam : 0;
      const total = score ? score.total : 0;
      const { grade, remark } = calculateGradeAndRemark(total, gradeBoundaries);
      
      const totalStudentsInSubject = subjectTotalsStore[subject.id]?.length || 0;
      const subjectPosition = subjectRanks[subject.id]?.[student.id] || 1;

      subjectResults[subject.id] = {
        subjectName: subject.name,
        subjectCode: subject.code,
        ca,
        exam,
        total,
        grade,
        remark,
        subjectPosition,
        totalStudentsInSubject
      };

      totalMarks += total;
      gradedSubjectsCount++;
    });

    const averageScore = gradedSubjectsCount > 0 ? Number((totalMarks / gradedSubjectsCount).toFixed(2)) : 0;
    const { grade: overallGrade, remark: overallRemark } = calculateGradeAndRemark(averageScore, gradeBoundaries);

    return {
      studentId: student.id,
      studentName: student.name,
      admissionNo: student.admissionNo,
      streamId: student.streamId,
      streamName,
      subjectResults,
      totalMarks,
      averageScore,
      overallGrade,
      overallRemark,
      classPosition: 1, // Will compute next based on streams
      totalStudentsInClass: 0 // Will compute next
    };
  });

  // Calculate stream-wise positions & totals
  // Group summaries by streamId
  const streamGroups: Record<string, StudentResultSummary[]> = {};
  summaries.forEach(s => {
    if (!streamGroups[s.streamId]) {
      streamGroups[s.streamId] = [];
    }
    streamGroups[s.streamId].push(s);
  });

  // For each stream, rank students by averageScore descending
  Object.keys(streamGroups).forEach(streamId => {
    const group = streamGroups[streamId];
    // Sort by averageScore descending, then by totalMarks descending as a tie breaker
    group.sort((a, b) => b.averageScore - a.averageScore || b.totalMarks - a.totalMarks);
    
    let currentRank = 1;
    for (let i = 0; i < group.length; i++) {
      if (i > 0 && group[i].averageScore < group[i - 1].averageScore) {
        currentRank = i + 1;
      }
      group[i].classPosition = currentRank;
      group[i].totalStudentsInClass = group.length;
    }
  });

  return summaries;
}
