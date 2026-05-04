import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  PrismaClient,
  WorkspaceRole,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
} from '../src/generated/prisma'
import bcrypt from 'bcryptjs'
import { uuidv7 } from 'uuidv7'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main(): Promise<void> {
  // Wave 0 — clear projects and tasks (tasks first, projects cascade their members)
  await prisma.task.deleteMany({})
  await prisma.project.deleteMany({})
  console.log('Cleared tasks and projects')

  // Wave 1 — users (upsert by email; safe to rerun)
  const passwordHash = await bcrypt.hash('password123', 10)

  const [alice, bob, carol, dave] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@flowdesk.dev' },
      update: {},
      create: { id: uuidv7(), email: 'alice@flowdesk.dev', name: 'Alice Chen', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'bob@flowdesk.dev' },
      update: {},
      create: { id: uuidv7(), email: 'bob@flowdesk.dev', name: 'Bob Tanaka', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'carol@flowdesk.dev' },
      update: {},
      create: { id: uuidv7(), email: 'carol@flowdesk.dev', name: 'Carol Okonkwo', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'dave@flowdesk.dev' },
      update: {},
      create: { id: uuidv7(), email: 'dave@flowdesk.dev', name: 'Dave Singh', passwordHash },
    }),
  ])
  console.log(`Users created: ${[alice.email, bob.email, carol.email, dave.email].join(', ')}`)

  // Wave 2 — workspaces (upsert by slug; safe to rerun)
  const [acme, beta] = await Promise.all([
    prisma.workspace.upsert({
      where: { slug: 'acme' },
      update: {},
      create: { id: uuidv7(), name: 'Acme Corp', slug: 'acme' },
    }),
    prisma.workspace.upsert({
      where: { slug: 'beta' },
      update: {},
      create: { id: uuidv7(), name: 'Beta Labs', slug: 'beta' },
    }),
  ])
  console.log(`Workspaces created: ${[acme.slug, beta.slug].join(', ')}`)

  // Wave 3a — workspace members (upsert by compound unique; role is refreshed on update)
  await Promise.all([
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: acme.id, userId: alice.id } },
      update: { role: WorkspaceRole.OWNER },
      create: { id: uuidv7(), workspaceId: acme.id, userId: alice.id, role: WorkspaceRole.OWNER },
    }),
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: acme.id, userId: bob.id } },
      update: { role: WorkspaceRole.ADMIN },
      create: { id: uuidv7(), workspaceId: acme.id, userId: bob.id, role: WorkspaceRole.ADMIN },
    }),
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: acme.id, userId: carol.id } },
      update: { role: WorkspaceRole.MEMBER },
      create: { id: uuidv7(), workspaceId: acme.id, userId: carol.id, role: WorkspaceRole.MEMBER },
    }),
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: acme.id, userId: dave.id } },
      update: { role: WorkspaceRole.VIEWER },
      create: { id: uuidv7(), workspaceId: acme.id, userId: dave.id, role: WorkspaceRole.VIEWER },
    }),
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: beta.id, userId: bob.id } },
      update: { role: WorkspaceRole.OWNER },
      create: { id: uuidv7(), workspaceId: beta.id, userId: bob.id, role: WorkspaceRole.OWNER },
    }),
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: beta.id, userId: carol.id } },
      update: { role: WorkspaceRole.MEMBER },
      create: { id: uuidv7(), workspaceId: beta.id, userId: carol.id, role: WorkspaceRole.MEMBER },
    }),
  ])
  console.log('Workspace members created')

  // Wave 3b — projects (fresh each run; always created after deleteMany above)
  const [websiteRedesign, mobileApp, apiV2, infraUpgrade] = await Promise.all([
    prisma.project.create({
      data: {
        id: uuidv7(),
        workspaceId: acme.id,
        name: 'Website Redesign',
        slug: 'website-redesign',
        status: ProjectStatus.ACTIVE,
        createdById: alice.id,
      },
    }),
    prisma.project.create({
      data: {
        id: uuidv7(),
        workspaceId: acme.id,
        name: 'Mobile App',
        slug: 'mobile-app',
        status: ProjectStatus.ACTIVE,
        createdById: alice.id,
      },
    }),
    prisma.project.create({
      data: {
        id: uuidv7(),
        workspaceId: acme.id,
        name: 'API v2',
        slug: 'api-v2',
        status: ProjectStatus.PLANNING,
        createdById: alice.id,
      },
    }),
    prisma.project.create({
      data: {
        id: uuidv7(),
        workspaceId: beta.id,
        name: 'Infrastructure Upgrade',
        slug: 'infrastructure-upgrade',
        status: ProjectStatus.ACTIVE,
        createdById: bob.id,
      },
    }),
  ])
  console.log(
    `Projects created: ${[websiteRedesign.name, mobileApp.name, apiV2.name, infraUpgrade.name].join(', ')}`,
  )

  // Wave 4 — tasks (createMany for a single round-trip)
  const { count } = await prisma.task.createMany({
    data: [
      // Website Redesign — 3 tasks
      {
        id: uuidv7(),
        workspaceId: acme.id,
        projectId: websiteRedesign.id,
        title: 'Design homepage mockup',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        position: 1.0,
        createdById: alice.id,
      },
      {
        id: uuidv7(),
        workspaceId: acme.id,
        projectId: websiteRedesign.id,
        title: 'Implement responsive navigation',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        position: 2.0,
        createdById: bob.id,
      },
      {
        id: uuidv7(),
        workspaceId: acme.id,
        projectId: websiteRedesign.id,
        title: 'Write content for About page',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        position: 3.0,
        createdById: carol.id,
      },
      // Mobile App — 2 tasks
      {
        id: uuidv7(),
        workspaceId: acme.id,
        projectId: mobileApp.id,
        title: 'Set up React Native project scaffolding',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        position: 1.0,
        createdById: alice.id,
      },
      {
        id: uuidv7(),
        workspaceId: acme.id,
        projectId: mobileApp.id,
        title: 'Design onboarding screens',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        position: 2.0,
        createdById: carol.id,
      },
      // API v2 — 1 task
      {
        id: uuidv7(),
        workspaceId: acme.id,
        projectId: apiV2.id,
        title: 'Define OpenAPI specification',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        position: 1.0,
        createdById: alice.id,
      },
      // Infrastructure Upgrade — 2 tasks
      {
        id: uuidv7(),
        workspaceId: beta.id,
        projectId: infraUpgrade.id,
        title: 'Provision Kubernetes cluster',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.URGENT,
        position: 1.0,
        createdById: bob.id,
      },
      {
        id: uuidv7(),
        workspaceId: beta.id,
        projectId: infraUpgrade.id,
        title: 'Migrate CI pipelines to GitHub Actions',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        position: 2.0,
        createdById: bob.id,
      },
    ],
  })
  console.log(`Tasks created: ${count}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
