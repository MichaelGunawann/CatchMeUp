import { supabase } from "@/lib/supabase/client";
import { SchoolAdmin, Teacher, Student, Parent } from "@/lib/supabase/types";
import { getCurrentProfile } from "./session";

/**
 * Get the current user's School Admin record, if they are a School Admin.
 *
 * NOTE: a School Admin may manage more than one school
 * (school_admins has UNIQUE(user_profile_id, school_id), not
 * UNIQUE(user_profile_id)). This helper uses `.single()` and will return
 * null for a genuinely multi-school admin. Use
 * getCurrentSchoolAdminSchools() when the caller needs every school the
 * admin manages.
 */
export async function getCurrentSchoolAdmin(): Promise<SchoolAdmin | null> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "SCHOOL_ADMIN") {
    return null;
  }

  const { data, error } = await supabase
    .from("school_admins")
    .select("*")
    .eq("user_profile_id", profile.id)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get every school the current user administers, if they are a School Admin.
 * Correctly supports the multi-school-admin model (one admin, many schools).
 */
export async function getCurrentSchoolAdminSchools(): Promise<SchoolAdmin[]> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "SCHOOL_ADMIN") {
    return [];
  }

  const { data, error } = await supabase
    .from("school_admins")
    .select("*")
    .eq("user_profile_id", profile.id);

  if (error) return [];
  return data;
}

/**
 * Get the current user's Teacher record, if they are a Teacher
 */
export async function getCurrentTeacher(): Promise<Teacher | null> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "TEACHER") {
    return null;
  }

  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("user_profile_id", profile.id)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get the current user's Student record, if they are a Student
 */
export async function getCurrentStudent(): Promise<Student | null> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "STUDENT") {
    return null;
  }

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("user_profile_id", profile.id)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get the current user's Parent record, if they are a Parent
 */
export async function getCurrentParent(): Promise<Parent | null> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "PARENT") {
    return null;
  }

  const { data, error } = await supabase
    .from("parents")
    .select("*")
    .eq("user_profile_id", profile.id)
    .single();

  if (error) return null;
  return data;
}

/**
 * Verify that a teacher has an assignment for the given class and subject
 */
export async function verifyTeacherAssignment(
  teacherId: string,
  classId: string,
  subjectId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("teacher_assignments")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .single();

  if (error) return false;
  return !!data;
}

/**
 * Verify that a parent has a verified link to a student
 */
export async function verifyParentStudentLink(
  parentId: string,
  studentId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("parent_student_links")
    .select("id")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .eq("verified", true)
    .single();

  if (error) return false;
  return !!data;
}

/**
 * Get all students linked to a parent
 */
export async function getParentLinkedStudents(parentId: string) {
  const { data, error } = await supabase
    .from("parent_student_links")
    .select("students(*)")
    .eq("parent_id", parentId)
    .eq("verified", true);

  if (error) return [];
  return data.map((link) => link.students).filter(Boolean);
}
