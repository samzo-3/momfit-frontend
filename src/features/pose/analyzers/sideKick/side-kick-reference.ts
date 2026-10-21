import reference from './reference/sidekick_reference_candidates_v0.1.0.json'

export type SideKickSide = 'LEFT' | 'RIGHT'

export type SideKickPeakMetrics = {
  knee_angle_deg: number
  ankle_away_magnitude_ratio: number
  torso_lateral_lean_deg: number
  shoulder_screen_tilt_deg: number
  pelvis_screen_tilt_deg: number
}

type ReferenceMetric = {
  target_candidate_median: number
  samples: number[]
  unit: string
}

type PeakReference = Record<keyof SideKickPeakMetrics, ReferenceMetric>

const FRONT_SETS = [1, 2, 3, 4, 5]

export function validateSideKickReference(): boolean {
  return (
    reference.schema_version === 1 &&
    reference.exercise_code === 'SIDE_KICK_SIDE_BEND' &&
    reference.reference_source.camera_view === 'FRONT' &&
    JSON.stringify(reference.reference_source.sets_used) ===
      JSON.stringify(FRONT_SETS) &&
    reference.review_status === 'EXPERIMENTAL_NOT_APPROVED'
  )
}

export function getSideKickPeakReference(
  side: SideKickSide,
): SideKickPeakMetrics {
  if (!validateSideKickReference()) {
    throw new Error('INVALID_SIDE_KICK_REFERENCE')
  }

  const key = `${side}_LIFT_PEAK` as 'LEFT_LIFT_PEAK' | 'RIGHT_LIFT_PEAK'

  const metrics: PeakReference = reference.reference_metrics[key]

  return {
    knee_angle_deg: metrics.knee_angle_deg.target_candidate_median,
    ankle_away_magnitude_ratio:
      metrics.ankle_away_magnitude_ratio.target_candidate_median,
    torso_lateral_lean_deg:
      metrics.torso_lateral_lean_deg.target_candidate_median,
    shoulder_screen_tilt_deg:
      metrics.shoulder_screen_tilt_deg.target_candidate_median,
    pelvis_screen_tilt_deg:
      metrics.pelvis_screen_tilt_deg.target_candidate_median,
  }
}

export function getSideKickReferenceVersion(): string {
  return reference.criteria_version
}

export function isSideKickReferenceApproved(): boolean {
  // 아직 전문가의 자세 기준 및 허용 오차 검토가 끝나지 않았다.
  return false
}
