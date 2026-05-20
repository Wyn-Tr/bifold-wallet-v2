// Dev-only gallery: renders every registered card design with mock data so
// implementers can visually QA the layouts without going through an issuer.
// Reachable from Settings → Developer → "Card Design Gallery".

import React, { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DC_PALETTE } from './tokens'
import { DCCredentialCard, CredentialField } from './layouts'
import { DCTopBar } from './primitives'
import { DESIGN_REGISTRY } from './registry'

/**
 * Mock attribute snapshots per design id — matches the demo credentials
 * exposed by the ESSI Studio backend. Pure UI fixture, no network.
 */
const FIXTURES: Record<string, { holder: string; title: string; subtitle: string; fields: CredentialField[]; footer?: string }> = {
  StudentID: {
    title: 'Student ID',
    subtitle: 'Digital University',
    holder: 'Alice Johnson',
    fields: [
      { label: 'Student Id', value: 'S1234567890' },
      { label: 'University', value: 'Digital University' },
      { label: 'Program', value: 'Computer Science' },
      { label: 'Enrollment Year', value: '2023' },
    ],
  },
  ProfessionalLicense: {
    title: 'Professional License',
    subtitle: 'State Bar Association',
    holder: 'Joyce Smith',
    fields: [
      { label: 'License Number', value: 'L-987654321' },
      { label: 'Profession', value: 'Lawyer' },
    ],
    footer: 'Issuing Authority · State Bar Association',
  },
  EmployeeBadge: {
    title: 'Employee Badge',
    subtitle: 'Tech Corp',
    holder: 'Bob Williams',
    fields: [
      { label: 'Employee Id', value: 'E-554433' },
      { label: 'Job Title', value: 'Senior Developer' },
      { label: 'Department', value: 'Engineering' },
      { label: 'Company', value: 'Tech Corp' },
    ],
  },
  HealthInsurance: {
    title: 'Health Insurance',
    subtitle: 'Global Care',
    holder: 'Charlie Brown',
    fields: [
      { label: 'Member Id', value: 'M-11223344' },
      { label: 'Plan Name', value: 'Premium Health' },
      { label: 'Insurer', value: 'Global Care' },
      { label: 'Group Number', value: 'G-998877' },
    ],
  },
  LoyaltyMembership: {
    title: 'SkyHigh Rewards',
    subtitle: 'SkyHigh Airlines',
    holder: 'Diana Prince',
    fields: [
      { label: 'Member Id', value: 'LM-776655' },
      { label: 'Tier', value: 'Gold' },
      { label: 'Points', value: '15400' },
    ],
  },
  AgeVerification: {
    title: 'Age Verification',
    subtitle: 'Trusted Verifier',
    holder: 'Eve Adams',
    fields: [
      { label: 'Nationality', value: 'US' },
    ],
  },
  Diploma: {
    title: 'Bachelor of Science',
    subtitle: 'Digital University',
    holder: 'Alice Johnson',
    fields: [
      { label: 'Achievement Name', value: 'B.S. Computer Science' },
      { label: 'Student Id', value: 'STU-2020-4451' },
    ],
  },
  AcademicEndorsement: {
    title: 'Faculty Endorsement',
    subtitle: 'Faculty Review Board',
    holder: 'Prof. Reviewer',
    fields: [
      { label: 'Endorser Name', value: 'Prof. Reviewer' },
    ],
  },
  AcademicExcellence: {
    title: "Dean's List",
    subtitle: 'Digital University',
    holder: 'Alice Johnson',
    fields: [],
  },
  SkillsCertification: {
    title: 'Cloud Computing Specialist',
    subtitle: 'CloudCert',
    holder: 'Bob Williams',
    fields: [],
  },
  CourseCompletion: {
    title: 'Intro to Web Dev',
    subtitle: 'OpenLearn',
    holder: 'Charlie Brown',
    fields: [],
  },
  AlumniCredential: {
    title: 'Alumni Credential',
    subtitle: 'Digital University',
    holder: 'Alice Johnson',
    fields: [
      { label: 'Alma Mater', value: 'Digital University' },
      { label: 'Degree', value: 'B.S.' },
      { label: 'Major', value: 'Computer Science' },
      { label: 'Gpa', value: '3.85' },
    ],
  },
  VolunteerCertificate: {
    title: 'Volunteer Certificate',
    subtitle: 'Open Source Foundation',
    holder: 'Bob Williams',
    fields: [
      { label: 'Organization', value: 'Open Source Foundation' },
      { label: 'Role', value: 'Maintainer' },
      { label: 'Hours Contributed', value: '120' },
    ],
  },
  EventTicket: {
    title: 'Identity Summit 2026',
    subtitle: 'Berlin Conference Center',
    holder: 'Alice Johnson',
    fields: [
      { label: 'Ticket Id', value: 'IDS26-104269' },
      { label: 'Event Name', value: 'Identity Summit' },
      { label: 'Venue', value: 'Berlin' },
      { label: 'Seat', value: 'GA-1042' },
    ],
  },
  ResearchAttestation: {
    title: 'Research Attestation',
    subtitle: 'Independent Research Lab',
    holder: 'Dr. Chen Liu',
    fields: [
      { label: 'Project', value: 'VC Field Study' },
      { label: 'Institution', value: 'Indep. Research Lab' },
      { label: 'Role', value: 'Principal Investigator' },
    ],
  },
  mDL: {
    title: "Driver's License",
    subtitle: 'DMV — United States',
    holder: 'Alice Johnson',
    fields: [
      { label: 'Document Number', value: 'DL-1234567' },
      { label: 'Driving Privileges', value: 'B' },
      { label: 'Birth Date', value: 'July 15, 1990' },
      { label: 'Issuing Country', value: 'US' },
    ],
    footer: 'Issuing Authority · Department of Motor Vehicles',
  },
}

export const DesignerCardGallery: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const entries = useMemo(() => DESIGN_REGISTRY, [])
  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <DCTopBar title="Card Design Gallery" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>
          Every registered card design with mock data. Used for visual QA — not reachable to end users.
        </Text>
        {entries.map((entry) => {
          const fixture = FIXTURES[entry.id] ?? {
            title: entry.id,
            subtitle: 'Issuer',
            holder: 'Sample Holder',
            fields: [{ label: 'Status', value: 'Active' }],
          }
          return (
            <View key={entry.id} style={styles.section}>
              <Text style={styles.label}>{entry.id}</Text>
              <DCCredentialCard
                design={entry.design}
                title={fixture.title}
                subtitle={fixture.subtitle}
                holder={fixture.holder}
                fields={fixture.fields}
                footer={fixture.footer}
              />
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DC_PALETTE.bg },
  scroll: { padding: 18, paddingBottom: 64 },
  intro: { color: DC_PALETTE.muted, fontSize: 13, marginBottom: 18, lineHeight: 18 },
  section: { marginBottom: 28 },
  label: {
    color: DC_PALETTE.subMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
})

export default DesignerCardGallery
