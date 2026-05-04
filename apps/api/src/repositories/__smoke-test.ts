import 'dotenv/config'
import {
  prisma,
  UserRepository,
  WorkspaceRepository,
  ProjectRepository,
  TaskRepository,
} from './index'

const userRepository = new UserRepository()
const workspaceRepository = new WorkspaceRepository()
const projectRepository = new ProjectRepository()
const taskRepository = new TaskRepository()

async function main(): Promise<void> {
  const acme = await prisma.workspace.findFirst({ where: { slug: 'acme' } })
  if (!acme) throw new Error('Acme workspace not found — run seed first')

  // a. Find Alice by email — assert not null and no passwordHash in public record
  const aliceAuth = await userRepository.findByEmail('alice@flowdesk.dev')
  if (!aliceAuth) throw new Error('Alice not found by email')
  const alice = await userRepository.findById(aliceAuth.id)
  if (!alice) throw new Error('Alice findById returned null')
  if ('passwordHash' in (alice as Record<string, unknown>)) {
    throw new Error('alice record exposes passwordHash')
  }
  console.log('✔ Alice found by email — passwordHash not exposed')

  // b. Find all workspaces for Alice — assert 1 workspace (Acme) with role OWNER
  const aliceWorkspaces = await workspaceRepository.findByMember(alice.id)
  if (aliceWorkspaces.length !== 1) {
    throw new Error(`Expected 1 workspace for Alice, got ${aliceWorkspaces.length}`)
  }
  const aliceWorkspace = aliceWorkspaces[0]!
  if (aliceWorkspace.slug !== 'acme') {
    throw new Error(`Expected acme workspace, got ${aliceWorkspace.slug}`)
  }
  const aliceMember = aliceWorkspace.members[0]!
  if (aliceMember.role !== 'OWNER') {
    throw new Error(`Expected OWNER role, got ${aliceMember.role}`)
  }
  console.log('✔ Alice has 1 workspace (Acme) with role OWNER')

  // c. Find all projects in Acme workspace — assert 3 projects
  const { projects, total: projectTotal } = await projectRepository.findByWorkspace(acme.id, {
    limit: 100,
  })
  if (projectTotal !== 3) throw new Error(`Expected 3 projects in Acme, got ${projectTotal}`)
  console.log('✔ Acme workspace has 3 projects')

  // d. Find all tasks in Website Redesign project — assert 3 tasks
  const websiteRedesign = projects.find((p) => p.slug === 'website-redesign')
  if (!websiteRedesign) throw new Error('Website Redesign project not found')
  const { total: taskTotal } = await taskRepository.findByProject(websiteRedesign.id, {
    limit: 100,
  })
  if (taskTotal !== 3) throw new Error(`Expected 3 tasks in Website Redesign, got ${taskTotal}`)
  console.log('✔ Website Redesign project has 3 tasks')

  // e. Find tasks assigned to Alice — assert result is an array (may be empty)
  const aliceTasks = await taskRepository.findByAssignee(alice.id, acme.id)
  if (!Array.isArray(aliceTasks)) throw new Error('findByAssignee did not return an array')
  console.log('✔ findByAssignee returns an array (may be empty)')

  console.log('\n✅ All smoke tests passed')
}

main().catch(console.error).finally(() => prisma.$disconnect())
