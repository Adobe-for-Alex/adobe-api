import { Browser, Builder, By, Key, until, WebDriver } from "selenium-webdriver"
import fs from 'fs/promises'

export type Token = string

async function screenshot(id: number, browser: WebDriver) {
  console.log(`Taking screenshot ${id}...`)
  const screenshot = await browser.takeScreenshot()
  console.log(`Saving screenshot ${id}...`)
  const formatter = new Intl.NumberFormat('en-US', { minimumIntegerDigits: 2 })
  await fs.writeFile(`/app/screenshots/${formatter.format(id)}.png`, screenshot, { encoding: 'base64' })
}

export default class Selenium {
  constructor(
    private readonly serverUrl: URL,
  ) { }

  async login(email: string, password: string): Promise<Token> {
    const browser = new Builder()
      .forBrowser(Browser.CHROME)
      .usingServer(this.serverUrl.toString())
      .build()
    try {
      // await this.getMailCode(email, password)
      console.log('Email', email, 'Get https://adminconsole.adobe.com')
      await browser.get('https://adminconsole.adobe.com')
      console.log('Email', email, 'Wait email input')
      await browser.wait(until.elementLocated(By.id('EmailPage-EmailField')))
      const emailInput = await browser.findElement(By.id('EmailPage-EmailField'))
      await emailInput.sendKeys(email, Key.ENTER)
      console.log('Email', email, 'Email entered. Wait next stage')
      await browser.wait(until.stalenessOf(emailInput))

      await screenshot(0, browser)
      if (await browser.findElements(By.id('PasswordPage-PasswordField')).then(x => x.length) == 0) {
        const nextButton = await browser.findElement(By.css('.CardLayout .spectrum-Button'))
        console.log('Email', email, 'Click check mail')
        await nextButton.click()
        await screenshot(1, browser)
        console.log('Email', email, 'Wait email code')
        const code = await this.getMailCode(email, password)
        console.log('Email', email, 'Wait next stage')
        await browser.wait(until.stalenessOf(nextButton))
        await screenshot(2, browser)
        const codeInput = await browser.findElement(By.css('input[data-id="CodeInput-0"]'))
        await codeInput.sendKeys(code)
        console.log('Email', email, 'Wait next stage')
        await browser.wait(until.stalenessOf(codeInput))
      }

      const passwordInput = await browser.findElement(By.id('PasswordPage-PasswordField'))
      await passwordInput.sendKeys(password, Key.ENTER)
      console.log('Email', email, 'Password enterd. Wait next stage')
      await browser.wait(until.stalenessOf(passwordInput))
      console.log('Email', email, 'Wait loading (20 sec)')
      await new Promise(r => setTimeout(r, 20 * 1000))
      const storage: Record<string, string> = await browser.executeScript(`return window.sessionStorage`)
      const accessKey = Object.keys(storage).filter(x => /adobeid_ims_access_token/.test(x))[0]
      if (!accessKey) {
        console.log('storage', storage)
        throw new Error('Failed to get access key for session storage')
      }
      return JSON.parse(storage[accessKey] || '{}').tokenValue
    } finally {
      await browser.quit()
    }
  }

  private async getMailCode(address: string, password: string): Promise<string> {
    console.log('Email', address, 'Get mail.tm token')
    const mailToken = await fetch('https://api.mail.tm/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, password })
    }).then(x => x.json()).then(x => x.token)
    while (true) {
      console.log('Email', address, 'Get last messages')
      const lastMessage: { id: string, seen: boolean, intro: string } = await fetch('https://api.mail.tm/messages', {
        headers: {
          'Authorization': `Bearer ${mailToken}`,
          'Content-Type': 'application/json',
        }
      }).then(x => x.json()).then(x => x['hydra:member'][0])
      console.log('lastMessage', lastMessage)
      if (lastMessage.seen) {
        await new Promise(r => setTimeout(r, 1000))
        continue
      }
      const messageUrl = `https://api.mail.tm/messages/${lastMessage.id}`
      console.log('messageUrl', messageUrl)
      console.log('response', await fetch(messageUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${mailToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seen: true })
      }).then(x => x.json()))
      const match = /\d{6}/.exec(lastMessage.intro)
      if (!match) throw new Error('Got message, but code not found. Message intro: ' + lastMessage.intro)
      console.log('Email', address, 'Got code:', match[0])
      return match[0]
    }

  }
}
