import { Browser, Builder, By, Key, until, WebDriver } from "selenium-webdriver"
import fs from 'fs/promises'
import { Options } from "selenium-webdriver/chrome"
import { Token } from "./aliases"
import { HttpsProxyAgent } from "https-proxy-agent"
import axios from "axios"

class Eyes {
  private index = 0
  constructor(
    private readonly directory: string,
    private readonly browser: WebDriver
  ) { }
  async look() {
    const id = this.index++
    const formatter = new Intl.NumberFormat('en-US', { minimumIntegerDigits: 2 })
    const filename = `${this.directory}/${formatter.format(id)}.png`
    console.log(`Taking screenshot ${filename}...`)
    const screenshot = await this.browser.takeScreenshot()
    console.log(`Saving screenshot ${filename}...`)
    try { await fs.access(this.directory) }
    catch { await fs.mkdir(this.directory, { recursive: true }) }
    await fs.writeFile(filename, screenshot, { encoding: 'base64' })
  }
  async drop() {
    console.log(`Drop ${this.directory}`)
    await fs.rm(this.directory, { recursive: true, force: true })
  }
}

export default class Selenium {
  constructor(
    public readonly serverUrl: URL,
    public readonly proxyList: URL
  ) { }

  async login(email: string, password: string): Promise<Token> {
    return await this.inSession(`./screenshots/${new Date().toISOString()}-login-${email}`, async (browser, eyes) => {
      await browser.get('https://adminconsole.adobe.com')

      await eyes.look()
      await browser.wait(until.elementLocated(By.id('EmailPage-EmailField')))
      await eyes.look()
      const emailInput = await browser.findElement(By.id('EmailPage-EmailField'))
      await emailInput.sendKeys(email, Key.ENTER)

      await eyes.look()
      await browser.wait(until.stalenessOf(emailInput))
      if (await browser.findElements(By.id('PasswordPage-PasswordField')).then(x => x.length) == 0) {
        let mailCodeTries = 2
        while (mailCodeTries--) {
          await eyes.look()
          const nextButton = await browser.findElement(By.css('.CardLayout .spectrum-Button'))
          await nextButton.click()

          if (await browser.findElements(By.css('*[data-id="ErrorPage-Title"]')).then(x => x.length) > 0)
            throw new Error('New emails temporary deny')
          let code: string | undefined = undefined
          try {
            code = await this.getMailCode(email, password)
          } catch {
            await eyes.look()
            const resendButton = await browser.findElement(By.css('*[data-id="ChallengeCodePage-Resend"]'))
            await resendButton.click()
            continue
          }

          await eyes.look()
          await browser.wait(until.elementLocated(By.css('*[data-id="CodeInput-0"]')))
          await eyes.look()
          const codeInput = await browser.findElement(By.css('*[data-id="CodeInput-0"]'))
          await codeInput.sendKeys(code)
          break
        }
        if (mailCodeTries < 0) {
          throw new Error('Failed to get mail code')
        }
      }

      await eyes.look()
      await browser.wait(until.elementLocated(By.id('PasswordPage-PasswordField')))
      await eyes.look()
      const passwordInput = await browser.findElement(By.id('PasswordPage-PasswordField'))
      await passwordInput.sendKeys(password, Key.ENTER)

      await eyes.look()
      await browser.wait(until.stalenessOf(passwordInput))
      while ((await browser.findElements(By.css('*[data-id$="-skip-btn"]'))).length > 0) {
        await eyes.look()
        const skipButton = await browser.findElement(By.css('*[data-id$="-skip-btn"]'))
        await skipButton.click()
        await browser.wait(until.stalenessOf(skipButton))
      }
      await eyes.look()

      await browser.wait(until.urlContains('https://adminconsole.adobe.com'))
      await browser.wait(until.elementLocated(By.css('button')))
      await eyes.look()
      return await this.extractToken(browser)
    })
  }

  async register(email: string, password: string): Promise<Token> {
    return await this.inSession(`./screenshots/${new Date().toISOString()}-register-${email}`, async (browser, eyes) => {
      await browser.get('https://adminconsole.adobe.com')

      await eyes.look()
      await browser.wait(until.elementLocated(By.css('*[data-id="EmailPage-CreateAccountLink"]')))
      await eyes.look()
      await browser.findElement(By.css('*[data-id="EmailPage-CreateAccountLink"]')).then(x => x.click())

      await eyes.look()
      await browser.wait(until.elementLocated(By.css('*[data-id="Signup-EmailField"]')))
      await eyes.look()
      const emailInput = await browser.findElement(By.css('*[data-id="Signup-EmailField"]'))
      const passwordInput = await browser.findElement(By.css('*[data-id="Signup-PasswordField"]'))
      await emailInput.sendKeys(email)
      await passwordInput.sendKeys(password)

      await eyes.look()
      await browser.wait(until.elementLocated(By.css('*[data-id="PasswordStrengthRule-notCommonlyUsed"] img[src="/img/generic/check.svg"]')))
      await eyes.look()
      const continueButton = await browser.findElement(By.css('*[data-id="Signup-CreateAccountBtn"]'))
      await continueButton.click()

      await eyes.look()
      await browser.wait(until.elementLocated(By.css('*[data-id="Signup-FirstNameField"]')), 10000)
      await eyes.look()
      const firstNameInput = await browser.findElement(By.css('*[data-id="Signup-FirstNameField"]'))
      const lastNameInput = await browser.findElement(By.css('*[data-id="Signup-LastNameField"]'))
      const createAccountButton = await browser.findElement(By.css('*[data-id="Signup-CreateAccountBtn"]'))
      await firstNameInput.sendKeys('John')
      await lastNameInput.sendKeys('Cererra')
      await createAccountButton.click()

      await eyes.look()
      await browser.wait(until.urlContains('https://adminconsole.adobe.com'))
      await browser.wait(until.elementLocated(By.css('button')))
      await eyes.look()
      return await this.extractToken(browser)
    })
  }

  private async inSession<T>(screenshotsDirectory: string, script: (browser: WebDriver, eyes: Eyes) => Promise<T>): Promise<T> {
    const browser = await this.browser()
    const eyes = new Eyes(screenshotsDirectory, browser)
    const timeout = setTimeout(async () => {
      console.warn('Browser session timedout')
      await eyes.look()
      await browser.quit()
    }, 15 * 60 * 1000)
    try {
      const result = await script(browser, eyes)
      await eyes.drop()
      return result
    } catch (e) {
      await eyes.look()
      throw e
    } finally {
      clearTimeout(timeout)
      await browser.quit()
    }
  }

  private async browser(): Promise<WebDriver> {
    const proxy = await this.chooseProxy()
    console.log('Proxy used for new browser:', proxy)
    const options = new Options()
    options.setUserPreferences({
      'profile.default_content_setting_values.images': 2
    })
    options.addArguments(
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-automation',
    )
    options.setProxy({
      proxyType: 'manual',
      httpProxy: proxy,
      sslProxy: proxy
    })
    const browser = new Builder()
      .forBrowser(Browser.CHROME)
      .setChromeOptions(options)
      .usingServer(this.serverUrl.toString())
      .build()
    await browser.executeScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return browser
  }

  private async extractToken(browser: WebDriver): Promise<Token> {
    const storage: Record<string, string> = await browser.executeScript(`return window.sessionStorage`)
    const accessKey = Object.keys(storage).filter(x => /adobeid_ims_access_token/.test(x))[0]
    if (!accessKey) {
      console.log('storage', storage)
      throw new Error('Failed to get access key for session storage')
    }
    return JSON.parse(storage[accessKey] || '{}').tokenValue
  }

  private async getMailCode(address: string, password: string): Promise<string> {
    const timeGap = new Date(1000)
    const timeEdge = new Date(+new Date() - +timeGap)
    console.log('Email', address, 'Time edge', timeEdge)
    console.log('Email', address, 'Get mail.tm token')
    const mailToken = await fetch('https://api.mail.tm/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, password })
    }).then(x => x.json()).then(x => x.token)
    let tries = 10
    while (tries--) {
      const lastMessage: {
        id: string,
        seen: boolean,
        intro: string,
        createdAt: string
      } | undefined = await fetch('https://api.mail.tm/messages', {
        headers: {
          'Authorization': `Bearer ${mailToken}`,
          'Content-Type': 'application/json',
        }
      }).then(x => x.json()).then(x => x['hydra:member'][0])
      console.log('lastMessage', lastMessage)
      if (!lastMessage || lastMessage.seen || (new Date(lastMessage.createdAt) < timeEdge)) {
        await new Promise(r => setTimeout(r, 3000))
        continue
      }
      const messageUrl = `https://api.mail.tm/messages/${lastMessage.id}`
      await fetch(messageUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${mailToken}`,
          'Content-Type': 'application/merge-patch+json',
        },
        body: JSON.stringify({ seen: true })
      })
      const match = /\d{6}/.exec(lastMessage.intro)
      if (!match) continue
      console.log('Email', address, 'Got code:', match[0])
      return match[0]
    }
    throw new Error('Timed out to wait email with code')
  }

  private async chooseProxy(): Promise<string> {
    try {
      const response = await fetch(this.proxyList)
      const proxies = await response.json() as string[]
      const validProxies = (await Promise.all(proxies.map(x => `http://${x}`).map(async proxy => {
        const agent = new HttpsProxyAgent(proxy, { timeout: 500 })
        try {
          await axios.get('http://ipinfo.io', {
            httpAgent: agent,
            httpsAgent: agent,
            timeout: 500,
          })
          console.log(`Proxy ${proxy} is valid`)
          return proxy
        } catch (e) {
          console.log(`Proxy ${proxy} failed ${e}`)
          return undefined
        }
      }))).filter(x => x !== undefined)
      const firstValidProxy = validProxies[0]
      if (firstValidProxy === undefined) throw new Error(`No valid proxies in ${proxies.join(', ')}`)
      return firstValidProxy
    } catch (e) {
      console.error('Failed to choose proxy')
      throw e
    }
  }
}
