import expressAsyncHandler from 'express-async-handler'
import Selenium from './selenium'
import express from 'express'
import { Admin, PrismaClient } from '@prisma/client'
import { attach, detach, licenseGroups, organizations, products, User, users } from './adobe'
import { LicenseGroupId, OrganizationId, ProductId, Token, UserId } from './aliases'
import cron from 'node-cron'
import { loadConfig } from './config'
import { inspect } from 'util'
import { DynamicProxyList } from './proxy/DynamicProxyList'

const config = loadConfig()
console.log('Config', inspect(config, {
  depth: 42,
  colors: true,
  numericSeparator: true
}))

const selenium = new Selenium(
  config.seleniumServer,
  new DynamicProxyList(
    config.proxy.list,
    config.proxy.test.url,
    config.proxy.test.timeout
  )
)
const prisma = new PrismaClient()
const app = express().use(express.json())

type Selection = {
  token: Token,
  organizationId: OrganizationId,
  productId: ProductId,
  licenseGroupId: LicenseGroupId
}

const selectFreeProduct = async (tokens: Token[]): Promise<Selection | undefined> => {
  for (const token of tokens) {
    for (const organization of await organizations(token)) {
      console.log('Check organization', organization)
      for (const product of await products(token, organization.id)) {
        console.log('Check product', product)
        if (!product.actual) continue
        if (product.delegations >= product.maxDelegations) continue
        const licenseGroup = (await licenseGroups(token, organization.id, product.id))[0]
        console.log('Check license group', licenseGroup)
        if (!licenseGroup) continue
        return {
          token,
          organizationId: organization.id,
          productId: product.id,
          licenseGroupId: licenseGroup.id
        }
      }
    }
  }
  return undefined
}

const findUser = async (tokens: Token[], email: string): Promise<(Selection & { userId: UserId }) | undefined> => {
  for (const token of tokens) {
    for (const organization of await organizations(token)) {
      for (const product of await products(token, organization.id)) {
        for (const user of await users(token, organization.id, product.id)) {
          if (user.email !== email) continue
          const licenseGroup = (await licenseGroups(token, organization.id, product.id))[0]
          if (!licenseGroup) return undefined
          return {
            token,
            organizationId: organization.id,
            productId: product.id,
            licenseGroupId: licenseGroup.id,
            userId: user.id
          }
        }
      }
    }
  }
  return undefined
}

const persistentLogin = async (selenium: Selenium, email: string, password: string): Promise<Token> => {
  let tries = 3
  while (tries--) {
    try {
      return await selenium.login(email, password)
    } catch (e) {
      console.warn('Failed while try to login', email, e);
      continue
    }
  }
  throw new Error(`Failed to login ${email}`)
}

const updateAdminTokens = async (selenium: Selenium, prisma: PrismaClient): Promise<void> => {
  const maxOld = new Date()
  maxOld.setHours(maxOld.getHours() - 6)
  const admins = await prisma.admin.findMany({
    where: {
      deleted: false,
      AND: {
        updatedAt: { lte: maxOld }
      }
    }
  })
  for (const admin of admins) {
    await prisma.admin.update({
      where: { email: admin.email },
      data: { token: await persistentLogin(selenium, admin.email, admin.password) }
    })
  }
}

const collectUsers = async (admins: Admin[]): Promise<User[]> => {
  let allUsers: User[] = []
  for (const { token, email } of admins) {
    console.log('Collect users from panel', email)
    for (const organization of await organizations(token)) {
      for (const product of await products(token, organization.id)) {
        allUsers = [...allUsers, ...await users(token, organization.id, product.id)]
      }
    }
  }
  return allUsers
}

const collectDelegationsCount = async (tokens: Token[]) => {
  return (await Promise.all(
    tokens.map(async token => await Promise.all(
      (await organizations(token)).map(async organization => await Promise.all(
        (await products(token, organization.id)).map(async product => {
          console.log(`Organization ${organization.id} Product ${product.id} has ${product.maxDelegations - product.delegations} delegations`)
          return {
            free: product.maxDelegations - product.delegations,
            total: product.maxDelegations
          }
        })
      ))
    ))
  )).flat(3).reduce((a, b) => ({
    free: a.free + b.free,
    total: a.total + b.total
  }), { free: 0, total: 0 })
}

if (!config.placeCountNotification) {
  console.log('Start check free process disabled because config.placeCountNotification is undefined')
} else {
  const placeCountNotification = config.placeCountNotification
  console.log('Start check free places process enabled')
  let checkFreePlacesIsRunning = false
  cron.schedule(placeCountNotification.freq, async () => {
    if (checkFreePlacesIsRunning) {
      console.log('Try to start check free places process ignored because old process still running')
      return
    }
    console.log('Start check free places process')
    try {
      checkFreePlacesIsRunning = true
      console.log('Check free places: Update admin tokens')
      await updateAdminTokens(selenium, prisma)

      const tokens = (await prisma.admin.findMany({ where: { deleted: false } }))
        .map(x => x.token)
      const delegations = await collectDelegationsCount(tokens)
      console.log('Check free places: Delegations', delegations)

      await Promise.all(placeCountNotification.consumers.map(async url => {
        try {
          console.log(`Check free places: Send notification to ${url}`)
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(delegations)
          })
        } catch (e) {
          console.error(`Check free places: Failed to send notification to ${url}`, e)
        }
      }))

    } catch (e) {
      console.error('Check free places: Failed', e)
    } finally {
      checkFreePlacesIsRunning = false
    }
  }, {
    runOnInit: true
  })
}

app.post('/admin', expressAsyncHandler(async (req, res) => {
  console.log(req.body)
  const { email, password } = req.body
  if (!email) {
    res.status(400).send('Email is undefined')
    return
  }
  if (!password) {
    res.status(400).send('Password is undefined')
    return
  }
  const token = await selenium.login(email, password)
  await prisma.admin.create({ data: { email, password, token } })
  res.sendStatus(201)
}))

app.post('/users', expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (typeof email !== 'string') {
    res.status(400).send('Invalid email')
    return
  }
  if (typeof password !== 'string') {
    res.status(400).send('Invalid password')
    return
  }

  if (!await prisma.user.findFirst({ where: { email } })) {
    const token = await selenium.register(email, password)
    await prisma.user.create({ data: { email, password, token } })
  }

  await updateAdminTokens(selenium, prisma)

  const selection = await selectFreeProduct(
    (await prisma.admin.findMany({ where: { deleted: false } }))
      .map(x => x.token)
  )
  console.log('Selection', selection)
  const admin = await prisma.admin.findFirst({ where: { token: selection?.token || '' } })
  if (!selection || !admin) {
    res.status(422).send('No free products')
    return
  }
  await attach({ ...selection, email })
  await prisma.attach.create({ data: { userId: email, adminId: admin.email } })
  res.sendStatus(201)
}))

app.get('/users/:email', expressAsyncHandler(async (req, res) => {
  const { email } = req.params
  if (!email) {
    res.status(400).send('Invalid email')
    return
  }
  res.send((await prisma.user.findFirst({ where: { email } })))
}))

app.delete('/users/:email', expressAsyncHandler(async (req, res) => {
  const { email } = req.params
  if (!email) {
    res.status(400).send('Invalid email')
    return
  }
  const user = await prisma.user.findFirst({ where: { email, deleted: false } })
  if (!user) {
    res.status(404).send('Not found user')
    return
  }
  await prisma.user.update({
    where: { email },
    data: { deleted: true }
  })
  await updateAdminTokens(selenium, prisma)
  const selection = await findUser(
    (await prisma.admin.findMany({ where: { deleted: false } }))
      .map(x => x.token),
    email
  )
  if (!selection) {
    res.status(404).send('Not found selection')
    return
  }
  await detach(selection)
  res.sendStatus(204)
}))

app.post('/users/check', expressAsyncHandler(async (_, res) => {
  await updateAdminTokens(selenium, prisma)
  const actualUsers = await collectUsers(await prisma.admin.findMany({ where: { deleted: false } }))
  const storedUsers = await prisma.user.findMany({ where: { deleted: false } })
  const fallenUsers = storedUsers.filter(x => !actualUsers.find(y => x.email === y.email))
  res.send(fallenUsers)
}))

app.listen(8080, () => console.log('Server started'))
