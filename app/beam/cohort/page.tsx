/**
 * /beam/cohort — embeddable cohort roles page
 *
 * This route lives on readyaimgo.biz/beam/cohort and can be
 * embedded via iframe on transportation.beamthinktank.space/cohort
 * until the BEAM Transportation site has its own deployment of
 * the CohortRolesPage component.
 *
 * To use as iframe on BEAM:
 *   <iframe src="https://www.readyaimgo.biz/beam/cohort"
 *           style="width:100%;min-height:100vh;border:none" />
 */
import { CohortRolesPage } from '@/components/beam/cohort-roles-page'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join a Cohort | BEAM Transportation',
  description:
    'Browse open roles in the BEAM Transportation cohort program. Earn while you learn — maintain real vehicles for ReadyAimGo clients in Milwaukee, Chicago, Atlanta, Orlando, and Madison.',
}

export default function BeamCohortPage() {
  return <CohortRolesPage />
}
