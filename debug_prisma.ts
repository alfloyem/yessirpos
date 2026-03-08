import prisma from './server/utils/prisma'

async function test() {
  try {
    const keys = Object.keys(prisma)
    console.log('Prisma keys:', keys.filter(k => !k.startsWith('_')))
  } catch (e) {
    console.error(e)
  }
}

test()
