import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function slugify(text: string) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

async function main() {
  console.log('Starting seed...')

  const issueTags = [
    'Copyright / training data',
    'Privacy / data protection',
    'Defamation',
    'Employment / hiring',
    'Discrimination / bias',
    'Consumer protection',
    'Product liability',
    'Deepfakes / impersonation',
    'Fraud / deception',
    'Hallucinated citations / false authorities',
    'Automated decision-making',
    'Platform / content moderation',
    'Contract / licensing',
    'Competition / antitrust',
    'Evidence / admissibility of AI output'
  ]

  const legalAreas = [
    'Intellectual property',
    'Privacy law',
    'Employment law',
    'Consumer law',
    'Tort',
    'Contract',
    'Administrative law',
    'Anti-discrimination law',
    'Procedural law / legal ethics',
    'Constitutional / public law'
  ]

  // Seed Issues
  for (const name of issueTags) {
    await prisma.issue.upsert({
      where: { name },
      update: {},
      create: {
        name,
        slug: slugify(name),
      },
    })
  }
  console.log('Seeded Issues')

  // Seed Legal Areas
  for (const name of legalAreas) {
    await prisma.legalArea.upsert({
      where: { name },
      update: {},
      create: {
        name,
        slug: slugify(name),
      },
    })
  }
  console.log('Seeded Legal Areas')

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
