-- ═══════════════════════════════════════════════════════════════════════
-- MATERIALS STORAGE + CONTENT-MANAGEMENT RLS (materials/questions UPDATE)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Phase 1-2 of the complete mock-data-elimination migration.
--
-- Storage path convention: {school_id}/{material_id}.{ext} - lets storage
-- RLS check school membership directly from the path, while the
-- authoritative class-level scoping stays enforced on the `materials`
-- table row itself (this is defense-in-depth, not the only check).
--
-- Safe to run once against the live project: IF NOT EXISTS / DO blocks /
-- DROP POLICY IF EXISTS throughout.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. materials.status (archive, never hard-delete)
-- ═══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  BEGIN
    ALTER TABLE materials ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'archived'));
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. materials UPDATE policy (archive action only - no DELETE policy
--    exists or should ever exist: questions.source_material_id
--    REFERENCES materials(id) with no ON DELETE clause, so a real
--    DELETE would 23503-error the moment any question was generated
--    from it)
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Teachers can update their own materials" ON materials;
CREATE POLICY "Teachers can update their own materials"
  ON materials FOR UPDATE
  USING (creator_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (creator_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════
-- 3. questions UPDATE policy (archive/retire only - never DELETE:
--    assessment_questions.question_id cascades through to
--    question_attempts/student_wrong_answers, so hard-deleting a
--    question would silently destroy historical attempt records)
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Teachers can update their own questions" ON questions;
CREATE POLICY "Teachers can update their own questions"
  ON questions FOR UPDATE
  USING (creator_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (creator_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Storage bucket + RLS for materials
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', false)
ON CONFLICT (id) DO NOTHING;

-- Upload: path's school_id segment must be one of the teacher's assigned
-- schools. Defense-in-depth check - the authoritative class-level scope
-- is the `materials` table row's own INSERT policy.
DROP POLICY IF EXISTS "Teachers can upload materials for their schools" ON storage.objects;
CREATE POLICY "Teachers can upload materials for their schools"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'materials'
    AND (storage.foldername(name))[1] IN (
      SELECT school_id::text FROM teacher_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

-- Download: mirrors the real visibility rules already enforced on the
-- `materials` table itself (student in-class, teacher assigned to the
-- class, school admin, or the uploading teacher).
DROP POLICY IF EXISTS "Materials storage follows materials table visibility" ON storage.objects;
CREATE POLICY "Materials storage follows materials table visibility"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'materials'
    AND EXISTS (
      SELECT 1 FROM materials m
      WHERE m.file_url = storage.objects.name
      AND (
        (
          m.school_id = (
            SELECT school_id FROM students
            WHERE user_profile_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
            AND status = 'ACTIVE'
          )
          AND (
            m.class_id IS NULL
            OR m.class_id = (
              SELECT class_id FROM students
              WHERE user_profile_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
              AND status = 'ACTIVE'
            )
          )
        )
        OR m.class_id IN (
          SELECT class_id FROM teacher_assignments
          WHERE teacher_id IN (
            SELECT id FROM teachers WHERE user_profile_id = (
              SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
            )
          )
        )
        OR m.school_id IN (SELECT get_my_school_admin_school_ids())
        OR m.creator_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
      )
    )
  );

-- No storage UPDATE/DELETE policy - archiving is a `materials.status`
-- update only, the underlying file is never removed from Storage.
