/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Stream {
  id: string;
  name: string;
  roomNumber: string;
  classTeacher: string;
}

export interface Student {
  id: string;
  admissionNo: string;
  name: string;
  streamId: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  status: 'Active' | 'Suspended' | 'Transferred';
  parentName: string;
  parentPhone: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  department: string;
  assignedStreamIds: string[]; // Map subjects to class streams
}

export interface Score {
  id: string; // "studentId_subjectId"
  studentId: string;
  subjectId: string;
  continuousAssessment: number; // Max 30
  exam: number; // Max 70
  total: number; // Max 100
  grade: string;
  updatedAt: string;
}

export interface GradeBoundary {
  grade: string;
  min: number;
  max: number;
  remark: string;
}

// Result structure per student for processing
export interface StudentResultSummary {
  studentId: string;
  studentName: string;
  admissionNo: string;
  streamId: string;
  streamName: string;
  subjectResults: {
    [subjectId: string]: {
      subjectName: string;
      subjectCode: string;
      ca: number;
      exam: number;
      total: number;
      grade: string;
      remark: string;
      subjectPosition: number;
      totalStudentsInSubject: number;
    };
  };
  totalMarks: number;
  averageScore: number;
  overallGrade: string;
  overallRemark: string;
  classPosition: number;
  totalStudentsInClass: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
}
